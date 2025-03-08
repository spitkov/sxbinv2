'use client';
import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
interface FileWithProgress {
  file: File;
  progress: number;
  status: 'waiting' | 'uploading' | 'success' | 'error';
  url?: string;
  shortUrl?: string;
  shortId?: string;
  expiresAt?: string;
  id?: string;
  passwordProtected?: boolean;
  fileSize?: number;
}
interface UploadResponse {
  success: boolean;
  fileId: string;
  shortId: string;
  shortUrl: string;
  url: string;
  expiresAt: string;
  filename: string;
  fileSize: number;
  passwordProtected: boolean;
}
const FileUploader = () => {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [password, setPassword] = useState('');
  const [expirationDays, setExpirationDays] = useState('7');
  const [isUploading, setIsUploading] = useState(false);
  const [totalProgress, setTotalProgress] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (startTime && isUploading) {
      timer = setInterval(() => {
        setTimeElapsed(Date.now() - startTime);
      }, 100);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [startTime, isUploading]);
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'waiting' as const,
    }));
    setFiles(prev => [...prev, ...newFiles]);
    const totalSize = [...files, ...newFiles].reduce((acc, file) => acc + file.file.size, 0);
    setTotalBytes(totalSize);
  }, [files]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    multiple: true
  });
  const uploadFiles = async () => {
    if (files.length === 0 || isUploading) return;
    setIsUploading(true);
    setStartTime(Date.now());
    let uploadedSize = 0;
    const filesCopy = [...files];
    for (let i = 0; i < filesCopy.length; i++) {
      if (filesCopy[i].status !== 'waiting') continue;
      const file = filesCopy[i];
      file.status = 'uploading';
      setFiles([...filesCopy]);
      try {
        const formData = new FormData();
        formData.append('file', file.file);
        formData.append('expiresIn', expirationDays);
        if (password) formData.append('password', password);
        const fileSize = file.file.size;
        const simulateProgress = () => {
          let progress = 0;
          const interval = setInterval(() => {
            if (progress < 90) {
              progress += Math.random() * 10;
              progress = Math.min(progress, 90);
              filesCopy[i].progress = Math.floor(progress);
              const estimatedUploaded = fileSize * (progress / 100);
              setUploadedBytes(prev => estimatedUploaded);
              const totalProgress = Math.round((estimatedUploaded / totalBytes) * 100);
              setTotalProgress(totalProgress);
              setFiles([...filesCopy]);
            } else {
              clearInterval(interval);
            }
          }, 300);
          return interval;
        };
        const progressInterval = simulateProgress();
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        clearInterval(progressInterval);
        if (!response.ok) {
          throw new Error('Upload failed');
        }
        const data = await response.json() as UploadResponse;
        filesCopy[i].status = 'success';
        filesCopy[i].url = data.url;
        filesCopy[i].shortUrl = data.shortUrl;
        filesCopy[i].shortId = data.shortId;
        filesCopy[i].expiresAt = data.expiresAt;
        filesCopy[i].id = data.fileId;
        filesCopy[i].passwordProtected = data.passwordProtected;
        filesCopy[i].fileSize = data.fileSize;
        filesCopy[i].progress = 100;
        uploadedSize += fileSize;
        setUploadedBytes(uploadedSize);
        const overallProgress = Math.round((uploadedSize / totalBytes) * 100);
        setTotalProgress(overallProgress);
        setFiles([...filesCopy]);
      } catch (error) {
        console.error('Error uploading file', error);
        filesCopy[i].status = 'error';
        setFiles([...filesCopy]);
      }
    }
    setIsUploading(false);
  };
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  const formatTime = (ms: number) => {
    if (ms === 0) return '0s';
    const seconds = Math.floor(ms / 1000);
    return seconds + 's';
  };
  const calculateSpeed = () => {
    if (timeElapsed === 0 || uploadedBytes === 0) return 'N/A';
    const speedBytesPerSec = uploadedBytes / (timeElapsed / 1000);
    const speedMbitsPerSec = (speedBytesPerSec * 8) / (1000 * 1000);
    return `${speedMbitsPerSec.toFixed(0)} Mbit/s`;
  };
  const handleRemoveFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    const totalSize = newFiles.reduce((acc, file) => acc + file.file.size, 0);
    setTotalBytes(totalSize);
  };
  const clearCompletedFiles = () => {
    setFiles(files.filter(file => file.status !== 'success'));
    setTotalBytes(0);
    setUploadedBytes(0);
    setTotalProgress(0);
    setTimeElapsed(0);
    setStartTime(null);
  };
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        alert('URL copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div 
        {...getRootProps()} 
        className={`upload-container ${isDragActive ? 'upload-active' : ''}`}
      >
        <input {...getInputProps()} />
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-gray-400">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p className="text-center">
          {isDragActive 
            ? 'Drop the files here...' 
            : 'Drag & drop files here, or click to select files'}
        </p>
      </div>
      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">Password (optional)</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set a password to protect files"
              className="w-full px-3 py-2 bg-[#1e1e1e] border border-[#333] rounded-lg focus:outline-none focus:border-[#3b82f6]"
            />
          </div>
          <div>
            <label htmlFor="expirationDays" className="block text-sm font-medium mb-2">Expires in (days)</label>
            <select
              id="expirationDays"
              value={expirationDays}
              onChange={(e) => setExpirationDays(e.target.value)}
              className="w-full px-3 py-2 bg-[#1e1e1e] border border-[#333] rounded-lg focus:outline-none focus:border-[#3b82f6]"
            >
              <option value="1">1 day</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
            </select>
          </div>
        </div>
        <button 
          onClick={uploadFiles} 
          disabled={files.length === 0 || isUploading || files.every(f => f.status !== 'waiting')}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? 'Uploading...' : 'Upload Files'}
        </button>
      </div>
      {files.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Files ({files.length})</h3>
            <button 
              onClick={clearCompletedFiles}
              className="text-sm text-[#3b82f6] hover:underline"
            >
              Clear completed
            </button>
          </div>
          {isUploading && (
            <div className="mb-6 p-5 bg-[#1e1e1e] rounded-lg border border-[#333]">
              <div className="flex justify-between mb-2">
                <span className="font-medium">Total Progress</span>
                <span className="font-medium">{totalProgress}%</span>
              </div>
              <div className="w-full bg-[#333] rounded-full h-2.5 mb-5">
                <div 
                  className="bg-[#3b82f6] h-2.5 rounded-full" 
                  style={{ width: `${totalProgress}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-400">Bytes</span>
                    <span>{formatBytes(uploadedBytes)} / {formatBytes(totalBytes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Time</span>
                    <span>{formatTime(timeElapsed)}</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Speed</span>
                    <span>{calculateSpeed()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <AnimatePresence>
            {files.map((file, index) => (
              <motion.div 
                key={`${file.file.name}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-3 p-5 bg-[#1e1e1e] border border-[#333] rounded-lg"
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="truncate max-w-[60%]">
                    <span className="font-medium">{file.file.name}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-400">{formatBytes(file.file.size)}</span>
                    {file.status === 'waiting' && (
                      <button 
                        onClick={() => handleRemoveFile(index)}
                        className="text-red-400 hover:text-red-500"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6L6 18"></path>
                          <path d="M6 6l12 12"></path>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <div className="w-full bg-[#333] rounded-full h-2.5 mb-3">
                  <div 
                    className={`h-2.5 rounded-full ${file.status === 'error' ? 'bg-red-500' : 'bg-[#3b82f6]'}`}
                    style={{ width: `${file.progress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span>
                    {file.status === 'waiting' && 'Ready to upload'}
                    {file.status === 'uploading' && `Uploading (${file.progress}%)`}
                    {file.status === 'success' && 'Upload complete'}
                    {file.status === 'error' && 'Upload failed'}
                  </span>
                  {file.url && (
                    <a 
                      href={file.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#3b82f6] hover:underline"
                    >
                      View File
                    </a>
                  )}
                </div>
                {file.expiresAt && (
                  <div className="mt-2 text-xs text-gray-400">
                    Expires on {new Date(file.expiresAt).toLocaleDateString()}
                    {file.passwordProtected && ' • Password protected'}
                  </div>
                )}
                { }
                {file.status === 'success' && file.shortUrl && (
                  <div className="mt-4 pt-4 border-t border-[#333]">
                    <div className="mb-2">
                      <p className="text-sm text-gray-400">Share URL:</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex">
                        <input
                          type="text"
                          value={file.shortUrl}
                          readOnly
                          className="w-full bg-[#121212] px-3 py-2 rounded-l-lg border border-[#333] text-sm"
                        />
                        <button
                          onClick={() => copyToClipboard(file.shortUrl || '')}
                          className="bg-[#2d2d2d] text-white px-4 py-2 rounded-r-lg border border-l-0 border-[#333] hover:bg-[#3a3a3a]"
                        >
                          Copy
                        </button>
                      </div>
                      <Link 
                        href={`/${file.shortId}`}
                        className="bg-[#3b82f6] text-white px-4 py-2 rounded-lg hover:bg-[#2563eb] transition-colors text-sm"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
export default FileUploader;