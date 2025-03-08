import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
interface ShareXConfig {
  Version: string;
  Name: string;
  DestinationType: string;
  RequestMethod: string;
  RequestURL: string;
  Headers: {
    Authorization: string;
  };
  ResponseType: string;
  URL: string;
}
export default function ShareXTab() {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  useEffect(() => {
    fetchApiKey();
  }, []);
  const fetchApiKey = async () => {
    try {
      const response = await fetch('/api/user/apikey');
      if (response.ok) {
        const data = await response.json();
        setApiKey(data.apiKey);
      }
    } catch (error) {
      console.error('Error fetching API key:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleResetApiKey = async () => {
    if (!confirm('Are you sure you want to reset your API key? All existing ShareX configurations will need to be updated.')) {
      return;
    }
    try {
      const response = await fetch('/api/user/apikey', {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        setApiKey(data.apiKey);
      }
    } catch (error) {
      console.error('Error resetting API key:', error);
    }
  };
  const generateShareXConfig = () => {
    const baseUrl = window.location.origin;
    const config: ShareXConfig = {
      Version: "15.0.0",
      Name: "sxbin.gay",
      DestinationType: "ImageUploader, FileUploader", 
      RequestMethod: "POST",
      RequestURL: `${baseUrl}/api/upload`,
      Headers: {
        Authorization: apiKey
      },
      ResponseType: "Text",
      URL: "$json:url$"
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sxbin-uploader.sxcu`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">ShareX Integration</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Your API Key
            </label>
            <div className="flex items-center space-x-4">
              <div className="flex-1 font-mono bg-[#121212] rounded-lg p-3 relative">
                <div 
                  className={`transition-all duration-200 ${showApiKey ? 'blur-none' : 'blur-md'}`}
                  onMouseEnter={() => setShowApiKey(true)}
                  onMouseLeave={() => setShowApiKey(false)}
                >
                  {apiKey}
                </div>
              </div>
              <button
                onClick={handleResetApiKey}
                className="bg-yellow-600/20 text-yellow-500 px-4 py-2 rounded-lg hover:bg-yellow-600/30 transition-colors"
              >
                Reset Key
              </button>
            </div>
          </div>
          <div className="border-t border-[#333] pt-4">
            <div className="flex">
              <button
                onClick={generateShareXConfig}
                className="bg-[#2d2d2d] hover:bg-[#3a3a3a] text-white px-4 py-2 rounded-lg transition-colors flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Download ShareX Configuration
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Download and import this configuration into ShareX to enable quick uploads for both images and files.
            </p>
          </div>
        </div>
      </div>
      <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6">
        <h3 className="text-lg font-medium mb-3">Setup Instructions</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-300">
          <li>Download the universal uploader configuration</li>
          <li>Open ShareX and go to "Destinations" → "Custom uploader settings"</li>
          <li>Click "Import" → "From file" and select the downloaded .sxcu file</li>
          <li>Go to "Destinations" → "Image uploader" and select "Custom image uploader"</li>
          <li>Go to "Destinations" → "File uploader" and select "Custom file uploader"</li>
          <li>Test your configuration using the "Test" button in the custom uploader settings</li>
        </ol>
      </div>
    </div>
  );
} 