import { type NextRequest, NextResponse } from "next/server";

// This points to the versioned Python backend base URL from environment variable.
// It should include /api/v1 as that's part of the Python backend's path structure.
// If NEXT_PUBLIC_BACKEND_API_URL is not set, this will be undefined,
// and the application should ideally handle this missing configuration.
const PYTHON_BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

export async function POST(request: NextRequest) {
  try {
    if (!PYTHON_BACKEND_BASE_URL) {
      console.error("CRITICAL: NEXT_PUBLIC_BACKEND_API_URL is not defined in the environment.");
      return NextResponse.json(
        {
          error_details: {
            type: "InternalServerError",
            message: "Backend API URL is not configured."
          }
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    // Validate request body
    if (!body.code || typeof body.code !== "string") {
      return NextResponse.json(
        {
          stdout: null,
          stderr: null,
          error_details: {
            type: "InputError",
            message: "Code is required and must be a string",
          },
          exit_code: -1,
          output_files: null,
        },
        { status: 400 },
      );
    }

    // Call the actual Python backend service
    const pythonBackendExecuteUrl = `${PYTHON_BACKEND_BASE_URL}/api/execute`;

    const backendResponse = await fetch(pythonBackendExecuteUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: body.code, input_data: body.input_data }),
    });

    const resultFromServer = await backendResponse.json();

    // Forward the response from the Python backend, including its status code
    return NextResponse.json(resultFromServer, { status: backendResponse.status });

  } catch (error) {
    console.error("Error in Next.js API route (/api/execute):", error);

    return NextResponse.json(
      {
        stdout: null,
        stderr: null,
        error_details: {
          type: "InternalServerError",
          message: "An unexpected error occurred while processing your request.",
        },
        exit_code: -1,
        output_files: null,
      },
      { status: 500 },
    )
  }
}
