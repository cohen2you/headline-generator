'use client';

import React, { useState, forwardRef, useImperativeHandle } from 'react';

export interface MSNHeadlineGeneratorRef {
  clearData: () => void;
}

const MSNHeadlineGenerator = forwardRef<MSNHeadlineGeneratorRef>((props, ref) => {
  const [articleText, setArticleText] = useState('');
  const [headlines, setHeadlines] = useState<{
    level1: string[];
    level2: string[];
    level3: string[];
  }>({
    level1: [],
    level2: [],
    level3: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const clearData = () => {
    setArticleText('');
    setHeadlines({ level1: [], level2: [], level3: [] });
    setError('');
  };

  useImperativeHandle(ref, () => ({
    clearData
  }));

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  async function generateHeadlines() {
    if (!articleText.trim()) {
      setError('Please paste article text first.');
      return;
    }

    setError('');
    setLoading(true);
    setHeadlines({ level1: [], level2: [], level3: [] });

    try {
      const res = await fetch('/api/generate/msn-headlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleText }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to generate headlines');
      }

      const data = await res.json();
      setHeadlines({
        level1: data.level1 || [],
        level2: data.level2 || [],
        level3: data.level3 || [],
      });
    } catch (error: unknown) {
      console.error('Error generating MSN headlines:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-gray-300 rounded-lg p-6 bg-white">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b border-gray-300 pb-2">
        MSN Headline Generator
      </h2>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Article Text
        </label>
        <textarea
          rows={8}
          className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Paste article text here..."
          value={articleText}
          onChange={(e) => setArticleText(e.target.value)}
        />
      </div>

      <button
        onClick={generateHeadlines}
        disabled={loading || !articleText.trim()}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md transition-colors font-medium"
      >
        {loading ? 'Generating Headlines...' : 'Generate Headlines'}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {(headlines.level1.length > 0 || headlines.level2.length > 0 || headlines.level3.length > 0) && (
        <div className="mt-6 space-y-6">
          {/* Level 1 - Moderate Strength */}
          {headlines.level1.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">
                Level 1 (Moderate Strength)
              </h3>
              <div className="space-y-2">
                {headlines.level1.map((headline, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between p-3 bg-white border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    <span className="flex-1 text-gray-800">{headline}</span>
                    <button
                      onClick={() => copyToClipboard(headline)}
                      className="ml-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Copy
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Level 2 - Strong Strength */}
          {headlines.level2.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">
                Level 2 (Strong Strength)
              </h3>
              <div className="space-y-2">
                {headlines.level2.map((headline, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between p-3 bg-white border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    <span className="flex-1 text-gray-800">{headline}</span>
                    <button
                      onClick={() => copyToClipboard(headline)}
                      className="ml-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Copy
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Level 3 - Maximum Strength */}
          {headlines.level3.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4 bg-red-50">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">
                Level 3 (Maximum Strength)
              </h3>
              <div className="space-y-2">
                {headlines.level3.map((headline, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between p-3 bg-white border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    <span className="flex-1 text-gray-800 font-medium">{headline}</span>
                    <button
                      onClick={() => copyToClipboard(headline)}
                      className="ml-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Copy
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

MSNHeadlineGenerator.displayName = 'MSNHeadlineGenerator';

export default MSNHeadlineGenerator;
