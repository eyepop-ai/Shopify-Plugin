// QuestionBuilder component
// This component will allow users to define questions for image analysis,
// supporting both predefined templates and custom questions.

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
        
        // For testing purposes, questions are passed as an array of strings.
        // The final format will depend on the API specification.
        // Example: ["Focus Object: Product", "What color is it?", "What material is it made of?"]
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

    const inputBaseStyle: CSSProperties = {
        width: 'calc(100% - 22px)',
        padding: '12px 10px',
        marginBottom: '15px',
        border: '1px solid #d1d5db', // Gray 300
        borderRadius: '8px',
        fontSize: '1rem',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
    };

    const inputFocusedStyle: CSSProperties = {
        borderColor: '#2563eb', // Blue 600
        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.2)', // Blue focus ring
    };

    const [mainObjectInputStyle, setMainObjectInputStyle] = useState<CSSProperties>(inputBaseStyle);
    const [questionInputStyle, setQuestionInputStyle] = useState<CSSProperties>(inputBaseStyle);

    const buttonStyle: CSSProperties = {
        padding: '12px 20px',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1rem',
        fontWeight: 'bold',
        color: 'white',
        background: 'linear-gradient(135deg, #3b82f6, #10b981)', // Blue to Cyan gradient
        cursor: 'pointer',
        transition: 'opacity 0.2s',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    };

    const listItemStyle: CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px',
        marginBottom: '8px',
        backgroundColor: '#f9fafb', // Gray 50
        borderRadius: '6px',
        border: '1px solid #e5e7eb', // Gray 200
        fontSize: '0.95rem',
    };

    const removeButtonStyle: CSSProperties = {
        background: 'transparent',
        border: 'none',
        color: '#ef4444', // Red 500
        cursor: 'pointer',
        fontSize: '1.1rem',
        fontWeight: 'bold',
        padding: '5px',
    };
    
    const labelStyle: CSSProperties = {
        display: 'block',
        marginBottom: '8px',
        fontSize: '1rem',
        fontWeight: '600',
        color: '#374151', // Gray 700
    };

    return (
        <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#1f2937', fontSize: '1.4rem' }}>Configure Analysis Questions</h3>
            
            <div>
                <label htmlFor="mainObject" style={labelStyle}>Main Object/Subject:</label>
                <input
                    id="mainObject"
                    type="text"
                    value={mainObject}
                    onChange={(e) => setMainObject(e.target.value)}
                    placeholder="e.g., Product, Person, Scene"
                    style={mainObjectInputStyle}
                    onFocus={() => setMainObjectInputStyle({ ...inputBaseStyle, ...inputFocusedStyle })}
                    onBlur={() => setMainObjectInputStyle(inputBaseStyle)}
                />
            </div>

            <div>
                <label htmlFor="question" style={labelStyle}>Add Question about the Subject:</label>
                <input
                    id="question"
                    type="text"
                    value={currentQuestion}
                    onChange={(e) => setCurrentQuestion(e.target.value)}
                    placeholder="e.g., What color is it? Is it damaged?"
                    style={questionInputStyle}
                    onFocus={() => setQuestionInputStyle({ ...inputBaseStyle, ...inputFocusedStyle })}
                    onBlur={() => setQuestionInputStyle(inputBaseStyle)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddQuestion()}
                />
                <button onClick={handleAddQuestion} style={buttonStyle} type="button">
                    Add Question
                </button>
            </div>

            {questionList.length > 0 && (
                <div style={{ marginTop: '25px' }}>
                    <h4 style={{ marginTop: 0, marginBottom: '12px', color: '#374151', fontSize: '1.1rem' }}>Your Questions:</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {questionList.map((q, index) => (
                            <li key={index} style={listItemStyle}>
                                <span>{q}</span>
                                <button 
                                    onClick={() => handleRemoveQuestion(index)} 
                                    style={removeButtonStyle}
                                    title="Remove question"
                                    type="button"
                                >
                                    &times;
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