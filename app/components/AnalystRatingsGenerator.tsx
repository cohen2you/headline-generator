'use client';

import React, { useState, forwardRef, useImperativeHandle } from 'react';

export interface AnalystRatingsGeneratorRef {
  clearData: () => void;
}

const AnalystRatingsGenerator = forwardRef<AnalystRatingsGeneratorRef>((props, ref) => {
  // Analyst Ratings state
  const [analystTicker, setAnalystTicker] = useState<string>('');
  const [analystParagraph, setAnalystParagraph] = useState<string>('');
  const [loadingRatings, setLoadingRatings] = useState<boolean>(false);
  const [ratingsError, setRatingsError] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const clearData = () => {
    setAnalystTicker('');
    setAnalystParagraph('');
    setLoadingRatings(false);
    setRatingsError('');
    setCopied(false);
  };

  useImperativeHandle(ref, () => ({
    clearData
  }));

  async function fetchAnalystRatings() {
    if (!analystTicker.trim()) {
      setRatingsError('Please enter a ticker first.');
      return;
    }
    setAnalystParagraph('');
    setRatingsError('');
    setLoadingRatings(true);
    try {
      const res = await fetch('/api/generate/analyst-ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: analystTicker }),
      });
      if (!res.ok) throw new Error('Failed to fetch analyst ratings');
      const data = await res.json();
      setAnalystParagraph(data.paragraph);
    } catch (error: unknown) {
      console.error('Error fetching analyst ratings:', error);
      if (error instanceof Error) setRatingsError(error.message);
      else setRatingsError(String(error));
    } finally {
      setLoadingRatings(false);
    }
  }

  // Function to split paragraph into two natural paragraphs
  const splitIntoTwoParagraphs = (paragraph: string) => {
    // Split by double line breaks first (if the API already provides paragraph breaks)
    const paragraphsByBreaks = paragraph.split(/\n\s*\n/);
    if (paragraphsByBreaks.length >= 2) {
      return paragraphsByBreaks.slice(0, 2);
    }

    // If no natural breaks, split by sentences but be smart about it
    const sentences = paragraph.split(/(?<=[.!?])\s+/).filter(sentence => sentence.trim().length > 0);
    
    if (sentences.length <= 2) {
      return sentences;
    }
    
    // Find a good breaking point - avoid breaking in the middle of price information
    const totalSentences = sentences.length;
    const midPoint = Math.ceil(totalSentences * 0.6); // Split at 60% to keep first paragraph longer
    
    // Look for a better break point around the midpoint
    let breakPoint = midPoint;
    for (let i = midPoint - 2; i <= midPoint + 2; i++) {
      if (i > 0 && i < sentences.length) {
        const sentence = sentences[i];
        // Avoid breaking after sentences that end with price patterns
        if (!sentence.match(/\$\d+\.\d+\.?$/)) {
          breakPoint = i;
          break;
        }
      }
    }
    
    const firstParagraph = sentences.slice(0, breakPoint).join(' ').trim();
    const secondParagraph = sentences.slice(breakPoint).join(' ').trim();
    
    return [firstParagraph, secondParagraph];
  };

  const copyAllText = async () => {
    try {
      await navigator.clipboard.writeText(analystParagraph);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const paragraphs = analystParagraph ? splitIntoTwoParagraphs(analystParagraph) : [];

  return (
    <section className="p-4 border border-sky-600 rounded-md max-w-4xl mx-auto">
      <h2 className="text-lg font-semibold mb-4 text-sky-700">Analyst Ratings</h2>
      <input
        type="text"
        placeholder="Enter ticker (e.g., TSLA)"
        value={analystTicker}
        onChange={(e) => setAnalystTicker(e.target.value.toUpperCase())}
        className="w-full p-2 border border-sky-400 rounded mb-4"
      />
      <button
        onClick={fetchAnalystRatings}
        disabled={loadingRatings || !analystTicker.trim()}
        className="bg-sky-600 text-white px-4 py-2 rounded disabled:bg-sky-300 mb-4"
      >
        {loadingRatings ? 'Loading Ratings...' : 'Get Analyst Ratings'}
      </button>
      {ratingsError && <p className="text-red-600 mb-4">{ratingsError}</p>}
      {paragraphs.length > 0 && (
        <div className="bg-sky-50 border border-sky-200 p-4 rounded">
          <div className="flex justify-end mb-3">
            <button
              onClick={copyAllText}
              className="bg-sky-200 hover:bg-sky-300 text-sky-800 px-3 py-1 rounded text-sm transition-colors"
            >
              {copied ? 'Copied!' : 'Copy All'}
            </button>
          </div>
          <div className="space-y-3 text-sky-900 leading-relaxed text-sm">
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="mb-0">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      )}
    </section>
  );
});

AnalystRatingsGenerator.displayName = 'AnalystRatingsGenerator';

export default AnalystRatingsGenerator; 