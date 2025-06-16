// EyePop SDK client wrapper
// This file contains the logic to connect to the EyePop API,
// process images with custom questions using the new abilities API, and handle responses.
// Error handling and connection management are also implemented here.

import { 
    EyePop, 
    PopComponentType, 
    ForwardOperatorType,
    InferenceType 
} from '@eyepop.ai/eyepop';

export interface EyePopConfig {
    secretKey?: string;
    popId?: string;
}

export interface PopComponent {
    type: PopComponentType | string;
    id?: number;
    ability?: string;
    abilityUuid?: string;
    model?: string;
    categoryName?: string;
    confidenceThresold?: number;
    params?: {
        prompts?: Array<{
            prompt: string;
            label?: string;
        }>;
        confidence_threshold?: number;
        model?: string;
        what?: string;
    };
    forward?: {
        targets?: PopComponent[];
    };
}

export interface PopDefinition {
    components: PopComponent[];
}

export class EyePopClient {
    private endpoint: any;
    private config: EyePopConfig;
    private isConnected: boolean = false;

    constructor(config?: EyePopConfig) {
        this.config = config || {};
        
        // Initialize endpoint with config or environment variables
        if (this.config.secretKey) {
            // Use Secret Key authentication
            this.endpoint = EyePop.workerEndpoint({
                auth: { secretKey: this.config.secretKey }
            });
            console.log(`🔧 [EyePop Client] Initialized with secret key authentication`);
        } else {
            this.endpoint = EyePop.workerEndpoint();
            console.log(`🔧 [EyePop Client] Initialized with environment variables`);
        }
    }

    async connect() {
        if (!this.endpoint) {
            throw new Error("EyePop endpoint not initialized. Please provide API token or Pop ID/Secret Key.");
        }
        try {
            await this.endpoint.connect();
            this.isConnected = true;
            console.log("Successfully connected to EyePop.");
        } catch (error) {
            console.error("Failed to connect to EyePop:", error);
            this.isConnected = false;
            throw error;
        }
    }

    async disconnect() {
        if (this.endpoint && this.isConnected) {
            try {
                await this.endpoint.disconnect();
                this.isConnected = false;
                console.log("Successfully disconnected from EyePop.");
            } catch (error) {
                console.error("Failed to disconnect from EyePop:", error);
                // We might not want to throw here, or handle differently
            }
        }
    }

    // Build comprehensive prompts from user questions and checkbox selections
    private buildComprehensivePrompt(questions: string[], productType?: string, checkboxQuestions: string[] = []): string {
        console.log(`🔧 [EyePop Client] ===== BUILDING COMPREHENSIVE PROMPT =====`);
        console.log(`🔧 [EyePop Client] Input to buildComprehensivePrompt:`, {
            questionsCount: questions.length,
            questions: questions,
            productType: productType || "undefined",
            checkboxQuestionsCount: checkboxQuestions.length,
            checkboxQuestions: checkboxQuestions
        });
        
        const categories: string[] = [];
        
        // Add product type context if provided
        if (productType) {
            categories.push(`product type (this is a ${productType} product)`);
            console.log(`✅ [EyePop Client] Added product type category`);
        }
        
        // Add custom user questions as categories
        if (questions && questions.length > 0) {
            console.log(`🔧 [EyePop Client] Adding ${questions.length} custom questions as categories...`);
            questions.forEach((question, index) => {
                // Convert questions to category format
                categories.push(question);
                console.log(`✅ [EyePop Client] Added custom question ${index + 1} as category: "${question}"`);
            });
        }
        
        // Add checkbox-based questions as categories
        console.log(`🔧 [EyePop Client] Processing ${checkboxQuestions.length} checkbox questions as categories...`);
        if (checkboxQuestions.includes('productTitle')) {
            categories.push("product title (compelling, SEO-friendly product title)");
            console.log(`✅ [EyePop Client] Added productTitle category`);
        }
        if (checkboxQuestions.includes('productDescription')) {
            categories.push("product description (detailed description suitable for e-commerce listing)");
            console.log(`✅ [EyePop Client] Added productDescription category`);
        }
        if (checkboxQuestions.includes('colorVariant')) {
            categories.push("color variants (primary colors and color variants visible)");
            console.log(`✅ [EyePop Client] Added colorVariant category`);
        }
        if (checkboxQuestions.includes('seoDescription')) {
            categories.push("SEO description (SEO-optimized meta description under 160 characters)");
            console.log(`✅ [EyePop Client] Added seoDescription category`);
        }
        if (checkboxQuestions.includes('productTags')) {
            categories.push("product tags (5-10 relevant product tags and keywords, comma-separated)");
            console.log(`✅ [EyePop Client] Added productTags category`);
        }
        if (checkboxQuestions.includes('altText')) {
            categories.push("alt text (descriptive alt text for accessibility)");
            console.log(`✅ [EyePop Client] Added altText category`);
        }
        
        // Build the prompt in the format that works with image-contents ability
        const categoriesString = categories.join(", ");
        const finalPrompt = `
         Analyze the image provided and determine the categories of: ${categoriesString}. 
         Report the values of the categories as classLabels. Be very careful to place these values correctly. 
         If you are unable to provide a category with a value then set its classLabel to null.`;
        
        console.log(`✅ [EyePop Client] ===== PROMPT CONSTRUCTION COMPLETE =====`);
        console.log(`✅ [EyePop Client] Final prompt details:`, {
            totalCategories: categories.length,
            finalPromptLength: finalPrompt.length,
            categories: categories,
            finalPrompt: finalPrompt
        });
        
        return finalPrompt;
    }

