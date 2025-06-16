#!/usr/bin/env node

// Test script for EyePop API integration
// This script tests the EyePop client with sample data to verify the implementation

// Since we're in a TypeScript project, we'll use dynamic imports
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// We'll import the EyePop SDK directly for testing
import { EyePop, PopComponentType } from '@eyepop.ai/eyepop';

// Test configuration
const TEST_CONFIG = {
    // You can set these via environment variables or hardcode for testing
    secretKey: process.env.EYEPOP_SECRET_KEY || 'your-secret-key-here',
    popId: process.env.EYEPOP_POP_ID || undefined, // Optional
};

// Test data
const TEST_CASES = [
    {
        name: "Basic Product Analysis",
        questions: ["What is the main color?", "What material does this appear to be made of?"],
        productType: "clothing",
        checkboxQuestions: ["productTitle", "productDescription", "colorVariant"]
    },
    {
        name: "Person Analysis",
        questions: ["What style is this person wearing?"],
        productType: "fashion",
        checkboxQuestions: ["ageRange", "gender", "fashionStyle", "outfitDescription"]
    },
    {
        name: "Comprehensive Analysis",
        questions: ["What brand is visible?", "What's the price range estimate?"],
        productType: "product",
        checkboxQuestions: ["productTitle", "productDescription", "seoDescription", "productTags", "altText"]
    }
];

// Sample image URL for testing (you can replace with your own)
const TEST_IMAGE_URL = "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop";

// Simple EyePop client for testing
class TestEyePopClient {
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
            throw new Error("EyePop endpoint not initialized. Please provide API token or Pop ID/Secret Key.");
        }
        try {
            await this.endpoint.connect();
            this.isConnected = true;
            console.log("   ✅ Connected to EyePop");
        } catch (error) {
            console.error("   ❌ Failed to connect to EyePop:", error.message);
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

    createTestPop(questions, productType, checkboxQuestions) {
        // Create prompts based on questions and checkboxes
        const promptObjects = questions.map(question => ({
            prompt: question,
            label: question
        }));

        // Add product type
        if (productType) {
            promptObjects.unshift({
                prompt: `Analyze this ${productType} product`,
                label: 'main_product'
            });
        }

        // Add checkbox questions
        if (checkboxQuestions.includes('productTitle')) {
            promptObjects.push({
                prompt: "Generate a compelling product title for this item",
                label: 'product_title'
            });
        }
        if (checkboxQuestions.includes('productDescription')) {
            promptObjects.push({
                prompt: "Generate a detailed product description for this item",
                label: 'product_description'
            });
        }
        if (checkboxQuestions.includes('colorVariant')) {
            promptObjects.push({
                prompt: "Identify the primary colors and any color variants visible in this product",
                label: 'color_variant'
            });
        }

        return {
            components: [{
                type: PopComponentType.INFERENCE,
                id: 1,
                ability: 'eyepop.image-contents:latest',
                params: {
                    prompts: promptObjects,
                    confidence_threshold: 0.25
                }
            }]
        };
    }

    async processImageByUrl(imageUrl, questions, productType, checkboxQuestions) {
        if (!this.isConnected) {
            await this.connect();
        }
        
        try {
            const pop = this.createTestPop(questions, productType, checkboxQuestions);
            console.log("   📋 Pop configuration:", JSON.stringify(pop, null, 2));
            
            // Use changePop to set the configuration
            await this.endpoint.changePop(pop);
            
            const results = await this.endpoint.process({ url: imageUrl });
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

    static async testConnection(config) {
        try {
            const testClient = new TestEyePopClient(config);
            await testClient.connect();
            await testClient.disconnect();
            return true;
        } catch (error) {
            console.error("Connection test failed:", error.message);
            return false;
        }
    }
}

async function testEyePopConnection() {
    console.log("🔍 Testing EyePop API Connection...\n");
    
    if (!TEST_CONFIG.secretKey || TEST_CONFIG.secretKey === 'your-secret-key-here') {
        console.log("❌ Please set EYEPOP_SECRET_KEY environment variable or update the script with your credentials");
        console.log("   Example: EYEPOP_SECRET_KEY=your_key node test-eyepop.js");
        return;
    }

    try {
        // Test connection
        console.log("1️⃣ Testing connection...");
        const isConnected = await TestEyePopClient.testConnection(TEST_CONFIG);
        
        if (!isConnected) {
            console.log("❌ Connection test failed. Please check your credentials.");
            return;
        }
        
        console.log("✅ Connection successful!\n");

        // Test each case
        for (let i = 0; i < TEST_CASES.length; i++) {
            const testCase = TEST_CASES[i];
            console.log(`${i + 2}️⃣ Testing: ${testCase.name}`);
            console.log(`   Questions: ${testCase.questions.join(', ')}`);
            console.log(`   Product Type: ${testCase.productType}`);
            console.log(`   Checkbox Options: ${testCase.checkboxQuestions.join(', ')}`);
            
            try {
                const client = new TestEyePopClient(TEST_CONFIG);
                await client.connect();
                
                console.log("   📤 Sending request to EyePop...");
                
                const results = await client.processImageByUrl(
                    TEST_IMAGE_URL,
                    testCase.questions,
                    testCase.productType,
                    testCase.checkboxQuestions
                );
                
                console.log("   ✅ Request successful!");
                console.log(`   📊 Results: ${results.length} response(s) received`);
                
                // Log first result for inspection
                if (results.length > 0) {
                    console.log("   📋 Sample result structure:");
                    const resultStr = JSON.stringify(results[0], null, 4);
                    console.log("   ", resultStr.substring(0, 800) + (resultStr.length > 800 ? "..." : ""));
                }
                
                await client.disconnect();
                console.log("");
                
            } catch (error) {
                console.log(`   ❌ Test failed: ${error.message}`);
                if (error.stack) {
                    console.log("   Stack trace:", error.stack.substring(0, 500));
                }
                console.log("");
            }
        }

    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
        if (error.stack) {
            console.log("Stack trace:", error.stack);
        }
    }
}

// Main execution
async function main() {
    console.log("🚀 EyePop API Integration Test\n");
    console.log("=".repeat(50));
    
    await testEyePopConnection();
    
    console.log("\n" + "=".repeat(50));
    console.log("🏁 Test completed!");
    console.log("\nUsage:");
    console.log("  EYEPOP_SECRET_KEY=your_key node test-eyepop.js");
    console.log("  EYEPOP_SECRET_KEY=your_key EYEPOP_POP_ID=your_pop_id node test-eyepop.js");
}

// Run the test
main().catch(console.error); 