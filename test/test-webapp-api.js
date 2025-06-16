#!/usr/bin/env node

// Test the actual web app API endpoint with real image data
// This tests the complete integration: form data parsing + EyePop processing

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
    apiUrl: 'http://localhost:3000/api/eyepop-process',
    testImagesDir: path.join(__dirname, 'test'),
    secretKey: process.env.EYEPOP_SECRET_KEY
};

const T_SHIRT_TEST_DATA = {
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

async function testWebAppAPI() {
    console.log("🚀 Testing Web App API Endpoint\n");
    console.log("=".repeat(60));
    
    if (!CONFIG.secretKey) {
        console.log("❌ EYEPOP_SECRET_KEY not set");
        return;
    }

    console.log("🔑 Configuration:");
    console.log(`   API URL: ${CONFIG.apiUrl}`);
    console.log(`   Secret Key: ${CONFIG.secretKey.substring(0, 10)}...`);
    console.log("");

    const testImages = getTestImages();
    if (testImages.length === 0) {
        console.log("❌ No test images found");
        return;
    }

    const imagePath = testImages[0];
    const imageName = path.basename(imagePath);
    
    console.log(`📁 Testing with: ${imageName}`);
    console.log(`   Full path: ${imagePath}`);
    console.log("");

    console.log("🎯 Test Data:");
    console.log(`   Main Object: ${T_SHIRT_TEST_DATA.mainObject}`);
    console.log(`   Custom Questions: ${T_SHIRT_TEST_DATA.customQuestions.join(', ')}`);
    console.log(`   Checkbox Questions: ${T_SHIRT_TEST_DATA.checkboxQuestions.join(', ')}`);
    console.log("");

    try {
        // Create form data
        console.log("📋 Creating form data...");
        const form = new FormData();
        
        // Add image file
        const imageBuffer = fs.readFileSync(imagePath);
        form.append('image', imageBuffer, {
            filename: imageName,
            contentType: 'image/png'
        });
        
        // Add content config
        const contentConfig = {
            mainObject: T_SHIRT_TEST_DATA.mainObject,
            customQuestions: T_SHIRT_TEST_DATA.customQuestions,
            checkboxQuestions: T_SHIRT_TEST_DATA.checkboxQuestions
        };
        
        form.append('contentConfig', JSON.stringify(contentConfig));
        
        console.log("   ✅ Form data created");
        console.log(`   Image size: ${imageBuffer.length} bytes`);
        console.log(`   Content config: ${JSON.stringify(contentConfig, null, 2)}`);
        console.log("");

        // Make API request
        console.log("📤 Making API request...");
        const startTime = Date.now();
        
        const response = await fetch(CONFIG.apiUrl, {
            method: 'POST',
            body: form,
            headers: {
                ...form.getHeaders()
            }
        });
        
        const duration = Date.now() - startTime;
        console.log(`   ⏱️ Request completed in ${duration}ms`);
        console.log(`   Status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log(`   ❌ Error response: ${errorText}`);
            return;
        }
        
        // Parse response
        const result = await response.json();
        console.log("   ✅ Response received");
        console.log("");

        // Display results
        console.log("📊 API Response:");
        console.log("=".repeat(60));
        
        if (result.success) {
            console.log("✅ Success: true");
            console.log(`📝 Processing time: ${result.processingTime}ms`);
            console.log("");
            
            if (result.results && result.results.length > 0) {
                result.results.forEach((apiResult, index) => {
                    console.log(`📋 Result ${index + 1}:`);
                    console.log(`   Type: ${apiResult.type || 'unknown'}`);
                    console.log(`   Source: ${apiResult.source_width}x${apiResult.source_height}`);
                    
                    if (apiResult.classes && apiResult.classes.length > 0) {
                        console.log(`   📝 Classifications (${apiResult.classes.length}):`);
                        apiResult.classes.forEach((cls, idx) => {
                            console.log(`      ${idx + 1}. ${cls.category}: "${cls.classLabel}" (${(cls.confidence * 100).toFixed(1)}%)`);
                        });
                    }
                    
                    if (apiResult.objects && apiResult.objects.length > 0) {
                        console.log(`   🎯 Objects (${apiResult.objects.length}):`);
                        apiResult.objects.slice(0, 3).forEach((obj, idx) => {
                            console.log(`      ${idx + 1}. ${obj.classLabel || 'unknown'} (${(obj.confidence * 100).toFixed(1)}%)`);
                        });
                    }
                });
                
                console.log("");
                console.log("🔍 Full Response Structure:");
                console.log(JSON.stringify(result, null, 2));
            } else {
                console.log("❌ No results in response");
            }
        } else {
            console.log("❌ Success: false");
            console.log(`Error: ${result.error}`);
            if (result.details) {
                console.log(`Details: ${result.details}`);
            }
        }
        
    } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
        if (error.stack) {
            console.log("Stack trace:", error.stack.substring(0, 500) + "...");
        }
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("🏁 Web app API test completed!");
    console.log("");
    console.log("✅ This shows the complete API response your Shopify plugin will receive!");
}

testWebAppAPI().catch(console.error); 