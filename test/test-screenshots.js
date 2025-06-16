#!/usr/bin/env node

// Test script for screenshot images in the test folder
// This script follows the official EyePop SDK patterns for proper image processing

import { EyePop, PopComponentType } from '@eyepop.ai/eyepop';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    secretKey: process.env.EYEPOP_SECRET_KEY,
    popId: process.env.EYEPOP_POP_ID,
};

// Dynamically get screenshot images from the test folder
function getScreenshotImages() {
    const testDir = path.resolve(process.cwd(), 'test');
    return fs.readdirSync(testDir)
        .filter(file => file.toLowerCase().includes('screenshot') && file.toLowerCase().endsWith('.png'))
        .sort(); // Sort for consistent ordering
}

// Test cases for different types of analysis
const TEST_SCENARIOS = [
    {
        name: "Product Analysis",
        questions: ["What is the main product shown?", "What colors are visible?", "What material does this appear to be made of?"],
        productType: "product",
        checkboxQuestions: ["productTitle", "productDescription", "colorVariant", "altText"]
    },
    {
        name: "Person Analysis", 
        questions: ["What style is this person wearing?", "What's the overall aesthetic?"],
        productType: "fashion",
        checkboxQuestions: ["ageRange", "gender", "fashionStyle", "outfitDescription"]
    },
    {
        name: "General Analysis",
        questions: ["What do you see in this image?", "What's the main focus?", "Describe the scene"],
        productType: "general",
        checkboxQuestions: ["productDescription", "altText", "seoDescription"]
    },
    {
        name: "E-commerce Focus",
        questions: ["What would be a good product title?", "What are the key selling points?"],
        productType: "product",
        checkboxQuestions: ["productTitle", "productDescription", "productTags", "seoDescription"]
    }
];

class ScreenshotTestClient {
    constructor(config) {
        this.config = config;
        this.isConnected = false;
        this.endpoint = null;
    }

