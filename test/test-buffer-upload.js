#!/usr/bin/env node

// Buffer upload test - reads file as buffer and uploads data
// This should work around the file path issue

import { EyePop } from '@eyepop.ai/eyepop';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
    secretKey: process.env.EYEPOP_SECRET_KEY,
    testImagesDir: path.join(__dirname, 'test')
};

class BufferUploadClient {
    constructor(config) {
        this.config = config;
        this.isConnected = false;
        
        if (this.config.secretKey) {
            this.endpoint = EyePop.workerEndpoint({
                auth: { secretKey: this.config.secretKey }
            });
        } else {
            this.endpoint = EyePop.workerEndpoint();
        }
    }

    async connect() {
        try {
            await this.endpoint.connect();
            this.isConnected = true;
            console.log("✅ Connected to EyePop");
        } catch (error) {
            console.error("❌ Failed to connect:", error.message);
            throw error;
        }
    }

    async disconnect() {
        if (this.endpoint && this.isConnected) {
            try {
                await this.endpoint.disconnect();
                this.isConnected = false;
                console.log("✅ Disconnected from EyePop");
            } catch (error) {
                console.error("⚠️ Failed to disconnect:", error.message);
            }
        }
    }

    getMimeType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        switch (ext) {
            case '.jpg':
            case '.jpeg':
                return 'image/jpeg';
            case '.png':
                return 'image/png';
            case '.gif':
                return 'image/gif';
            case '.webp':
                return 'image/webp';
            default:
                return 'image/png'; // Default for screenshots
        }
    }

    async processImageBuffer(imagePath) {
        if (!this.isConnected) {
            await this.connect();
        }
        
        try {
            console.log(`📤 Processing image: ${path.basename(imagePath)}`);
            console.log("   Reading file as buffer...");
            
            // Read file as buffer
            const imageBuffer = fs.readFileSync(imagePath);
            const mimeType = this.getMimeType(imagePath);
            
            console.log(`   File size: ${imageBuffer.length} bytes`);
            console.log(`   MIME type: ${mimeType}`);
            console.log("   Using format: { data: buffer, mimeType: mimeType }");
            
            const results = await this.endpoint.process({ 
                data: imageBuffer,
                mimeType: mimeType
            });
            
            const processedResults = [];
            for await (const result of results) {
                processedResults.push(result);
            }
            return processedResults;
        } catch (error) {
            console.error(`   ❌ Error processing image:`, error.message);
            console.error(`   Error details:`, error);
            throw error;
        }
    }
}

function getTestImages() {
    try {
        const files = fs.readdirSync(CONFIG.testImagesDir);
        return files
            .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
            .map(file => path.join(CONFIG.testImagesDir, file))
            .slice(0, 1); // Just test one image
    } catch (error) {
        console.error("❌ Error reading test images directory:", error.message);
        return [];
    }
}

function displayResults(results, imageName) {
    console.log(`\n📊 API Response for ${imageName}:`);
    console.log("=".repeat(60));
    
    if (!results || results.length === 0) {
        console.log("   ❌ No results received");
        return;
    }

    results.forEach((result, index) => {
        console.log(`\n📋 Result ${index + 1}:`);
        console.log(`   Type: ${result.type || 'unknown'}`);
        console.log(`   Source: ${result.source_width}x${result.source_height}`);
        
        if (result.objects && result.objects.length > 0) {
            console.log(`   🎯 Objects Detected (${result.objects.length}):`);
            result.objects.slice(0, 5).forEach((obj, idx) => {
                console.log(`      ${idx + 1}. ${obj.classLabel || 'unknown'} (${(obj.confidence * 100).toFixed(1)}%)`);
            });
        }

        if (result.classes && result.classes.length > 0) {
            console.log(`   📝 Image Classifications (${result.classes.length}):`);
            result.classes.slice(0, 5).forEach((cls, idx) => {
                console.log(`      ${idx + 1}. ${cls.category}: "${cls.classLabel}" (${(cls.confidence * 100).toFixed(1)}%)`);
            });
        }

        // Show raw result (truncated)
        const resultStr = JSON.stringify(result, null, 2);
        console.log(`\n   🔍 Raw Result (${resultStr.length} chars):`);
        if (resultStr.length > 800) {
            console.log(`      ${resultStr.substring(0, 800)}...`);
        } else {
            console.log(`      ${resultStr}`);
        }
    });
}

async function testBufferUpload() {
    console.log("🚀 Buffer Upload Test\n");
    console.log("=".repeat(50));
    
    if (!CONFIG.secretKey) {
        console.log("❌ EYEPOP_SECRET_KEY not set");
        return;
    }

    console.log("🔑 Configuration:");
    console.log(`   Secret Key: ${CONFIG.secretKey.substring(0, 10)}...`);
    console.log("");

    const testImages = getTestImages();
    if (testImages.length === 0) {
        console.log("❌ No test images found");
        return;
    }

    console.log(`📁 Testing with: ${path.basename(testImages[0])}`);
    console.log(`   Full path: ${testImages[0]}`);
    console.log("");

    try {
        const client = new BufferUploadClient(CONFIG);
        await client.connect();
        
        const startTime = Date.now();
        
        const results = await client.processImageBuffer(testImages[0]);
        
        const duration = Date.now() - startTime;
        console.log(`✅ Processing completed in ${duration}ms`);
        
        displayResults(results, path.basename(testImages[0]));
        
        await client.disconnect();
        
    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
        if (error.stack) {
            console.log("Stack trace:", error.stack.substring(0, 500) + "...");
        }
    }
    
    console.log("\n" + "=".repeat(50));
    console.log("🏁 Buffer upload test completed!");
}

testBufferUpload().catch(console.error); 