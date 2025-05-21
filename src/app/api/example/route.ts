import { NextRequest, NextResponse } from "next/server";
import { logSuccess, logError, logWarning } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    // Example of logging a success
    await logSuccess(
      "Operation Completed",
      "Successfully fetched data from the API",
      {
        details: {
          "Request ID": crypto.randomUUID(),
          "User": "Anonymous",
          "Resource": "/api/example"
        }
      }
    );
    
    return NextResponse.json({ message: "Success example logged and notified" });
  } catch (error) {
    // Example of logging an error
    await logError(
      "Operation Failed",
      error instanceof Error ? error.message : "Unknown error occurred",
      {
        details: {
          "Request ID": crypto.randomUUID(),
          "Endpoint": "/api/example"
        }
      }
    );
    
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Example of intentionally causing a warning
    const body = await request.json();
    
    if (!body.requiredField) {
      // Log a warning when a required field is missing
      await logWarning(
        "Missing Required Field",
        "The request is missing a required field: requiredField",
        {
          details: {
            "Request ID": crypto.randomUUID(),
            "Endpoint": "/api/example",
            "Method": "POST"
          }
        }
      );
      
      return NextResponse.json(
        { warning: "Missing required field" },
        { status: 400 }
      );
    }
    
    // Example of a successful operation
    await logSuccess(
      "Data Processed",
      "Successfully processed the submitted data",
      {
        details: {
          "Request ID": crypto.randomUUID(),
          "User": body.user || "Anonymous",
          "Data Size": `${JSON.stringify(body).length} bytes`
        }
      }
    );
    
    return NextResponse.json({ message: "Data processed successfully" });
  } catch (error) {
    await logError(
      "Processing Error",
      error instanceof Error ? error.message : "Failed to process data",
      {
        details: {
          "Request ID": crypto.randomUUID(),
          "Endpoint": "/api/example",
          "Method": "POST"
        }
      }
    );
    
    return NextResponse.json(
      { error: "Failed to process data" },
      { status: 500 }
    );
  }
} 