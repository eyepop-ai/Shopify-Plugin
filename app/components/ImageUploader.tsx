// ImageUploader component
// This component handles drag-and-drop and click-to-upload functionality
// for multiple images with EyePop branding and blue-to-cyan gradient styling.

import React, { useState, useCallback, CSSProperties } from 'react';

interface ImageUploaderProps {
    onFilesSelected: (files: File[]) => void;
    maxFiles?: number;
    maxFileSizeMB?: number; // Max file size in MB
}

interface FilePreview extends File {
    preview: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
    onFilesSelected,
    maxFiles = 50, 
    maxFileSizeMB = 10 
}) => {
    const [selectedFiles, setSelectedFiles] = useState<FilePreview[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const maxSizeBytes = maxFileSizeMB * 1024 * 1024;

    const handleFiles = useCallback((files: FileList | null) => {
        if (!files) return;
        setError(null);
        let newFiles: FilePreview[] = [];
        let currentFileCount = selectedFiles.length;

        for (let i = 0; i < files.length; i++) {
            if (currentFileCount + newFiles.length >= maxFiles) {
                setError(`You can select a maximum of ${maxFiles} files.`);
                break;
            }
            const file = files[i];
            if (!file.type.startsWith('image/')) {
                setError("Only image files are allowed.");
                continue;
            }
            if (file.size > maxSizeBytes) {
                setError(`File ${file.name} exceeds the ${maxFileSizeMB}MB size limit.`);
                continue;
            }
            const fileWithPreview = Object.assign(file, {
                preview: URL.createObjectURL(file)
            }) as FilePreview;
            newFiles.push(fileWithPreview);
        }

        if (newFiles.length > 0) {
            const updatedFiles = [...selectedFiles, ...newFiles];
            setSelectedFiles(updatedFiles);
            onFilesSelected(updatedFiles);
        }
    }, [selectedFiles, onFilesSelected, maxFiles, maxSizeBytes, maxFileSizeMB]);

    const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        handleFiles(event.dataTransfer.files);
    }, [handleFiles]);

    const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        handleFiles(event.target.files);
    };

    const removeFile = (fileName: string) => {
        const updatedFiles = selectedFiles.filter(file => file.name !== fileName);
        setSelectedFiles(updatedFiles);
        onFilesSelected(updatedFiles);
        // Revoke object URL to free up memory
        const fileToRemove = selectedFiles.find(file => file.name === fileName);
        if (fileToRemove) {
            URL.revokeObjectURL(fileToRemove.preview);
        }
    };

    // EyePop-themed styles with blue-to-cyan gradient
    const baseStyle: CSSProperties = {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 30px',
        borderWidth: 2,
        borderRadius: '12px',
        borderColor: '#0ea5e9', // Sky blue
        borderStyle: 'dashed',
        backgroundColor: '#f0f9ff', // Very light sky blue
        color: '#0369a1', // Sky blue 700
        outline: 'none',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        minHeight: '200px',
        justifyContent: 'center',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(14, 165, 233, 0.1)',
        position: 'relative',
        overflow: 'hidden',
    };

    const activeStyle: CSSProperties = {
        borderColor: '#0284c7', // Sky blue 600
        background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', // Sky blue to cyan gradient
        color: '#ffffff',
        transform: 'scale(1.02)',
        boxShadow: '0 8px 24px rgba(14, 165, 233, 0.2)',
    };

    const style = React.useMemo(() => ({
        ...baseStyle,
        ...(isDragging ? activeStyle : {}),
    }), [isDragging, baseStyle, activeStyle]);

    const thumbsContainer: CSSProperties = {
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 20,
        gap: '15px',
    };

    const thumb: CSSProperties = {
        display: 'inline-flex',
        borderRadius: '12px',
        border: '2px solid #e0f2fe', // Light cyan
        marginBottom: 8,
        marginRight: 8,
        width: 120,
        height: 120,
        padding: 4,
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(14, 165, 233, 0.1)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    };

    const thumbHover: CSSProperties = {
        transform: 'scale(1.05)',
        boxShadow: '0 8px 24px rgba(14, 165, 233, 0.2)',
    };

    const thumbInner: CSSProperties = {
        display: 'flex',
        minWidth: 0,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: '8px',
    };

    const img: CSSProperties = {
        display: 'block',
        width: 'auto',
        height: '100%',
        objectFit: 'cover',
        borderRadius: '8px',
    };

    const removeButton: CSSProperties = {
        position: 'absolute',
        top: '8px',
        right: '8px',
        background: 'linear-gradient(135deg, #ef4444, #dc2626)', // Red gradient
        color: 'white',
        border: 'none',
        borderRadius: '50%',
        width: '28px',
        height: '28px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        lineHeight: '1',
        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
        transition: 'transform 0.2s ease',
    };
    
    const errorStyle: CSSProperties = {
        color: '#dc2626', // Red 600
        marginTop: '15px',
        fontSize: '0.9em',
        padding: '12px',
        backgroundColor: '#fef2f2', // Red 50
        border: '1px solid #fecaca', // Red 200
        borderRadius: '8px',
        textAlign: 'center',
    };

    const uploadIconStyle: CSSProperties = {
        fontSize: '3rem',
        marginBottom: '16px',
        opacity: isDragging ? 1 : 0.7,
        transition: 'opacity 0.3s ease',
    };

    const textStyle: CSSProperties = {
        fontSize: '1.1rem',
        fontWeight: '600',
        marginBottom: '8px',
        color: isDragging ? '#ffffff' : '#0369a1',
    };

    const subtextStyle: CSSProperties = {
        fontSize: '0.9rem',
        opacity: isDragging ? 0.9 : 0.7,
        color: isDragging ? '#ffffff' : '#0369a1',
    };

    return (
        <section style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            <div 
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => document.getElementById('fileInput')?.click()}
                style={style}
            >
                <input
                    id="fileInput"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileInputChange}
                    style={{ display: 'none' }}
                />
                
                <div style={uploadIconStyle}>
                    📸
                </div>
                
                <div style={textStyle}>
                    {isDragging ? 'Drop your images here!' : 'Drag & drop product images'}
                </div>
                
                <div style={subtextStyle}>
                    or click to browse  • Max {maxFileSizeMB}MB each
                </div>
                
                {/* Gradient overlay for active state */}
                {isDragging && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1), rgba(6, 182, 212, 0.1))',
                        pointerEvents: 'none',
                        borderRadius: '12px',
                    }} />
                )}
            </div>

            {error && <div style={errorStyle}>{error}</div>}

            {selectedFiles.length > 0 && (
                <aside style={thumbsContainer}>
                    {selectedFiles.map((file, index) => (
                        <div 
                            key={file.name + index} 
                            style={thumb}
                            onMouseEnter={(e) => {
                                Object.assign(e.currentTarget.style, thumbHover);
                            }}
                            onMouseLeave={(e) => {
                                Object.assign(e.currentTarget.style, thumb);
                            }}
                        >
                            <div style={thumbInner}>
                                <img
                                    src={file.preview}
                                    style={img}
                                    alt={file.name}
                                    onLoad={() => { URL.revokeObjectURL(file.preview) }}
                                />
                            </div>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeFile(file.name);
                                }} 
                                style={removeButton}
                                title="Remove image"
                                type="button"
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </aside>
            )}
        </section>
    );
};

export default ImageUploader; 