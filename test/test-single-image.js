#!/usr/bin/env node

// Simple test to verify EyePop integration is working with real responses
// This tests a single image to quickly validate the implementation

import { EyePop, PopComponentType } from '@eyepop.ai/eyepop';
import fs from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
    secretKey: process.env.EYEPOP_SECRET_KEY,
    popId: process.env.EYEPOP_POP_ID,
};

// Get first screenshot image
function getFirstScreenshot() {
    const testDir = path.resolve(process.cwd(), 'test');
    const screenshots = fs.readdirSync(testDir)
        .filter(file => file.toLowerCase().includes('screenshot') && file.toLowerCase().endsWith('.png'))
        .sort();
    return screenshots[0];
}

class SimpleEyePopTest {
    constructor(config) {
        this.config = config;
        this.endpoint = null;
    }

    async connect() {
        if (this.config.secretKey && this.config.popId) {
            this.endpoint = EyePop.workerEndpoint({
                popId: this.config.popId,
                auth: { secretKey: this.config.secretKey }
            });
        } else if (this.config.secretKey) {
            this.endpoint = EyePop.workerEndpoint({
                auth: { secretKey: this.config.secretKey }
            });
        } else {
            throw new Error("EyePop credentials not found");
        }

        await this.endpoint.connect();
        console.log("✅ Connected to EyePop");
    }

    async disconnect() {
        if (this.endpoint) {
            await this.endpoint.disconnect();
            console.log("✅ Disconnected from EyePop");
        }
    }

    createSimplePop() {
        return {
            components: [{
                type: PopComponentType.INFERENCE,
                id: 1,
                ability: 'eyepop.image-contents:latest',
                params: {
                    prompts: [
                        {
                            prompt: "What is the main product or item shown in this image?",
                            label: 'main_product'
                        },
                        {
                            prompt: "What colors are visible in this image?",
                            label: 'colors'
                        },
                        {
                            prompt: "Generate a product title for this item",
                            label: 'product_title'
                        }
                    ]
                }
            }]
        };
    }

    async processImage(imagePath) {
        try {
            // Apply Pop configuration
            const pop = this.createSimplePop();
            console.log("📋 Applying Pop configuration:", JSON.stringify(pop, null, 2));
            await this.endpoint.changePop(pop);
            console.log("📋 Applied Pop configuration");
            
            // Process image
            const stream = fs.createReadStream(imagePath);
            const results = await this.endpoint.process({ 
                stream: stream,
                mimeType: 'image/png'
            });
            
            // Collect results
            const processedResults = [];
            for await (const result of results) {
                processedResults.push(result);
            }
            
            return processedResults;
        } catch (error) {
            console.error("❌ Error processing image:", error);
            console.error("❌ Error message:", error.message);
            console.error("❌ Error stack:", error.stack);
            throw error;
        }
    }
}

async function runSimpleTest() {
    console.log("🧪 Simple EyePop Integration Test\n");
    console.log("=".repeat(50));
    
    // Check credentials
    if (!CONFIG.secretKey) {
        console.log("❌ EYEPOP_SECRET_KEY not set");
        return;
    }

    console.log("🔑 Credentials found");
    console.log(`   Secret Key: ${CONFIG.secretKey.substring(0, 10)}...`);
    console.log(`   Pop ID: ${CONFIG.popId || 'default'}`);
    
    // Get test image
    const imageName = getFirstScreenshot();
    if (!imageName) {
        console.log("❌ No screenshot images found in test folder");
        return;
    }
    
    const imagePath = path.resolve(process.cwd(), 'test', imageName);
    console.log(`📸 Testing with: ${imageName}`);
    console.log(`📁 File size: ${(fs.statSync(imagePath).size / 1024 / 1024).toFixed(2)} MB`);
    console.log("");

    try {
        const client = new SimpleEyePopTest(CONFIG);
        await client.connect();
        
        console.log("📤 Processing image...");
        const startTime = Date.now();
        
        const results = await client.processImage(imagePath);
        
        const duration = Date.now() - startTime;
        console.log(`✅ Processing completed in ${duration}ms`);
        console.log(`📊 Results: ${results.length} response(s) received`);
        
        if (results.length > 0) {
            const result = results[0];
            console.log("\n📋 Analysis Results:");
            console.log(`   Type: ${result.type || 'unknown'}`);
            console.log(`   Keys: ${Object.keys(result).join(', ')}`);
            
            if (result.prompts) {
                console.log("\n💬 Prompt Responses:");
                Object.entries(result.prompts).forEach(([key, value]) => {
                    console.log(`   ${key}: ${value}`);
                });
            }
            
            if (result.objects && result.objects.length > 0) {
                console.log(`\n🎯 Objects detected: ${result.objects.length}`);
                result.objects.slice(0, 5).forEach((obj, idx) => {
                    console.log(`   ${idx + 1}. ${obj.classLabel || 'unknown'} (${(obj.confidence * 100).toFixed(1)}%)`);
                });
            }
            
            console.log("\n📄 Full Response:");
            console.log(JSON.stringify(result, null, 2));
        }
        
        await client.disconnect();
        
    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
    }
    
    console.log("\n" + "=".repeat(50));
    console.log("🏁 Simple test completed!");
}

// Run the test
runSimpleTest().catch(error => {
    console.error("❌ Test failed:", error.message);
}); 