// EyePop Smart Product Generator - Main Page
// Complete product generation workflow: Auth → Upload → Define → Configure → Process → Export

import React, { useState, useCallback } from 'react';
import { json, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Checkbox,
  Badge,
  ProgressBar,
  Thumbnail,
  Banner,
  Divider,
  Box,
  Grid,
  Icon
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { ImageIcon, ExportIcon, CheckIcon } from '@shopify/polaris-icons';

import ImageUploader from '../components/ImageUploader';
import ProcessingStatus from '../components/ProcessingStatus';
import ResponseViewer from '../components/ResponseViewer';
import AuthSetup from '../components/AuthSetup';
import ExportResults from '../components/ExportResults';

// Interfaces
interface ProcessingItem {
    id: string; 
    status: 'pending' | 'uploading' | 'processing' | 'success' | 'error';
    progress?: number; 
    message?: string; 
}

export interface EyePopResponse {
    id: string; 
    summary?: string; 
    objectsDetected?: Array<{ label: string; confidence: number; box?: [number, number, number, number]; }>;
    attributes?: Record<string, string | number | boolean>;
    customQuestionsResults?: Array<{ question: string; answer: string | number | boolean | object; }>;
    rawJson?: any; 
}

interface ContentConfig {
    productTitle: boolean;
    productDescription: boolean;
    colorVariant: boolean;
    seoDescription: boolean;
    productTags: boolean;
    altText: boolean;
}

interface CustomQuestion {
    id: string;
    question: string;
}

interface AuthCredentials {
    secretKey: string;
    popId?: string;
}

export async function loader({ request }: LoaderFunctionArgs) {
  return json({ shopName: "EyePop Listing Creator" });
}

const SmartProductGenerator: React.FC = () => {
    const { shopName } = useLoaderData<typeof loader>();

    // Shopify App Bridge for toast notifications
    const shopify = useAppBridge();
    
    // State management
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [authCredentials, setAuthCredentials] = useState<AuthCredentials | null>(null);
    const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [productType, setProductType] = useState<string>('');
    const [contentConfig, setContentConfig] = useState<ContentConfig>({
        productTitle: true,
        productDescription: true,
        colorVariant: true,
        seoDescription: true,
        productTags: true,
        altText: true,
    });
    const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
    const [newQuestion, setNewQuestion] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [processingItems, setProcessingItems] = useState<ProcessingItem[]>([]);
    const [analysisResults, setAnalysisResults] = useState<EyePopResponse[]>([]);
    const [exportResults, setExportResults] = useState<any>(null);

    // Authentication handlers
    const handleAuthSuccess = useCallback((credentials: AuthCredentials) => {
        setAuthCredentials(credentials);
        setIsAuthenticated(true);
    }, []);

    const handleAuthSkip = useCallback(() => {
        // Allow skipping auth for testing with environment variables
        setIsAuthenticated(true);
        setAuthCredentials(null);
    }, []);

    const handleResetAuth = useCallback(() => {
        setIsAuthenticated(false);
        setAuthCredentials(null);
        setCurrentStep(1);
        setSelectedFiles([]);
        setAnalysisResults([]);
    }, []);

    // Existing handlers
    const handleFilesSelected = useCallback((files: File[]) => {
        setSelectedFiles(files);
        if (files.length > 0 && currentStep === 1) {
            setCurrentStep(2);
        }
    }, [currentStep]);

    const handleProductTypeChange = useCallback((value: string) => {
        setProductType(value);
    }, []);

    const handleContentConfigChange = useCallback((field: keyof ContentConfig) => {
        setContentConfig(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    }, []);

    const handleAddCustomQuestion = useCallback(() => {
        if (newQuestion.trim() && customQuestions.length < 5) {
            setCustomQuestions(prev => [...prev, {
                id: Date.now().toString(),
                question: newQuestion.trim()
            }]);
            setNewQuestion('');
        }
    }, [newQuestion, customQuestions]);

    const handleRemoveCustomQuestion = useCallback((id: string) => {
        setCustomQuestions(prev => prev.filter(q => q.id !== id));
    }, []);

    const handleStartProcessing = async () => {
        if (selectedFiles.length === 0 || !productType.trim()) return;
        
        setIsProcessing(true);
        setCurrentStep(4);
        setAnalysisResults([]);

        // Initialize processing items
        let currentRunItems: ProcessingItem[] = selectedFiles.map(file => ({
            id: file.name,
            status: 'pending',
            progress: 0,
        }));
        setProcessingItems(currentRunItems);

        const allProcessedResults: EyePopResponse[] = [];

        // Build questions array
        const questions = [
            `Focus Object: ${productType.trim()}`,
            ...customQuestions.map(q => q.question)
        ];

        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const currentFileId = file.name;

            // Update status to uploading
            currentRunItems = currentRunItems.map(item => 
                item.id === currentFileId ? { ...item, status: 'uploading', progress: 30 } : item
            );
            setProcessingItems([...currentRunItems]);

            const formData = new FormData();
            formData.append('image', file);
            formData.append('questions', JSON.stringify(questions));
            formData.append('productType', productType);
            formData.append('contentConfig', JSON.stringify(contentConfig));
            
            // Add authentication credentials if available
            if (authCredentials?.secretKey) {
                formData.append('secretKey', authCredentials.secretKey);
            }
            if (authCredentials?.popId) {
                formData.append('popId', authCredentials.popId);
            }

            try {
                // Update status to processing
                currentRunItems = currentRunItems.map(item => 
                    item.id === currentFileId ? { ...item, status: 'processing', progress: 60 } : item
                );
                setProcessingItems([...currentRunItems]);

                const response = await fetch('/api/eyepop-process', {
                    method: 'POST',
                    body: formData,
                });

                let processedItemUpdate: Partial<ProcessingItem> = { progress: 100 };

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response.' }));
                    
                    // Handle authentication errors
                    if (errorData.requiresAuth) {
                        setIsAuthenticated(false);
                        setAuthCredentials(null);
                        setIsProcessing(false);
                        return;
                    }
                    
                    const errorMessage = errorData.error || `HTTP error! Status: ${response.status}`;
                    processedItemUpdate = { ...processedItemUpdate, status: 'error', message: errorMessage };
                    allProcessedResults.push({ id: currentFileId, summary: `Error: ${errorMessage}` });
                } else {
                    const result = await response.json();
                    console.log("🔍 [Frontend] Received API response:", result);
                    
                    if (result.success && result.result) {
                        const apiResult = result.result; 
                        console.log("✅ [Frontend] Processing successful result:", {
                            hasAiResponse: !!apiResult.aiResponse,
                            aiResponseLength: apiResult.aiResponse?.length || 0,
                            hasExtractedData: !!apiResult.extractedData,
                            extractedDataKeys: apiResult.extractedData ? Object.keys(apiResult.extractedData) : [],
                            hasContentResults: !!apiResult.contentResults,
                            contentResultsKeys: apiResult.contentResults ? Object.keys(apiResult.contentResults) : [],
                            hasCustomQuestions: !!apiResult.customQuestionResponses,
                            customQuestionsCount: apiResult.customQuestionResponses?.length || 0,
                            hasImageSrc: !!apiResult.imageSrc,
                            imageSrcSize: apiResult.imageSrc ? `${(apiResult.imageSrc.length / 1024).toFixed(1)}KB` : 'N/A',
                            imageSrcType: apiResult.imageSrc ? (apiResult.imageSrc.startsWith('data:') ? 'data URL' : 'regular URL') : 'none'
                        });
                        
                        const singleImageAnalysis: EyePopResponse = {
                            id: currentFileId,
                            summary: apiResult.aiResponse || 'Analysis completed successfully.',
                            attributes: {
                                fileName: apiResult.fileName,
                                processingTime: apiResult.metadata?.processingTime,
                                totalProcessingTime: apiResult.metadata?.totalProcessingTime,
                                // Only include extractedData to avoid duplicates
                                ...apiResult.extractedData
                            },
                            customQuestionsResults: apiResult.customQuestionResponses?.map((qr: any) => ({
                                question: qr.question,
                                // Prioritize extracted field which should contain the specific answer
                                answer: qr.extracted || qr.answer || 'No response generated'
                            })) || [],
                            rawJson: apiResult
                        };
                        
                        console.log("📋 [Frontend] Created analysis result:", {
                            id: singleImageAnalysis.id,
                            summaryLength: singleImageAnalysis.summary?.length || 0,
                            attributesCount: Object.keys(singleImageAnalysis.attributes || {}).length,
                            customQuestionsCount: singleImageAnalysis.customQuestionsResults?.length || 0
                        });
                        
                        allProcessedResults.push(singleImageAnalysis);
                        processedItemUpdate = { ...processedItemUpdate, status: 'success' };
                    } else {
                        const errorMessage = result.error || 'Processing failed to return valid results.';
                        console.error("❌ [Frontend] API returned unsuccessful result:", {
                            success: result.success,
                            hasResult: !!result.result,
                            error: result.error,
                            fullResponse: result
                        });
                        processedItemUpdate = { ...processedItemUpdate, status: 'error', message: errorMessage };
                        allProcessedResults.push({ id: currentFileId, summary: `Error: ${errorMessage}` });
                    }
                }

                currentRunItems = currentRunItems.map(item => 
                    item.id === currentFileId ? { ...item, ...processedItemUpdate } as ProcessingItem : item
                );
                setProcessingItems([...currentRunItems]);

            } catch (error: any) {
                console.error(`Error processing ${currentFileId}:`, error);
                const catchErrorMessage = error.message || "An unexpected error occurred.";
                currentRunItems = currentRunItems.map(item => 
                    item.id === currentFileId ? { 
                        ...item, 
                        status: 'error', 
                        progress: 100, 
                        message: catchErrorMessage 
                    } as ProcessingItem : item
                );
                setProcessingItems([...currentRunItems]);
                allProcessedResults.push({ id: currentFileId, summary: `Error: ${catchErrorMessage}` });
            }
        }

        setAnalysisResults(allProcessedResults);
        setIsProcessing(false);
        
        // Advance to step 5 (Results & Export) when processing is complete
        if (allProcessedResults.length > 0) {
            setCurrentStep(5);
        }
    };

    const handleExportToShopify = async () => {
        if (!analysisResults || analysisResults.length === 0) {
            console.error('No analysis results to export');
            shopify.toast.show('No analysis results to export', { isError: true });
            return;
        }

        console.log('🛍️ [Frontend] Starting Shopify export...', {
            resultsCount: analysisResults.length,
            results: analysisResults
        });

        setIsProcessing(true);

        try {
            // Call the Shopify export API
            const response = await fetch('/api/shopify-export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    analysisResults: analysisResults,
                    defaultVendor: 'EyePop AI Generated'
                }),
            });

            const result = await response.json();
            console.log('📥 [Frontend] Shopify export response:', result);

            if (response.ok && result.success) {
                console.log('✅ [Frontend] Shopify export successful:', {
                    message: result.message,
                    summary: result.summary,
                    resultsCount: result.results?.length || 0
                });

                // Show success toast with details
                const successMessage = `Successfully exported ${result.summary.successful} products to Shopify!${result.summary.failed > 0 ? ` (${result.summary.failed} failed)` : ''}`;
                shopify.toast.show(successMessage, { duration: 5000 });

                // Store export results for display
                setExportResults(result);

                // Optionally, you could open the first successful product in Shopify admin
                const firstSuccess = result.results?.find((r: any) => r.success);
                if (firstSuccess && firstSuccess.adminUrl) {
                    console.log('🔗 [Frontend] Opening first product in Shopify admin:', firstSuccess.adminUrl);
                    // Note: This might not work due to browser security, but we'll try
                    try {
                        window.open(firstSuccess.adminUrl, '_blank');
                    } catch (openError) {
                        console.warn('Could not open product in admin:', openError);
                    }
                }

            } else {
                console.error('❌ [Frontend] Shopify export failed:', {
                    error: result.error,
                    details: result.details
                });
                
                const errorMessage = result.error || 'Failed to export to Shopify';
                shopify.toast.show(`Export failed: ${errorMessage}`, { isError: true, duration: 5000 });
            }

        } catch (error: any) {
            console.error('💥 [Frontend] Error during Shopify export:', error);
            shopify.toast.show(`Export error: ${error.message || 'Unknown error occurred'}`, { isError: true, duration: 5000 });
        } finally {
            setIsProcessing(false);
        }
    };

    const canProceedToStep3 = selectedFiles.length > 0 && productType.trim().length > 0;
    const canStartProcessing = canProceedToStep3 && currentStep >= 3;

    return (
        <Page fullWidth>
            <TitleBar title="EyePop Listing Creator" />
            
            {/* Authentication Flow */}
            {!isAuthenticated && (
                <Layout>
                    <Layout.Section>
                        <AuthSetup 
                            onAuthSuccess={handleAuthSuccess}
                            onSkip={handleAuthSkip}
                            isLoading={isProcessing}
                        />
                    </Layout.Section>
                </Layout>
            )}

            {/* Main Application Flow */}
            {isAuthenticated && (
                <>
                    {/* Header with EyePop Branding */}
                    <Box paddingBlockEnd="600">
                        <Card>
                            <BlockStack gap="400">
                                <InlineStack align="center">
                                    <InlineStack align="center" gap="400">
                                        <img 
                                            src="/eyepop-logo-horizontal-800.png" 
                                            alt="EyePop.ai" 
                                            style={{ height: '40px', width: 'auto' }}
                                        />
                                        {/* <Box 
                                            background="bg-fill-brand-active"
                                            padding="200"
                                            borderRadius="100"
                                        >
                                            <Text variant="bodyMd" as="p" fontWeight="medium" tone="text-inverse">
                                                Smart Product Generator
                                            </Text>
                                        </Box> */}
                                        {authCredentials && (
                                            <Badge tone="success">Connected</Badge>
                                        )}
                                    </InlineStack>
                                    {/* <Button 
                                        variant="plain" 
                                        onClick={handleResetAuth}
                                        size="slim"
                                    >
                                        Change Credentials
                                    </Button> */}
                                </InlineStack>
                                <Text variant="bodyMd" as="p" tone="subdued" alignment="center">
                                    Upload product images and automatically generate complete Shopify listings with AI-powered descriptions
                                </Text>
                            </BlockStack>
                        </Card>
                    </Box>

                    {/* Progress Steps */}
                    <Box paddingBlockEnd="600">
                        <Card>
                            <Box padding="600">
                                <BlockStack gap="400">
                                    {/* Steps Container */}
                                    <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between',
                                        position: 'relative',
                                        maxWidth: '1000px',
                                        margin: '0 auto'
                                    }}>
                                        {/* Background Progress Line */}
                                        <div style={{
                                            position: 'absolute',
                                            top: '35%',
                                            left: '60px',
                                            right: '60px',
                                            height: '5px',
                                            background: 'linear-gradient(90deg, #e1e3e5 0%, #e1e3e5 100%)',
                                            borderRadius: '2px',
                                            zIndex: 1,
                                            transform: 'translateY(-50%)'
                                        }} />
                                        
                                        {/* Active Progress Line */}
                                        <div style={{
                                            position: 'absolute',
                                            top: '35%',
                                            left: '60px',
                                            width: `${Math.max(0, (currentStep - 1) * 25)}%`,
                                            height: '5px',
                                            background: 'linear-gradient(90deg, #87CEEB 0%, #00CED1 50%, #4682B4 100%)',
                                            borderRadius: '2px',
                                            zIndex: 2,
                                            transition: 'width 0.3s ease-in-out',
                                            transform: 'translateY(-50%)'
                                        }} />

                                        {/* Step 1: Upload Images */}
                                        <div style={{ 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            alignItems: 'center', 
                                            gap: '12px',
                                            zIndex: 3,
                                            minWidth: '140px'
                                        }}>
                                            <div style={{
                                                width: '60px',
                                                height: '60px',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: currentStep >= 1 
                                                    ? 'linear-gradient(135deg, #87CEEB 0%, #00CED1 50%, #4682B4 100%)'
                                                    : '#f6f6f7',
                                                border: currentStep >= 1 ? 'none' : '2px solid #e1e3e5',
                                                boxShadow: currentStep >= 1 
                                                    ? '0 4px 12px rgba(70, 130, 180, 0.3)' 
                                                    : '0 2px 4px rgba(0, 0, 0, 0.1)',
                                                transition: 'all 0.3s ease-in-out'
                                            }}>
                                                <Icon 
                                                    source={ImageIcon} 
                                                    tone={currentStep >= 1 ? "base" : "subdued"} 
                                               
                                                />
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <Text 
                                                    variant="bodyMd" 
                                                    as="span" 
                                                    fontWeight={currentStep === 1 ? "semibold" : "regular"}
                                                    tone={currentStep >= 1 ? "base" : "subdued"}
                                                >
                                                    Upload Images
                                                </Text>
                                            </div>
                                        </div>

                                        {/* Step 2: Define Products */}
                                        <div style={{ 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            alignItems: 'center', 
                                            gap: '12px',
                                            zIndex: 3,
                                            minWidth: '140px'
                                        }}>
                                            <div style={{
                                                width: '60px',
                                                height: '60px',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: currentStep >= 2 
                                                    ? 'linear-gradient(135deg, #87CEEB 0%, #00CED1 50%, #4682B4 100%)'
                                                    : '#f6f6f7',
                                                border: currentStep >= 2 ? 'none' : '2px solid #e1e3e5',
                                                boxShadow: currentStep >= 2 
                                                    ? '0 4px 12px rgba(70, 130, 180, 0.3)' 
                                                    : '0 2px 4px rgba(0, 0, 0, 0.1)',
                                                transition: 'all 0.3s ease-in-out'
                                            }}>
                                                <Text 
                                                    variant="bodyLg" 
                                                    as="span" 
                                                    fontWeight="bold" 
                                                    tone={currentStep >= 2 ? "text-inverse" : "subdued"}
                                                >
                                                    2
                                                </Text>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <Text 
                                                    variant="bodyMd" 
                                                    as="span" 
                                                    fontWeight={currentStep === 2 ? "semibold" : "regular"}
                                                    tone={currentStep >= 2 ? "base" : "subdued"}
                                                >
                                                    Define Products
                                                </Text>
                                            </div>
                                        </div>

                                        {/* Step 3: Configure Content */}
                                        <div style={{ 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            alignItems: 'center', 
                                            gap: '12px',
                                            zIndex: 3,
                                            minWidth: '140px'
                                        }}>
                                            <div style={{
                                                width: '60px',
                                                height: '60px',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: currentStep >= 3 
                                                    ? 'linear-gradient(135deg, #87CEEB 0%, #00CED1 50%, #4682B4 100%)'
                                                    : '#f6f6f7',
                                                border: currentStep >= 3 ? 'none' : '2px solid #e1e3e5',
                                                boxShadow: currentStep >= 3 
                                                    ? '0 4px 12px rgba(70, 130, 180, 0.3)' 
                                                    : '0 2px 4px rgba(0, 0, 0, 0.1)',
                                                transition: 'all 0.3s ease-in-out'
                                            }}>
                                                <Text 
                                                    variant="bodyLg" 
                                                    as="span" 
                                                    fontWeight="bold" 
                                                    tone={currentStep >= 3 ? "text-inverse" : "subdued"}
                                                >
                                                    3
                                                </Text>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <Text 
                                                    variant="bodyMd" 
                                                    as="span" 
                                                    fontWeight={currentStep === 3 ? "semibold" : "regular"}
                                                    tone={currentStep >= 3 ? "base" : "subdued"}
                                                >
                                                    Configure Content
                                                </Text>
                                            </div>
                                        </div>

                                        {/* Step 4: AI Generation */}
                                        <div style={{ 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            alignItems: 'center', 
                                            gap: '12px',
                                            zIndex: 3,
                                            minWidth: '140px'
                                        }}>
                                            <div style={{
                                                width: '60px',
                                                height: '60px',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: currentStep >= 4 
                                                    ? 'linear-gradient(135deg, #87CEEB 0%, #00CED1 50%, #4682B4 100%)'
                                                    : '#f6f6f7',
                                                border: currentStep >= 4 ? 'none' : '2px solid #e1e3e5',
                                                boxShadow: currentStep >= 4 
                                                    ? '0 4px 12px rgba(70, 130, 180, 0.3)' 
                                                    : '0 2px 4px rgba(0, 0, 0, 0.1)',
                                                transition: 'all 0.3s ease-in-out'
                                            }}>
                                                <Text 
                                                    variant="bodyLg" 
                                                    as="span" 
                                                    fontWeight="bold" 
                                                    tone={currentStep >= 4 ? "text-inverse" : "subdued"}
                                                >
                                                    4
                                                </Text>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <Text 
                                                    variant="bodyMd" 
                                                    as="span" 
                                                    fontWeight={currentStep === 4 ? "semibold" : "regular"}
                                                    tone={currentStep >= 4 ? "base" : "subdued"}
                                                >
                                                    AI Generation
                                                </Text>
                                            </div>
                                        </div>

                                        {/* Step 5: Generate & Export */}
                                        <div style={{ 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            alignItems: 'center', 
                                            gap: '12px',
                                            zIndex: 3,
                                            minWidth: '140px'
                                        }}>
                                            <div style={{
                                                width: '60px',
                                                height: '60px',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: currentStep >= 5 
                                                    ? 'linear-gradient(135deg, #87CEEB 0%, #00CED1 50%, #4682B4 100%)'
                                                    : '#f6f6f7',
                                                border: currentStep >= 5 ? 'none' : '2px solid #e1e3e5',
                                                boxShadow: currentStep >= 5 
                                                    ? '0 4px 12px rgba(70, 130, 180, 0.3)' 
                                                    : '0 2px 4px rgba(0, 0, 0, 0.1)',
                                                transition: 'all 0.3s ease-in-out'
                                            }}>
                                                <Icon 
                                                    source={ExportIcon} 
                                                    tone={currentStep >= 5 ? "base" : "subdued"} 
                                                />
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <Text 
                                                    variant="bodyMd" 
                                                    as="span" 
                                                    fontWeight={currentStep === 5 ? "semibold" : "regular"}
                                                    tone={currentStep >= 5 ? "base" : "subdued"}
                                                >
                                                    Generate & Export
                                                </Text>
                                            </div>
                                        </div>
                                    </div>
                                </BlockStack>
                            </Box>
                        </Card>
                    </Box>

                    <Layout>
                        <Layout.Section>
                            {/* Step 1: Image Upload */}
                            {currentStep >= 1 && (
                                <Card>
                                    <BlockStack gap="400">
                                        <InlineStack align="space-between">
                                            <Text variant="headingMd" as="h2">Step 1: Upload Product Images</Text>
                                            {selectedFiles.length > 0 && (
                                                <Badge tone="success">
                                                    {`${selectedFiles.length} image${selectedFiles.length !== 1 ? 's' : ''} selected`}
                                                </Badge>
                                            )}
                                        </InlineStack>
                                        
                                        <ImageUploader 
                                            onFilesSelected={handleFilesSelected}
                                            maxFiles={50}
                                        />
                                        
                                        {selectedFiles.length > 0 && (
                                            <Box paddingBlockStart="400">
                                                <Text variant="bodyMd" as="p" fontWeight="medium">Selected Images:</Text>
                                                <Box paddingBlockStart="200">
                                                    <InlineStack gap="200" wrap>
                                                        {selectedFiles.map((file, index) => (
                                                            <Thumbnail
                                                                key={`${file.name}-${index}`}
                                                                source={URL.createObjectURL(file)}
                                                                alt={file.name}
                                                                size="small"
                                                            />
                                                        ))}
                                                    </InlineStack>
                                                </Box>
                                            </Box>
                                        )}
                                    </BlockStack>
                                </Card>
                            )}

                            {/* Step 2: Product Definition */}
                            {currentStep >= 2 && (
                                <Card>
                                    <BlockStack gap="400">
                                        <Text variant="headingMd" as="h2">Step 2: What are you uploading photos of?</Text>
                                        <Text variant="bodyMd" as="p" tone="subdued">
                                            Describe what type of products these images contain. This helps our AI understand what to look for.
                                        </Text>
                                        
                                        <TextField
                                            label=""
                                            value={productType}
                                            onChange={handleProductTypeChange}
                                            placeholder="e.g., water bottles, t-shirts, skincare products, jackets"
                                            helpText="Be specific - this becomes the foundation for all product analysis"
                                            autoComplete="off"
                                        />
                                        
                                        {productType.trim() && (
                                            <Banner tone="info">
                                                <Text variant="bodyMd" as="p">
                                                    Great! We'll analyze your images looking for <strong>{productType}</strong> and generate product content accordingly.
                                                </Text>
                                            </Banner>
                                        )}
                                        
                                        {canProceedToStep3 && currentStep === 2 && (
                                            <InlineStack align="end">
                                                <Button 
                                                    variant="primary" 
                                                    onClick={() => setCurrentStep(3)}
                                                >
                                                    Continue to Content Settings
                                                </Button>
                                            </InlineStack>
                                        )}
                                    </BlockStack>
                                </Card>
                            )}

                            {/* Step 3: Content Configuration */}
                            {currentStep >= 3 && (
                                <Card>
                                    <BlockStack gap="500">
                                        <Text variant="headingMd" as="h2">Step 3: Content Generation Settings</Text>
                                        
                                        {/* Basic Content Toggles */}
                                        <BlockStack gap="300">
                                            <Text variant="headingSm" as="h3">What content should we generate? (All enabled by default)</Text>
                                            
                                            <Grid columns={{ xs: 1, sm: 2, md: 3 }}>
                                                <Box padding="200">
                                                    <Checkbox
                                                        label="Product Title"
                                                        checked={contentConfig.productTitle}
                                                        onChange={() => handleContentConfigChange('productTitle')}
                                                    />
                                                </Box>
                                                <Box padding="200">
                                                    <Checkbox
                                                        label="Product Description"
                                                        checked={contentConfig.productDescription}
                                                        onChange={() => handleContentConfigChange('productDescription')}
                                                    />
                                                </Box>
                                                <Box padding="200">
                                                    <Checkbox
                                                        label="Color/Variant Detection"
                                                        checked={contentConfig.colorVariant}
                                                        onChange={() => handleContentConfigChange('colorVariant')}
                                                    />
                                                </Box>
                                                <Box padding="200">
                                                    <Checkbox
                                                        label="SEO Meta Description"
                                                        checked={contentConfig.seoDescription}
                                                        onChange={() => handleContentConfigChange('seoDescription')}
                                                    />
                                                </Box>
                                                <Box padding="200">
                                                    <Checkbox
                                                        label="Product Tags"
                                                        checked={contentConfig.productTags}
                                                        onChange={() => handleContentConfigChange('productTags')}
                                                    />
                                                </Box>
                                                <Box padding="200">
                                                    <Checkbox
                                                        label="Alt Text for Images"
                                                        checked={contentConfig.altText}
                                                        onChange={() => handleContentConfigChange('altText')}
                                                    />
                                                </Box>
                                            </Grid>
                                        </BlockStack>

                                        <Divider />

                                        {/* Custom Questions */}
                                        <BlockStack gap="300">
                                            <Text variant="headingSm" as="h3">Custom Questions (Optional)</Text>
                                            <Text variant="bodyMd" as="p" tone="subdued">
                                                Add up to 5 custom questions to get specific information about your products.
                                            </Text>
                                            
                                            <InlineStack gap="200">
                                                <div style={{ flex: 1 }}>
                                                    <TextField
                                                        label=""
                                                        value={newQuestion}
                                                        onChange={setNewQuestion}
                                                        placeholder="e.g., What scent is this? What material is it made of?"
                                                        disabled={customQuestions.length >= 5}
                                                        autoComplete="off"
                                                    />
                                                </div>
                                                <Button 
                                                    onClick={handleAddCustomQuestion}
                                                    disabled={!newQuestion.trim() || customQuestions.length >= 5}
                                                >
                                                    Add Question
                                                </Button>
                                            </InlineStack>
                                            
                                            {customQuestions.length > 0 && (
                                                <BlockStack gap="200">
                                                    {customQuestions.map((question) => (
                                                        <InlineStack key={question.id} align="space-between" blockAlign="center">
                                                            <Text variant="bodyMd" as="span">{question.question}</Text>
                                                            <Button 
                                                                variant="plain" 
                                                                tone="critical"
                                                                onClick={() => handleRemoveCustomQuestion(question.id)}
                                                            >
                                                                Remove
                                                            </Button>
                                                        </InlineStack>
                                                    ))}
                                                </BlockStack>
                                            )}
                                            
                                            <Text variant="bodySm" as="p" tone="subdued">
                                                {customQuestions.length}/5 custom questions added
                                            </Text>
                                        </BlockStack>

                                        {canStartProcessing && (
                                            <InlineStack align="end">
                                                <Button 
                                                    variant="primary" 
                                                    size="large"
                                                    onClick={handleStartProcessing}
                                                    disabled={isProcessing}
                                                    loading={isProcessing}
                                                >
                                                    Start AI Analysis
                                                </Button>
                                            </InlineStack>
                                        )}
                                    </BlockStack>
                                </Card>
                            )}

                            {/* Step 4: AI Generation & Processing */}
                            {currentStep >= 4 && currentStep < 5 && (
                                <Card>
                                    <BlockStack gap="400">
                                        <Text variant="headingMd" as="h2">Step 4: AI Generation in Progress</Text>
                                        <Text variant="bodyMd" as="p" tone="subdued">
                                            Our AI is analyzing your images and generating product content...
                                        </Text>
                                        {processingItems.length > 0 && (
                                            <ProcessingStatus items={processingItems} />
                                        )}
                                    </BlockStack>
                                </Card>
                            )}

                            {/* Step 5: Results & Export */}
                            {currentStep >= 5 && (
                                <>
                                    {/* Results */}
                                    {analysisResults.length > 0 && (
                                        <Card>
                                            <BlockStack gap="400">
                                                <InlineStack align="space-between">
                                                    <Text variant="headingMd" as="h2">Step 5: Generated Product Content</Text>
                                                    <Button 
                                                        variant="primary" 
                                                        icon={ExportIcon}
                                                        onClick={handleExportToShopify}
                                                        disabled={isProcessing || analysisResults.length === 0}
                                                        loading={isProcessing}
                                                    >
                                                        {isProcessing ? 'Exporting...' : 'Export to Shopify'}
                                                    </Button>
                                                </InlineStack>
                                                
                                                <ResponseViewer 
                                                    responses={analysisResults} 
                                                    originalFiles={selectedFiles}
                                                />
                                            </BlockStack>
                                        </Card>
                                    )}

                                    {/* Export Results */}
                                    {exportResults && (
                                        <ExportResults 
                                            results={exportResults.results || []}
                                            summary={exportResults.summary || { total: 0, successful: 0, failed: 0, processingTimeMs: 0 }}
                                            onClose={() => setExportResults(null)}
                                        />
                                    )}
                                </>
                            )}
                        </Layout.Section>
                    </Layout>
                </>
            )}
        </Page>
    );
};

export default SmartProductGenerator; 