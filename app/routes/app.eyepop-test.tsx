// Main page for EyePop testing
// This page will bring together all components for a cohesive workflow:
// ImageUploader, QuestionBuilder, ProcessingStatus, and ResponseViewer.

import React, { useState, useCallback, CSSProperties } from 'react';
import { json, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigation } from "@remix-run/react";

import ImageUploader from '../components/ImageUploader';
import QuestionBuilder from '../components/QuestionBuilder';
import ProcessingStatus from '../components/ProcessingStatus';
import ResponseViewer from '../components/ResponseViewer';

// Interfaces (mirroring those in child components for clarity, or could be imported)
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

// Dummy data for initial display as requested
const initialDummyResults: EyePopResponse[] = [
    {
        id: 'initial_dummy_1.jpg',
        summary: 'This is a placeholder. Upload images and click "Start Analysis" to see real results.',
        objectsDetected: [{ label: 'Placeholder Object', confidence: 0.99, box: [10, 10, 50, 50] }],
        attributes: { 'Initial State': 'Ready for processing' },
    }
];

export async function loader({ request }: LoaderFunctionArgs) {
  // You can load any necessary data from Shopify or other sources here if needed
  // For now, just returning a simple object
  return json({ shopName: "EyePop.ai Shopify Plugin" });
}

const EyePopTestPage: React.FC = () => {
    const { shopName } = useLoaderData<typeof loader>();
    const navigation = useNavigation();

    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [analysisQuestions, setAnalysisQuestions] = useState<string[]>([]);
    const [processingItems, setProcessingItems] = useState<ProcessingItem[]>([]);
    const [analysisResults, setAnalysisResults] = useState<EyePopResponse[]>(initialDummyResults);
    const [pageError, setPageError] = useState<string | null>(null);

    const isLoading = navigation.state === 'submitting' || navigation.state === 'loading';

    const handleFilesSelected = useCallback((files: File[]) => {
        setSelectedFiles(files);
        setPageError(null); // Clear previous errors
        // Initialize processing items for newly selected files
        const newProcessingItems: ProcessingItem[] = files.map(file => ({
            id: file.name,
            status: 'pending',
            progress: 0
        }));
        setProcessingItems(newProcessingItems);
        // Clear old results when new files are selected, but keep dummy if nothing else
        if (files.length > 0) {
            setAnalysisResults([]); 
        } else {
            setAnalysisResults(initialDummyResults);
        }
    }, []);

    const handleQuestionsChange = useCallback((questions: string[]) => {
        setAnalysisQuestions(questions);
    }, []);

    const handleSubmitForProcessing = async () => {
        if (selectedFiles.length === 0) {
            setPageError("Please select at least one image to process.");
            return;
        }
        setPageError(null);
        setAnalysisResults([]); // Clear previous or dummy results

        // Initialize processing items state for this submission run
        let currentRunItems: ProcessingItem[] = selectedFiles.map(file => ({
            id: file.name,
            status: 'pending',
            progress: 0,
        }));
        setProcessingItems(currentRunItems); // Initial display of pending items

        const allProcessedResults: EyePopResponse[] = [];

        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const currentFileId = file.name;

            // Update status to uploading for the current file
            currentRunItems = currentRunItems.map(item => 
                item.id === currentFileId ? { ...item, status: 'uploading', progress: 30 } : item
            );
            setProcessingItems([...currentRunItems]); // Create new array for React state update

            const formData = new FormData();
            formData.append('image', file);
            formData.append('questions', JSON.stringify(analysisQuestions));

            try {
                // Update status to processing for the current file
                currentRunItems = currentRunItems.map(item => 
                    item.id === currentFileId ? { ...item, status: 'processing', progress: 60 } : item
                );
                setProcessingItems([...currentRunItems]);

                const response = await fetch('/api/eyepop-process', {
                    method: 'POST',
                    body: formData,
                });

                let processedItemUpdate: Partial<ProcessingItem> = { progress: 100 };
                let apiResponseError = false;

                if (!response.ok) {
                    apiResponseError = true;
                    const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response.', details: response.statusText }));
                    const errorMessage = errorData.error || `HTTP error! Status: ${response.status}`;
                    processedItemUpdate = { ...processedItemUpdate, status: 'error', message: errorMessage };
                    allProcessedResults.push({ id: currentFileId, summary: `Error: ${errorMessage}` });
                } else {
                    const result = await response.json();
                    if (result.success && result.results && result.results.length > 0) {
                        const apiResult = result.results[0]; 
                        const singleImageAnalysis: EyePopResponse = {
                            id: currentFileId,
                            summary: apiResult?.summary || 'No summary provided.',
                            objectsDetected: apiResult?.objectsDetected || [],
                            attributes: apiResult?.attributes || {},
                            customQuestionsResults: apiResult?.customQuestionsResults || [],
                            rawJson: apiResult
                        };
                        allProcessedResults.push(singleImageAnalysis);
                        processedItemUpdate = { ...processedItemUpdate, status: 'success' };
                    } else {
                        apiResponseError = true;
                        const errorMessage = result.error || 'Processing failed to return success or valid results.';
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
        setAnalysisResults(allProcessedResults.length > 0 ? allProcessedResults : initialDummyResults);
    };
    
    // Basic layout styles
    const pageStyle: CSSProperties = {
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        maxWidth: '1000px',
        margin: '0 auto',
        background: '#f0f4f8', // Lightest blue-gray for page background
        minHeight: '100vh',
    };

    const headerStyle: CSSProperties = {
        textAlign: 'center',
        marginBottom: '30px',
        color: '#1e3a8a', // Dark blue
        fontSize: '2rem',
    };

    const controlsContainerStyle: CSSProperties = {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
        marginBottom: '30px',
    };

    const submitButtonStyle: CSSProperties = {
        display: 'block',
        width: '100%',
        padding: '15px 20px',
        fontSize: '1.2rem',
        fontWeight: 'bold',
        color: 'white',
        background: 'linear-gradient(135deg, #2563eb, #10b981)', // Blue to Cyan gradient
        border: 'none',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'opacity 0.2s, transform 0.1s',
        boxShadow: '0 6px 12px rgba(0,0,0,0.15)',
        marginTop: '20px',
        marginBottom: '30px',
    };
    
    const errorTextStyle: CSSProperties = {
        color: '#d9534f',
        textAlign: 'center',
        padding: '10px',
        background: '#f8d7da',
        border: '1px solid #f5c6cb',
        borderRadius: '8px',
        marginBottom: '20px',
    };

    return (
        <div style={pageStyle}>
            <h1 style={headerStyle}>{shopName} - EyePop Report Pop</h1>

            <div style={controlsContainerStyle}>
                <ImageUploader onFilesSelected={handleFilesSelected} maxFiles={10} maxFileSizeMB={5} />
                <QuestionBuilder onQuestionsChange={handleQuestionsChange} />
            </div>

            <button 
                onClick={handleSubmitForProcessing} 
                style={{...submitButtonStyle, opacity: isLoading ? 0.7 : 1}} 
                disabled={isLoading || selectedFiles.length === 0}
            >
                {isLoading ? 'Processing...' : 'Start Analysis'}
            </button>

            {pageError && <p style={errorTextStyle}>{pageError}</p>}

            {processingItems.length > 0 && <ProcessingStatus items={processingItems} />}
            
            <ResponseViewer responses={analysisResults} />

        </div>
    );
};

export default EyePopTestPage; 