    // Create the correct Pop definition for visual intelligence
    private createVisualIntelligencePop(questions: string[], productType?: string, checkboxQuestions: string[] = []): PopDefinition {
        console.log(`🔧 [EyePop Client] ===== CREATING VISUAL INTELLIGENCE POP =====`);
        const comprehensivePrompt = this.buildComprehensivePrompt(questions, productType, checkboxQuestions);
     
        const popDefinition: PopDefinition = {
            components: [{
                type: PopComponentType.INFERENCE,
                ability: 'eyepop.image-contents:latest',
                params: {
                    prompts: [{
                        prompt: comprehensivePrompt
                    }]
                }
            }]
        };
        
        console.log(`🔧 [EyePop Client] Pop definition created with direct prompt.`);
        return popDefinition;
    }

    // Enhanced parsing for visual intelligence responses
   // In your EyePopClient class (eyepop-client.ts)

private parseVisualIntelligenceResponse(processedResults: any[]): Record<string, any> {
    console.log(`🔍 [EyePop Client] Starting parseVisualIntelligenceResponse with:`, {
        resultsCount: processedResults.length,
        resultsPreview: processedResults.map((r, i) => ({
            index: i,
            hasText: !!r.text,
            textLength: r.text?.length || 0,
            textPreview: r.text?.substring(0, 100) + "..." || "NO TEXT",
            hasClasses: !!r.classes,
            classesCount: r.classes?.length || 0,
            allKeys: Object.keys(r)
        }))
    });
    
    const parsedResponse: Record<string, any> = {
        rawResults: processedResults,
        text: '',
        extractedData: {}
    };
    
    // createFieldMapping now takes the category name from AI as input
    const createFieldMapping = (categoryNameFromAI: string): string | null => {
        if (typeof categoryNameFromAI !== 'string' || !categoryNameFromAI.trim()) {
            console.log(`⚠️ [EyePop Client] Invalid categoryNameFromAI for mapping: "${categoryNameFromAI}"`);
            return 'unknown_field'; // Or null, depending on how you want to handle
        }
        // Normalize the categoryName: lowercase, trim, remove extra spaces
        const normalized = categoryNameFromAI.toLowerCase().trim().replace(/\s+/g, ' ');
        
        console.log(`🔍 [EyePop Client] Mapping categoryNameFromAI: "${categoryNameFromAI}" -> normalized: "${normalized}"`);
        
        const mappings: Record<string, string> = {
            'product type': 'product_type',
            'focus object': 'focus_object',
            'product title': 'product_title',
            'title': 'product_title',
            'product name': 'product_title',
            'name': 'product_title',
            'product description': 'product_description',
            'description': 'product_description',
            'product details': 'product_description',
            'details': 'product_description',
            'color': 'color_variant',
            'color variant': 'color_variant',
            'color variants': 'color_variant',
            'variant': 'color_variant',
            'product color': 'color_variant',
            'seo description': 'seo_description',
            'seo': 'seo_description',
            'meta description': 'seo_description',
            'product tags': 'product_tags',
            'tags': 'product_tags',
            'keywords': 'product_tags',
            'product keywords': 'product_tags',
            'alt text': 'alt_text',
            'alt': 'alt_text',
            'image alt text': 'alt_text',
            'image description': 'alt_text',
            'price': 'price',
            'product price': 'price',
            'cost': 'price',
            'amount': 'price',
            'size': 'size',
            'chest size': 'chest_size'
        };
        
        const mappedField = mappings[normalized];
        if (mappedField) {
            console.log(`✅ [EyePop Client] Successfully mapped category "${normalized}" -> fieldKey "${mappedField}"`);
            return mappedField;
        } else {
            console.log(`⚠️ [EyePop Client] No direct mapping found for category "${normalized}", will use sanitized version`);
            const sanitized = normalized.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            return sanitized || 'unknown_field'; // Ensure it doesn't return null or empty string if sanitization fails
        }
    };
    
    if (processedResults.length > 0) {
        const firstResult = processedResults[0];
        
        console.log(`🔍 [EyePop Client] Processing first result:`, {
            hasText: !!firstResult.text,
            textLength: firstResult.text?.length || 0,
            hasObjects: !!firstResult.objects,
            hasClasses: !!firstResult.classes,
            classesCount: firstResult.classes?.length || 0,
            allResultKeys: Object.keys(firstResult)
        });
        
        if (firstResult.classes && firstResult.classes.length > 0) {
            console.log(`🔍 [EyePop Client] Found ${firstResult.classes.length} classes, processing them with aligned logic...`);
            
            let combinedText = '';
            for (const classItem of firstResult.classes) {
                console.log(`🔍 [EyePop Client] Processing class item:`, {
                    category: classItem.category,      // Expected to be the Question/Key Source
                    classLabel: classItem.classLabel,  // Expected to be the Answer/Value Source
                    confidence: classItem.confidence
                });
                
                // Ensure category (for key) and classLabel (for value) exist
                // classLabel can be the string "null" as per your prompt, which is a valid value.
                if (classItem.category) { 
                    const categoryNameFromAI = String(classItem.category); // This is the Question/Key Source from AI
                    const valueFromAI = classItem.classLabel !== undefined && classItem.classLabel !== null ? String(classItem.classLabel) : null; // This is the Answer/Value Source from AI

                    const fieldKey = createFieldMapping(categoryNameFromAI);
                    
                    if (fieldKey) {
                        // Handle null values explicitly if needed by downstream logic,
                        // otherwise, they will be stored as the string "null" or an actual null.
                        const extractedValue = (valueFromAI === "null") ? null : valueFromAI;

                        if (extractedValue !== null && extractedValue !== undefined) {
                            if (fieldKey === 'product_tags') {
                                if (typeof extractedValue === 'string') {
                                    parsedResponse.extractedData.product_tags = extractedValue.split(/[,;]/).map((tag: string) => tag.trim()).filter((tag: string) => tag);
                                } else { // Should not happen if valueFromAI is always string or null
                                    parsedResponse.extractedData.product_tags = Array.isArray(extractedValue) ? extractedValue : [];
                                }
                                console.log(`✅ [EyePop Client] Processed tags for category "${categoryNameFromAI}": ${JSON.stringify(parsedResponse.extractedData.product_tags)}`);
                            } else if (fieldKey === 'price') {
                                const priceString = String(extractedValue).replace(/[^\d.-]/g, '');
                                const priceValue = parseFloat(priceString);
                                if (!isNaN(priceValue)) {
                                    parsedResponse.extractedData.price = priceValue;
                                    console.log(`✅ [EyePop Client] Processed price for category "${categoryNameFromAI}": ${priceValue}`);
                                } else {
                                    parsedResponse.extractedData.price_text = extractedValue;
                                    console.log(`⚠️ [EyePop Client] Could not parse numeric price for category "${categoryNameFromAI}", stored as price_text: "${extractedValue}"`);
                                }
                            } else {
                                parsedResponse.extractedData[fieldKey] = extractedValue;
                                console.log(`✅ [EyePop Client] Mapped category "${categoryNameFromAI}" to fieldKey "${fieldKey}" with value: "${extractedValue}"`);
                            }
                        } else {
                             // If extractedValue is null or undefined (e.g. AI returned "null" for classLabel)
                            parsedResponse.extractedData[fieldKey] = null; // Store actual null
                            console.log(`ℹ️ [EyePop Client] Stored null for category "${categoryNameFromAI}" (fieldKey: "${fieldKey}") as value was "${valueFromAI}"`);
                        }
                        
                        // Build combined text in "Question: Answer" format
                        combinedText += `${categoryNameFromAI}: ${extractedValue === null ? 'null' : extractedValue}\n`;
                    } else {
                        console.log(`❌ [EyePop Client] Failed to create field key for AI category: "${categoryNameFromAI}"`);
                    }
                } else {
                    console.log(`⚠️ [EyePop Client] Skipping class item - AI category name is missing:`, {
                        hasClassLabel: !!classItem.classLabel,
                        classLabelValue: classItem.classLabel
                    });
                }
            }
            
            if (combinedText.trim()) {
                parsedResponse.text = combinedText.trim();
                console.log(`✅ [EyePop Client] Built combined text from classes:`, {
                    combinedTextLength: combinedText.length,
                    combinedTextPreview: combinedText.substring(0, 200) + "..."
                });
            }
        }
        
        // Fallback logic for when firstResult.classes is empty or fails, but firstResult.text exists
        // This part assumes firstResult.text would be a newline-separated "Key: Value" string.
        // This logic might be less relevant if classes are consistently populated.
        if (Object.keys(parsedResponse.extractedData).length === 0 && firstResult.text) {
            console.log(`🔍 [EyePop Client] No data from classes. Attempting to parse direct text response as fallback.`);
            parsedResponse.text = firstResult.text; // Keep the original text if classes didn't yield anything
            
            const lines = firstResult.text.split('\n').filter((line: string) => line.trim());
            for (const line of lines) {
                const match = line.match(/^([^:]+):\s*(.+)$/); // Matches "Key: Value"
                if (match) {
                    const keyFromText = match[1].trim();
                    const valueFromText = match[2].trim();
                    const fieldKey = createFieldMapping(keyFromText); // Try to map the key part
                    
                    if (fieldKey && !parsedResponse.extractedData[fieldKey]) { // Avoid overwriting if somehow populated
                        parsedResponse.extractedData[fieldKey] = valueFromText;
                        console.log(`✅ [EyePop Client] Fallback text mapping for key "${keyFromText}" -> fieldKey "${fieldKey}": "${valueFromText}"`);
                    }
                }
            }
        }
        
        if (Object.keys(parsedResponse.extractedData).length === 0 && !parsedResponse.text) {
            console.log(`❌ [EyePop Client] No data extracted! Full first result for debugging:`, JSON.stringify(firstResult, null, 2));
        }
    } else {
        console.log(`❌ [EyePop Client] No processed results to parse!`);
    }
    
    console.log(`🔍 [EyePop Client] Final parsed response:`, {
        finalExtractedData: parsedResponse.extractedData,
        finalTextLength: parsedResponse.text?.length || 0,
        extractedDataKeys: Object.keys(parsedResponse.extractedData)
    });
    
    return parsedResponse;
}

