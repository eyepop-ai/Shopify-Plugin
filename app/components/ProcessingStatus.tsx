// ProcessingStatus component
// This component will display real-time processing status for each uploaded image.

import React, { CSSProperties } from 'react';

interface ProcessingItem {
    id: string; // Could be file name or a unique ID
    status: 'pending' | 'uploading' | 'processing' | 'success' | 'error';
    progress?: number; // Optional progress percentage (0-100)
    message?: string; // Optional message, e.g., error details
}

interface ProcessingStatusProps {
    items: ProcessingItem[];
}

const ProcessingStatus: React.FC<ProcessingStatusProps> = ({ items }) => {
    if (!items || items.length === 0) {
        return null; // Don't render anything if there are no items
    }

    const getStatusColor = (status: ProcessingItem['status']) => {
        switch (status) {
            case 'pending': return '#6b7280'; // Gray
            case 'uploading': return '#3b82f6'; // Blue
            case 'processing': return '#f59e0b'; // Amber
            case 'success': return '#10b981'; // Green/Cyan
            case 'error': return '#ef4444'; // Red
            default: return '#6b7280';
        }
    };

    // Styles
    const containerStyle: CSSProperties = {
        fontFamily: 'Arial, sans-serif',
        marginTop: '25px',
        padding: '20px',
        background: '#f9fafb', // Light gray background
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
    };

    const titleStyle: CSSProperties = {
        marginTop: 0,
        marginBottom: '15px',
        color: '#1f2937', // Dark gray text
        fontSize: '1.3rem',
    };

    const listStyle: CSSProperties = {
        listStyle: 'none',
        padding: 0,
        margin: 0,
    };

    const listItemStyle: CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 0',
        borderBottom: '1px solid #e5e7eb', // Lighter gray border
        fontSize: '0.95rem',
    };

    const lastListItemStyle: CSSProperties = {
        ...listItemStyle,
        borderBottom: 'none',
    };

    const itemNameStyle: CSSProperties = {
        color: '#374151',
        fontWeight: '500',
        flex: '1 1 0%',
        marginRight: '15px',
        wordBreak: 'break-all',
    };

    const statusTextStyle: CSSProperties = {
        fontWeight: 'bold',
        minWidth: '100px',
        textAlign: 'right',
    };
    
    const progressBarStyle: CSSProperties = {
        width: '100px',
        height: '8px',
        backgroundColor: '#e5e7eb',
        borderRadius: '4px',
        overflow: 'hidden',
        marginLeft: '10px',
    };

    const progressBarFillStyle = (progress: number, statusColor: string): CSSProperties => ({
        width: `${progress}%`,
        height: '100%',
        backgroundColor: statusColor,
        borderRadius: '4px',
        transition: 'width 0.3s ease-in-out',
    });

    return (
        <div style={containerStyle}>
            <h3 style={titleStyle}>Processing Status</h3>
            <ul style={listStyle}>
                {items.map((item, index) => {
                    const isLastItem = index === items.length - 1;
                    const statusColor = getStatusColor(item.status);
                    return (
                        <li key={item.id} style={isLastItem ? lastListItemStyle : listItemStyle}>
                            <span style={itemNameStyle}>{item.id}</span>
                            {(item.status === 'uploading' || item.status === 'processing') && typeof item.progress === 'number' && (
                                <div style={progressBarStyle}>
                                    <div style={progressBarFillStyle(item.progress, statusColor)}></div>
                                </div>
                            )}
                            <span style={{ ...statusTextStyle, color: statusColor }}>
                                {item.status.toUpperCase()}
                                {item.status === 'error' && item.message && `: ${item.message}`}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default ProcessingStatus; 