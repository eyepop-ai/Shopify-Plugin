#!/usr/bin/env node

// Real upload test script for EyePop API integration
// This script uploads actual images and tests the complete API flow
// Based on the working example from EyePop Labs

import { EyePop, PopComponentType, ForwardOperatorType } from '@eyepop.ai/eyepop';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    secretKey: process.env.EYEPOP_SECRET_KEY,
    popId: process.env.EYEPOP_POP_ID,
    testImagesDir: path.join(__dirname, 'test')
};

// T-shirt specific test configuration
const T_SHIRT_TEST_CONFIG = {
    mainObject: "t-shirt",
    customQuestions: [
        "what is the collar style",
        "what is the sleeve length", 
        "what type of neckline does this have"
    ],
    // Relevant checkboxes for t-shirt analysis
    checkboxQuestions: [
        "productTitle",        // Generate product title
        "productDescription",  // Generate description
        "colorVariant",       // Identify colors
        "productTags",        // Generate tags
        "altText"            // Generate alt text
    ]
};

// EyePop client implementation based on Labs example
class RealUploadEyePopClient {
    constructor(config) {
        this.config = config;
        this.isConnected = false;
        
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
            this.endpoint = EyePop.workerEndpoint();
        }
    }

    async connect() {
        if (!this.endpoint) {
            throw new Error("EyePop endpoint not initialized");
        }
        try {
            await this.endpoint.connect();
            this.isConnected = true;
            console.log("   ✅ Connected to EyePop");
        } catch (error) {
            console.error("   ❌ Failed to connect:", error.message);
            this.isConnected = false;
            throw error;
        }
    }

    async disconnect() {
        if (this.endpoint && this.isConnected) {
            try {
                await this.endpoint.disconnect();
                this.isConnected = false;
                console.log("   ✅ Disconnected from EyePop");
            } catch (error) {
                console.error("   ⚠️ Failed to disconnect:", error.message);
            }
        }
    }

    createTShirtAnalysisPop(customQuestions, checkboxQuestions, mainObject) {
        console.log("   📋 Creating T-shirt Analysis Pop (Labs-style)");
        console.log(`      Main Object: ${mainObject}`);
        console.log(`      Custom Questions: ${customQuestions.join(', ')}`);
        console.log(`      Checkbox Questions: ${checkboxQuestions.join(', ')}`);

        // Build the combined prompt based on Labs example format
        let promptCategories = [];
        
        // Add custom questions
        customQuestions.forEach(question => {
            promptCategories.push(question);
        });
        
        // Add checkbox-based questions
        if (checkboxQuestions.includes('productTitle')) {
            promptCategories.push("Generate a compelling product title for this item");
        }
        if (checkboxQuestions.includes('productDescription')) {
            promptCategories.push("Generate a detailed product description for this item");
        }
        if (checkboxQuestions.includes('colorVariant')) {
            promptCategories.push("Identify the primary colors and any color variants visible in this product");
        }
        if (checkboxQuestions.includes('productTags')) {
            promptCategories.push("Generate relevant product tags and keywords for this item");
        }
        if (checkboxQuestions.includes('altText')) {
            promptCategories.push("Generate descriptive alt text for this product image for accessibility");
        }

        // Create the prompt in the format used by Labs example
        const combinedPrompt = `Analyze the image provided and determine the categories of: ${promptCategories.join(', ')}. Report the values of the categories as classLabels. If you are unable to provide a category with a value then set its classLabel to null`;

        console.log(`   📝 Generated combined prompt:`);
        console.log(`      "${combinedPrompt}"`);

        // Use the structure from Labs example with correct ability name
        return {
            components: [{
                type: PopComponentType.INFERENCE,
                id: 1,
                ability: 'eyepop.image-contents-t4:latest', // Correct ability name from Labs
                params: {
                    prompts: [{
                        prompt: combinedPrompt
                    }]
                }
            }]
        };
    }

    async processImageFile(imagePath, customQuestions, checkboxQuestions, mainObject) {
        if (!this.isConnected) {
            await this.connect();
        }
        
        try {
            const pop = this.createTShirtAnalysisPop(customQuestions, checkboxQuestions, mainObject);
            
            // Use changePop to set the configuration
            console.log("   📋 Setting Pop configuration...");
            await this.endpoint.changePop(pop);
            
            // Use the correct EyePop API format from Labs example: { file: imagePath, mimeType: 'image/*' }
            console.log(`   📤 Processing image: ${path.basename(imagePath)}`);
            
            const results = await this.endpoint.process({ 
                file: imagePath,
                mimeType: 'image/*'
            });
            
            const processedResults = [];
            for await (const result of results) {
                processedResults.push(result);
            }
            return processedResults;
        } catch (error) {
            console.error(`   ❌ Error processing image:`, error.message);
            throw error;
        }
    }
}

// Get available test images
function getTestImages() {
    try {
        const files = fs.readdirSync(CONFIG.testImagesDir);
        return files
            .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
            .map(file => path.join(CONFIG.testImagesDir, file));
    } catch (error) {
        console.error("❌ Error reading test images directory:", error.message);
        return [];
    }
}

