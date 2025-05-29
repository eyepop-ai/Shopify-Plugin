// EyePop SDK client wrapper
// This file will contain the logic to connect to the EyePop API,
// process images with custom questions, and handle responses.
// Error handling and connection management will also be implemented here.

import { EyePop } from '@eyepop.ai/eyepop';

export class EyePopClient {
    private endpoint: any; // Adjust 'any' to the actual type from EyePop SDK if available

    constructor() {
        // The SDK will automatically use EYEPOP_POP_ID and EYEPOP_SECRET_KEY from .env
        this.endpoint = EyePop.workerEndpoint();
    }

    async connect() {
        if (!this.endpoint) {
            throw new Error("EyePop endpoint not initialized.");
        }
        try {
            await this.endpoint.connect();
            console.log("Successfully connected to EyePop.");
        } catch (error) {
            console.error("Failed to connect to EyePop:", error);
            throw error;
        }
    }

    async disconnect() {
        if (this.endpoint) {
            try {
                await this.endpoint.disconnect();
                console.log("Successfully disconnected from EyePop.");
            } catch (error) {
                console.error("Failed to disconnect from EyePop:", error);
                // We might not want to throw here, or handle differently
            }
        }
    }

    // Process a single image from a file path
    async processImageByPath(filePath: string, questions?: any) { // Define a proper type for questions
        if (!this.endpoint || !this.endpoint.isConnected()) { // Add isConnected or similar check if available
            await this.connect();
        }
        try {
            // TODO: Incorporate 'questions' into the process call if the SDK supports it directly.
            // This might involve sending questions as part of the job configuration or a separate step.
            // For now, this is a placeholder for where question logic would go.
            // The SDK's process method might take a 'config' object for such parameters.
            console.log(`Processing image from path: ${filePath} with questions:`, questions);
            const results = await this.endpoint.process({ path: filePath });
            const processedResults = [];
            for await (const result of results) {
                processedResults.push(result);
            }
            return processedResults;
        } catch (error) {
            console.error(`Error processing image from path ${filePath}:`, error);
            throw error;
        }
    }

    // Process a single image from a URL
    async processImageByUrl(imageUrl: string, questions?: any) { // Define a proper type for questions
        if (!this.endpoint || !this.endpoint.isConnected()) { // Add isConnected or similar check if available
            await this.connect();
        }
        try {
            // TODO: Incorporate 'questions' into the process call.
            console.log(`Processing image from URL: ${imageUrl} with questions:`, questions);
            const results = await this.endpoint.process({ url: imageUrl });
            const processedResults = [];
            for await (const result of results) {
                processedResults.push(result);
            }
            return processedResults;
        } catch (error) {
            console.error(`Error processing image from URL ${imageUrl}:`, error);
            throw error;
        }
    }

    // Process an image from a stream (e.g., from an upload)
    async processImageStream(stream: NodeJS.ReadableStream, mimeType: string, questions?: any) { // Define a proper type for questions
        if (!this.endpoint || !this.endpoint.isConnected()) { // Add isConnected or similar check if available
            await this.connect();
        }
        try {
            // TODO: Incorporate 'questions' into the process call.
            console.log(`Processing image stream (${mimeType}) with questions:`, questions);
            const results = await this.endpoint.process({ stream: stream, mimeType: mimeType });
            const processedResults = [];
            for await (const result of results) {
                processedResults.push(result);
            }
            return processedResults;
        } catch (error) {
            console.error(`Error processing image stream:`, error);
            throw error;
        }
    }
} 