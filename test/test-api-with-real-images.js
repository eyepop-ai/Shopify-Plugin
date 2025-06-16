#!/usr/bin/env node

// Test script that calls your actual API endpoint with real images
// This simulates exactly what your web app does when uploading images

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
    apiUrl: 'http://localhost:3000/api/eyepop-process', // Your API endpoint
    testImagesDir: path.join(__dirname, 'test')
};

// T-shirt test configuration
const T_SHIRT_TEST = {
    mainObject: "t-shirt",
    customQuestions: [
        "what is the collar style",
        "what is the sleeve length", 
        "what type of neckline does this have"
    ],
    checkboxQuestions: {
        productTitle: true,
        productDescription: true,
        colorVariant: true,
        productTags: true,
        altText: true,
        // Not including person-related checkboxes for t-shirt analysis
        ageRange: false,
        gender: false,
        fashionStyle: false,
        outfitDescription: false,
        seoDescription: false
    }
};

// Get test images
function getTestImages() {
    try {
        const files = fs.readdirSync(CONFIG.testImagesDir);
        return files
            .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
            .map(file => path.join(CONFIG.testImagesDir, file));
    } catch (error) {
        console.error("❌ Error reading test images:", error.message);
        return [];
    }
}

// Create form data for API call
async function createFormData(imagePath, questions, productType, checkboxConfig) {
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    
    // Add the image file
    const imageBuffer = fs.readFileSync(imagePath);
    const imageName = path.basename(imagePath);
    formData.append('file', imageBuffer, {
        filename: imageName,
        contentType: getMimeType(imagePath)
    });
    
    // Add questions as JSON string
    formData.append('questions', JSON.stringify(questions));
    
    // Add product type
    formData.append('productType', productType);
    
    // Add checkbox configuration as JSON string
    formData.append('contentConfig', JSON.stringify(checkboxConfig));
    
    return formData;
}

function getMimeType(filePath) {
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
            return 'image/jpeg';
    }
}

