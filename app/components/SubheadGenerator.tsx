'use client';

import React, { useState, forwardRef, useImperativeHandle } from 'react';

interface SubheadGeneratorProps {
  articleText: string;
}

export interface SubheadGeneratorRef {
  clearData: () => void;
}

const SubheadGenerator = forwardRef<SubheadGeneratorRef, SubheadGeneratorProps>(({ articleText }, ref) => {
  // H2 Generator state & loading
  const [articleWithH2s, setArticleWithH2s] = useState('');
  const [h2HeadingsOnly, setH2HeadingsOnly] = useState<string[]>([]);
  const [loadingH2s, setLoadingH2s] = useState(false);
  const [h2Error, setH2Error] = useState('');
  const [copiedH2Index, setCopiedH2Index] = useState<number | null>(null);
  const [copiedAllH2s, setCopiedAllH2s] = useState(false);
  const [copiedArticleWithH2s, setCopiedArticleWithH2s] = useState(false);

  const clearData = () => {
    setArticleWithH2s('');
    setH2HeadingsOnly([]);
    setLoadingH2s(false);
    setH2Error('');
    setCopiedH2Index(null);
    setCopiedAllH2s(false);
    setCopiedArticleWithH2s(false);
  };

  useImperativeHandle(ref, () => ({
    clearData
  }));

  async function generateH2s() {
    if (!articleText.trim()) {
      setH2Error('Please enter article text first.');
      return;
    }
    setArticleWithH2s('');
    setH2HeadingsOnly([]);
    setH2Error('');
    setLoadingH2s(true);
    try {
      const res = await fetch('/api/generate/h2s', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleText }),
      });
      if (!res.ok) throw new Error('Failed to generate H2s');
      const data = await res.json();
      setArticleWithH2s(data.articleWithH2s);
      setH2HeadingsOnly(data.h2HeadingsOnly);
    } catch (error: unknown) {
      console.error('Error generating H2s:', error);
      if (error instanceof Error) setH2Error(error.message);
      else setH2Error(String(error));
    } finally {
      setLoadingH2s(false);
    }
  }

  return (
    <section className="p-4 border border-indigo-600 rounded-md max-w-4xl mx-auto">
      <h2 className="text-lg font-semibold mb-4 text-indigo-700">Subhead Generator</h2>
      <button
        onClick={generateH2s}
        disabled={loadingH2s || !articleText.trim()}
        className="bg-indigo-600 text-white px-4 py-2 rounded disabled:bg-indigo-300 mb-4"
      >
        {loadingH2s ? 'Generating Subheads...' : 'Generate Subheads'}
      </button>
      {h2Error && <p className="text-red-600 mb-4">{h2Error}</p>}
      
      {/* Subheads Section */}
      {h2HeadingsOnly.length > 0 && (
        <div className="mb-6">
          <h3 className="text-md font-semibold mb-3 text-indigo-600">Generated Subheads (Easy Copy)</h3>
          <p className="text-sm text-gray-600 mb-3">These subheads provide specific perspective on the content that follows, serving as compelling section introductions.</p>
          <div className="bg-indigo-50 border border-indigo-200 rounded p-4 mb-3">
            <ol className="list-decimal list-inside space-y-3">
              {h2HeadingsOnly.map((heading, index) => (
                <li key={index} className="flex justify-between items-center">
                  <span className="font-semibold text-indigo-800 text-lg">{heading}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(heading);
                      setCopiedH2Index(index);
                      setTimeout(() => setCopiedH2Index(null), 2000);
                    }}
                    className="bg-indigo-200 hover:bg-indigo-300 text-indigo-800 px-2 py-1 rounded text-xs"
                    title="Copy plain text"
                  >
                    {copiedH2Index === index ? 'Copied!' : 'Copy'}
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <button
            onClick={() => {
              const allHeadings = h2HeadingsOnly.join('\n');
              navigator.clipboard.writeText(allHeadings);
              setCopiedAllH2s(true);
              setTimeout(() => setCopiedAllH2s(false), 2000);
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded mb-4"
          >
            {copiedAllH2s ? 'Copied!' : 'Copy All Subheads'}
          </button>
        </div>
      )}
      
      {/* Full Article with H2s Section */}
      {articleWithH2s && (
        <>
          <h3 className="text-md font-semibold mb-3 text-indigo-600">Full Article with H2s Embedded</h3>
          <textarea
            readOnly
            value={articleWithH2s}
            rows={16}
            className="w-full p-3 border border-indigo-400 rounded resize-none font-mono text-sm mb-2"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(articleWithH2s);
              setCopiedArticleWithH2s(true);
              setTimeout(() => setCopiedArticleWithH2s(false), 2000);
            }}
            className="bg-indigo-700 text-white px-4 py-2 rounded"
          >
            {copiedArticleWithH2s ? 'Copied!' : 'Copy Article with H2s'}
          </button>
        </>
      )}
    </section>
  );
});

SubheadGenerator.displayName = 'SubheadGenerator';

export default SubheadGenerator; 