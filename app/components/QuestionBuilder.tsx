// QuestionBuilder component
// This component allows users to define questions for image analysis,
// supporting both predefined templates and custom questions with EyePop branding.

import React, { useState, useEffect, CSSProperties } from 'react';

interface QuestionBuilderProps {
    onQuestionsChange: (questions: string[]) => void;
    initialMainObject?: string;
    initialQuestions?: string[];
}

const QuestionBuilder: React.FC<QuestionBuilderProps> = ({ 
    onQuestionsChange,
    initialMainObject = '',
    initialQuestions = [] 
}) => {
    const [mainObject, setMainObject] = useState<string>(initialMainObject);
    const [currentQuestion, setCurrentQuestion] = useState<string>('');
    const [questionList, setQuestionList] = useState<string[]>(initialQuestions);

    useEffect(() => {
        let combinedQuestions: string[] = [];
        if (mainObject.trim() !== '') {
            combinedQuestions.push(`Focus Object: ${mainObject.trim()}`);
        }
        combinedQuestions = [...combinedQuestions, ...questionList];
        
        onQuestionsChange(combinedQuestions);
    }, [mainObject, questionList, onQuestionsChange]);

    const handleAddQuestion = () => {
        if (currentQuestion.trim() !== '') {
            setQuestionList([...questionList, currentQuestion.trim()]);
            setCurrentQuestion('');
        }
    };

    const handleRemoveQuestion = (indexToRemove: number) => {
        setQuestionList(questionList.filter((_, index) => index !== indexToRemove));
    };

    // EyePop-themed styles with blue-to-cyan gradient
    const containerStyle: CSSProperties = {
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '24px',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(14, 165, 233, 0.1)',
        border: '1px solid #e0f2fe',
    };

    const titleStyle: CSSProperties = {
        marginTop: 0,
        marginBottom: '24px',
        color: '#0369a1',
        fontSize: '1.5rem',
        fontWeight: '700',
        background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
    };

    const inputBaseStyle: CSSProperties = {
        width: 'calc(100% - 24px)',
        padding: '16px 12px',
        marginBottom: '16px',
        border: '2px solid #e0f2fe',
        borderRadius: '12px',
        fontSize: '1rem',
        fontFamily: 'inherit',
        boxShadow: '0 2px 8px rgba(14, 165, 233, 0.05)',
        transition: 'all 0.3s ease',
        backgroundColor: '#ffffff',
    };

    const inputFocusedStyle: CSSProperties = {
        borderColor: '#0ea5e9',
        boxShadow: '0 0 0 4px rgba(14, 165, 233, 0.1), 0 4px 12px rgba(14, 165, 233, 0.15)',
        outline: 'none',
    };

    const [mainObjectInputStyle, setMainObjectInputStyle] = useState<CSSProperties>(inputBaseStyle);
    const [questionInputStyle, setQuestionInputStyle] = useState<CSSProperties>(inputBaseStyle);

    const buttonStyle: CSSProperties = {
        padding: '16px 24px',
        border: 'none',
        borderRadius: '12px',
        fontSize: '1rem',
        fontWeight: '600',
        color: 'white',
        background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)',
        fontFamily: 'inherit',
    };

    const buttonHoverStyle: CSSProperties = {
        transform: 'translateY(-2px)',
        boxShadow: '0 8px 24px rgba(14, 165, 233, 0.4)',
    };

    const listItemStyle: CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px',
        marginBottom: '12px',
        backgroundColor: '#f0f9ff',
        borderRadius: '12px',
        border: '1px solid #e0f2fe',
        fontSize: '1rem',
        boxShadow: '0 2px 8px rgba(14, 165, 233, 0.05)',
        transition: 'all 0.2s ease',
    };

    const removeButtonStyle: CSSProperties = {
        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
        border: 'none',
        color: '#ffffff',
        cursor: 'pointer',
        fontSize: '1.2rem',
        fontWeight: 'bold',
        padding: '8px 12px',
        borderRadius: '8px',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)',
    };
    
    const labelStyle: CSSProperties = {
        display: 'block',
        marginBottom: '12px',
        fontSize: '1.1rem',
        fontWeight: '600',
        color: '#0369a1',
    };

    const sectionStyle: CSSProperties = {
        marginBottom: '32px',
    };

    const questionListHeaderStyle: CSSProperties = {
        marginTop: 0,
        marginBottom: '16px',
        color: '#0369a1',
        fontSize: '1.2rem',
        fontWeight: '600',
    };

    return (
        <div style={containerStyle}>
            <h3 style={titleStyle}>Content Generation Settings</h3>
            
            <div style={sectionStyle}>
                <label htmlFor="mainObject" style={labelStyle}>What are you uploading photos of?</label>
                <input
                    id="mainObject"
                    type="text"
                    value={mainObject}
                    onChange={(e) => setMainObject(e.target.value)}
                    placeholder="e.g., water bottles, t-shirts, skincare products, jackets"
                    style={mainObjectInputStyle}
                    onFocus={() => setMainObjectInputStyle({ ...inputBaseStyle, ...inputFocusedStyle })}
                    onBlur={() => setMainObjectInputStyle(inputBaseStyle)}
                />
            </div>

            <div style={sectionStyle}>
                <label htmlFor="question" style={labelStyle}>Add Custom Questions (Optional):</label>
                <input
                    id="question"
                    type="text"
                    value={currentQuestion}
                    onChange={(e) => setCurrentQuestion(e.target.value)}
                    placeholder="e.g., What scent is this? What material is it made of?"
                    style={questionInputStyle}
                    onFocus={() => setQuestionInputStyle({ ...inputBaseStyle, ...inputFocusedStyle })}
                    onBlur={() => setQuestionInputStyle(inputBaseStyle)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddQuestion()}
                />
                <button 
                    onClick={handleAddQuestion} 
                    style={buttonStyle} 
                    type="button"
                    onMouseEnter={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
                    onMouseLeave={(e) => Object.assign(e.currentTarget.style, buttonStyle)}
                >
                    Add Question
                </button>
            </div>

            {questionList.length > 0 && (
                <div>
                    <h4 style={questionListHeaderStyle}>Your Custom Questions:</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {questionList.map((q, index) => (
                            <li 
                                key={index} 
                                style={listItemStyle}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(14, 165, 233, 0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(14, 165, 233, 0.05)';
                                }}
                            >
                                <span style={{ color: '#0369a1', fontWeight: '500' }}>{q}</span>
                                <button 
                                    onClick={() => handleRemoveQuestion(index)} 
                                    style={removeButtonStyle}
                                    title="Remove question"
                                    type="button"
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'scale(1.05)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.2)';
                                    }}
                                >
                                    ×
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default QuestionBuilder; 