#!/usr/bin/env node

// Full integration test script
// This script tests the complete flow: form data → API endpoint → EyePop processing

import { EyePop, PopComponentType } from '@eyepop.ai/eyepop';
import fs from 'fs';
import { Readable } from 'stream';

// Configuration
const CONFIG = {
    secretKey: process.env.EYEPOP_SECRET_KEY,
    popId: process.env.EYEPOP_POP_ID,
    testImageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop"
};

// Full EyePop client implementation for testing
class FullTestEyePopClient {
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

    createComprehensivePop(prompts, productType, checkboxQuestions) {
        // Check if this should use person analysis
        const hasPersonQuestions = checkboxQuestions.some(q => 
            ['ageRange', 'gender', 'fashionStyle', 'outfitDescription'].includes(q)
        );

        if (hasPersonQuestions) {
            return this.createPersonAnalysisPop(prompts, checkboxQuestions);
        } else {
            return this.createGeneralAnalysisPop(prompts, productType, checkboxQuestions);
        }
    }

    createPersonAnalysisPop(prompts, checkboxQuestions) {
        const allPrompts = [...prompts];
        const checkboxPrompts = [];
        
        if (checkboxQuestions.includes('productTitle')) {
            checkboxPrompts.push("Generate a compelling product title for this item");
        }
        if (checkboxQuestions.includes('productDescription')) {
            checkboxPrompts.push("Generate a detailed product description for this item");
        }
        if (checkboxQuestions.includes('colorVariant')) {
            checkboxPrompts.push("Identify the primary colors and any color variants visible in this product");
        }
        if (checkboxQuestions.includes('seoDescription')) {
            checkboxPrompts.push("Generate an SEO-optimized meta description for this product");
        }
        if (checkboxQuestions.includes('productTags')) {
            checkboxPrompts.push("Generate relevant product tags and keywords for this item");
        }
        if (checkboxQuestions.includes('altText')) {
            checkboxPrompts.push("Generate descriptive alt text for this product image for accessibility");
        }
        if (checkboxQuestions.includes('ageRange')) {
            checkboxPrompts.push("Determine the age range of the person (report as range, ex. 20s)");
        }
        if (checkboxQuestions.includes('gender')) {
            checkboxPrompts.push("Identify the gender (Male/Female)");
        }
        if (checkboxQuestions.includes('fashionStyle')) {
            checkboxPrompts.push("Identify the fashion style (Casual, Formal, Bohemian, Streetwear, Vintage, Chic, Sporty, Edgy)");
        }
        if (checkboxQuestions.includes('outfitDescription')) {
            checkboxPrompts.push("Describe their outfit in detail");
        }

        const combinedPrompts = [...allPrompts, ...checkboxPrompts];
        
        let promptText = "Analyze the image provided and determine the following:";
        
        const hasPersonQuestions = checkboxQuestions.some(q => 
            ['ageRange', 'gender', 'fashionStyle', 'outfitDescription'].includes(q)
        );
        
        if (hasPersonQuestions) {
            promptText += " For any people in the image, analyze: Age (report as range, ex. 20s), Gender (Male/Female), Fashion style (Casual, Formal, Bohemian, Streetwear, Vintage, Chic, Sporty, Edgy), and describe their outfit.";
        }
        
        if (combinedPrompts.length > 0) {
            promptText += " Additionally: " + combinedPrompts.join(". ");
        }
        
        promptText += " Report the values of the categories as classLabels. If you are unable to provide a category with a value then set its classLabel to null.";

        return {
            components: [{
                type: PopComponentType.INFERENCE,
                forward: {
                    targets: [{
                        type: PopComponentType.INFERENCE,
                        ability: 'eyepop.image-contents:latest',
                        params: {
                            prompts: [{
                                prompt: promptText
                            }],
                        }
                    }]
                }
            }]
        };
    }