// Format and display API response
function displayApiResponse(results, imageName) {
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
        
        // Display objects detected
        if (result.objects && result.objects.length > 0) {
            console.log(`   🎯 Objects Detected (${result.objects.length}):`);
            result.objects.forEach((obj, idx) => {
                console.log(`      ${idx + 1}. ${obj.classLabel || 'unknown'} (confidence: ${(obj.confidence * 100).toFixed(1)}%)`);
                if (obj.bbox) {
                    console.log(`         Location: x=${obj.bbox.x}, y=${obj.bbox.y}, w=${obj.bbox.w}, h=${obj.bbox.h}`);
                }
                
                // Display classes (this is where our prompt responses should appear)
                if (obj.classes && obj.classes.length > 0) {
                    console.log(`         📝 Classifications (${obj.classes.length}):`);
                    obj.classes.forEach((cls, clsIdx) => {
                        console.log(`            ${clsIdx + 1}. ${cls.category}: "${cls.classLabel}" (${(cls.confidence * 100).toFixed(1)}%)`);
                    });
                }
            });
        }

        // Display top-level classes (image-level classifications)
        if (result.classes && result.classes.length > 0) {
            console.log(`   📝 Image Classifications (${result.classes.length}):`);
            result.classes.forEach((cls, idx) => {
                console.log(`      ${idx + 1}. ${cls.category}: "${cls.classLabel}" (${(cls.confidence * 100).toFixed(1)}%)`);
            });
        }

        // Display prompt responses if available
        if (result.prompts) {
            console.log(`   💬 Prompt Responses (${Object.keys(result.prompts).length}):`);
            Object.entries(result.prompts).forEach(([key, value]) => {
                console.log(`      📝 ${key}:`);
                if (typeof value === 'string') {
                    // Wrap long text
                    const wrapped = value.length > 100 ? value.substring(0, 100) + '...' : value;
                    console.log(`         "${wrapped}"`);
                } else {
                    console.log(`         ${JSON.stringify(value, null, 2)}`);
                }
            });
        }

        // Show raw result structure (truncated)
        console.log(`   🔍 Raw Result Structure:`);
        const resultStr = JSON.stringify(result, null, 2);
        if (resultStr.length > 1000) {
            console.log(`      ${resultStr.substring(0, 1000)}...`);
            console.log(`      [Truncated - Full result is ${resultStr.length} characters]`);
        } else {
            console.log(`      ${resultStr}`);
        }
    });
}

// Main test function
async function testRealUpload() {
    console.log("🚀 Real Image Upload Test - T-Shirt Analysis (Labs Format)\n");
    console.log("=".repeat(70));
    
    // Check credentials
    if (!CONFIG.secretKey) {
        console.log("❌ EYEPOP_SECRET_KEY environment variable not set");
        console.log("   Please set your credentials:");
        console.log("   export EYEPOP_SECRET_KEY=your_secret_key");
        console.log("   export EYEPOP_POP_ID=your_pop_id  # Optional");
        console.log("\n   Then run: node test-real-upload.js");
        return;
    }

    console.log("🔑 Configuration:");
    console.log(`   Secret Key: ${CONFIG.secretKey.substring(0, 10)}...`);
    console.log(`   Pop ID: ${CONFIG.popId || 'default'}`);
    console.log(`   Test Images Dir: ${CONFIG.testImagesDir}`);
    console.log("");

    // Get test images
    const testImages = getTestImages();
    if (testImages.length === 0) {
        console.log("❌ No test images found in the test directory");
        console.log(`   Please add some images to: ${CONFIG.testImagesDir}`);
        return;
    }

    console.log(`📁 Found ${testImages.length} test image(s):`);
    testImages.forEach((img, idx) => {
        const stats = fs.statSync(img);
        console.log(`   ${idx + 1}. ${path.basename(img)} (${(stats.size / 1024).toFixed(1)}KB)`);
    });
    console.log("");

    // Test configuration
    console.log("🎯 Test Configuration:");
    console.log(`   Main Object: ${T_SHIRT_TEST_CONFIG.mainObject}`);
    console.log(`   Custom Questions: ${T_SHIRT_TEST_CONFIG.customQuestions.join(', ')}`);
    console.log(`   Checkbox Questions: ${T_SHIRT_TEST_CONFIG.checkboxQuestions.join(', ')}`);
    console.log("");

    // Test connection
    console.log("1️⃣ Testing connection...");
    try {
        const testClient = new RealUploadEyePopClient(CONFIG);
        await testClient.connect();
        await testClient.disconnect();
        console.log("✅ Connection successful!\n");
    } catch (error) {
        console.log("❌ Connection test failed:", error.message);
        return;
    }

    // Process each test image
    for (let i = 0; i < testImages.length; i++) {
        const imagePath = testImages[i];
        const imageName = path.basename(imagePath);
        
        console.log(`${i + 2}️⃣ Processing: ${imageName}`);
        console.log("=".repeat(50));
        
        try {
            const client = new RealUploadEyePopClient(CONFIG);
            await client.connect();
            
            const startTime = Date.now();
            
            const results = await client.processImageFile(
                imagePath,
                T_SHIRT_TEST_CONFIG.customQuestions,
                T_SHIRT_TEST_CONFIG.checkboxQuestions,
                T_SHIRT_TEST_CONFIG.mainObject
            );
            
            const duration = Date.now() - startTime;
            console.log(`   ✅ Processing completed in ${duration}ms`);
            
            // Display the complete API response
            displayApiResponse(results, imageName);
            
            await client.disconnect();
            
        } catch (error) {
            console.log(`   ❌ Processing failed: ${error.message}`);
            if (error.stack) {
                console.log("   Stack trace:", error.stack.substring(0, 500) + "...");
            }
        }
        
        console.log("\n" + "=".repeat(70));
    }
    
    console.log("🏁 Real upload test completed!");
    console.log("\n✅ This test shows you exactly what your API returns!");
    console.log("   • Custom questions about collar style, sleeve length, etc.");
    console.log("   • Checkbox-generated prompts for product info");
    console.log("   • Complete object detection results");
    console.log("   • All prompt responses with actual content");
}

// Run the test
testRealUpload().catch(error => {
    console.error("❌ Test failed with error:", error.message);
    if (error.stack) {
        console.error("Stack trace:", error.stack);
    }
}); 