# pyexecute/backend/executor_service/Dockerfile
# Dockerfile for the Flask-based Python Code Executor Service

FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Create a non-root user for running the executor service
RUN groupadd -r executor_user_group && useradd --no-log-init -r -g executor_user_group executor_user

WORKDIR /opt/executor_service

# Copy executor service requirements and install them
# Assumes this Dockerfile is in executor_service/ and requirements.txt is also there.
COPY ./requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the executor service application code (app.py)
# Assumes app.py is in the same directory as this Dockerfile (executor_service/)
COPY ./app.py .

# This is the directory where user scripts (run by subprocess from app.py) will operate.
# The Flask app (running as executor_user) will write user_script.py here
# and expect output files here.
# /app is relative to the root of the container filesystem.
RUN mkdir -p /app/outputs && chown executor_user:executor_user_group /app && chown executor_user:executor_user_group /app/outputs

USER executor_user

# Port Gunicorn will listen on inside the container
EXPOSE 8080

# Command to run Gunicorn with the Flask app
# Assumes the Flask app instance is named 'app' in 'app.py'
CMD ["gunicorn", "--workers", "4", "--bind", "0.0.0.0:8080", "app:app"]