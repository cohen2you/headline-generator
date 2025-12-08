'use client';

import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';

export interface TechnicalAnalysisGeneratorRef {
  clearData: () => void;
}

interface TechnicalAnalysisResult {
  ticker: string;
  companyName: string;
  analysis: string;
  data?: {
    currentPrice: number;
    changePercent: number;
    twelveMonthReturn?: number;
    rsi?: number;
    rsiSignal?: string;
    supportLevel?: number | null;
    resistanceLevel?: number | null;
    sma20?: number;
    sma50?: number;
    sma100?: number;
    sma200?: number;
  };
  error?: string;
}

const TechnicalAnalysisGenerator = forwardRef<TechnicalAnalysisGeneratorRef>((props, ref) => {
  const [tickers, setTickers] = useState('');
  const [analyses, setAnalyses] = useState<TechnicalAnalysisResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [provider, setProvider] = useState<'openai' | 'gemini'>('openai');

  const analysisRefs = useRef<(HTMLDivElement | null)[]>([]);

  const clearData = () => {
    setTickers('');
    setAnalyses([]);
    setLoading(false);
    setError('');
    setCopiedIndex(null);
  };

  useImperativeHandle(ref, () => ({
    clearData
  }));

  async function generateTechnicalAnalysis() {
    if (!tickers.trim()) {
      setError('Please enter ticker(s) first.');
      return;
    }
    setAnalyses([]);
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/generate/technical-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers, provider }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to generate technical analysis');
      }
      const data = await res.json();
      setAnalyses(data.analyses || []);
    } catch (error: unknown) {
      console.error('Error generating technical analysis:', error);
      if (error instanceof Error) setError(error.message);
      else setError(String(error));
    } finally {
      setLoading(false);
    }
  }

  const copyAnalysisHTML = async (index: number) => {
    const targetDiv = analysisRefs.current[index];
    if (!targetDiv) return;

    try {
      const clone = targetDiv.cloneNode(true) as HTMLElement;
      const copyButton = clone.querySelector('button');
      if (copyButton) {
        copyButton.remove();
      }

      const htmlContent = clone.innerHTML.trim();
      const plainText = clone.textContent?.trim() || '';

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const textBlob = new Blob([plainText], { type: 'text/plain' });

      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blob,
          'text/plain': textBlob
        })
      ]);

      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Fallback to plain text
      try {
        const plainText = targetDiv.textContent?.trim() || '';
        await navigator.clipboard.writeText(plainText);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
      } catch (fallbackError) {
        console.error('Failed to copy text:', fallbackError);
      }
    }
  };

  return (
    <section className="p-4 border border-blue-600 rounded-md max-w-4xl mx-auto">
      <h2 className="text-lg font-semibold mb-4 text-blue-700">Technical Analysis Generator</h2>
      <p className="text-sm text-gray-600 mb-4">
        Generate comprehensive multi-timeframe technical analysis focusing on 12-month, 6-month, 3-month, monthly, and weekly trends. 
        Includes moving averages, RSI, support/resistance levels, and overall technical outlook.
      </p>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          AI Provider
        </label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as 'openai' | 'gemini')}
          className="w-full p-2 border border-blue-400 rounded"
        >
          <option value="openai">OpenAI (GPT-4o-mini)</option>
          <option value="gemini">Gemini (2.5 Flash)</option>
        </select>
      </div>
      
      <input
        type="text"
        placeholder="Enter ticker(s), comma separated (e.g., AAPL, MSFT)"
        value={tickers}
        onChange={(e) => setTickers(e.target.value.toUpperCase())}
        className="w-full p-2 border border-blue-400 rounded mb-4"
      />
      
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={generateTechnicalAnalysis}
          disabled={loading || !tickers.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-blue-300 font-semibold"
        >
          {loading ? 'Analyzing...' : '📊 Generate Technical Analysis'}
        </button>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {analyses.length > 0 && (
        <div className="space-y-6">
          {analyses.map((analysis, i) => {
            if (analysis.error) {
              return (
                <div key={i} className="p-4 border border-red-300 rounded bg-red-50">
                  <p className="font-semibold text-red-800">{analysis.ticker}</p>
                  <p className="text-red-600">{analysis.error}</p>
                </div>
              );
            }

            return (
              <div
                key={i}
                ref={el => { analysisRefs.current[i] = el; }}
                className="p-4 border border-blue-200 rounded bg-blue-50"
              >
                <div className="flex justify-end items-start mb-3">
                  <button
                    onClick={() => copyAnalysisHTML(i)}
                    className="bg-blue-200 hover:bg-blue-300 text-blue-800 px-3 py-1 rounded text-sm"
                  >
                    {copiedIndex === i ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap prose prose-sm max-w-none">
                  {analysis.analysis.split('\n\n').filter((p: string) => p.trim()).map((paragraph: string, pIndex: number) => {
                    // Render markdown bold (**text**) as HTML bold for the first paragraph
                    // This will handle patterns like **Company Name** (TICKER) correctly
                    const processedParagraph = pIndex === 0 
                      ? paragraph.trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      : paragraph.trim();
                    
                    return (
                      <p 
                        key={pIndex} 
                        className="mb-3"
                        dangerouslySetInnerHTML={pIndex === 0 ? { __html: processedParagraph } : undefined}
                      >
                        {pIndex !== 0 ? processedParagraph : null}
                      </p>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
});

TechnicalAnalysisGenerator.displayName = 'TechnicalAnalysisGenerator';

export default TechnicalAnalysisGenerator;

