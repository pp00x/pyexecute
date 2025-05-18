import os
import subprocess
import json
import base64
import tarfile # Though not strictly needed if not creating tar for output, os.listdir is simpler
import io # For BytesIO if tarfile were used for output bundling
import logging
from flask import Flask, request, jsonify
from functools import wraps # For the decorator

# Configure basic logging
# In a container, logs usually go to stdout/stderr
logging.basicConfig(
    level=logging.INFO, 
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()] # Ensure logs go to stderr/stdout
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configuration
# These paths are *inside* the container where this Flask app runs.
# The Dockerfile for this service ensures these are set up.
EXECUTION_TIMEOUT_SECONDS = int(os.getenv("EXECUTION_TIMEOUT_SECONDS", "10"))
APP_WORKDIR_FOR_SCRIPT = "/app" # User script will be written here and CWD will be this
USER_SCRIPT_NAME = "user_script.py"
USER_SCRIPT_PATH = f"{APP_WORKDIR_FOR_SCRIPT}/{USER_SCRIPT_NAME}"
OUTPUT_DIR_FOR_SCRIPT = f"{APP_WORKDIR_FOR_SCRIPT}/outputs"

# Define ErrorType constants (mirroring Pydantic Enum for consistency in error payloads)
class ErrorType:
    INPUT_ERROR = "InputError"
    SCRIPT_TIMEOUT_ERROR = "ScriptTimeoutError"
    SCRIPT_EXECUTION_ERROR = "ScriptExecutionError" # For non-zero exit codes from user script
    INTERNAL_SERVER_ERROR = "InternalServerError" # Errors within this executor service

def create_structured_error(error_type: str, message: str, stdout: str = None, stderr: str = None, exit_code: int = -1) -> dict:
    """Helper to create a structured error response body."""
    return {
        "stdout": stdout,
        "stderr": stderr,
        "error_details": {"type": error_type, "message": message},
        "exit_code": exit_code,
        "output_files": None,
    }

# --- Auth Configuration ---
EXPECTED_AUTH_TOKEN = os.getenv("EXECUTOR_SHARED_SECRET")
AUTH_HEADER_NAME = "X-Internal-Auth-Token" # Case-sensitive for header name matching

