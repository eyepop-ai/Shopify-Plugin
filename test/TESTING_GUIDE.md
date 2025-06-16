# EyePop Integration Testing Guide

## 🎯 What We've Implemented

Your Shopify plugin now has a complete EyePop API integration that:

✅ **Combines custom user questions with checkbox selections**
- User-uploaded questions are processed alongside checkbox-generated prompts
- Both types of questions are sent to EyePop in a single request

✅ **Smart Pop configuration based on question types**
- **Person Analysis**: When age, gender, fashion style, or outfit description checkboxes are selected
- **General Product Analysis**: For all other scenarios
- **Composable Pops**: Uses `changePop()` method with proper API structure

✅ **Complete checkbox question mapping**
- `productTitle` → "Generate a compelling product title for this item"
- `productDescription` → "Generate a detailed product description for this item"
- `colorVariant` → "Identify the primary colors and any color variants visible in this product"
- `seoDescription` → "Generate an SEO-optimized meta description for this product"
- `productTags` → "Generate relevant product tags and keywords for this item"
- `altText` → "Generate descriptive alt text for this product image for accessibility"
- `ageRange` → "Determine the age range of the person (report as range, ex. 20s)"
- `gender` → "Identify the gender (Male/Female)"
- `fashionStyle` → "Identify the fashion style (Casual, Formal, Bohemian, Streetwear, Vintage, Chic, Sporty, Edgy)"
- `outfitDescription` → "Describe their outfit in detail"

✅ **Proper API endpoint integration**
- Form data parsing for file uploads, questions, and checkbox configurations
- Error handling for invalid JSON and missing data
- Stream processing for uploaded images

## 🧪 Testing Scripts Available

We've created several test scripts to verify the implementation:

### 1. **Pop Configuration Test** (`test-pop-config.js`)
Tests the prompt generation logic without making API calls.

```bash
node test-pop-config.js
```

**What it tests:**
- Custom questions are properly included
- Checkbox questions are mapped to correct prompts
- Person analysis detection works
- Pop structure is valid

### 2. **API Endpoint Test** (`test-api-endpoint.js`)
Tests the form data parsing and processing logic.

```bash
node test-api-endpoint.js
```

**What it tests:**
- Form data extraction (file, questions, productType, contentConfig)
- JSON parsing for questions and checkbox configurations
- Error handling for invalid data
- Mock processing flow

### 3. **EyePop Connection Test** (`test-eyepop.js`)
Tests actual EyePop API calls with your credentials.

```bash
EYEPOP_SECRET_KEY=your_key node test-eyepop.js
```

**What it tests:**
- Connection to EyePop API
- Image processing with different question combinations
- Real API responses
- Error handling

### 4. **Full Integration Test** (`test-full-integration.js`)
Comprehensive test of the complete integration.

```bash
EYEPOP_SECRET_KEY=your_key node test-full-integration.js
```

**What it tests:**
- Complete end-to-end flow
- Multiple test scenarios
- Performance timing
- Result analysis

## 🚀 How to Test Your Implementation

### Step 1: Test Configuration Logic (No credentials needed)
```bash
# Test Pop configuration generation
node test-pop-config.js

# Test API endpoint logic
node test-api-endpoint.js
```

### Step 2: Test with EyePop Credentials
```bash
# Set your credentials
export EYEPOP_SECRET_KEY=your_secret_key_here
export EYEPOP_POP_ID=your_pop_id_here  # Optional

# Test EyePop connection and processing
node test-eyepop.js

# Run full integration test
node test-full-integration.js
```

### Step 3: Test the Web Application
```bash
# Start the development server
npm run dev

# Open http://localhost:3000
# Upload an image and test different question combinations
```

## 📋 Test Scenarios to Try

### Scenario 1: Basic Product Analysis
- **Custom Questions**: "What is the main color?", "What material is this made of?"
- **Product Type**: "clothing"
- **Checkboxes**: productTitle, productDescription, colorVariant
- **Expected**: 6 prompts total (1 product type + 2 custom + 3 checkbox)

### Scenario 2: Person Analysis
- **Custom Questions**: "What style is this person wearing?"
- **Product Type**: "fashion"
- **Checkboxes**: ageRange, gender, fashionStyle, outfitDescription
- **Expected**: Single combined prompt for person analysis

### Scenario 3: SEO-focused Analysis
- **Custom Questions**: "What brand is visible?"
- **Product Type**: "product"
- **Checkboxes**: productTitle, seoDescription, productTags, altText
- **Expected**: Multiple prompts for SEO content generation

## 🔍 What to Look For

### ✅ Success Indicators
- Connection to EyePop API succeeds
- Custom questions appear in the prompts
- Checkbox selections generate appropriate prompts
- Person analysis is triggered when relevant checkboxes are selected
- API responses contain relevant data
- No TypeScript or build errors

### ❌ Common Issues
- **"isConnected is not a function"**: Fixed - we now use a boolean flag
- **Missing prompts**: Check that checkbox questions are being parsed correctly
- **Connection failures**: Verify your EYEPOP_SECRET_KEY is correct
- **Invalid Pop structure**: Check the Pop configuration in test output

## 🛠️ Implementation Details

### Key Files Modified
- `app/lib/eyepop-client.ts`: Main EyePop client with composable Pops
- `app/routes/api.eyepop-process.ts`: API endpoint for processing requests

### Key Features Implemented
1. **Composable Pop Definitions**: Using `changePop()` method
2. **Dynamic Prompt Generation**: Based on user input and checkboxes
3. **Person Detection Logic**: Automatic switching to person analysis
4. **Error Handling**: Graceful handling of connection and processing errors
5. **Stream Processing**: Support for uploaded image files

## 🎉 Next Steps

Once your tests pass:

1. **Deploy to production** with your EyePop credentials
2. **Test with real product images** from your Shopify store
3. **Monitor API usage** and response times
4. **Customize prompts** based on your specific needs
5. **Add more checkbox options** if needed

## 📞 Support

If you encounter issues:

1. **Check the test output** for specific error messages
2. **Verify your EyePop credentials** are correct
3. **Review the Pop configuration** in test output
4. **Check network connectivity** to EyePop API
5. **Ensure all dependencies** are installed (`npm install`)

Your EyePop integration is now complete and ready for testing! 🚀 