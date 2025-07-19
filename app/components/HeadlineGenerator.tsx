'use client';

import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { cleanHeadline } from './utils';

interface HeadlineGeneratorProps {
  articleText: string;
  setArticleText: (text: string) => void;
}

export interface HeadlineGeneratorRef {
  clearData: () => void;
}

const HeadlineGenerator = forwardRef<HeadlineGeneratorRef, HeadlineGeneratorProps>(
  ({ articleText, setArticleText }, ref) => {
    const [headlines, setHeadlines] = useState<string[]>([]);
    const [noColonHeadlines, setNoColonHeadlines] = useState<string[]>([]);
    const [creativeHeadlines, setCreativeHeadlines] = useState<string[]>([]);
    const [loadingMain, setLoadingMain] = useState(false);
    const [loadingNoColon, setLoadingNoColon] = useState(false);
    const [loadingCreative, setLoadingCreative] = useState(false);
    const [error, setError] = useState('');
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const clearData = () => {
      setHeadlines([]);
      setNoColonHeadlines([]);
      setCreativeHeadlines([]);
      setLoadingMain(false);
      setLoadingNoColon(false);
      setLoadingCreative(false);
      setError('');
      setCopiedIndex(null);
    };

    useImperativeHandle(ref, () => ({
      clearData
    }));

    function copyToClipboard(text: string, index: number) {
      navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }

    async function generateHeadlines() {
      setError('');
      setLoadingMain(true);
      setHeadlines([]);
      setNoColonHeadlines([]);
      setCreativeHeadlines([]);
      try {
        const res = await fetch('/api/generate/headlines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleText }),
        });
        if (!res.ok) throw new Error('Failed to generate headlines');
        const data = await res.json();
        setHeadlines(data.headlines.map((hl: string) => cleanHeadline(hl)));
      } catch (error: unknown) {
        if (error instanceof Error) setError(error.message);
        else setError(String(error));
      } finally {
        setLoadingMain(false);
      }
    }

    async function generateNoColonHeadlines() {
      setError('');
      setLoadingNoColon(true);
      setNoColonHeadlines([]);
      setHeadlines([]);
      setCreativeHeadlines([]);
      try {
        const res = await fetch('/api/generate/no-colon-headlines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleText }),
        });
        if (!res.ok) throw new Error('Failed to generate no colon headlines');
        const data = await res.json();
        setNoColonHeadlines(data.headlines.map((hl: string) => cleanHeadline(hl)));
      } catch (error: unknown) {
        if (error instanceof Error) setError(error.message);
        else setError(String(error));
      } finally {
        setLoadingNoColon(false);
      }
    }

    async function generateCreativeHeadlines() {
      setError('');
      setLoadingCreative(true);
      setCreativeHeadlines([]);
      setNoColonHeadlines([]);
      setHeadlines([]);
      try {
        const res = await fetch('/api/generate/creative-headlines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleText }),
        });
        if (!res.ok) throw new Error('Failed to generate creative headlines');
        const data = await res.json();
        const cleaned = data.headlines
          .map((hl: string) => hl.replace(/^["""']|["""']$/g, '').trim())
          .map(cleanHeadline);
        setCreativeHeadlines(cleaned);
      } catch (error: unknown) {
        if (error instanceof Error) setError(error.message);
        else setError(String(error));
      } finally {
        setLoadingCreative(false);
      }
    }

    return (
      <>
        <textarea
          rows={8}
          className="w-full p-3 border border-gray-300 rounded-md mb-4 resize-none"
          placeholder="Paste article text here..."
          value={articleText}
          onChange={(e) => setArticleText(e.target.value)}
        />

        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={generateHeadlines}
            disabled={loadingMain || !articleText.trim()}
            className="bg-blue-600 text-white px-6 py-3 rounded-md disabled:bg-gray-400 flex-1 min-w-[180px]"
          >
            {loadingMain ? 'Generating Headlines...' : 'Generate 5 Headlines'}
          </button>

          <button
            onClick={generateNoColonHeadlines}
            disabled={loadingNoColon || !articleText.trim()}
            className="bg-purple-600 text-white px-6 py-3 rounded-md disabled:bg-gray-400 flex-1 min-w-[180px]"
          >
            {loadingNoColon ? 'Generating No Colon Headlines...' : 'No Colon Headlines'}
          </button>

          <button
            onClick={generateCreativeHeadlines}
            disabled={loadingCreative || !articleText.trim()}
            className="bg-indigo-600 text-white px-6 py-3 rounded-md disabled:bg-gray-400 flex-1 min-w-[180px]"
          >
            {loadingCreative ? 'Generating Creative Headlines...' : 'Creative Headlines'}
          </button>
        </div>

        {error && <p className="text-red-600 mt-4">{error}</p>}

        {/* Generated Headlines */}
        {headlines.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-2">Generated Headlines</h2>
            <ul className="space-y-2">
              {headlines.map((hl, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between border border-gray-300 rounded-md px-4 py-2"
                >
                  <div className="flex-1 flex items-center">
                    <span className="flex-1">{hl}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        // This will be handled by the parent component
                        const event = new CustomEvent('headlineSelected', { detail: hl });
                        window.dispatchEvent(event);
                      }}
                      className="bg-blue-200 hover:bg-blue-300 text-blue-800 px-3 py-1 rounded text-sm"
                    >
                      Enhance
                    </button>
                    <button
                      onClick={() => copyToClipboard(hl, i)}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm"
                    >
                      {copiedIndex === i ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* No Colon Headlines */}
        {noColonHeadlines.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-2 text-purple-600">No Colon Headlines</h2>
            <ul className="space-y-2">
              {noColonHeadlines.map((hl, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between border border-purple-300 rounded-md px-4 py-2"
                >
                  <span className="flex-1">{hl}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const event = new CustomEvent('headlineSelected', { detail: hl });
                        window.dispatchEvent(event);
                      }}
                      className="bg-blue-200 hover:bg-blue-300 text-blue-800 px-3 py-1 rounded text-sm"
                    >
                      Enhance
                    </button>
                    <button
                      onClick={() => copyToClipboard(hl, i)}
                      className="bg-purple-200 hover:bg-purple-300 text-purple-800 px-3 py-1 rounded text-sm"
                    >
                      {copiedIndex === i ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Creative Headlines */}
        {creativeHeadlines.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-2 text-indigo-600">Creative Headlines</h2>
            <ul className="space-y-2">
              {creativeHeadlines.map((hl, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between border border-indigo-300 rounded-md px-4 py-2"
                >
                  <span className="flex-1">{hl}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const event = new CustomEvent('headlineSelected', { detail: hl });
                        window.dispatchEvent(event);
                      }}
                      className="bg-blue-200 hover:bg-blue-300 text-blue-800 px-3 py-1 rounded text-sm"
                    >
                      Enhance
                    </button>
                    <button
                      onClick={() => copyToClipboard(hl, i)}
                      className="bg-indigo-200 hover:bg-indigo-300 text-indigo-800 px-3 py-1 rounded text-sm"
                    >
                      {copiedIndex === i ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </>
    );
  }
);

HeadlineGenerator.displayName = 'HeadlineGenerator';

export default HeadlineGenerator; 