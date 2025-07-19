'use client';

import React, { useState, forwardRef, useImperativeHandle } from 'react';

interface HeadlineToolsProps {
  articleText: string;
}

export interface HeadlineToolsRef {
  clearData: () => void;
}

const HeadlineTools = forwardRef<HeadlineToolsRef, HeadlineToolsProps>(
  ({ articleText }, ref) => {
    // For the headline adjuster
    const [baseHeadline, setBaseHeadline] = useState('');
    const [adjustPrompt, setAdjustPrompt] = useState('');
    const [adjustedHeadlines, setAdjustedHeadlines] = useState<string[]>([]);
    const [loadingAdjust, setLoadingAdjust] = useState(false);

    // For the headline checker
    const [accuracyHeadline, setAccuracyHeadline] = useState('');
    const [accuracyResult, setAccuracyResult] =
      useState<{ review: string; suggestions: string[] } | null>(null);
    const [loadingAccuracy, setLoadingAccuracy] = useState(false);

    const clearData = () => {
      setBaseHeadline('');
      setAdjustPrompt('');
      setAdjustedHeadlines([]);
      setLoadingAdjust(false);
      setAccuracyHeadline('');
      setAccuracyResult(null);
      setLoadingAccuracy(false);
    };

    useImperativeHandle(ref, () => ({
      clearData
    }));

    async function checkHeadlineAccuracy() {
      if (!accuracyHeadline.trim() || !articleText.trim()) {
        setAccuracyResult(null);
        return;
      }
      setLoadingAccuracy(true);
      setAccuracyResult(null);
      try {
        const res = await fetch('/api/check-accuracy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ headline: accuracyHeadline, articleText }),
        });
        if (!res.ok) throw new Error('Failed to check headline accuracy');
        const data = await res.json();
        setAccuracyResult(data);
      } catch (error: unknown) {
        console.error('Error checking headline accuracy:', error);
      } finally {
        setLoadingAccuracy(false);
      }
    }

    return (
      <>
        {/* Adjust Existing Headline */}
        <section className="mt-8 p-4 border border-yellow-500 rounded-md max-w-xl mx-auto">
          <h2 className="text-lg font-semibold mb-2 text-yellow-700">
            Adjust Existing Headline
          </h2>
          <input
            type="text"
            placeholder="Paste headline to adjust"
            value={baseHeadline}
            onChange={e => setBaseHeadline(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded mb-3"
          />
          <input
            type="text"
            placeholder="I like this headline… but"
            value={adjustPrompt}
            onChange={e => setAdjustPrompt(e.target.value)}
            className="w-full p-2 border border-yellow-300 rounded mb-3"
          />
          <button
            onClick={async () => {
              if (!baseHeadline.trim() || !adjustPrompt.trim()) return;
              setLoadingAdjust(true);
              try {
                const res = await fetch('/api/adjust-headline', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    headline: baseHeadline,
                    tweak: adjustPrompt,
                    articleText,
                  }),
                });
                const { headlines } = await res.json();
                setAdjustedHeadlines(headlines || []);
              } catch (error) {
                console.error('Error adjusting headline:', error);
              } finally {
                setLoadingAdjust(false);
              }
            }}
            disabled={loadingAdjust || !baseHeadline.trim() || !adjustPrompt.trim()}
            className="bg-yellow-600 text-white px-4 py-2 rounded disabled:bg-yellow-300 mb-6"
          >
            {loadingAdjust ? 'Adjusting…' : 'Adjust Headline'}
          </button>
          {adjustedHeadlines.length > 0 && (
            <ul className="list-disc list-inside ml-5 mb-6">
              {adjustedHeadlines.map((hl, i) => (
                <li key={i} className="flex justify-between items-center">
                  <span>{hl}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(hl)}
                    className="ml-4 bg-gray-200 hover:bg-gray-300 text-gray-800 px-2 py-1 rounded text-sm"
                  >
                    Copy
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Headline Checker */}
        <section className="mt-8 p-4 border border-gray-400 rounded-md max-w-xl mx-auto">
          <h2 className="text-lg font-semibold mb-2 text-gray-800">
            Headline Checker
          </h2>
          <input
            type="text"
            placeholder="Type headline to check"
            value={accuracyHeadline}
            onChange={e => setAccuracyHeadline(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded mb-3"
          />
          <button
            onClick={checkHeadlineAccuracy}
            disabled={loadingAccuracy || !accuracyHeadline.trim() || !articleText.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
          >
            {loadingAccuracy ? 'Checking…' : 'Check Headline'}
          </button>
          {accuracyResult && (
            <div className="mt-4 bg-gray-100 p-3 rounded whitespace-pre-line">
              <strong>Review:</strong>
              <p className="mt-1">{accuracyResult.review}</p>
              {accuracyResult.suggestions.length > 0 && (
                <>
                  <strong className="block mt-3">Alternative Headlines:</strong>
                  <ul className="list-disc list-inside ml-5">
                    {accuracyResult.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </section>
      </>
    );
  }
);

HeadlineTools.displayName = 'HeadlineTools';

export default HeadlineTools; 