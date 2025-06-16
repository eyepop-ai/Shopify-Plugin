#!/usr/bin/env node

// URL upload test with custom Pop configuration
// This combines the working URL approach with our custom prompts

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

class UrlWithPopClient {
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
        console.log("📋 Creating T-shirt Analysis Pop");
        
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

        console.log(`📝 Generated combined prompt:`);
        console.log(`   "${combinedPrompt}"`);

        // Try different ability names to see which one works
        const popConfigs = [
            {
                name: "image-contents-t4:latest",
                config: {
                    components: [{
                        type: PopComponentType.INFERENCE,
                        id: 1,
                        ability: 'eyepop.image-contents-t4:latest',
                        params: {
                            prompts: [{
                                prompt: combinedPrompt
                            }]
                        }
                    }]
                }
            },
            {
                name: "image-contents:latest",
                config: {
                    components: [{
                        type: PopComponentType.INFERENCE,
                        id: 1,
                        ability: 'eyepop.image-contents:latest',
                        params: {
                            prompts: [{
                                prompt: combinedPrompt
                            }]
                        }
                    }]
                }
            }
        ];

        return popConfigs;
    }

    async processImageByUrl(imageUrl, customQuestions, checkboxQuestions, mainObject) {
        if (!this.isConnected) {
            await this.connect();
        }
        
        const popConfigs = this.createTShirtPop(customQuestions, checkboxQuestions, mainObject);
        
        for (const popConfig of popConfigs) {
            try {
                console.log(`\n🧪 Testing with ability: ${popConfig.name}`);
                console.log("📋 Setting Pop configuration...");
                
                await this.endpoint.changePop(popConfig.config);
                
                console.log(`📤 Processing image from URL: ${imageUrl}`);
                const results = await this.endpoint.process({ url: imageUrl });
                
                const processedResults = [];
                for await (const result of results) {
                    processedResults.push(result);
                }
                
                console.log(`✅ Success with ${popConfig.name}!`);
                return { ability: popConfig.name, results: processedResults };
                
            } catch (error) {
                console.error(`❌ Failed with ${popConfig.name}: ${error.message}`);
                continue;
            }
        }
        
        throw new Error("All Pop configurations failed");
    }
}

function displayResults(results, abilityName) {
    console.log(`\n📊 API Response (${abilityName}):`);
    console.log("=".repeat(60));
    
    if (!results || results.length === 0) {
        console.log("❌ No results received");
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
                    console.log(`         "${value}"`);
                } else {
                    console.log(`         ${JSON.stringify(value)}`);
                }
            });
        }

        // Show raw result (truncated)
        const resultStr = JSON.stringify(result, null, 2);
        console.log(`\n   🔍 Raw Result (${resultStr.length} chars):`);
        if (resultStr.length > 1000) {
            console.log(`      ${resultStr.substring(0, 1000)}...`);
        } else {
            console.log(`      ${resultStr}`);
        }
    });
}

async function testUrlWithPop() {
    console.log("🚀 Testing URL Upload with Custom Pop Configuration\n");
    console.log("=".repeat(70));
    
    if (!CONFIG.secretKey) {
        console.log("❌ EYEPOP_SECRET_KEY not set");
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
        const client = new UrlWithPopClient(CONFIG);
        await client.connect();
        
        const startTime = Date.now();
        
        const result = await client.processImageByUrl(
            CONFIG.testImageUrl,
            T_SHIRT_TEST.customQuestions,
            T_SHIRT_TEST.checkboxQuestions,
            T_SHIRT_TEST.mainObject
        );
        
        const duration = Date.now() - startTime;
        console.log(`✅ Processing completed in ${duration}ms`);
        
        displayResults(result.results, result.ability);
        
        await client.disconnect();
        
    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
        if (error.stack) {
            console.log("Stack trace:", error.stack.substring(0, 500) + "...");
        }
    }
    
    console.log("\n" + "=".repeat(70));
    console.log("🏁 URL with Pop test completed!");
}

testUrlWithPop().catch(console.error); 