    // Process a single image from a file path with custom Pop definition
    async processImageByPath(filePath: string, questions?: string[], productType?: string, checkboxQuestions: string[] = []) {
        if (!this.isConnected) {
            await this.connect();
        }
        try {
            console.log(`🔧 [EyePop Client] Processing image from path: ${filePath} with visual intelligence...`);
            
            const pop = this.createVisualIntelligencePop(questions || [], productType, checkboxQuestions);
            console.log(`🔧 [EyePop Client] Created visual intelligence Pop for file processing`);
            
            // Use changePop to set the composable pop configuration
            await this.endpoint.changePop(pop);
            
            // Process the image
            const results = await this.endpoint.process({ file: filePath });
            const processedResults = [];
            for await (const result of results) {
                processedResults.push(result);
            }
            
            return this.parseVisualIntelligenceResponse(processedResults);
        } catch (error) {
            console.error(`❌ [EyePop Client] Error processing image from path ${filePath}:`, error);
            throw error;
        }
    }

    // Process image data directly (for uploaded files)
    async processImageData(imageData: Buffer, mimeType: string, questions?: string[], productType?: string, checkboxQuestions: string[] = []) {
        if (!this.isConnected) {
            await this.connect();
        }
        try {
            console.log(`🔧 [EyePop Client] ===== STARTING processImageData =====`);
            console.log(`🔧 [EyePop Client] Processing image data (${mimeType}) with visual intelligence...`);
            console.log(`🔧 [EyePop Client] Input parameters:`, {
                imageDataLength: imageData.length,
                mimeType,
                questionsCount: questions?.length || 0,
                questions: questions || [],
                productType: productType || "undefined",
                checkboxQuestionsCount: checkboxQuestions.length,
                checkboxQuestions
            });
            
            // Create the visual intelligence Pop with comprehensive prompt
            const pop = this.createVisualIntelligencePop(questions || [], productType, checkboxQuestions);
            console.log(`🔧 [EyePop Client] Created visual intelligence Pop:`, {
                componentType: pop.components[0].type,
                ability: pop.components[0].ability,
                hasPrompts: !!pop.components[0].params?.prompts,
                promptsCount: pop.components[0].params?.prompts?.length || 0,
                promptPreview: pop.components[0].params?.prompts?.[0]?.prompt?.substring(0, 100) + "..."
            });
            
            // Use changePop to set the composable pop configuration
            console.log(`🔧 [EyePop Client] Setting Pop configuration...`);
            await this.endpoint.changePop(pop);
            console.log(`✅ [EyePop Client] Pop configuration set successfully`);
            
            // Convert Buffer to Blob for EyePop SDK compatibility
            console.log(`🔧 [EyePop Client] Converting Buffer to Blob...`, {
                originalBufferLength: imageData.length,
                bufferType: typeof imageData,
                mimeType: mimeType
            });
            
            // Create a Blob from the Buffer data
            const blob = new Blob([imageData], { type: mimeType });
            console.log(`✅ [EyePop Client] Buffer converted to Blob`, {
                blobSize: blob.size,
                blobType: blob.type,
                isBlobInstance: blob instanceof Blob
            });
            
            // Create a readable stream from the Blob for EyePop processing
            console.log(`🔧 [EyePop Client] Creating stream from Blob...`);
            const stream = blob.stream();
            console.log(`✅ [EyePop Client] Stream created from Blob`);
            
            // Process the image using the stream format with our custom Pop
            console.log(`🚀 [EyePop Client] Sending image stream to EyePop with visual intelligence Pop...`);
            const results = await this.endpoint.process({ 
                stream: stream, 
                mimeType: mimeType 
            });
            
            console.log(`📥 [EyePop Client] Received results from EyePop visual intelligence, processing...`);
            const processedResults = [];
            for await (const result of results) {
                console.log(`📋 [EyePop Client] ===== PROCESSING INDIVIDUAL RESULT =====`);
                console.log(`📋 [EyePop Client] Processing visual intelligence result:`, {
                    resultType: typeof result,
                    resultKeys: Object.keys(result),
                    hasText: !!result.text,
                    textLength: result.text?.length || 0,
                    hasObjects: !!result.objects,
                    objectsCount: result.objects?.length || 0,
                    hasClasses: !!result.classes,
                    classesCount: result.classes?.length || 0,
                    textPreview: result.text?.substring(0, 200) + "..."
                });
                
                // 🚨 ADD RAW RESULT LOGGING
                console.log(`🔍 [EyePop Client] ===== RAW RESULT FROM EYEPOP =====`);
                console.log(`🔍 [EyePop Client] FULL RAW RESULT:`, JSON.stringify(result, null, 2));
                console.log(`🔍 [EyePop Client] Result text content:`, result.text);
                console.log(`🔍 [EyePop Client] Result objects:`, result.objects);
                console.log(`🔍 [EyePop Client] Result classes:`, result.classes);
                console.log(`🔍 [EyePop Client] All result keys:`, Object.keys(result));
                console.log(`🔍 [EyePop Client] All result values:`, Object.values(result));
                console.log(`🔍 [EyePop Client] ===== END RAW RESULT =====`);
                
                processedResults.push(result);
            }
            
            console.log(`✅ [EyePop Client] All visual intelligence results processed`, {
                totalResults: processedResults.length,
                resultsPreview: processedResults.map((r, i) => ({
                    index: i,
                    hasText: !!r.text,
                    textLength: r.text?.length || 0,
                    hasObjects: !!r.objects,
                    objectsCount: r.objects?.length || 0
                }))
            });
            
            // Parse the EyePop visual intelligence results
            console.log(`🔧 [EyePop Client] ===== STARTING RESPONSE PARSING =====`);
            const parsedResponse = this.parseVisualIntelligenceResponse(processedResults);
            console.log(`✅ [EyePop Client] ===== RESPONSE PARSING COMPLETE =====`);
            console.log(`✅ [EyePop Client] Final parsed response:`, {
                hasText: !!parsedResponse.text,
                textLength: parsedResponse.text?.length || 0,
                extractedDataKeys: Object.keys(parsedResponse.extractedData || {}),
                extractedDataValues: parsedResponse.extractedData
            });
            
            return parsedResponse;
        } catch (error) {
            console.error(`❌ [EyePop Client] ===== ERROR IN processImageData =====`);
            console.error(`❌ [EyePop Client] Error processing image data with visual intelligence:`, {
                error: error,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                errorStack: error instanceof Error ? error.stack : undefined,
                mimeType: mimeType,
                dataLength: imageData.length
            });
            throw error;
        }
    }

