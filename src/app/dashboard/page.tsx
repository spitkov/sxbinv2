'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import PasswordModal from '@/components/PasswordModal';
import ShareXTab from '@/components/ShareXTab';
interface UserFile {
  id: string;
  shortId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  uploadedAt: string;
  expiresAt: string;
  publicUrl: string;
  passwordHash: string | null;
}
type TabType = 'files' | 'sharex';
export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [files, setFiles] = useState<UserFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<UserFile | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('files');
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);
  useEffect(() => {
    const fetchFiles = async () => {
      if (!user) return;
      try {
        const response = await fetch('/api/files/user');
        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch files');
        }
        const data = await response.json();
        setFiles(data.files);
      } catch (error) {
        console.error('Error fetching files:', error);
      } finally {
        setFilesLoading(false);
      }
    };
    if (user) {
      fetchFiles();
    }
  }, [user, router]);
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
  const handlePasswordUpdate = async (password: string) => {
    if (!selectedFile) return;
    try {
      const response = await fetch(`/api/files/${selectedFile.shortId}/password`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          password: password || null 
        })
      });
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to update password');
      }
      const data = await response.json();
      setFiles(files.map(file => 
        file.shortId === selectedFile.shortId 
          ? { ...file, passwordHash: data.passwordHash }
          : file
      ));
      setIsPasswordModalOpen(false);
      setSelectedFile(null);
    } catch (error) {
      console.error('Error updating password:', error);
      alert('Failed to update password. Please try again.');
    }
  };
  const handleDelete = async (shortId: string) => {
    if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      return;
    }
    try {
      const response = await fetch(`/api/files/${shortId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to delete file');
      }
      setFiles(files.filter(file => file.shortId !== shortId));
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }
  const renderTabs = () => (
    <div className="border-b border-[#333] mb-6">
      <div className="flex space-x-1">
        <button
          onClick={() => setActiveTab('files')}
          className={`px-4 py-2 -mb-px ${
            activeTab === 'files'
              ? 'border-b-2 border-blue-500 text-blue-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Your Files
        </button>
        <button
          onClick={() => setActiveTab('sharex')}
          className={`px-4 py-2 -mb-px ${
            activeTab === 'sharex'
              ? 'border-b-2 border-blue-500 text-blue-500'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          ShareX Integration
        </button>
      </div>
    </div>
  );
  const renderFilesTab = () => (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Your Files</h1>
        <Link
          href="/"
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Upload New File
        </Link>
      </div>
      {filesLoading ? (
        <div className="text-center py-12">
          <div className="animate-pulse text-lg">Loading your files...</div>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[#333] rounded-lg">
          <p className="text-gray-400 mb-4">You haven't uploaded any files yet</p>
          <Link
            href="/"
            className="text-[#3b82f6] hover:underline"
          >
            Upload your first file
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto border border-[#333] rounded-lg bg-[#1e1e1e]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#333] text-left bg-[#252525]">
                <th className="py-3 px-4 font-medium">File Name</th>
                <th className="py-3 px-4 font-medium">Size</th>
                <th className="py-3 px-4 font-medium">Uploaded</th>
                <th className="py-3 px-4 font-medium">Expires</th>
                <th className="py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#333]">
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="py-3 px-4">
                    <Link 
                      href={`/${file.shortId}`}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      {file.fileName}
                    </Link>
                    {file.passwordHash && (
                      <span className="ml-2 text-xs bg-yellow-600/20 text-yellow-500 px-2 py-0.5 rounded">
                        Protected
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-400">
                    {formatFileSize(file.fileSize)}
                  </td>
                  <td className="py-3 px-4 text-gray-400">
                    {formatDate(file.uploadedAt)}
                  </td>
                  <td className="py-3 px-4 text-gray-400">
                    {formatDate(file.expiresAt)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedFile(file);
                          setIsPasswordModalOpen(true);
                        }}
                        className="text-sm bg-[#2d2d2d] hover:bg-[#3a3a3a] text-white px-3 py-1 rounded transition-colors"
                      >
                        {file.passwordHash ? 'Change Password' : 'Add Password'}
                      </button>
                      <button
                        onClick={() => handleDelete(file.shortId)}
                        className="text-sm bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
  return (
    <div className="min-h-screen bg-[#121212] p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {renderTabs()}
        {activeTab === 'files' ? renderFilesTab() : <ShareXTab />}
      </div>
      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setSelectedFile(null);
        }}
        onSubmit={handlePasswordUpdate}
        title={selectedFile?.passwordHash ? 'Change Password' : 'Add Password'}
        description={
          selectedFile?.passwordHash
            ? 'Enter a new password for this file. Leave blank to remove password protection.'
            : 'Add a password to protect this file. Only users with the password will be able to access it.'
        }
      />
    </div>
  );
} 