'use client';

import { forwardRef, useImperativeHandle, useState } from 'react';

export interface ImageGeneratorRef {
  clearData: () => void;
}

interface ImageIdea {
  title: string;
  description: string;
  prompt: string;
}

const ImageGenerator = forwardRef<ImageGeneratorRef>((props, ref) => {
  const [articleText, setArticleText] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageIdeas, setImageIdeas] = useState<ImageIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<ImageIdea | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [copiedAltText, setCopiedAltText] = useState(false);
  const [copiedCutline, setCopiedCutline] = useState(false);
  const [error, setError] = useState('');
  const [provider, setProvider] = useState<'openai' | 'gemini'>('openai');

  const cutline = 'Image created using artificial intelligence via DALL-E.';

  const clearData = () => {
    setArticleText('');
    setCustomPrompt('');
    setImageIdeas([]);
    setSelectedIdea(null);
    setGeneratedImageUrl('');
    setAltText('');
    setError('');
    setCopiedAltText(false);
    setCopiedCutline(false);
  };

  useImperativeHandle(ref, () => ({
    clearData
  }));

  async function generateImageIdeas() {
    if (!articleText.trim()) {
      setError('Please enter a headline or article text.');
      return;
    }

    setLoading(true);
    setError('');
    setImageIdeas([]);
    setSelectedIdea(null);
    setGeneratedImageUrl('');

    try {
      const res = await fetch('/api/generate/image-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleText, provider }),
      });

      if (!res.ok) throw new Error('Failed to generate image ideas');

      const data = await res.json();
      setImageIdeas(data.ideas);
    } catch (err) {
      console.error('Error generating image ideas:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate image ideas');
    } finally {
      setLoading(false);
    }
  }

  async function generateImage(idea: ImageIdea) {
    setSelectedIdea(idea);
    setGeneratingImage(true);
    setError('');
    setGeneratedImageUrl('');
    setAltText('');

    try {
      const res = await fetch('/api/generate/dalle-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: idea.prompt, description: idea.description, provider }),
      });

      if (!res.ok) throw new Error('Failed to generate image');

      const data = await res.json();
      setGeneratedImageUrl(data.imageUrl);
      setAltText(data.altText || '');
    } catch (err) {
      console.error('Error generating image:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setGeneratingImage(false);
    }
  }

  async function generateFromCustomPrompt() {
    if (!customPrompt.trim()) {
      setError('Please enter a custom prompt.');
      return;
    }

    setGeneratingImage(true);
    setError('');
    setGeneratedImageUrl('');
    setAltText('');
    setImageIdeas([]);

    try {
      // Step 1: Optimize the prompt with GPT-4
      console.log('Optimizing prompt with GPT-4...');
      const optimizeRes = await fetch('/api/generate/optimize-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: customPrompt }),
      });

      if (!optimizeRes.ok) throw new Error('Failed to optimize prompt');
      
      const { optimizedPrompt } = await optimizeRes.json();
      console.log('Optimized prompt:', optimizedPrompt);

      // Step 2: Generate image with optimized prompt
      console.log('Generating image with DALL-E...');
      const res = await fetch('/api/generate/dalle-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: optimizedPrompt,
          description: customPrompt, // Use the simple prompt as description for alt-text
          provider
        }),
      });

      if (!res.ok) throw new Error('Failed to generate image');

      const data = await res.json();
      setGeneratedImageUrl(data.imageUrl);
      setAltText(data.altText || '');
    } catch (err) {
      console.error('Error generating image from custom prompt:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setGeneratingImage(false);
    }
  }

  function downloadImage() {
    if (!generatedImageUrl) return;

    try {
      // Create a temporary link element
      const a = document.createElement('a');
      a.href = generatedImageUrl;
      a.download = `article-image-${Date.now()}.png`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading image:', err);
      setError('Failed to download image. Please right-click the image and select "Save image as..."');
    }
  }

  return (
    <section className="p-4 border border-indigo-500 rounded-md max-w-4xl mx-auto">
      <h2 className="text-lg font-semibold mb-4 text-indigo-700">Article Image Generator</h2>
      
      {/* AI Provider Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          AI Provider (for text generation)
        </label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as 'openai' | 'gemini')}
          className="w-full p-2 border border-indigo-400 rounded"
        >
          <option value="openai">OpenAI (GPT-4o)</option>
          <option value="gemini">Gemini (2.5 Flash)</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">Note: Images are always generated with DALL-E. This setting controls text generation (image ideas and alt-text).</p>
      </div>

      {/* Custom Prompt Input */}
      <div className="mb-6 p-4 bg-indigo-50 border border-indigo-300 rounded">
        <h3 className="text-md font-semibold text-indigo-700 mb-2">Quick Custom Image</h3>
        <p className="text-xs text-gray-600 mb-3">Enter a simple description - GPT-4 will optimize it for best results</p>
        <input
          type="text"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="e.g., A bull and bear charging through Wall Street"
          className="w-full p-3 border border-indigo-300 rounded text-sm mb-3"
          onKeyPress={(e) => e.key === 'Enter' && generateFromCustomPrompt()}
        />
        <button
          onClick={generateFromCustomPrompt}
          disabled={generatingImage || !customPrompt.trim()}
          className="bg-indigo-700 text-white px-6 py-2 rounded disabled:bg-indigo-300"
        >
          {generatingImage ? 'Generating...' : '⚡ Generate Image Now'}
        </button>
      </div>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-indigo-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-indigo-600 font-medium">OR Generate from Article</span>
        </div>
      </div>

      {/* Article Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-indigo-700 mb-2">
          Enter Headline or Article:
        </label>
        <textarea
          value={articleText}
          onChange={(e) => setArticleText(e.target.value)}
          placeholder="Paste your headline or full article here..."
          rows={6}
          className="w-full p-3 border border-indigo-300 rounded resize-none text-sm"
        />
      </div>

      <button
        onClick={generateImageIdeas}
        disabled={loading || !articleText.trim()}
        className="bg-indigo-600 text-white px-6 py-2 rounded disabled:bg-indigo-300 mb-4"
      >
        {loading ? 'Generating Ideas...' : 'Generate Image Ideas'}
      </button>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {imageIdeas.length > 0 && !generatedImageUrl && (
        <div className="mb-4">
          <h3 className="text-md font-semibold text-indigo-700 mb-3">Choose an Image Concept:</h3>
          <div className="grid gap-4">
            {imageIdeas.map((idea, index) => (
              <div
                key={index}
                className="border border-indigo-300 rounded p-4 hover:bg-indigo-50 cursor-pointer transition-colors"
                onClick={() => !generatingImage && generateImage(idea)}
              >
                <h4 className="font-semibold text-indigo-900 mb-2">{idea.title}</h4>
                <p className="text-sm text-gray-700">{idea.description}</p>
                {generatingImage && selectedIdea === idea && (
                  <p className="text-sm text-indigo-600 mt-2">Generating image...</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {generatedImageUrl && (
        <div className="mb-4">
          <h3 className="text-md font-semibold text-indigo-700 mb-3">Generated Image:</h3>
          <div className="border border-indigo-300 rounded p-4 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={generatedImageUrl}
              alt={altText}
              className="w-full rounded mb-4"
            />
            
            {/* Alt Text */}
            {altText && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">Alt Text:</label>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(altText);
                      setCopiedAltText(true);
                      setTimeout(() => setCopiedAltText(false), 2000);
                    }}
                    className="bg-indigo-500 text-white px-3 py-1 rounded text-sm hover:bg-indigo-600"
                  >
                    {copiedAltText ? '✓ Copied!' : 'Copy Alt Text'}
                  </button>
                </div>
                <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm text-gray-800">
                  {altText}
                </div>
              </div>
            )}

            {/* Cutline */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700">Cutline:</label>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(cutline);
                    setCopiedCutline(true);
                    setTimeout(() => setCopiedCutline(false), 2000);
                  }}
                  className="bg-indigo-500 text-white px-3 py-1 rounded text-sm hover:bg-indigo-600"
                >
                  {copiedCutline ? '✓ Copied!' : 'Copy Cutline'}
                </button>
              </div>
              <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm text-gray-800 italic">
                {cutline}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={downloadImage}
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                📥 Download Image
              </button>
              <button
                onClick={() => window.open(generatedImageUrl, '_blank')}
                className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
              >
                🔗 Open in New Tab
              </button>
              <button
                onClick={() => {
                  setGeneratedImageUrl('');
                  setSelectedIdea(null);
                  setAltText('');
                  setCopiedAltText(false);
                  setCopiedCutline(false);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Generate Another
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
});

ImageGenerator.displayName = 'ImageGenerator';

export default ImageGenerator;