// Call your API endpoint
async function callApiEndpoint(imagePath) {
    console.log(`📤 Calling API with: ${path.basename(imagePath)}`);
    
    try {
        const formData = await createFormData(
            imagePath,
            T_SHIRT_TEST.customQuestions,
            T_SHIRT_TEST.mainObject,
            T_SHIRT_TEST.checkboxQuestions
        );
        
        console.log("   📋 Request details:");
        console.log(`      Image: ${path.basename(imagePath)}`);
        console.log(`      Questions: ${T_SHIRT_TEST.customQuestions.join(', ')}`);
        console.log(`      Product Type: ${T_SHIRT_TEST.mainObject}`);
        console.log(`      Checkboxes: ${Object.keys(T_SHIRT_TEST.checkboxQuestions).filter(k => T_SHIRT_TEST.checkboxQuestions[k]).join(', ')}`);
        
        const fetch = (await import('node-fetch')).default;
        
        const response = await fetch(CONFIG.apiUrl, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders()
        });
        
        console.log(`   📊 Response Status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API call failed: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        return result;
        
    } catch (error) {
        console.error(`   ❌ API call failed: ${error.message}`);
        throw error;
    }
}

// Display API response in detail
function displayApiResponse(response, imageName) {
    console.log(`\n📊 API Response for ${imageName}:`);
    console.log("=".repeat(60));
    
    if (!response) {
        console.log("   ❌ No response received");
        return;
    }
    
    // Check if it's an error response
    if (response.error) {
        console.log(`   ❌ Error Response: ${response.error}`);
        return;
    }
    
    // Display success response
    if (response.success) {
        console.log("   ✅ Success: true");
    }
    
    // Display results
    if (response.results && response.results.length > 0) {
        console.log(`   📋 Results (${response.results.length}):`);
        
        response.results.forEach((result, index) => {
            console.log(`\n      📄 Result ${index + 1}:`);
            console.log(`         Type: ${result.type || 'unknown'}`);
            
            // Objects detected
            if (result.objects && result.objects.length > 0) {
                console.log(`         🎯 Objects (${result.objects.length}):`);
                result.objects.slice(0, 5).forEach((obj, idx) => {
                    console.log(`            ${idx + 1}. ${obj.classLabel || 'unknown'} (${(obj.confidence * 100).toFixed(1)}%)`);
                });
                if (result.objects.length > 5) {
                    console.log(`            ... and ${result.objects.length - 5} more`);
                }
            }
            
            // Prompt responses - THIS IS THE KEY PART!
            if (result.prompts) {
                console.log(`         💬 Prompt Responses (${Object.keys(result.prompts).length}):`);
                Object.entries(result.prompts).forEach(([key, value]) => {
                    console.log(`            📝 ${key}:`);
                    if (typeof value === 'string') {
                        console.log(`               "${value}"`);
                    } else {
                        console.log(`               ${JSON.stringify(value)}`);
                    }
                });
            }
            
            // Any other data
            Object.keys(result).forEach(key => {
                if (!['type', 'objects', 'prompts'].includes(key)) {
                    console.log(`         📊 ${key}: ${JSON.stringify(result[key])}`);
                }
            });
        });
    }
    
    // Display metadata
    if (response.metadata) {
        console.log(`\n   📊 Metadata:`);
        Object.entries(response.metadata).forEach(([key, value]) => {
            console.log(`      ${key}: ${value}`);
        });
    }
    
    // Show processing time if available
    if (response.processingTime) {
        console.log(`\n   ⏱️ Processing Time: ${response.processingTime}ms`);
    }
    
    // Show raw response (truncated)
    console.log(`\n   🔍 Raw Response Structure:`);
    const responseStr = JSON.stringify(response, null, 2);
    if (responseStr.length > 1500) {
        console.log(`      ${responseStr.substring(0, 1500)}...`);
        console.log(`      [Truncated - Full response is ${responseStr.length} characters]`);
    } else {
        console.log(`      ${responseStr}`);
    }
}

// Check if server is running
async function checkServerStatus() {
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch('http://localhost:3000', { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        return false;
    }
}

// Main test function
async function testApiWithRealImages() {
    console.log("🚀 Testing Your API Endpoint with Real Images\n");
    console.log("=".repeat(70));
    
    // Check if server is running
    console.log("1️⃣ Checking if your server is running...");
    const serverRunning = await checkServerStatus();
    
    if (!serverRunning) {
        console.log("❌ Server is not running at http://localhost:3000");
        console.log("   Please start your development server:");
        console.log("   npm run dev");
        console.log("\n   Then run this test again: node test-api-with-real-images.js");
        return;
    }
    
    console.log("✅ Server is running!\n");
    
    // Get test images
    const testImages = getTestImages();
    if (testImages.length === 0) {
        console.log("❌ No test images found");
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
    console.log(`   Main Object: ${T_SHIRT_TEST.mainObject}`);
    console.log(`   Custom Questions: ${T_SHIRT_TEST.customQuestions.join(', ')}`);
    console.log(`   Active Checkboxes: ${Object.keys(T_SHIRT_TEST.checkboxQuestions).filter(k => T_SHIRT_TEST.checkboxQuestions[k]).join(', ')}`);
    console.log(`   API Endpoint: ${CONFIG.apiUrl}`);
    console.log("");
    
    // Process each image
    for (let i = 0; i < testImages.length; i++) {
        const imagePath = testImages[i];
        const imageName = path.basename(imagePath);
        
        console.log(`${i + 2}️⃣ Testing with: ${imageName}`);
        console.log("=".repeat(50));
        
        try {
            const startTime = Date.now();
            const response = await callApiEndpoint(imagePath);
            const duration = Date.now() - startTime;
            
            console.log(`   ✅ API call completed in ${duration}ms`);
            
            // Display the complete response
            displayApiResponse(response, imageName);
            
        } catch (error) {
            console.log(`   ❌ Test failed: ${error.message}`);
        }
        
        console.log("\n" + "=".repeat(70));
    }
    
    console.log("🏁 API endpoint testing completed!");
    console.log("\n✅ This shows you exactly what your Shopify plugin returns!");
    console.log("   • Your custom questions about collar style, sleeve length, neckline");
    console.log("   • Generated content from checkboxes (title, description, colors, tags, alt text)");
    console.log("   • Object detection results");
    console.log("   • Complete API response structure");
    console.log("\n💡 Next steps:");
    console.log("   • Use this data to build your Shopify product listings");
    console.log("   • Customize the prompts based on what you see");
    console.log("   • Test with different product types and questions");
}

// Run the test
testApiWithRealImages().catch(error => {
    console.error("❌ Test failed:", error.message);
    if (error.stack) {
        console.error("Stack trace:", error.stack);
    }
}); 