'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import 'highlight.js/styles/github-dark.css';
import { isPreviewableFile, preparePreview } from '@/lib/previewUtils';
import { Metadata } from "next";
import { getFileByShortId } from "@/lib/db";
import { formatDistanceToNow } from "date-fns";

interface FileData {
  id: string;
  shortId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  uploadedAt: string;
  expiresAt: string;
  publicUrl: string;
  uploaderUsername: string | null;
}
interface ZipEntry {
  name: string;
  path: string;
  size: number;
  isDirectory: boolean;
  lastModified: Date;
}
interface ZipContents {
  fileName: string;
  contentType: string;
  contents: ZipEntry[];
}
interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: true;
  children: (FileEntry | DirectoryEntry)[];
}
interface FileEntry {
  name: string;
  path: string;
  size: number;
  isDirectory: false;
  lastModified: Date;
}
interface PreviewData {
  content: string;
  language: string;
  isText: boolean;
  lineCount: number;
  contentType: string;
}

export async function generateMetadata({ params }: { params: { shortId: string } }): Promise<Metadata> {
  const { shortId } = params;
  const file = await getFileByShortId(shortId);

  if (!file) {
    return {
      title: "File Not Found - sxbin.gay",
      description: "This file does not exist or has expired.",
      openGraph: {
        title: "sxbin.gay | Simple File Uploads",
        description: "A simple, no-registration file upload service",
        siteName: "sxbin.gay",
      },
      twitter: {
        card: "summary",
        title: "sxbin.gay | Simple File Uploads",
        description: "A simple, no-registration file upload service",
      },
    };
  }

  const uploadDate = new Date(file.uploadedAt);
  const uploadedAgo = formatDistanceToNow(uploadDate, { addSuffix: true });
  
  const formattedSize = formatBytes(file.fileSize);

  const detailedDescription = `${file.fileName} (${formattedSize}) - Uploaded ${uploadedAgo}${file.uploaderUsername ? ` by ${file.uploaderUsername}` : ''}`;

  return {
    title: `${file.fileName} - sxbin.gay`,
    description: detailedDescription,
    openGraph: {
      title: `${file.fileName} - sxbin.gay`,
      description: detailedDescription,
      siteName: "sxbin.gay",
      images: file.contentType?.startsWith("image/") 
        ? [{ url: `/${shortId}/raw` }] 
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${file.fileName} - sxbin.gay`,
      description: detailedDescription,
      images: file.contentType?.startsWith("image/") 
        ? [`/${shortId}/raw`] 
        : undefined,
    },
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

const getTextContent = async (url: string, password?: string) => {
  const passwordParam = password ? `?password=${encodeURIComponent(password)}` : '';
  const response = await fetch(`${url}${passwordParam}`);
  if (!response.ok) {
    throw new Error('Failed to fetch content');
  }
  const content = await response.text();
  return content;
};
export default function FileDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { shortId } = params;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [zipContents, setZipContents] = useState<ZipContents | null>(null);
  const [loadingZip, setLoadingZip] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [submittedPassword, setSubmittedPassword] = useState('');
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [fileStructure, setFileStructure] = useState<(FileEntry | DirectoryEntry)[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<{name: string, path: string}[]>([]);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const buildFileStructure = (entries: ZipEntry[]): (FileEntry | DirectoryEntry)[] => {
    const directories: Record<string, DirectoryEntry> = {
      '': { name: 'root', path: '', isDirectory: true, children: [] }
    };
    entries.forEach(entry => {
      const pathParts = entry.path.split('/');
      const filteredParts = pathParts.filter(part => part !== '');
      let currentPath = '';
      for (let i = 0; i < filteredParts.length - 1; i++) {
        const part = filteredParts[i];
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        if (!directories[currentPath]) {
          directories[currentPath] = {
            name: part,
            path: currentPath,
            isDirectory: true,
            children: []
          };
          if (directories[parentPath]) {
            directories[parentPath].children.push(directories[currentPath]);
          }
        }
      }
    });
    entries.forEach(entry => {
      if (entry.isDirectory) return;
      const pathParts = entry.path.split('/');
      const fileName = pathParts.pop() || '';
      const dirPath = pathParts.join('/');
      const fileEntry: FileEntry = {
        name: fileName,
        path: entry.path,
        size: entry.size,
        isDirectory: false,
        lastModified: entry.lastModified
      };
      if (directories[dirPath]) {
        directories[dirPath].children.push(fileEntry);
      } else {
        directories[''].children.push(fileEntry);
      }
    });
    const sortDirContents = (dir: DirectoryEntry) => {
      dir.children.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      dir.children.forEach(child => {
        if (child.isDirectory) {
          sortDirContents(child as DirectoryEntry);
        }
      });
    };
    sortDirContents(directories['']);
    return directories[''].children;
  };
  const getCurrentDirectoryContents = (): (FileEntry | DirectoryEntry)[] => {
    if (!currentPath.length || currentPath[0] === '') {
      return fileStructure;
    }
    const findDir = (
      path: string[], 
      items: (FileEntry | DirectoryEntry)[]
    ): DirectoryEntry | null => {
      if (path.length === 0) return null;
      for (const item of items) {
        if (item.path === path.join('/') && item.isDirectory) {
          return item as DirectoryEntry;
        }
        if (item.isDirectory) {
          const foundDir = findDir(path, (item as DirectoryEntry).children);
          if (foundDir) return foundDir;
        }
      }
      return null;
    };
    const currentDir = findDir(currentPath, fileStructure);
    return currentDir ? currentDir.children : [];
  };
  useEffect(() => {
    if (!currentPath.length) {
      setBreadcrumbs([{ name: 'Root', path: '' }]);
      return;
    }
    const crumbs = [{ name: 'Root', path: '' }];
    let path = '';
    for (let i = 0; i < currentPath.length; i++) {
      path = path ? `${path}/${currentPath[i]}` : currentPath[i];
      crumbs.push({
        name: currentPath[i],
        path
      });
    }
    setBreadcrumbs(crumbs);
  }, [currentPath]);
  const navigateToDirectory = (path: string) => {
    setCurrentPath(path.split('/'));
  };
  const navigateUp = () => {
    if (!currentPath.length) return;
    const parts = currentPath.slice(0, -1);
    setCurrentPath(parts);
  };
  useEffect(() => {
    const fetchFileData = async () => {
      setIsLoading(true);
      try {
        const passwordParam = submittedPassword ? `?password=${encodeURIComponent(submittedPassword)}` : '';
        const response = await fetch(`/${shortId}/info${passwordParam}`);
        if (response.status === 403) {
          const data = await response.json();
          if (data.passwordProtected) {
            setPasswordRequired(true);
            setPasswordError(submittedPassword !== '');
            setIsLoading(false);
            return;
          }
        }
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch file');
        }
        const data = await response.json();
        setFileData(data);
        setPasswordRequired(false);
        if (data.contentType.includes('zip') || data.fileName.toLowerCase().endsWith('.zip')) {
          fetchZipContents();
        } else if (isPreviewableFile(data.contentType, data.fileName)) {
          try {
            const content = await getTextContent(`/${shortId}/raw`, submittedPassword);
            const preview = await preparePreview(content, data.fileName, data.contentType);
            setPreviewData(preview);
          } catch (err) {
            console.error('Error fetching preview:', err);
            setPreviewData(null);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    const fetchZipContents = async () => {
      setLoadingZip(true);
      try {
        const passwordParam = submittedPassword ? `?password=${encodeURIComponent(submittedPassword)}` : '';
        const response = await fetch(`/${shortId}/contents${passwordParam}`);
        if (!response.ok) {
          console.error('Failed to fetch ZIP contents:', response.status);
          setZipContents(null);
          setLoadingZip(false);
          return;
        }
        const data = await response.json();
        if (!data || !Array.isArray(data)) {
          console.error('Invalid ZIP contents format:', data);
          setZipContents(null);
          setLoadingZip(false);
          return;
        }
        const zipData = {
          fileName: fileData?.fileName || '',
          contentType: fileData?.contentType || '',
          contents: data
        };
        setZipContents(zipData);
        const structure = buildFileStructure(data);
        setFileStructure(structure);
      } catch (err) {
        console.error('Error fetching ZIP contents:', err);
        setZipContents(null);
      } finally {
        setLoadingZip(false);
      }
    };
    if (shortId) {
      fetchFileData();
    }
  }, [shortId, submittedPassword]);
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedPassword(password);
  };
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    } else if (['mp4', 'webm', 'avi', 'mov'].includes(extension)) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    } else if (['mp3', 'wav', 'ogg'].includes(extension)) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      );
    } else if (['pdf'].includes(extension)) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      );
    } else {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
  };
  const getFolderIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
  const isImage = fileData?.contentType.startsWith('image/');
  const isVideo = fileData?.contentType.startsWith('video/');
  const isAudio = fileData?.contentType.startsWith('audio/');
  const isZip = fileData?.contentType.includes('zip') || fileData?.fileName.toLowerCase().endsWith('.zip');
  const currentDirContents = getCurrentDirectoryContents();
  const PreviewComponent = ({ preview }: { preview: PreviewData }) => {
    return (
      <div className="relative bg-gray-900 rounded-lg overflow-hidden">
        <div className="flex">
          { }
          <div className="pr-4 py-4 text-gray-500 select-none bg-gray-800 text-right">
            {Array.from({ length: preview.lineCount }, (_, i) => (
              <div key={i + 1} className="leading-5 px-2">
                {i + 1}
              </div>
            ))}
          </div>
          { }
          <div className="overflow-auto p-4 w-full">
            <pre className="language-{preview.language}">
              <code 
                dangerouslySetInnerHTML={{ __html: preview.content }}
                className="leading-5 inline-block min-w-full"
              />
            </pre>
          </div>
        </div>
      </div>
    );
  };
  const renderFileContent = () => {
    if (!fileData) return null;
    if (fileData.contentType.includes('zip') || fileData.fileName.toLowerCase().endsWith('.zip')) {
      return renderZipContents();
    }
    if (fileData.contentType === 'application/pdf') {
      return (
        <div className="w-full h-[800px] rounded-lg overflow-hidden">
          <iframe
            src={`${fileData.publicUrl}#toolbar=0`}
            className="w-full h-full border-0"
            title={fileData.fileName}
          />
        </div>
      );
    }
    if (previewData) {
      return <PreviewComponent preview={previewData} />;
    }
    if (isImage) {
      return (
        <div className="max-h-[800px] overflow-hidden rounded-lg">
          <img 
            src={fileData.publicUrl} 
            alt={fileData.fileName}
            className="max-w-full h-auto object-contain"
          />
        </div>
      );
    }
    if (isVideo) {
      return (
        <div className="max-h-[800px] overflow-hidden rounded-lg">
          <video 
            controls 
            className="max-w-full max-h-[800px]"
          >
            <source src={fileData.publicUrl} type={fileData.contentType} />
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }
    if (isAudio) {
      return (
        <div className="p-8 bg-gray-900 rounded-lg">
          <audio controls className="w-full">
            <source src={fileData.publicUrl} type={fileData.contentType} />
            Your browser does not support the audio tag.
          </audio>
        </div>
      );
    }
    return (
      <div className="text-center p-8 bg-gray-900 rounded-lg">
        <p className="mb-4">This file type cannot be previewed.</p>
      </div>
    );
  };
  const DownloadButton = () => {
    if (!fileData) return null;
    const handleDownload = () => {
      const passwordParam = submittedPassword ? `?password=${encodeURIComponent(submittedPassword)}` : '';
      window.location.href = `/${shortId}/download${passwordParam}`;
    };
    return (
      <button
        onClick={handleDownload}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download
      </button>
    );
  };
  const renderZipContents = () => {
    if (loadingZip) {
      return (
        <div className="text-center py-8">
          <div className="animate-pulse text-lg">Loading ZIP contents...</div>
        </div>
      );
    }
    if (!zipContents) {
      return (
        <div className="text-center py-8 border border-[#333] rounded-lg bg-[#121212]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p>Failed to load ZIP contents.</p>
        </div>
      );
    }
    if (!zipContents.contents || zipContents.contents.length === 0) {
      return (
        <div className="text-center py-8 border border-[#333] rounded-lg bg-[#121212]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <p>This ZIP file is empty.</p>
        </div>
      );
    }
    return (
      <div className="bg-[#1e1e1e] rounded-lg overflow-hidden">
        { }
        <div className="flex items-center p-3 bg-[#252525] border-b border-[#333]">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.path} className="flex items-center">
              {index > 0 && (
                <span className="mx-2 text-gray-500">/</span>
              )}
              <button
                onClick={() => navigateToDirectory(crumb.path)}
                className="text-blue-400 hover:text-blue-300"
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>
        { }
        <div className="divide-y divide-[#333]">
          { }
          {currentPath.length > 0 && (
            <div 
              className="flex items-center p-3 hover:bg-[#1a1a1a] transition-colors cursor-pointer border-b border-[#222]"
              onClick={navigateUp}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              ..
            </div>
          )}
          { }
          {currentDirContents
            .filter(entry => entry.isDirectory)
            .map(entry => (
              <div
                key={entry.path}
                className="flex items-center p-3 hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                onClick={() => navigateToDirectory(entry.path)}
              >
                {getFolderIcon()}
                <span className="ml-2">{entry.name}</span>
              </div>
            ))}
          { }
          {currentDirContents
            .filter(entry => !entry.isDirectory)
            .map(entry => (
              <div
                key={entry.path}
                className="flex items-center justify-between p-3 hover:bg-[#1a1a1a] transition-colors"
              >
                <div className="flex items-center">
                  {getFileIcon(entry.name)}
                  <span className="ml-2">{entry.name}</span>
                  <span className="ml-4 text-gray-500 text-sm">
                    {formatFileSize((entry as FileEntry).size)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    const passwordParam = submittedPassword ? `?password=${encodeURIComponent(submittedPassword)}` : '';
                    window.location.href = `/${shortId}/extract?path=${encodeURIComponent(entry.path)}&download=true${passwordParam}`;
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                >
                  Download
                </button>
              </div>
            ))}
        </div>
      </div>
    );
  };
  if (isLoading && !passwordRequired) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-3xl mx-auto text-center">
          <div className="animate-pulse text-xl">Loading...</div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-3xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Error</h1>
          <p className="text-lg mb-4">{error}</p>
          <Link href="/" className="text-blue-500 hover:underline">
            Go back to upload page
          </Link>
        </div>
      </div>
    );
  }
  if (passwordRequired) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-center">Password Protected</h2>
            <p className="mb-4 text-center">This file is protected by a password.</p>
            {passwordError && (
              <div className="mb-4 p-3 bg-red-800/50 border border-red-700 rounded-lg text-white text-sm">
                Incorrect password. Please try again.
              </div>
            )}
            <form onSubmit={handlePasswordSubmit}>
              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium mb-1">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#121212] border border-[#333] rounded-lg focus:outline-none focus:border-[#3b82f6]"
                  placeholder="Enter password"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#3b82f6] text-white py-2 rounded-lg hover:bg-[#2563eb] transition-colors"
              >
                Unlock File
              </button>
            </form>
            <div className="mt-4 text-center">
              <Link href="/" className="text-[#3b82f6] hover:underline text-sm">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!fileData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-3xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-red-500 mb-4">File Not Found</h1>
          <p className="text-lg mb-4">The requested file could not be found or has expired.</p>
          <Link href="/" className="text-blue-500 hover:underline">
            Go back to upload page
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen flex flex-col pt-20">
      <div className="flex-grow w-full max-w-4xl mx-auto px-4 py-8">
        <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2 break-all">{fileData.fileName}</h1>
          <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">File Size</p>
              <p>{formatFileSize(fileData.fileSize)}</p>
            </div>
            <div>
              <p className="text-gray-400">Uploaded</p>
              <p>{formatDate(fileData.uploadedAt)}</p>
            </div>
            <div>
              <p className="text-gray-400">Expires</p>
              <p>{formatDate(fileData.expiresAt)}</p>
            </div>
            <div>
              <p className="text-gray-400">Type</p>
              <p>{fileData.contentType}</p>
            </div>
            <div>
              <p className="text-gray-400">Uploaded By</p>
              <p>{fileData.uploaderUsername || 'Anonymous'}</p>
            </div>
          </div>
          { }
          {!isZip && (
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-4">Preview</h2>
              <div className="border border-[#333] rounded-lg overflow-hidden bg-[#121212]">
                {renderFileContent()}
              </div>
            </div>
          )}
          { }
          {isZip && (
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-2">ZIP Contents</h2>
              {renderZipContents()}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <a
              href={`/${shortId}/raw${submittedPassword ? `?password=${encodeURIComponent(submittedPassword)}` : ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#2d2d2d] text-white text-center py-2 rounded-lg hover:bg-[#3a3a3a] transition-colors"
            >
              View Raw
            </a>
            <a
              href={`/${shortId}/download${submittedPassword ? `?password=${encodeURIComponent(submittedPassword)}` : ''}`}
              download={fileData.fileName}
              className="bg-[#3b82f6] text-white text-center py-2 rounded-lg hover:bg-[#2563eb] transition-colors"
            >
              Download
            </a>
          </div>
        </div>
        <div className="text-center">
          <Link href="/" className="text-[#3b82f6] hover:underline">
            Upload Another File
          </Link>
        </div>
      </div>
    </div>
  );
}