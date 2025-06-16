#!/usr/bin/env node

// Simple URL test for EyePop API
// This tests with a URL to verify the API is working correctly

import { EyePop, PopComponentType } from '@eyepop.ai/eyepop';

const CONFIG = {
    secretKey: process.env.EYEPOP_SECRET_KEY,
    testImageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop" // T-shirt image
};

const T_SHIRT_TEST = {
    mainObject: "t-shirt",
    customQuestions: [
        "what is the collar style",
        "what is the sleeve length",
        "what type of neckline does this have"
    ],
    checkboxQuestions: [
        "productTitle",
        "productDescription", 
        "colorVariant",
        "productTags",
        "altText"
    ]
};

class SimpleEyePopClient {
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

    createTShirtPop(customQuestions, checkboxQuestions, mainObject) {
        const userPrompts = customQuestions.map(question => ({
            prompt: question,
            label: question.replace(/\s+/g, '_').toLowerCase()
        }));

        userPrompts.unshift({
            prompt: `Analyze this ${mainObject} product in detail`,
            label: 'main_product_analysis'
        });

        const checkboxPrompts = [];
        
        if (checkboxQuestions.includes('productTitle')) {
            checkboxPrompts.push({
                prompt: "Generate a compelling product title for this item",
                label: 'product_title'
            });
        }
        if (checkboxQuestions.includes('productDescription')) {
            checkboxPrompts.push({
                prompt: "Generate a detailed product description for this item",
                label: 'product_description'
            });
        }
        if (checkboxQuestions.includes('colorVariant')) {
            checkboxPrompts.push({
                prompt: "Identify the primary colors and any color variants visible in this product",
                label: 'color_variant'
            });
        }
        if (checkboxQuestions.includes('productTags')) {
            checkboxPrompts.push({
                prompt: "Generate relevant product tags and keywords for this item",
                label: 'product_tags'
            });
        }
        if (checkboxQuestions.includes('altText')) {
            checkboxPrompts.push({
                prompt: "Generate descriptive alt text for this product image for accessibility",
                label: 'alt_text'
            });
        }

        const allPromptObjects = [...userPrompts, ...checkboxPrompts];

        console.log(`📝 Generated ${allPromptObjects.length} prompts:`);
        allPromptObjects.forEach((prompt, index) => {
            console.log(`   ${index + 1}. [${prompt.label}] "${prompt.prompt}"`);
        });

        return {
            components: [{
                type: PopComponentType.INFERENCE,
                id: 1,
                ability: 'eyepop.image-contents:latest',
                params: {
                    prompts: allPromptObjects,
                    confidence_threshold: 0.25
                }
            }]
        };
    }

    async processImageByUrl(imageUrl, customQuestions, checkboxQuestions, mainObject) {
        if (!this.isConnected) {
            await this.connect();
        }
        
        try {
            const pop = this.createTShirtPop(customQuestions, checkboxQuestions, mainObject);
            
            console.log("📋 Setting Pop configuration...");
            await this.endpoint.changePop(pop);
            
            console.log(`📤 Processing image from URL: ${imageUrl}`);
            const results = await this.endpoint.process({ url: imageUrl });
            
            const processedResults = [];
            for await (const result of results) {
                processedResults.push(result);
            }
            return processedResults;
        } catch (error) {
            console.error(`❌ Error processing image:`, error.message);
            throw error;
        }
    }
}

function displayResults(results) {
    console.log("\n📊 API Response:");
    console.log("=".repeat(60));
    
    if (!results || results.length === 0) {
        console.log("❌ No results received");
        return;
    }

    results.forEach((result, index) => {
        console.log(`\n📋 Result ${index + 1}:`);
        console.log(`   Type: ${result.type || 'unknown'}`);
        
        if (result.objects && result.objects.length > 0) {
            console.log(`   🎯 Objects Detected (${result.objects.length}):`);
            result.objects.slice(0, 5).forEach((obj, idx) => {
                console.log(`      ${idx + 1}. ${obj.classLabel || 'unknown'} (${(obj.confidence * 100).toFixed(1)}%)`);
            });
        }

        if (result.prompts) {
            console.log(`   💬 Prompt Responses (${Object.keys(result.prompts).length}):`);
            Object.entries(result.prompts).forEach(([key, value]) => {
                console.log(`      📝 ${key}:`);
                if (typeof value === 'string') {
                    console.log(`         "${value}"`);
                } else {
                    console.log(`         ${JSON.stringify(value)}`);
                }
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

async function testUrlUpload() {
    console.log("🚀 Testing EyePop API with URL Upload\n");
    console.log("=".repeat(60));
    
    if (!CONFIG.secretKey) {
        console.log("❌ EYEPOP_SECRET_KEY not set");
        console.log("   Please run: export EYEPOP_SECRET_KEY=your_key");
        return;
    }

    console.log("🔑 Configuration:");
    console.log(`   Secret Key: ${CONFIG.secretKey.substring(0, 10)}...`);
    console.log(`   Test Image URL: ${CONFIG.testImageUrl}`);
    console.log("");

    console.log("🎯 Test Configuration:");
    console.log(`   Main Object: ${T_SHIRT_TEST.mainObject}`);
    console.log(`   Custom Questions: ${T_SHIRT_TEST.customQuestions.join(', ')}`);
    console.log(`   Checkbox Questions: ${T_SHIRT_TEST.checkboxQuestions.join(', ')}`);
    console.log("");

    try {
        const client = new SimpleEyePopClient(CONFIG);
        await client.connect();
        
        const startTime = Date.now();
        
        const results = await client.processImageByUrl(
            CONFIG.testImageUrl,
            T_SHIRT_TEST.customQuestions,
            T_SHIRT_TEST.checkboxQuestions,
            T_SHIRT_TEST.mainObject
        );
        
        const duration = Date.now() - startTime;
        console.log(`✅ Processing completed in ${duration}ms`);
        
        displayResults(results);
        
        await client.disconnect();
        
    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
        if (error.stack) {
            console.log("Stack trace:", error.stack.substring(0, 500) + "...");
        }
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("🏁 URL upload test completed!");
}

testUrlUpload().catch(console.error); 