    // Process a single image from a URL with custom Pop definition
    async processImageByUrl(imageUrl: string, questions?: string[], productType?: string, checkboxQuestions: string[] = []) {
        if (!this.isConnected) {
            await this.connect();
        }
        try {
            console.log(`🔧 [EyePop Client] Processing image from URL: ${imageUrl} with visual intelligence...`);
            
            const pop = this.createVisualIntelligencePop(questions || [], productType, checkboxQuestions);
            console.log(`🔧 [EyePop Client] Created visual intelligence Pop for URL processing`);
            
            // Use changePop to set the composable pop configuration
            await this.endpoint.changePop(pop);
            
            const results = await this.endpoint.process({ url: imageUrl });
            const processedResults = [];
            for await (const result of results) {
                processedResults.push(result);
            }
            
            return this.parseVisualIntelligenceResponse(processedResults);
        } catch (error) {
            console.error(`❌ [EyePop Client] Error processing image from URL ${imageUrl}:`, error);
            throw error;
        }
    }

    // Process an image from a stream (e.g., from an upload) with custom Pop definition
    async processImageStream(stream: NodeJS.ReadableStream, mimeType: string, questions?: string[], productType?: string, checkboxQuestions: string[] = []) {
        if (!this.isConnected) {
            await this.connect();
        }
        try {
            console.log(`🔧 [EyePop Client] Processing image stream (${mimeType}) with visual intelligence...`);
            
            const pop = this.createVisualIntelligencePop(questions || [], productType, checkboxQuestions);
            console.log(`🔧 [EyePop Client] Created visual intelligence Pop for stream processing`);
            
            // Use changePop to set the composable pop configuration
            await this.endpoint.changePop(pop);
            
            const results = await this.endpoint.process({ stream: stream, mimeType: mimeType });
            const processedResults = [];
            for await (const result of results) {
                processedResults.push(result);
            }
            
            return this.parseVisualIntelligenceResponse(processedResults);
        } catch (error) {
            console.error(`❌ [EyePop Client] Error processing image stream:`, error);
            throw error;
        }
    }

