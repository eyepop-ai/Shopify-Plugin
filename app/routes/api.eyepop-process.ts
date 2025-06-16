// API endpoint for EyePop processing
// This endpoint accepts uploaded images and question configurations,
// sends them to EyePop for analysis using the new abilities API, and returns structured responses.

import { ActionFunctionArgs, LoaderFunctionArgs, unstable_parseMultipartFormData, json, unstable_createMemoryUploadHandler } from "@remix-run/node";
import { Readable } from "stream";
import { EyePopClient, EyePopConfig } from "../lib/eyepop-client";

// Handle GET requests - return information about the API
export async function loader({ request }: LoaderFunctionArgs) {
  return json({
    message: "EyePop Image Processing API",
    description: "This endpoint processes images using EyePop AI. Use POST method with multipart/form-data.",
    method: "POST",
    requiredFields: ["image"],
    optionalFields: ["questions", "productType", "contentConfig", "secretKey"],
    documentation: "https://www.eyepop.ai/"
  }, { 
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const startTime = Date.now();
  console.log("🚀 [EyePop API] Starting image processing request at", new Date().toISOString());
  
  try {
    console.log("📋 [EyePop API] Step 1: Parsing multipart form data...");
    // Use unstable_createMemoryUploadHandler to handle file uploads in memory
    const uploadHandler = unstable_createMemoryUploadHandler({
      maxPartSize: 5 * 1024 * 1024, // 5MB limit
    });
    const formData = await unstable_parseMultipartFormData(request, uploadHandler);
    console.log("✅ [EyePop API] Form data parsed successfully");

    console.log("📋 [EyePop API] Step 2: Extracting form fields...");
    const imageFile = formData.get("image") as File | null;
    const questionsString = formData.get("questions") as string | null;
    const productType = formData.get("productType") as string | null;
    const contentConfig = formData.get("contentConfig") as string | null;
    const secretKey = formData.get("secretKey") as string | null;

    console.log("📊 [EyePop API] Received request data:", {
      fileName: imageFile?.name,
      fileType: imageFile?.type,
      fileSize: imageFile?.size,
      fileSizeMB: imageFile?.size ? (imageFile.size / (1024 * 1024)).toFixed(2) + " MB" : "unknown",
      productType,
      hasQuestions: !!questionsString,
      questionsLength: questionsString?.length || 0,
      hasContentConfig: !!contentConfig,
      contentConfigLength: contentConfig?.length || 0,
      hasSecretKey: !!secretKey,
      secretKeyLength: secretKey?.length || 0,
      requestHeaders: Object.fromEntries(request.headers.entries())
    });

    console.log("🔍 [EyePop API] Step 3: Validating image file...");
    if (!imageFile || typeof imageFile.arrayBuffer !== 'function') {
      console.error("❌ [EyePop API] Image validation failed:", {
        hasImageFile: !!imageFile,
        imageFileType: typeof imageFile,
        hasArrayBuffer: imageFile ? typeof imageFile.arrayBuffer : "no file"
      });
      return json({ error: "Image file is required and must be a valid file." }, { status: 400 });
    }
    console.log("✅ [EyePop API] Image file validation passed");

    console.log("🔐 [EyePop API] Step 4: Checking authentication...");
    // Use staging credentials by default, or provided credentials
    const finalSecretKey = secretKey || process.env.EYEPOP_SECRET_KEY;
    if (!finalSecretKey) {
      console.error("❌ [EyePop API] Authentication failed - no secret key provided");
      return json({ 
        error: "EyePop authentication required. Please provide your Secret Key.",
        requiresAuth: true,
        dashboardUrl: "https://www.eyepop.ai/"
      }, { status: 401 });
    }
    console.log("✅ [EyePop API] Authentication check passed", {
      secretKeySource: secretKey ? "form data" : "environment variable",
      secretKeyLength: finalSecretKey.length,
      usingStagingCredentials: false,
      note: "No Pop ID required for staging environment"
    });

    console.log("📝 [EyePop API] Step 5: Parsing questions...");
    let questions: string[] = [];
    if (questionsString) {
      try {
        const parsedQuestions = JSON.parse(questionsString);
        questions = Array.isArray(parsedQuestions) ? parsedQuestions : [];
        console.log("✅ [EyePop API] Questions parsed successfully:", {
          questionsCount: questions.length,
          questions: questions
        });
      } catch (e) {
        console.error("❌ [EyePop API] Failed to parse questions JSON:", {
          error: e,
          questionsString: questionsString?.substring(0, 200) + "..."
        });
        return json({ error: "Invalid JSON format for questions." }, { status: 400 });
      }
    } else {
      console.log("ℹ️ [EyePop API] No questions provided");
    }

    console.log("☑️ [EyePop API] Step 6: Parsing content configuration...");
    let checkboxQuestions: string[] = [];
    if (contentConfig) {
      try {
        const parsedContentConfig = JSON.parse(contentConfig);
        console.log("📋 [EyePop API] Content config parsed:", parsedContentConfig);
        
        // Convert enabled content config options to checkbox questions
        const configMapping = {
          productTitle: 'productTitle',
          productDescription: 'productDescription',
          colorVariant: 'colorVariant',
          seoDescription: 'seoDescription',
          productTags: 'productTags',
          altText: 'altText'
        };

        Object.entries(configMapping).forEach(([key, value]) => {
          if (parsedContentConfig[key]) {
            checkboxQuestions.push(value);
            console.log(`✅ [EyePop API] Added checkbox question: ${value}`);
          }
        });

        console.log("✅ [EyePop API] Content config processed successfully:", {
          totalCheckboxQuestions: checkboxQuestions.length,
          checkboxQuestions: checkboxQuestions
        });
      } catch (e) {
        console.warn("⚠️ [EyePop API] Invalid JSON format for contentConfig, proceeding without checkbox questions:", {
          error: e,
          contentConfig: contentConfig?.substring(0, 200) + "..."
        });
      }
    } else {
      console.log("ℹ️ [EyePop API] No content config provided");
    }

    console.log("🔌 [EyePop API] Step 7: Creating EyePop client...");
    const config: EyePopConfig = {
      secretKey: finalSecretKey,
    };

    console.log("🔧 [EyePop API] EyePop client configuration:", {
      hasSecretKey: !!config.secretKey,
      secretKeyLength: config.secretKey?.length,
      note: "No Pop ID required for staging environment"
    });

    const eyePopClient = new EyePopClient(config);
    console.log("✅ [EyePop API] EyePop client created with configuration");

    console.log("🔗 [EyePop API] Step 8: Connecting to EyePop service...");
    const connectStartTime = Date.now();
    try {
      await eyePopClient.connect();
      const connectTime = Date.now() - connectStartTime;
      console.log("✅ [EyePop API] Successfully connected to EyePop", {
        connectionTimeMs: connectTime,
        totalTimeMs: Date.now() - startTime
      });
    } catch (connectError: unknown) {
      const connectTime = Date.now() - connectStartTime;
      console.error("❌ [EyePop API] Failed to connect to EyePop:", {
        error: connectError,
        connectionTimeMs: connectTime,
        errorMessage: connectError instanceof Error ? connectError.message : 'Unknown error',
        errorStack: connectError instanceof Error ? connectError.stack : undefined
      });
      throw new Error(`EyePop connection failed: ${connectError instanceof Error ? connectError.message : 'Unknown error'}`);
    }

    console.log("🖼️ [EyePop API] Step 9: Converting image to buffer...");
    const bufferStartTime = Date.now();
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const bufferTime = Date.now() - bufferStartTime;
    console.log("✅ [EyePop API] Image converted to buffer", {
      bufferSizeBytes: buffer.length,
      bufferSizeMB: (buffer.length / (1024 * 1024)).toFixed(2) + " MB",
      conversionTimeMs: bufferTime
    });

    console.log("🤖 [EyePop API] Step 10: Processing image with EyePop AI...");
    const processingStartTime = Date.now();
    console.log("📤 [EyePop API] Sending to EyePop with parameters:", {
      imageType: imageFile.type,
      questionsCount: questions.length,
      productType: productType || "undefined",
      checkboxQuestionsCount: checkboxQuestions.length,
      totalParameters: {
        questions,
        productType: productType || undefined,
        checkboxQuestions
      }
    });
    
    const result = await eyePopClient.processImageData(
      buffer,
      imageFile.type,
      questions,
      productType || undefined,
      checkboxQuestions
    );

    const processingTime = Date.now() - processingStartTime;
    console.log("✅ [EyePop API] EyePop processing complete", {
      processingTimeMs: processingTime,
      totalTimeMs: Date.now() - startTime
    });

    console.log("📊 [EyePop API] Step 11: Analyzing result structure...");
    console.log("🔍 [EyePop API] Raw result analysis:", {
      hasText: !!result.text,
      textLength: result.text?.length || 0,
      textPreview: result.text?.substring(0, 100) + "..." || "No text",
      hasExtractedData: !!result.extractedData,
      extractedDataKeys: result.extractedData ? Object.keys(result.extractedData) : [],
      extractedDataValues: result.extractedData ? Object.entries(result.extractedData).reduce((acc, [key, value]) => {
        acc[key] = typeof value === 'string' ? value.substring(0, 50) + "..." : value;
        return acc;
      }, {} as Record<string, any>) : {},
      hasRawResults: !!result.rawResults,
      rawResultsType: typeof result.rawResults,
      fullResultKeys: Object.keys(result)
    });

    console.log("🔌 [EyePop API] Step 12: Disconnecting from EyePop...");
    const disconnectStartTime = Date.now();
    await eyePopClient.disconnect();
    const disconnectTime = Date.now() - disconnectStartTime;
    console.log("✅ [EyePop API] Disconnected from EyePop", {
      disconnectionTimeMs: disconnectTime
    });

    console.log("🏗️ [EyePop API] Step 13: Building structured response...");
    const responseStartTime = Date.now();
    
    // ===== COMPREHENSIVE DEBUG LOGGING =====
    console.log("🔍 [EyePop API] ===== DETAILED RESULT ANALYSIS =====");
    console.log("🔍 [EyePop API] Full result object:", JSON.stringify(result, null, 2));
    console.log("🔍 [EyePop API] Result text content:", {
      hasText: !!result.text,
      textLength: result.text?.length || 0,
      fullText: result.text,
      textType: typeof result.text
    });
    console.log("🔍 [EyePop API] Result extractedData:", {
      hasExtractedData: !!result.extractedData,
      extractedDataKeys: result.extractedData ? Object.keys(result.extractedData) : [],
      fullExtractedData: result.extractedData
    });
    console.log("🔍 [EyePop API] Questions asked:", {
      questions: questions,
      questionsCount: questions.length,
      checkboxQuestions: checkboxQuestions,
      checkboxQuestionsCount: checkboxQuestions.length
    });
    console.log("🔍 [EyePop API] ===== END DETAILED ANALYSIS =====");
    
    // Create a structured response based on the visual intelligence output
    const processedResult = {
      id: `result_${Date.now()}`,
      fileName: imageFile.name,
      productType: productType || "general",
      
      // Main text response from the AI - this should contain the actual AI analysis
      aiResponse: result.text || "No AI response received from EyePop",
      
      // Also include the raw AI response for prominent display
      summary: result.text || `AI analysis completed for ${imageFile.name}. ${result.extractedData ? 'Structured data extracted.' : 'No structured data found.'}`,
      
      // Extracted structured data (if any)
      extractedData: result.extractedData || {},
      
      // Convert uploaded image to data URL for Shopify export
      imageSrc: `data:${imageFile.type};base64,${Buffer.from(buffer).toString('base64')}`,
      
      // Individual answers for checkbox questions (if they can be parsed)
      contentResults: {
        productTitle: result.extractedData?.product_title || 
                     result.extractedData?.title || 
                     (checkboxQuestions.includes('productTitle') ? 
                       extractAnswerFromText(result.text, "product title") || result.text || "No AI response available" 
                       : null),
        
        productDescription: result.extractedData?.product_description || 
                           result.extractedData?.description ||
                           (checkboxQuestions.includes('productDescription') ? 
                             extractAnswerFromText(result.text, "product description") || result.text || "No AI response available"
                             : null),
        
        colorVariant: result.extractedData?.color || 
                     result.extractedData?.colors ||
                     result.extractedData?.color_variant ||
                     (checkboxQuestions.includes('colorVariant') ? 
                       extractAnswerFromText(result.text, "color") || extractAnswerFromText(result.text, "variant") || "No color information available"
                       : null),
        
        seoDescription: result.extractedData?.seo_description || 
                       result.extractedData?.meta_description ||
                       (checkboxQuestions.includes('seoDescription') ? 
                         extractAnswerFromText(result.text, "SEO") || extractAnswerFromText(result.text, "meta description") || "No SEO content available"
                         : null),
        
        productTags: result.extractedData?.tags || 
                    result.extractedData?.product_tags ||
                    (checkboxQuestions.includes('productTags') ? 
                      extractAnswerFromText(result.text, "tags")?.split(/[,;]/).map(tag => tag.trim()).filter(tag => tag) || []
                      : null),
        
        altText: result.extractedData?.alt_text || 
                result.extractedData?.accessibility_text ||
                (checkboxQuestions.includes('altText') ? 
                  extractAnswerFromText(result.text, "alt text") || result.text || "No alt text available"
                  : null)
      },
      
      // Custom question responses
      customQuestionResponses: questions.map(question => {
        const extracted = extractAnswerFromText(result.text, question);
        console.log(`🔍 [EyePop API] Extracting answer for question: "${question}"`, {
          hasExtracted: !!extracted,
          extractedLength: extracted?.length || 0,
          extractedPreview: extracted?.substring(0, 50) + "..." || "No extraction",
          fullAiResponseLength: result.text?.length || 0,
          fullAiResponsePreview: result.text?.substring(0, 100) + "..." || "No AI response"
        });
        return {
          question,
          answer: extracted || result.text || "No response generated from AI",
          extracted,
          rawAiResponse: result.text // Include full AI response for debugging
        };
      }),
      
      // Metadata
      metadata: {
        timestamp: Date.now(),
        imageSize: imageFile.size,
        imageType: imageFile.type,
        processingTime: processingTime,
        totalProcessingTime: Date.now() - startTime,
        questionsAsked: questions.length + checkboxQuestions.length
      },
      
      // Raw response for debugging
      debug: process.env.NODE_ENV === 'development' ? {
        rawResponse: result.rawResults,
        fullResult: result
      } : undefined
    };

    const responseTime = Date.now() - responseStartTime;
    const totalTime = Date.now() - startTime;
    
    console.log("✅ [EyePop API] Response built successfully", {
      responseTimeMs: responseTime,
      totalTimeMs: totalTime
    });

    console.log("📊 [EyePop API] Final response summary:", {
      success: true,
      fileName: imageFile.name,
      aiResponseLength: processedResult.aiResponse.length,
      extractedDataKeys: Object.keys(processedResult.extractedData),
      contentResultsKeys: Object.keys(processedResult.contentResults).filter(key => processedResult.contentResults[key as keyof typeof processedResult.contentResults] !== null),
      customQuestionResponsesCount: processedResult.customQuestionResponses.length,
      totalProcessingTimeMs: totalTime,
      processingStages: {
        formParsing: "✅",
        validation: "✅",
        authentication: "✅",
        questionParsing: "✅",
        contentConfigParsing: "✅",
        clientCreation: "✅",
        connection: "✅",
        imageConversion: "✅",
        aiProcessing: "✅",
        resultAnalysis: "✅",
        disconnection: "✅",
        responseBuilding: "✅"
      }
    });

    console.log("🎉 [EyePop API] Request completed successfully at", new Date().toISOString());

    const finalResponse = { 
      success: true, 
      result: processedResult,
      message: `Successfully analyzed ${imageFile.name}`
    };

    console.log("📤 [EyePop API] Sending final response:", {
      success: finalResponse.success,
      message: finalResponse.message,
      resultKeys: Object.keys(finalResponse.result),
      hasImageSrc: !!finalResponse.result.imageSrc,
      imageSrcSize: finalResponse.result.imageSrc ? `${(finalResponse.result.imageSrc.length / 1024).toFixed(1)}KB` : 'N/A',
      imageSrcType: finalResponse.result.imageSrc ? (finalResponse.result.imageSrc.startsWith('data:') ? 'data URL' : 'regular URL') : 'none',
      resultStructure: {
        id: finalResponse.result.id,
        fileName: finalResponse.result.fileName,
        productType: finalResponse.result.productType,
        aiResponseLength: finalResponse.result.aiResponse?.length || 0,
        extractedDataKeys: Object.keys(finalResponse.result.extractedData || {}),
        contentResultsKeys: Object.keys(finalResponse.result.contentResults || {}),
        customQuestionResponsesCount: finalResponse.result.customQuestionResponses?.length || 0,
        hasMetadata: !!finalResponse.result.metadata,
        hasDebug: !!finalResponse.result.debug
      }
    });

    return json(finalResponse);

  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    console.error("💥 [EyePop API] ERROR occurred during processing:", {
      error: error,
      errorMessage: error.message,
      errorStack: error.stack,
      errorType: error.constructor.name,
      totalTimeMs: totalTime,
      timestamp: new Date().toISOString()
    });
    
    // Handle authentication errors specifically
    if (error.message?.toLowerCase().includes('auth') || 
        error.message?.toLowerCase().includes('unauthorized') ||
        error.message?.toLowerCase().includes('api key') ||
        error.message?.toLowerCase().includes('secret')) {
      console.error("🔐 [EyePop API] Authentication error detected:", {
        errorMessage: error.message,
        errorDetails: error.stack
      });
      return json({ 
        error: "Authentication failed. Please check your EyePop credentials.",
        requiresAuth: true,
        dashboardUrl: "https://www.eyepop.ai/",
        details: error.message
      }, { status: 401 });
    }

    // Handle connection errors
    if (error.message?.toLowerCase().includes('connect') ||
        error.message?.toLowerCase().includes('network')) {
      console.error("🌐 [EyePop API] Connection error detected:", {
        errorMessage: error.message,
        errorDetails: error.stack
      });
      return json({ 
        error: "Failed to connect to EyePop service. Please check your network and try again.",
        details: error.message,
        requiresAuth: false
      }, { status: 503 });
    }

    let errorMessage = "Failed to process image.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    console.error("❌ [EyePop API] Returning error response:", {
      errorMessage,
      statusCode: 500,
      includeStack: process.env.NODE_ENV === 'development',
      totalTimeMs: totalTime
    });
    
    return json({ 
      error: errorMessage, 
      details: process.env.NODE_ENV === 'development' ? error.stack : error.message,
      requiresAuth: false
    }, { status: 500 });
  }
}

