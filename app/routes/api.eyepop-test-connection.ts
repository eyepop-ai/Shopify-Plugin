// API endpoint for testing EyePop connection
// This endpoint tests the connection to EyePop with provided credentials

import { ActionFunctionArgs, unstable_parseMultipartFormData, json, unstable_createMemoryUploadHandler } from "@remix-run/node";
import { EyePopClient, EyePopConfig } from "../lib/eyepop-client";

export async function action({ request }: ActionFunctionArgs) {
  try {
    const uploadHandler = unstable_createMemoryUploadHandler({
      maxPartSize: 1024 * 1024, // 1MB limit for test
    });
    const formData = await unstable_parseMultipartFormData(request, uploadHandler);

    const secretKey = formData.get("secretKey") as string | null;
    const popId = formData.get("popId") as string | null;
    const isTest = formData.get("test") as string | null;

    if (!secretKey) {
      return json({ 
        error: "Secret Key is required for testing connection.",
        success: false
      }, { status: 400 });
    }

    // Create EyePop client with production configuration
    const config: EyePopConfig = {
      secretKey: secretKey,
      popId: popId || undefined // Optional Pop ID
    };

    console.log(`🔧 [Test Connection] Testing connection with production EyePop`);
    console.log(`🔧 [Test Connection] Using secret key: ${secretKey.substring(0, 20)}...`);
    console.log(`🔧 [Test Connection] Pop ID: ${popId || "Not provided (using default)"}`);

    const eyePopClient = new EyePopClient(config);

    // Test the connection
    await eyePopClient.connect();
    await eyePopClient.disconnect();

    return json({ 
      success: true,
      message: "Connection test successful",
      hasPopId: !!popId,
      note: popId ? "Using provided Pop ID" : "Using default Pop configuration"
    });

  } catch (error: any) {
    console.error("Error testing EyePop connection:", error);
    
    let errorMessage = "Connection test failed.";
    if (error instanceof Error) {
      if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
        errorMessage = "Invalid credentials. Please check your Secret Key and Pop ID.";
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        errorMessage = "Network error. Please check your internet connection.";
      } else {
        errorMessage = error.message;
      }
    }
    
    return json({ 
      error: errorMessage,
      success: false,
      details: String(error)
    }, { status: 401 });
  }
} 