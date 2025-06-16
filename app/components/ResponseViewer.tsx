// ResponseViewer component
// This component will display EyePop analysis results in a clean, readable format.

import React, { CSSProperties } from 'react';

// This would be replaced with the actual structure of an EyePop API response.
interface EyePopResponse {
    id: string; // Identifier for the response, e.g., image name
    summary?: string; // A general summary if provided
    objectsDetected?: Array<{
        label: string;
        confidence: number;
        box?: [number, number, number, number]; // [xmin, ymin, xmax, ymax]
    }>;
    attributes?: Record<string, string | number | boolean>;
    customQuestionsResults?: Array<{
        question: string;
        answer: string | number | boolean | object;
    }>;
    rawJson?: any; // To display the full JSON if needed
}

interface ResponseViewerProps {
    responses: EyePopResponse[];
    originalFiles?: File[]; // Add original files to create thumbnails
}

const ResponseViewer: React.FC<ResponseViewerProps> = ({ responses, originalFiles = [] }) => {

    // Helper function to get the original file for a response
    const getOriginalFile = (responseId: string): File | null => {
        return originalFiles.find(file => file.name === responseId) || null;
    };

    // Helper function to format field names into readable labels
    const formatFieldName = (fieldName: string): string => {
        const fieldMappings: Record<string, string> = {
            'product_type': 'Product Type',
            'focus_object': 'Focus Object',
            'color_variant': 'Color Variants',
            'product_title': 'Product Title',
            'product_description': 'Product Description',
            'product_tags': 'Product Tags',
            'alt_text': 'Alt Text',
            'seo_description': 'SEO Description',
            'fileName': 'File Name',
            'processingTime': 'Processing Time (ms)',
            'totalProcessingTime': 'Total Processing Time (ms)'
        };
        
        return fieldMappings[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    // Styles (defined upfront to avoid linter errors)
    const baseTextStyle: CSSProperties = {
        fontFamily: 'Arial, sans-serif',
        color: '#374151', // Gray-700
    };

    const containerStyle: CSSProperties = {
        ...baseTextStyle,
        marginTop: '25px',
        padding: '20px',
        background: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
    };

    const titleStyle: CSSProperties = {
        marginTop: 0,
        marginBottom: '20px',
        color: '#1f2937', // Gray-800
        fontSize: '1.4rem',
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: '10px',
    };

    const placeholderTextStyle: CSSProperties = {
        color: '#6b7280', // Gray-500
        fontSize: '1rem',
        textAlign: 'center',
        padding: '20px 0',
    };

    const responseBlockStyle: CSSProperties = {
        marginBottom: '30px',
        paddingBottom: '20px',
        borderBottom: '1px dashed #d1d5db', // Gray-300
    };
    
    const lastResponseBlockStyle: CSSProperties = {
        ...responseBlockStyle,
        borderBottom: 'none',
        marginBottom: 0,
        paddingBottom: 0,
    };

    const subHeaderStyle: CSSProperties = {
        fontSize: '1.1rem',
        color: '#111827', // Gray-900
        fontWeight: '600',
        marginTop: '15px',
        marginBottom: '10px',
    };

    const contentStyle: CSSProperties = {
        fontSize: '0.95rem',
        lineHeight: '1.6',
        whiteSpace: 'pre-wrap', // Preserve whitespace for JSON
        backgroundColor: '#f9fafb', // Gray-50
        padding: '10px 15px',
        borderRadius: '8px',
        border: '1px solid #e5e7eb', // Gray-200
        overflowX: 'auto',
    };

    const listItemStyle: CSSProperties = {
        marginBottom: '8px',
        padding: '5px',
        borderLeft: '3px solid #3b82f6', // Blue-500 accent
        paddingLeft: '10px',
        backgroundColor: '#eff6ff', // Blue-50
    };

    const imageHeaderStyle: CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        marginBottom: '15px',
    };

    const thumbnailStyle: CSSProperties = {
        width: '80px',
        height: '80px',
        objectFit: 'cover',
        borderRadius: '8px',
        border: '2px solid #e5e7eb',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    };

    const imageInfoStyle: CSSProperties = {
        flex: 1,
    };

    const imageNameStyle: CSSProperties = {
        fontSize: '1.2rem',
        fontWeight: '600',
        color: '#3b82f6',
        margin: 0,
    };

    const imageSizeStyle: CSSProperties = {
        fontSize: '0.9rem',
        color: '#6b7280',
        margin: '4px 0 0 0',
    };

    if (!responses || responses.length === 0) {
        return (
            <div style={containerStyle}>
                <h3 style={titleStyle}>Analysis Results</h3>
                <p style={placeholderTextStyle}>No results to display yet. Process some images to see the analysis here.</p>
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            <h3 style={titleStyle}>Analysis Results</h3>
            {responses.map((response, index) => {
                const originalFile = getOriginalFile(response.id);
                
                return (
                    <div key={response.id + index} style={index === responses.length - 1 ? lastResponseBlockStyle : responseBlockStyle}>
                        {/* Image Header with Thumbnail */}
                        <div style={imageHeaderStyle}>
                            {originalFile ? (
                                <img 
                                    src={URL.createObjectURL(originalFile)} 
                                    alt={response.id}
                                    style={thumbnailStyle}
                                />
                            ) : (
                                <div style={{
                                    ...thumbnailStyle,
                                    backgroundColor: '#f3f4f6',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.8rem',
                                    color: '#6b7280'
                                }}>
                                    No Image
                                </div>
                            )}
                            <div style={imageInfoStyle}>
                                <h4 style={imageNameStyle}>
                                    {response.id}
                                </h4>
                                {originalFile && (
                                    <p style={imageSizeStyle}>
                                        {(originalFile.size / 1024 / 1024).toFixed(2)} MB • {originalFile.type}
                                    </p>
                                )}
                            </div>
                        </div>
                        
                        {response.summary && (
                            <>
                                <h5 style={subHeaderStyle}>Summary</h5>
                                <p style={{...contentStyle, backgroundColor: '#e0f2fe'}}>{response.summary}</p>
                            </>
                        )}

                        {response.objectsDetected && response.objectsDetected.length > 0 && (
                            <>
                                <h5 style={subHeaderStyle}>Objects Detected</h5>
                                <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
                                    {response.objectsDetected.map((obj, i) => (
                                        <li key={i} style={listItemStyle}>
                                            <strong>{obj.label}</strong> (Confidence: {(obj.confidence * 100).toFixed(1)}%)
                                            {obj.box && <span style={{fontSize: '0.8em', marginLeft: '5px'}}>- Box: [{obj.box.join(', ')}]</span>}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}

                        {response.attributes && Object.keys(response.attributes).length > 0 && (
                            <>
                                <h5 style={subHeaderStyle}>Attributes</h5>
                                <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
                                    {Object.entries(response.attributes).map(([key, value]) => (
                                        <li key={key} style={listItemStyle}>
                                            <strong>{formatFieldName(key)}:</strong> {String(value)}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}

                        {response.customQuestionsResults && response.customQuestionsResults.length > 0 && (
                            <>
                                <h5 style={subHeaderStyle}>Custom Questions</h5>
                                <ul style={{ listStyleType: 'none', paddingLeft: 0 }}>
                                    {response.customQuestionsResults.map((qr, i) => (
                                        <li key={i} style={listItemStyle}>
                                            <strong>Q: {qr.question}</strong> A: {typeof qr.answer === 'object' ? JSON.stringify(qr.answer, null, 2) : String(qr.answer)}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}

                        {/* {response.rawJson && (
                            <>
                                <h5 style={subHeaderStyle}>Raw JSON Output</h5>
                                <pre style={contentStyle}>
                                    {JSON.stringify(response.rawJson, null, 2)}
                                </pre>
                            </>
                        )} */}
                    </div>
                );
            })}
        </div>
    );
};

export default ResponseViewer; 