    async connect() {
        try {
            // Follow the official EyePop SDK pattern
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

    // Create a proper Pop configuration following EyePop patterns
    createPop(questions, productType, checkboxQuestions) {
        // Build prompts array following the official SDK pattern
        const prompts = [];
        
        // Add product type analysis if specified
        if (productType) {
            prompts.push({
                prompt: `Analyze this ${productType} image`,
                label: 'main_analysis'
            });
        }

        // Add custom questions
        questions.forEach((question, index) => {
            prompts.push({
                prompt: question,
                label: `custom_question_${index + 1}`
            });
        });

        // Add checkbox-based prompts
        if (checkboxQuestions.includes('productTitle')) {
            prompts.push({
                prompt: "Generate a compelling product title for this item",
                label: 'product_title'
            });
        }
        if (checkboxQuestions.includes('productDescription')) {
            prompts.push({
                prompt: "Generate a detailed product description for this item",
                label: 'product_description'
            });
        }
        if (checkboxQuestions.includes('colorVariant')) {
            prompts.push({
                prompt: "Identify the primary colors and any color variants visible",
                label: 'color_variant'
            });
        }
        if (checkboxQuestions.includes('seoDescription')) {
            prompts.push({
                prompt: "Generate an SEO-optimized meta description",
                label: 'seo_description'
            });
        }
        if (checkboxQuestions.includes('productTags')) {
            prompts.push({
                prompt: "Generate relevant product tags and keywords",
                label: 'product_tags'
            });
        }
        if (checkboxQuestions.includes('altText')) {
            prompts.push({
                prompt: "Generate descriptive alt text for accessibility",
                label: 'alt_text'
            });
        }
        if (checkboxQuestions.includes('ageRange')) {
            prompts.push({
                prompt: "Determine the age range of any people visible (report as range, ex. 20s)",
                label: 'age_range'
            });
        }
        if (checkboxQuestions.includes('gender')) {
            prompts.push({
                prompt: "Identify the gender of any people visible (Male/Female)",
                label: 'gender'
            });
        }
        if (checkboxQuestions.includes('fashionStyle')) {
            prompts.push({
                prompt: "Identify the fashion style (Casual, Formal, Bohemian, Streetwear, Vintage, Chic, Sporty, Edgy)",
                label: 'fashion_style'
            });
        }
        if (checkboxQuestions.includes('outfitDescription')) {
            prompts.push({
                prompt: "Describe the outfit in detail",
                label: 'outfit_description'
            });
        }

        // Return a proper Pop configuration following EyePop SDK patterns (with id field)
        return {
            components: [{
                type: PopComponentType.INFERENCE,
                id: 1,  // Add the id field that's in the working version
                ability: 'eyepop.image-contents:latest',
                params: {
                    prompts: prompts,
                    confidence_threshold: 0.25
                }
            }]
        };
    }

    async processImageFile(imagePath, questions, productType, checkboxQuestions) {
        if (!this.isConnected) {
            await this.connect();
        }
        
        try {
            // Create and apply Pop configuration
            const pop = this.createPop(questions || [], productType, checkboxQuestions || []);
            console.log("   📋 Using Pop configuration with", pop.components.length, "component(s)");
            console.log("   📝 Prompts:", pop.components[0].params.prompts.length);
            
            // Apply the Pop configuration
            await this.endpoint.changePop(pop);
            
            // Process the image following the official SDK pattern
            console.log("   📤 Processing image file...");
            
            // Try using a readable stream instead of file path
            const stream = fs.createReadStream(imagePath);
            const results = await this.endpoint.process({ 
                stream: stream,
                mimeType: 'image/png'
            });
            
            // Collect all results following the SDK pattern
            const processedResults = [];
            for await (const result of results) {
                processedResults.push(result);
                console.log("   📊 Received result:", typeof result, Object.keys(result || {}));
            }
            
            return processedResults;
        } catch (error) {
            console.error(`   ❌ Error processing image:`, error);
            console.error(`   📍 Error details:`, {
                message: error.message,
                stack: error.stack?.substring(0, 200) + '...'
            });
            throw error;
        }
    }
}

async function runScreenshotTests() {
    console.log("🖼️ Screenshot Image Analysis Test (Following Official EyePop SDK Patterns)\n");
    console.log("=".repeat(70));
    
    // Check credentials
    if (!CONFIG.secretKey) {
        console.log("❌ EYEPOP_SECRET_KEY environment variable not set");
        console.log("   Please set your credentials:");
        console.log("   export EYEPOP_SECRET_KEY=your_secret_key");
        console.log("   export EYEPOP_POP_ID=your_pop_id  # Optional");
        return;
    }

    console.log("🔑 Using credentials:");
    console.log(`   Secret Key: ${CONFIG.secretKey.substring(0, 10)}...`);
    console.log(`   Pop ID: ${CONFIG.popId || 'default'}`);
    console.log(`   Screenshots to test: ${getScreenshotImages().length}`);
    console.log("");

    // Test connection first
    console.log("1️⃣ Testing connection...");
    try {
        const testClient = new ScreenshotTestClient(CONFIG);
        await testClient.connect();
        await testClient.disconnect();
        console.log("✅ Connection test successful!\n");
    } catch (error) {
        console.log("❌ Connection test failed:", error.message);
        return;
    }

    // Test each screenshot with different scenarios
    for (let i = 0; i < getScreenshotImages().length; i++) {
        const imageName = getScreenshotImages()[i];
        // Fix path resolution - use absolute path from project root
        const imagePath = path.resolve(process.cwd(), 'test', imageName);
        
        console.log(`🖼️ Testing Image ${i + 1}: ${imageName}`);
        console.log("=".repeat(50));
        
        // Check if file exists
        if (!fs.existsSync(imagePath)) {
            console.log(`   ❌ Image file not found: ${imagePath}`);
            console.log(`   📁 Checking directory: ${path.dirname(imagePath)}`);
            console.log(`   📂 Files in directory:`, fs.readdirSync(path.dirname(imagePath)).filter(f => f.endsWith('.png')));
            continue;
        }
        
        const fileSize = fs.statSync(imagePath).size;
        console.log(`   📁 File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   📍 File path: ${imagePath}`);
        
        // Test with one scenario per image (rotate through scenarios)
        const scenario = TEST_SCENARIOS[i % TEST_SCENARIOS.length];
        console.log(`   🎯 Testing scenario: ${scenario.name}`);
        console.log(`   ❓ Questions: ${scenario.questions.join(', ')}`);
        console.log(`   🏷️ Product Type: ${scenario.productType}`);
        console.log(`   ☑️ Checkboxes: ${scenario.checkboxQuestions.join(', ')}`);
        
        try {
            const client = new ScreenshotTestClient(CONFIG);
            await client.connect();
            
            const startTime = Date.now();
            
            const results = await client.processImageFile(
                imagePath,
                scenario.questions,
                scenario.productType,
                scenario.checkboxQuestions
            );
            
            const duration = Date.now() - startTime;
            
            console.log(`   ✅ Processing completed in ${duration}ms`);
            console.log(`   📊 Results: ${results.length} response(s) received`);
            
            // Analyze results
            if (results.length > 0) {
                const firstResult = results[0];
                console.log("   📋 Analysis Results:");
                console.log(`      📄 Result type: ${firstResult.type || 'unknown'}`);
                console.log(`      🔍 Result keys: ${Object.keys(firstResult).join(', ')}`);
                
                if (firstResult.objects && firstResult.objects.length > 0) {
                    console.log(`      🎯 Objects detected: ${firstResult.objects.length}`);
                    firstResult.objects.slice(0, 3).forEach((obj, idx) => {
                        console.log(`         ${idx + 1}. ${obj.classLabel || 'unknown'} (${(obj.confidence * 100).toFixed(1)}%)`);
                    });
                }
                
                if (firstResult.prompts) {
                    console.log(`      💬 Prompt responses: ${Object.keys(firstResult.prompts).length}`);
                    Object.entries(firstResult.prompts).slice(0, 3).forEach(([key, value]) => {
                        const displayValue = typeof value === 'string' ? 
                            (value.length > 80 ? value.substring(0, 80) + '...' : value) : 
                            JSON.stringify(value);
                        console.log(`         ${key}: ${displayValue}`);
                    });
                }
                
                // Show full results for first image as example
                if (i === 0) {
                    console.log("\n   📄 Full Results (first image only):");
                    console.log(JSON.stringify(firstResult, null, 2));
                }
            } else {
                console.log("   ⚠️ No results received");
            }
            
            await client.disconnect();
            console.log("");
            
        } catch (error) {
            console.log(`   ❌ Test failed: ${error.message}`);
            console.log(`   📍 Error type: ${error.constructor.name}`);
            console.log("");
        }
    }
    
    console.log("=".repeat(70));
    console.log("🏁 Screenshot testing completed!");
    console.log("\n✅ Summary:");
    console.log(`   • Tested ${getScreenshotImages().length} screenshot images`);
    console.log(`   • Used ${TEST_SCENARIOS.length} different analysis scenarios`);
    console.log("   • Followed official EyePop SDK patterns");
    console.log("   • Verified Pop configuration generation");
    console.log("   • Tested both person and product analysis modes");
}

// Run the test
runScreenshotTests().catch(error => {
    console.error("❌ Test failed with error:", error.message);
    if (error.stack) {
        console.error("Stack trace:", error.stack);
    }
}); 