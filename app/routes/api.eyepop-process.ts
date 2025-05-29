// API endpoint for EyePop processing
// This endpoint will accept uploaded images and question configurations,
// send them to EyePop for analysis, and return structured responses.

import { ActionFunctionArgs, unstable_parseMultipartFormData, json, unstable_createMemoryUploadHandler } from "@remix-run/node"; // Or from @shopify/remix-oxygen if in a Hydrogen context
import { Readable } from "stream";
import { EyePopClient } from "../lib/eyepop-client";

export async function action({ request }: ActionFunctionArgs) {
  const eyePopClient = new EyePopClient();

  try {
    // Attempt to connect to EyePop early. If this fails, we don't need to parse the form.
    await eyePopClient.connect();

    // Use unstable_createMemoryUploadHandler to handle file uploads in memory
    const uploadHandler = unstable_createMemoryUploadHandler({
      maxPartSize: 5 * 1024 * 1024, // Example: 5MB limit
    });
    const formData = await unstable_parseMultipartFormData(request, uploadHandler);

    const imageFile = formData.get("image") as File | null; // Standard Web API File object
    const questionsString = formData.get("questions") as string | null;

    if (!imageFile || typeof imageFile.arrayBuffer !== 'function') { // Check for arrayBuffer method as a proxy for File type
      return json({ error: "Image file is required and must be a valid file." }, { status: 400 });
    }

    let questions;
    if (questionsString) {
      try {
        questions = JSON.parse(questionsString);
      } catch (e) {
        return json({ error: "Invalid JSON format for questions." }, { status: 400 });
      }
    }

    // Convert Web API File to Node.js stream.Readable
    // First, get the ArrayBuffer from the File object
    const arrayBuffer = await imageFile.arrayBuffer();
    // Then, create a Buffer from the ArrayBuffer
    const buffer = Buffer.from(arrayBuffer);
    // Finally, create a Readable stream from the Buffer
    const nodeReadableStream = Readable.from(buffer);

    const results = await eyePopClient.processImageStream(
      nodeReadableStream,
      imageFile.type, // mimeType from the uploaded file
      questions
    );

    return json({ success: true, results });

  } catch (error: any) {
    console.error("Error in api.eyepop-process action:", error);
    let errorMessage = "Failed to process image.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return json({ error: errorMessage, details: String(error) }, { status: 500 });
  } finally {
    // Always attempt to disconnect the client
    await eyePopClient.disconnect();
  }
} 