    // Test connection with provided credentials
    static async testConnection(config: EyePopConfig): Promise<boolean> {
        try {
            const testClient = new EyePopClient(config);
            await testClient.connect();
            await testClient.disconnect();
            return true;
        } catch (error) {
            console.error("Connection test failed:", error);
            return false;
        }
    }

    // Helper method to process multiple images in batch
    async processBatch(
        images: Array<{ path?: string; url?: string; data?: Buffer; mimeType?: string }>,
        questions?: string[],
        productType?: string,
        checkboxQuestions: string[] = [],
    ) {
        const results = [];
        
        for (const image of images) {
            try {
                let result;
                
                if (image.path) {
                    result = await this.processImageByPath(image.path, questions, productType, checkboxQuestions);
                } else if (image.url) {
                    result = await this.processImageByUrl(image.url, questions, productType, checkboxQuestions);
                } else if (image.data && image.mimeType) {
                    result = await this.processImageData(image.data, image.mimeType, questions, productType, checkboxQuestions);
                } else {
                    throw new Error("Invalid image format. Must provide path, url, or data+mimeType");
                }
                
                results.push({
                    success: true,
                    image: image.path || image.url || 'uploaded-image',
                    result: result
                });
            } catch (error) {
                results.push({
                    success: false,
                    image: image.path || image.url || 'uploaded-image',
                    error: (error as Error).message
                });
            }
        }
        
        return results;
    }
}