'use client';

import { useState, useRef } from 'react';

export default function IpfsDownloader() {
    const [start, setStart] = useState<number>(0);
    const [end, setEnd] = useState<number>(100);
    const [delay, setDelay] = useState<number>(100);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [logs, setLogs] = useState<string[]>([]);  // ← This fixes the error
    const [downloadComplete, setDownloadComplete] = useState<boolean>(false);
    const [successCount, setSuccessCount] = useState<number>(0);
    const [totalCount, setTotalCount] = useState<number>(0);
    const abortControllerRef = useRef<AbortController | null>(null);
    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    };

    const clearLogs = () => {
        setLogs([]);
        setProgress(0);
        setDownloadComplete(false);
        setSuccessCount(0);
        setTotalCount(0);
    };

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const startDownload = async () => {
        if (isDownloading) return;

        if (start > end) {
            alert('Start value must be less than or equal to end value');
            return;
        }

        setIsDownloading(true);
        setDownloadComplete(false);
        setProgress(0);
        setSuccessCount(0);
        const total = end - start + 1;
        setTotalCount(total);
        abortControllerRef.current = new AbortController();
        
        addLog(`Starting download from ${start} to ${end}... (${total} files)`);
        
        try {
            const response = await fetch('/api/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    start,
                    end,
                    delay
                }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Handle streaming response for real-time updates
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader?.read() || { done: true, value: null };
                
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                
                // Try to parse complete JSON objects from buffer
                let newlineIndex;
                while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                    const line = buffer.slice(0, newlineIndex);
                    buffer = buffer.slice(newlineIndex + 1);
                    
                    if (line.trim()) {
                        try {
                            const data = JSON.parse(line);
                            if (data.fileName) {
                                if (data.status === 'success') {
                                    addLog(`✅ Downloaded: ${data.fileName}`);
                                    setSuccessCount(prev => prev + 1);
                                } else {
                                    addLog(`❌ Failed: ${data.fileName} (${data.status})`);
                                }
                                setProgress(data.progress || 0);
                            }
                        } catch (e) {
                            // Ignore JSON parse errors for incomplete lines
                        }
                    }
                }
            }

            // Parse final result
            const result = JSON.parse(buffer || '{}');
            
            if (result.success) {
                addLog(`✅ Download complete! ${successCount}/${totalCount} files downloaded successfully`);
                setDownloadComplete(true);
            } else {
                addLog(`❌ Download failed: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                addLog('❌ Download cancelled by user');
            } else {
                addLog(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        setIsDownloading(false);
    };

    const stopDownload = () => {
        if (isDownloading && abortControllerRef.current) {
            abortControllerRef.current.abort();
            setIsDownloading(false);
            addLog('🛑 Download stopped by user');
        }
    };

    const downloadZip = async () => {
        try {
            addLog('📦 Creating zip file...');
            const response = await fetch('/api/zip');
            
            if (!response.ok) {
                throw new Error('Failed to create zip file');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ipfs_files.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            addLog('📦 Zip file downloaded successfully!');
        } catch (error) {
            addLog(`❌ Failed to download zip: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8">
                        <h1 className="text-3xl font-bold text-white text-center">
                            IPFS JSON Downloader
                        </h1>
                        <p className="text-blue-100 text-center mt-2">
                            Download JSON files from IPFS gateway with progress tracking
                        </p>
                    </div>

                    <div className="p-6">
                        {/* Controls */}
                        <div className="bg-gray-50 rounded-lg p-6 mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Start Index
                                    </label>
                                    <input
                                        type="number"
                                        value={start}
                                        onChange={(e) => setStart(parseInt(e.target.value) || 0)}
                                        min="0"
                                        disabled={isDownloading}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        End Index
                                    </label>
                                    <input
                                        type="number"
                                        value={end}
                                        onChange={(e) => setEnd(parseInt(e.target.value) || 0)}
                                        min="0"
                                        disabled={isDownloading}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Delay (ms)
                                    </label>
                                    <input
                                        type="number"
                                        value={delay}
                                        onChange={(e) => setDelay(parseInt(e.target.value) || 0)}
                                        min="0"
                                        disabled={isDownloading}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={startDownload}
                                    disabled={isDownloading}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
                                >
                                    {isDownloading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                            Downloading...
                                        </>
                                    ) : (
                                        'Start Download'
                                    )}
                                </button>
                                
                                <button
                                    onClick={stopDownload}
                                    disabled={!isDownloading}
                                    className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                                >
                                    Stop
                                </button>
                                
                                <button
                                    onClick={clearLogs}
                                    className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors duration-200"
                                >
                                    Clear Log
                                </button>
                                
                                {downloadComplete && (
                                    <button
                                        onClick={downloadZip}
                                        className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 flex items-center gap-2"
                                    >
                                        📦 Download ZIP
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Progress Section */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700">
                                    Progress
                                </span>
                                <span className="text-sm text-gray-500">
                                    {isDownloading || downloadComplete ? `${successCount}/${totalCount} files` : 'Ready to start'}
                                </span>
                            </div>
                            
                            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                                <div 
                                    className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            
                            <div className="text-center text-sm text-gray-600">
                                {progress.toFixed(1)}% complete
                            </div>
                        </div>

                        {/* Log Container */}
                        <div className="bg-gray-900 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-semibold text-white">
                                    Download Log
                                </h3>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                    <span className="text-green-400 text-sm">Live</span>
                                </div>
                            </div>
                            
                            <div className="bg-black rounded p-4 h-80 overflow-y-auto font-mono text-sm">
                                {logs.length === 0 ? (
                                    <div className="text-gray-500 text-center py-8">
                                        Logs will appear here when download starts...
                                    </div>
                                ) : (
                                    logs.map((log, index) => (
                                        <div 
                                            key={index} 
                                            className={`mb-1 ${
                                                log.includes('✅') ? 'text-green-400' :
                                                log.includes('❌') || log.includes('⚠️') ? 'text-red-400' :
                                                log.includes('📦') ? 'text-blue-400' :
                                                log.includes('🛑') ? 'text-yellow-400' :
                                                'text-gray-300'
                                            }`}
                                        >
                                            {log}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Stats */}
                        {(isDownloading || downloadComplete) && (
                            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-blue-50 p-4 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
                                    <div className="text-sm text-blue-800">Total Files</div>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-green-600">{successCount}</div>
                                    <div className="text-sm text-green-800">Downloaded</div>
                                </div>
                                <div className="bg-red-50 p-4 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-red-600">{totalCount - successCount}</div>
                                    <div className="text-sm text-red-800">Failed</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
