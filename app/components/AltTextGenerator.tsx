'use client';

import React, { useState, forwardRef, useImperativeHandle } from 'react';
import Image from 'next/image';

export interface AltTextGeneratorRef {
  clearData: () => void;
}

const AltTextGenerator = forwardRef<AltTextGeneratorRef>((props, ref) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [altText, setAltText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const clearData = () => {
    setSelectedFile(null);
    setAltText('');
    setIsLoading(false);
    setError('');
    setPreviewUrl(null);
    setIsDragOver(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setSelectedFile(file);
    setError('');
    setAltText('');
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const uploadImage = async () => {
    if (!selectedFile) {
      setError('Please select an image file');
      return;
    }

    setIsLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      const response = await fetch('/api/alt-text/generate', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to generate alt text');
      }

      const data = await response.json();
      setAltText(data.altText);
    } catch (error) {
      console.error('Error:', error);
      setError('Error generating alt text. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const [copyButtonText, setCopyButtonText] = useState('📋 Copy Alt Text');

  const copyAltText = () => {
    if (altText) {
      navigator.clipboard.writeText(altText).then(() => {
        setCopyButtonText('✅ Copied!');
        setTimeout(() => {
          setCopyButtonText('📋 Copy Alt Text');
        }, 2000);
      }).catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = altText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopyButtonText('✅ Copied!');
        setTimeout(() => {
          setCopyButtonText('📋 Copy Alt Text');
        }, 2000);
      });
    }
  };

  const editAltText = () => {
    // This could open a modal or make the textarea editable
    // For now, we'll just focus on the textarea
    const textarea = document.getElementById('altTextResult') as HTMLTextAreaElement;
    if (textarea) {
      textarea.focus();
      textarea.select();
    }
  };

  useImperativeHandle(ref, () => ({
    clearData
  }));

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h3 className="text-xl font-bold mb-4 text-gray-800 border-b border-gray-300 pb-2">
        🖼️ Alt-Text Generator
      </h3>
      <p className="text-gray-600 mb-6">
        Generate descriptive alt text for images to improve accessibility
      </p>

      {/* Upload Area */}
      <div className="mb-6">
        <div 
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="imageUpload"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <label
            htmlFor="imageUpload"
            className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            📁 Select Image
          </label>
          <p className="text-sm text-gray-500 mt-2">
            {isDragOver ? 'Drop your image here' : 'Drag and drop an image here, or click to select'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Supported formats: JPG, PNG, GIF, WebP
          </p>
        </div>

        {selectedFile && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">
              Selected: {selectedFile.name}
            </p>
            {previewUrl && (
              <div className="max-w-xs">
                <Image
                  src={previewUrl}
                  alt="Preview"
                  width={200}
                  height={150}
                  className="w-full h-auto rounded border"
                />
              </div>
            )}
            <button
              onClick={uploadImage}
              disabled={isLoading}
              className="mt-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors"
            >
              {isLoading ? 'Generating...' : 'Generate Alt Text'}
            </button>
          </div>
        )}
      </div>

      {/* Result Area */}
      {altText && (
        <div className="mb-4">
          <label htmlFor="altTextResult" className="block text-sm font-medium text-gray-700 mb-2">
            Generated Alt Text:
          </label>
          <textarea
            id="altTextResult"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            rows={4}
            className="w-full p-3 border border-gray-300 rounded-md resize-none"
            placeholder="Generated alt text will appear here..."
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={copyAltText}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              {copyButtonText}
            </button>
            <button
              onClick={editAltText}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              ✏️ Edit
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm mt-2">
          {error}
        </div>
      )}
    </div>
  );
});

AltTextGenerator.displayName = 'AltTextGenerator';

export default AltTextGenerator; 