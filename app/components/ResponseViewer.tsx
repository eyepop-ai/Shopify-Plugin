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
}

const ResponseViewer: React.FC<ResponseViewerProps> = ({ responses }) => {

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
            {responses.map((response, index) => (
                <div key={response.id + index} style={index === responses.length - 1 ? lastResponseBlockStyle : responseBlockStyle}>
                    <h4 style={{...subHeaderStyle, marginTop: 0, fontSize: '1.2rem', color: '#3b82f6'}}>
                        Results for: {response.id}
                    </h4>
                    
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
                                        <strong>{key}:</strong> {String(value)}
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
                                        <strong>Q: {qr.question}</strong>
                                        <br />
                                        A: {typeof qr.answer === 'object' ? JSON.stringify(qr.answer, null, 2) : String(qr.answer)}
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}

                    {response.rawJson && (
                        <>
                            <h5 style={subHeaderStyle}>Raw JSON Output</h5>
                            <pre style={contentStyle}>
                                {JSON.stringify(response.rawJson, null, 2)}
                            </pre>
                        </>
                    )}
                </div>
            ))}
        </div>
    );
};

// Dummy data for initial display
const dummyResponses: EyePopResponse[] = [
    {
        id: 'sample_image_1.jpg',
        summary: 'A vibrant red t-shirt displayed on a mannequin. Appears to be made of cotton.',
        objectsDetected: [
            { label: 'T-Shirt', confidence: 0.95, box: [10, 20, 150, 200] },
            { label: 'Mannequin', confidence: 0.88 }
        ],
        attributes: {
            'Primary Color': 'Red',
            'Material Estimate': 'Cotton',
            'Sleeve Length': 'Short'
        },
        customQuestionsResults: [
            { question: 'Is there a logo on the t-shirt?', answer: 'Yes, a small circular logo on the left chest.' },
            { question: 'What is the condition of the t-shirt?', answer: 'Appears new, no visible damage.' }
        ],
        rawJson: { full_payload: { data: ["some", "complex", "data"], timestamp: "2023-10-27" } }
    },
    {
        id: 'product_image_005.png',
        summary: 'A pair of blue denim jeans, folded neatly.',
        objectsDetected: [
            { label: 'Jeans', confidence: 0.99, box: [5, 5, 300, 150] },
        ],
        attributes: {
            'Primary Color': 'Blue',
            'Material': 'Denim',
            'Style': 'Folded'
        },
        customQuestionsResults: [
            { question: 'Are there any visible labels or tags?', answer: 'A small leather tag is visible on the waistband.' }
        ],
    }
];

// To use with dummy data:
// <ResponseViewer responses={dummyResponses} />

export default ResponseViewer; 