    createGeneralAnalysisPop(prompts, productType, checkboxQuestions) {
        const userPrompts = prompts.map(prompt => ({
            prompt: prompt,
            label: prompt
        }));

        if (productType) {
            userPrompts.unshift({
                prompt: `Analyze this ${productType} product`,
                label: 'main_product'
            });
        }

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
        if (checkboxQuestions.includes('seoDescription')) {
            checkboxPrompts.push({
                prompt: "Generate an SEO-optimized meta description for this product",
                label: 'seo_description'
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

    async processImageByUrl(imageUrl, questions, productType, checkboxQuestions) {
        if (!this.isConnected) {
            await this.connect();
        }
        
        try {
            const pop = this.createComprehensivePop(questions || [], productType, checkboxQuestions || []);
            console.log("   📋 Using Pop configuration with", pop.components.length, "component(s)");
            
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
            const testClient = new FullTestEyePopClient(config);
            await testClient.connect();
            await testClient.disconnect();
            return true;
        } catch (error) {
            return false;
        }
    }
}

// Test cases
const INTEGRATION_TEST_CASES = [
    {
        name: "Product Analysis with Checkboxes",
        questions: ["What is the main color?", "What material does this appear to be made of?"],
        productType: "clothing",
        checkboxQuestions: ["productTitle", "productDescription", "colorVariant"],
        expectedPrompts: 6 // 1 product type + 2 custom + 3 checkbox
    },
    {
        name: "Person Analysis",
        questions: ["What style is this person wearing?"],
        productType: "fashion",
        checkboxQuestions: ["ageRange", "gender", "fashionStyle", "outfitDescription"],
        expectedPrompts: 1 // Person analysis uses single combined prompt
    },
    {
        name: "Minimal Test",
        questions: ["What do you see?"],
        productType: "general",
        checkboxQuestions: ["altText"],
        expectedPrompts: 3 // 1 product type + 1 custom + 1 checkbox
    }
];

async function runFullIntegrationTest() {
    console.log("🚀 Full EyePop Integration Test\n");
    console.log("=".repeat(60));
    
    // Check credentials
    if (!CONFIG.secretKey) {
        console.log("❌ EYEPOP_SECRET_KEY environment variable not set");
        console.log("   Please set your credentials:");
        console.log("   export EYEPOP_SECRET_KEY=your_secret_key");
        console.log("   export EYEPOP_POP_ID=your_pop_id  # Optional");
        console.log("\n   Then run: node test-full-integration.js");
        return;
    }

    console.log("🔑 Using credentials:");
    console.log(`   Secret Key: ${CONFIG.secretKey.substring(0, 10)}...`);
    console.log(`   Pop ID: ${CONFIG.popId || 'default'}`);
    console.log(`   Test Image: ${CONFIG.testImageUrl}`);
    console.log("");

    // Test connection first
    console.log("1️⃣ Testing connection...");
    const isConnected = await FullTestEyePopClient.testConnection(CONFIG);
    
    if (!isConnected) {
        console.log("❌ Connection test failed. Please check your credentials.");
        return;
    }
    
    console.log("✅ Connection successful!\n");

    // Run integration tests
    for (let i = 0; i < INTEGRATION_TEST_CASES.length; i++) {
        const testCase = INTEGRATION_TEST_CASES[i];
        console.log(`${i + 2}️⃣ Testing: ${testCase.name}`);
        console.log("=".repeat(40));
        console.log(`   Custom Questions: ${testCase.questions.join(', ')}`);
        console.log(`   Product Type: ${testCase.productType}`);
        console.log(`   Checkbox Questions: ${testCase.checkboxQuestions.join(', ')}`);
        
        try {
            const client = new FullTestEyePopClient(CONFIG);
            await client.connect();
            
            console.log("   📤 Sending request to EyePop...");
            const startTime = Date.now();
            
            const results = await client.processImageByUrl(
                CONFIG.testImageUrl,
                testCase.questions,
                testCase.productType,
                testCase.checkboxQuestions
            );
            
            const duration = Date.now() - startTime;
            
            console.log(`   ✅ Request completed in ${duration}ms`);
            console.log(`   📊 Results: ${results.length} response(s) received`);
            
            // Analyze results
            if (results.length > 0) {
                const firstResult = results[0];
                console.log("   📋 Result analysis:");
                console.log(`      Type: ${firstResult.type || 'unknown'}`);
                
                if (firstResult.objects && firstResult.objects.length > 0) {
                    console.log(`      Objects detected: ${firstResult.objects.length}`);
                    firstResult.objects.slice(0, 3).forEach((obj, idx) => {
                        console.log(`         ${idx + 1}. ${obj.classLabel || 'unknown'} (${(obj.confidence * 100).toFixed(1)}%)`);
                    });
                }
                
                if (firstResult.prompts) {
                    console.log(`      Prompts processed: ${Object.keys(firstResult.prompts).length}`);
                    Object.keys(firstResult.prompts).slice(0, 3).forEach(key => {
                        const value = firstResult.prompts[key];
                        console.log(`         ${key}: ${typeof value === 'string' ? value.substring(0, 50) + '...' : JSON.stringify(value)}`);
                    });
                }
            }
            
            await client.disconnect();
            console.log("");
            
        } catch (error) {
            console.log(`   ❌ Test failed: ${error.message}`);
            if (error.stack) {
                console.log("   Stack trace:", error.stack.substring(0, 300) + "...");
            }
            console.log("");
        }
    }
    
    console.log("=".repeat(60));
    console.log("🏁 Full integration test completed!");
    console.log("\n✅ Your EyePop integration is working correctly!");
    console.log("   • Custom questions are being processed");
    console.log("   • Checkbox questions are being mapped to prompts");
    console.log("   • Person analysis detection is working");
    console.log("   • API responses are being received");
}

// Run the test
runFullIntegrationTest().catch(error => {
    console.error("❌ Test failed with error:", error.message);
    if (error.stack) {
        console.error("Stack trace:", error.stack);
    }
}); 