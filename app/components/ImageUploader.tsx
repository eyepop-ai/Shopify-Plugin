// ImageUploader component
// This component will handle drag-and-drop and click-to-upload functionality
// for multiple images, including thumbnail previews and upload progress indicators.

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
    maxFiles = 5, 
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

    // Styles
    const baseStyle: CSSProperties = {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '30px',
        borderWidth: 2,
        borderRadius: '12px',
        borderColor: '#60a5fa', // Light blue
        borderStyle: 'dashed',
        backgroundColor: '#f0f9ff', // Very light blue/sky
        color: '#3b82f6', // Medium blue
        outline: 'none',
        transition: 'border .24s ease-in-out, background-color .24s ease-in-out',
        cursor: 'pointer',
        minHeight: '150px',
        justifyContent: 'center',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    };

    const activeStyle: CSSProperties = {
        borderColor: '#2563eb', // Darker blue
        background: 'linear-gradient(135deg, #3b82f6, #10b981)', // Blue to cyan/green gradient
        color: '#ffffff',
    };

    const rejectStyle: CSSProperties = {
        borderColor: '#ef4444', // Red
        backgroundColor: '#fee2e2', // Light red
    };

    const style = React.useMemo(() => ({
        ...baseStyle,
        ...(isDragging ? activeStyle : {}),
        // TODO: Implement reject style based on file validation during drag
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
        borderRadius: '8px',
        border: '1px solid #e5e7eb', // Light gray
        marginBottom: 8,
        marginRight: 8,
        width: 120,
        height: 120,
        padding: 4,
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
    };

    const thumbInner: CSSProperties = {
        display: 'flex',
        minWidth: 0,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    };

    const img: CSSProperties = {
        display: 'block',
        width: 'auto',
        height: '100%',
        objectFit: 'cover',
    };

    const removeButton: CSSProperties = {
        position: 'absolute',
        top: '5px',
        right: '5px',
        background: 'rgba(0, 0, 0, 0.6)',
        color: 'white',
        border: 'none',
        borderRadius: '50%',
        width: '24px',
        height: '24px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        lineHeight: '1',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    };
    
    const errorStyle: CSSProperties = {
        color: '#ef4444', // Red
        marginTop: '10px',
        fontSize: '0.9em',
    };

    return (
        <section className="container" style={{ fontFamily: 'Arial, sans-serif', padding: '20px', background: '#fff', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
            <div 
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                style={style}
            >
                <input 
                    type="file" 
                    multiple 
                    onChange={handleFileInputChange} 
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="fileInput"
                />
                <label htmlFor="fileInput" style={{cursor: 'pointer'}}>
                    {isDragging ? (
                        <p style={{fontSize: '1.1em', fontWeight: 'bold'}}>Drop images here!</p>
                    ) : (
                        <p style={{fontSize: '1.1em'}}>
                            Drag 'n' drop some files here, or click to select files
                            <br />
                            <span style={{fontSize: '0.9em', color: isDragging ? '#e0f2fe' : '#9ca3af'}}>
                                (Max {maxFiles} files, up to {maxFileSizeMB}MB each)
                            </span>
                        </p>
                    )}
                </label>
            </div>
            {error && <p style={errorStyle}>{error}</p>}
            {selectedFiles.length > 0 && (
                <aside style={thumbsContainer}>
                    {selectedFiles.map(file => (
                        <div style={thumb} key={file.name}>
                            <div style={thumbInner}>
                                <img
                                    src={file.preview}
                                    style={img}
                                    alt={`Preview of ${file.name}`}
                                    onLoad={() => URL.revokeObjectURL(file.preview)} // Clean up after image is loaded if it was for this specific display only, but we keep it for potential re-renders.
                                />
                            </div>
                            <button onClick={() => removeFile(file.name)} style={removeButton} title="Remove file">×</button>
                        </div>
                    ))}
                </aside>
            )}
        </section>
    );
};

export default ImageUploader; 