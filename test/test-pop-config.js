#!/usr/bin/env node

// Test script for Pop configuration logic
// This script tests the Pop configuration generation without making actual API calls

import { PopComponentType } from '@eyepop.ai/eyepop';

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
    },
    {
        name: "No Checkboxes",
        questions: ["What do you see in this image?"],
        productType: "general",
        checkboxQuestions: []
    }
];

// Pop configuration generator (mimics our actual implementation)
function createTestPop(questions, productType, checkboxQuestions) {
    console.log(`\n📋 Creating Pop for:`);
    console.log(`   Product Type: ${productType || 'none'}`);
    console.log(`   Custom Questions: ${questions.length > 0 ? questions.join(', ') : 'none'}`);
    console.log(`   Checkbox Options: ${checkboxQuestions.length > 0 ? checkboxQuestions.join(', ') : 'none'}`);

    // Check if this should use person analysis
    const hasPersonQuestions = checkboxQuestions.some(q => 
        ['ageRange', 'gender', 'fashionStyle', 'outfitDescription'].includes(q)
    );

    if (hasPersonQuestions) {
        return createPersonAnalysisPop(questions, checkboxQuestions);
    } else {
        return createComprehensivePop(questions, productType, checkboxQuestions);
    }
}

function createPersonAnalysisPop(prompts, checkboxQuestions) {
    console.log(`   🧑 Using Person Analysis Pop`);
    
    // Start with custom user prompts
    const allPrompts = [...prompts];
    
    // Build specific prompts based on checkbox questions
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

    // Combine all prompts
    const combinedPrompts = [...allPrompts, ...checkboxPrompts];
    
    // Create the main prompt text
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

    console.log(`   📝 Generated Prompt Text: "${promptText}"`);

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

function createComprehensivePop(prompts, productType, checkboxQuestions) {
    console.log(`   🔍 Using Comprehensive Analysis Pop`);
    
    // Start with custom user prompts
    const userPrompts = prompts.map(prompt => ({
        prompt: prompt,
        label: prompt
    }));

    // Add product type
    if (productType) {
        userPrompts.unshift({
            prompt: `Analyze this ${productType} product`,
            label: 'main_product'
        });
    }

    // Build checkbox-based prompts
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

    // Combine all prompts
    const allPromptObjects = [...userPrompts, ...checkboxPrompts];

    console.log(`   📝 Generated ${allPromptObjects.length} prompt objects:`);
    allPromptObjects.forEach((prompt, index) => {
        console.log(`      ${index + 1}. [${prompt.label}] "${prompt.prompt}"`);
    });

    return {
        components: [
            {
                type: PopComponentType.INFERENCE,
                id: 1,
                ability: 'eyepop.image-contents:latest',
                params: {
                    prompts: allPromptObjects,
                    confidence_threshold: 0.25
                }
            },
            {
                type: PopComponentType.INFERENCE,
                id: 2,
                ability: 'eyepop.localize-objects:latest',
                params: {
                    prompts: allPromptObjects,
                    confidence_threshold: 0.25
                }
            }
        ]
    };
}

// Main test function
async function testPopConfigurations() {
    console.log("🚀 Testing Pop Configuration Logic\n");
    console.log("=".repeat(60));
    
    for (let i = 0; i < TEST_CASES.length; i++) {
        const testCase = TEST_CASES[i];
        console.log(`\n${i + 1}️⃣ Test Case: ${testCase.name}`);
        console.log("=".repeat(40));
        
        try {
            const pop = createTestPop(
                testCase.questions,
                testCase.productType,
                testCase.checkboxQuestions
            );
            
            console.log(`\n   ✅ Pop configuration generated successfully`);
            console.log(`   📊 Components: ${pop.components.length}`);
            console.log(`   🔧 Pop Structure:`);
            console.log(JSON.stringify(pop, null, 4));
            
        } catch (error) {
            console.log(`   ❌ Failed to generate Pop: ${error.message}`);
        }
        
        console.log("\n" + "-".repeat(60));
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("🏁 Pop configuration testing completed!");
    console.log("\nNext step: Test with actual EyePop credentials using:");
    console.log("  EYEPOP_SECRET_KEY=your_key node test-eyepop.js");
}

// Run the test
testPopConfigurations().catch(console.error); 