def require_auth_token(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not EXPECTED_AUTH_TOKEN:
            logger.error("CRITICAL: EXECUTOR_SHARED_SECRET is not configured for the executor service. Denying all requests.")
            # Use the consistent error structure
            error_payload = create_structured_error(
                ErrorType.INTERNAL_SERVER_ERROR,
                "Service authentication not configured."
            )
            return jsonify(error_payload), 500 # Internal server error if secret isn't set
        
        token = request.headers.get(AUTH_HEADER_NAME)
        if token == EXPECTED_AUTH_TOKEN:
            return f(*args, **kwargs)
        else:
            logger.warning(f"Flask Executor: Unauthorized attempt. Missing or invalid token in header '{AUTH_HEADER_NAME}'.")
            error_payload = create_structured_error(
                ErrorType.INPUT_ERROR, # Or a more specific "AuthenticationError" if defined
                "Unauthorized."
            )
            return jsonify(error_payload), 401 # Unauthorized
    return decorated_function

@app.route("/internal/execute-script", methods=["POST"]) # Changed path
@require_auth_token # Apply the decorator
def execute_script_route():
    # The actual request handling logic starts after successful auth
    logger.info("Flask Executor: Received /execute request (authenticated).")
    try:
        data = request.get_json()
        if not data:
            logger.warning("Flask Executor: Request body is not JSON or is empty.")
            return jsonify(create_structured_error(ErrorType.INPUT_ERROR, "Request body must be JSON and not empty.")), 400
        
        code = data.get("code")
        input_data_str = data.get("input_data") # Can be None

        if not code or not isinstance(code, str):
            logger.warning("Flask Executor: 'code' field is missing or not a string.")
            return jsonify(create_structured_error(ErrorType.INPUT_ERROR, "Field 'code' is required and must be a string.")), 400
        
        if input_data_str is not None and not isinstance(input_data_str, str):
            logger.warning("Flask Executor: 'input_data' field must be a string if provided.")
            return jsonify(create_structured_error(ErrorType.INPUT_ERROR, "Field 'input_data' must be a string if provided.")), 400

        # Prepare for execution
        os.makedirs(OUTPUT_DIR_FOR_SCRIPT, exist_ok=True)
        # Clean up old output files from previous runs in this container instance (if any)
        for item in os.listdir(OUTPUT_DIR_FOR_SCRIPT):
            os.remove(os.path.join(OUTPUT_DIR_FOR_SCRIPT, item))
        
        with open(USER_SCRIPT_PATH, "w", encoding="utf-8") as f:
            f.write(code)
        
        process_stdout_bytes = b""
        process_stderr_bytes = b""
        exit_code = -1

        try:
            logger.info(f"Flask Executor: Executing script. Timeout: {EXECUTION_TIMEOUT_SECONDS}s.")
            process = subprocess.run(
                ["python3", "-u", USER_SCRIPT_PATH],
                input=input_data_str.encode('utf-8') if input_data_str is not None else None,
                capture_output=True, # Captures stdout and stderr
                timeout=EXECUTION_TIMEOUT_SECONDS,
                cwd=APP_WORKDIR_FOR_SCRIPT # Run script from /app directory
            )
            process_stdout_bytes = process.stdout
            process_stderr_bytes = process.stderr
            exit_code = process.returncode
            logger.info(f"Flask Executor: Script finished. Exit code: {exit_code}.")

        except subprocess.TimeoutExpired as te:
            logger.warning(f"Flask Executor: Script execution timed out after {EXECUTION_TIMEOUT_SECONDS}s.")
            # stdout/stderr might have partial data in te.stdout, te.stderr
            process_stdout_bytes = te.stdout or b""
            process_stderr_bytes = te.stderr or b""
            # Append timeout message to stderr
            timeout_msg = f"\n--- Execution forcefully terminated after {EXECUTION_TIMEOUT_SECONDS} seconds. ---"
            process_stderr_bytes += timeout_msg.encode('utf-8')
            
            response_payload = create_structured_error(
                ErrorType.SCRIPT_TIMEOUT_ERROR, 
                f"Execution timed out after {EXECUTION_TIMEOUT_SECONDS} seconds.",
                stdout=process_stdout_bytes.decode('utf-8', errors='replace').strip(),
                stderr=process_stderr_bytes.decode('utf-8', errors='replace').strip(),
                exit_code=-1 # Explicitly -1 for timeout
            )
            return jsonify(response_payload), 200 # HTTP 200, error in payload

        except Exception as e_run: # Catch other potential errors during subprocess.run
            logger.error(f"Flask Executor: Error during subprocess execution: {e_run}", exc_info=True)
            response_payload = create_structured_error(
                ErrorType.INTERNAL_SERVER_ERROR,
                f"An unexpected error occurred during script execution: {str(e_run)}",
                stderr=str(e_run), # Put the exception message in stderr
            )
            return jsonify(response_payload), 200 # HTTP 200, error in payload

        # Process outputs
        stdout_final = process_stdout_bytes.decode('utf-8', errors='replace').strip()
        stderr_final = process_stderr_bytes.decode('utf-8', errors='replace').strip()
        
        output_files_list = []
        try:
            if os.path.exists(OUTPUT_DIR_FOR_SCRIPT):
                for item_name in os.listdir(OUTPUT_DIR_FOR_SCRIPT):
                    item_path = os.path.join(OUTPUT_DIR_FOR_SCRIPT, item_name)
                    if os.path.isfile(item_path):
                        with open(item_path, "rb") as f_out:
                            content_bytes = f_out.read()
                        content_base64 = base64.b64encode(content_bytes).decode('utf-8')
                        output_files_list.append({"filename": item_name, "content_base64": content_base64})
                        logger.info(f"Flask Executor: Retrieved output file: {item_name} ({len(content_bytes)} bytes)")
        except Exception as e_files:
            logger.error(f"Flask Executor: Error retrieving output files: {e_files}", exc_info=True)
            # Append file error to stderr, but don't fail the whole response
            file_error_msg = f"\n--- Error retrieving output files: {str(e_files)} ---"
            stderr_final = (stderr_final + file_error_msg).strip()

        # Construct final successful response (even if script had non-zero exit code)
        final_response_payload = {
            "stdout": stdout_final,
            "stderr": stderr_final,
            "error_details": None, # No *service* error if script ran; script errors are in stderr/exit_code
            "exit_code": exit_code,
            "output_files": output_files_list if output_files_list else None
        }
        return jsonify(final_response_payload), 200

    except Exception as e_outer:
        logger.exception("Flask Executor: Unhandled exception in /execute route.")
        # This is for unexpected errors in the Flask app logic itself
        return jsonify(create_structured_error(ErrorType.INTERNAL_SERVER_ERROR, "An unexpected internal error occurred in the executor service.")), 500

if __name__ == "__main__":
    # This is for local testing of this Flask app.
    # Gunicorn will be used by the Docker CMD for running in the container.
    # The port should match what Gunicorn will use, or be different for local test.
    # For local testing, ensure /app and /app/outputs exist where you run this.
    os.makedirs(OUTPUT_DIR_FOR_SCRIPT, exist_ok=True) 
    app.run(host="0.0.0.0", port=8080, debug=True)