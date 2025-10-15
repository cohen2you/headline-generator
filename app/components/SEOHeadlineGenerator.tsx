'use client';

import React, { useState, forwardRef, useImperativeHandle } from 'react';

export interface SEOHeadlineGeneratorRef {
  clearData: () => void;
}

const SEOHeadlineGenerator = forwardRef<SEOHeadlineGeneratorRef>((props, ref) => {
  const [headline, setHeadline] = useState('');
  const [seoHeadlines, setSeoHeadlines] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const clearData = () => {
    setHeadline('');
    setSeoHeadlines([]);
    setLoading(false);
    setError('');
    setCopiedIndex(null);
  };

  useImperativeHandle(ref, () => ({
    clearData
  }));

  async function generateSEOHeadlines() {
    if (!headline.trim()) {
      setError('Please enter a headline to optimize.');
      return;
    }

    setSeoHeadlines([]);
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/generate/seo-headline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline: headline.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to generate SEO headlines');
      }

      const data = await res.json();
      setSeoHeadlines(data.seoHeadlines || []);

      if (data.seoHeadlines.length === 0) {
        setError('No SEO headlines generated.');
      }
    } catch (error: unknown) {
      console.error('Error generating SEO headlines:', error);
      if (error instanceof Error) setError(error.message);
      else setError(String(error));
    } finally {
      setLoading(false);
    }
  }

  const copyHeadline = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const clearResults = () => {
    setSeoHeadlines([]);
    setError('');
    setCopiedIndex(null);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8">
      <h2 className="text-2xl font-bold mb-4 text-indigo-800">SEO Headline Generator</h2>
      
      <div className="mb-4">
        <label htmlFor="headline" className="block text-sm font-medium text-gray-700 mb-2">
          Enter Headline to Optimize:
        </label>
        <input
          id="headline"
          type="text"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !loading) {
              generateSEOHeadlines();
            }
          }}
          placeholder="Enter your headline here..."
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          disabled={loading}
        />
      </div>

      <div className="flex gap-3 mb-4">
        <button
          onClick={generateSEOHeadlines}
          disabled={loading || !headline.trim()}
          className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {loading ? 'Generating...' : 'Generate SEO Headlines'}
        </button>
        
        {seoHeadlines.length > 0 && (
          <button
            onClick={clearResults}
            className="px-6 py-3 bg-gray-500 text-white rounded-md hover:bg-gray-600 font-medium transition-colors"
          >
            Clear Results
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 mb-4">
          {error}
        </div>
      )}

      {seoHeadlines.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg text-gray-800 mb-3">
            SEO-Optimized Headlines ({seoHeadlines.length}):
          </h3>
          
          {seoHeadlines.map((seoHeadline, index) => (
            <div
              key={index}
              className="p-4 bg-indigo-50 border border-indigo-200 rounded-md"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-indigo-600 mb-1">
                    {index === 0 ? 'Option 1 (Similar to Original)' : `Option ${index + 1} (Alternative Angle)`}
                  </div>
                  <div className="text-base font-medium text-gray-900">
                    {seoHeadline}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {seoHeadline.split(' ').length} words
                  </div>
                </div>
                
                <button
                  onClick={() => copyHeadline(seoHeadline, index)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium text-sm whitespace-nowrap transition-colors"
                >
                  {copiedIndex === index ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

SEOHeadlineGenerator.displayName = 'SEOHeadlineGenerator';

export default SEOHeadlineGenerator;