// Helper function to extract answers from AI text response
function extractAnswerFromText(text: string, question: string): string | null {
  if (!text || !question) return null;
  
  console.log(`🔍 [Extract Helper] Extracting answer for: "${question}" from text length: ${text.length}`);
  
  const questionLower = question.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Try exact pattern matching first (e.g., "Product Title: Something" or "Color: Red")
  const exactPatterns = [
    new RegExp(`${questionLower}:\\s*([^\\n]+)`, 'i'),
    new RegExp(`${questionLower.replace(/\s+/g, '\\s+')}:\\s*([^\\n]+)`, 'i'),
    new RegExp(`\\b${questionLower}\\b[:\\-]\\s*([^\\n]+)`, 'i')
  ];
  
  for (const pattern of exactPatterns) {
    const match = text.match(pattern);
    if (match && match[1]?.trim()) {
      const extracted = match[1].trim();
      console.log(`✅ [Extract Helper] Found exact match: "${extracted}"`);
      return extracted;
    }
  }
  
  // Try finding lines that contain the question keywords
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  const questionWords = questionLower.split(' ').filter(w => w.length > 2);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLower = line.toLowerCase();
    
    // Check if this line contains keywords from the question
    const matchCount = questionWords.filter(word => lineLower.includes(word)).length;
    
    if (matchCount >= Math.max(1, questionWords.length * 0.6)) {
      // This line might contain the answer
      let answer = line;
      
      // If this line contains a colon, take everything after it
      const colonIndex = line.indexOf(':');
      if (colonIndex > -1) {
        answer = line.substring(colonIndex + 1).trim();
      }
      
      // If the answer is very short, try to include the next line too
      if (answer.length < 20 && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (!nextLine.includes(':')) { // Don't include if next line is another question
          answer += ' ' + nextLine;
        }
      }
      
      if (answer && answer.length > 3) {
        console.log(`✅ [Extract Helper] Found contextual match: "${answer}"`);
        return answer.trim();
      }
    }
  }
  
  // Last resort: if question is very specific, try to find it anywhere in text
  if (questionWords.length === 1) {
    const word = questionWords[0];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(word)) {
        const cleaned = sentence.trim();
        if (cleaned.length > 10) {
          console.log(`✅ [Extract Helper] Found sentence match: "${cleaned}"`);
          return cleaned;
        }
      }
    }
  }
  
  console.log(`❌ [Extract Helper] No match found for: "${question}"`);
  return null;
}