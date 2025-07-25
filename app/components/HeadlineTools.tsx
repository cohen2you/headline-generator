'use client';

import React, { useState, forwardRef, useImperativeHandle } from 'react';
import CTALineGenerator from './CTALineGenerator';

interface HeadlineToolsProps {
  articleText: string;
}

export interface HeadlineToolsRef {
  clearData: () => void;
  checkHeadlineFromWorkshop: (headline: string) => void;
}

const HeadlineTools = forwardRef<HeadlineToolsRef, HeadlineToolsProps>(
  ({ articleText }, ref) => {
    // For the headline checker
    const [accuracyHeadline, setAccuracyHeadline] = useState('');
    const [accuracyResult, setAccuracyResult] = useState<{
      accuracy: { score: number; breakdown: string };
      engagement: { score: number; breakdown: string };
      recommendation: { needsChange: boolean; reason: string; improvedHeadline: string };
      seoHeadline: string;
    } | null>(null);
    const [loadingAccuracy, setLoadingAccuracy] = useState(false);

    const clearData = () => {
      setAccuracyHeadline('');
      setAccuracyResult(null);
      setLoadingAccuracy(false);
    };

    // Function to receive headline from workshop
    const checkHeadlineFromWorkshop = (headline: string) => {
      setAccuracyHeadline(headline);
      // Automatically trigger the check
      setTimeout(() => {
        checkHeadlineAccuracy();
      }, 100);
    };

    // Expose the function to parent components
    useImperativeHandle(ref, () => ({
      clearData,
      checkHeadlineFromWorkshop
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
            <div className="mt-4 space-y-4">
              {/* Accuracy Analysis */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-blue-800">Accuracy Analysis</h3>
                  <div className="flex items-center">
                    <span className="text-sm text-blue-600 mr-2">Score:</span>
                    <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-bold">
                      {accuracyResult.accuracy.score}/10
                    </div>
                  </div>
                </div>
                <div className="whitespace-pre-line text-sm text-blue-700">
                  {accuracyResult.accuracy.breakdown}
                </div>
              </div>

              {/* Engagement Analysis */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-green-800">Engagement Analysis</h3>
                  <div className="flex items-center">
                    <span className="text-sm text-green-600 mr-2">Score:</span>
                    <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-bold">
                      {accuracyResult.engagement.score}/10
                    </div>
                  </div>
                </div>
                <div className="whitespace-pre-line text-sm text-green-700">
                  {accuracyResult.engagement.breakdown}
                </div>
              </div>

              {/* Recommendation */}
              {accuracyResult.recommendation.needsChange && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-2">Recommendation</h3>
                  <p className="text-sm text-yellow-700 mb-2">{accuracyResult.recommendation.reason}</p>
                  <div className="bg-white border border-yellow-300 rounded p-2">
                    <span className="text-sm text-yellow-800 font-medium">Improved Headline:</span>
                    <p className="text-yellow-900 font-semibold mt-1">{accuracyResult.recommendation.improvedHeadline}</p>
                  </div>
                </div>
              )}

              {/* SEO Headline */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold text-purple-800 mb-2">SEO Optimized Version</h3>
                <div className="bg-white border border-purple-300 rounded p-2">
                  <p className="text-purple-900 font-semibold">{accuracyResult.seoHeadline}</p>
                  <p className="text-xs text-purple-600 mt-1">
                    {accuracyResult.seoHeadline.split(' ').length} words
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
        <CTALineGenerator />
      </>
    );
  }
);

HeadlineTools.displayName = 'HeadlineTools';

export default HeadlineTools; 