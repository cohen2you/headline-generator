'use client';

import { useState, forwardRef, useImperativeHandle } from 'react';

export interface StockMarketReportRef {
  clearData: () => void;
}

const StockMarketReport = forwardRef<StockMarketReportRef>((props, ref) => {
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const clearData = () => {
    setReport('');
    setError('');
    setCopied(false);
  };

  useImperativeHandle(ref, () => ({
    clearData
  }));

  async function generateReport() {
    setReport('');
    setError('');
    setLoading(true);
    setCopied(false);

    try {
      const res = await fetch('/api/generate/market-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) throw new Error('Failed to generate market report');
      
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
      } else if (data.report) {
        setReport(data.report);
      } else {
        setError('Invalid response format');
      }
    } catch (error: unknown) {
      console.error('Error generating market report:', error);
      if (error instanceof Error) setError(error.message);
      else setError(String(error));
    } finally {
      setLoading(false);
    }
  }

  async function copyReport() {
    if (!report) return;

    try {
      // Strip markdown formatting before copying
      const plainText = report.replace(/\*\*/g, '');
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy report:', error);
    }
  }

  return (
    <section className="p-4 border border-purple-600 rounded-md max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-purple-700">Stock Market Report</h2>
        {report && (
          <button
            onClick={clearData}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
          >
            Clear Report
          </button>
        )}
      </div>

      <button
        onClick={generateReport}
        disabled={loading}
        className="bg-purple-600 text-white px-6 py-3 rounded disabled:bg-purple-300 font-semibold w-full mb-4"
      >
        {loading ? 'Generating Report...' : '📊 Generate Market Report'}
      </button>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {report && (
        <div className="mt-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded border border-purple-200 dark:border-purple-800 mb-4">
            <div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-mono text-sm">
              {report.split('\n\n').filter((p: string) => p.trim()).map((paragraph: string, pIndex: number) => {
                // Convert markdown bold (**text**) to HTML bold
                const parts = paragraph.split(/(\*\*.*?\*\*)/g);
                return (
                  <p key={pIndex} className="mb-3">
                    {parts.map((part, partIdx) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={partIdx}>{part.slice(2, -2)}</strong>;
                      }
                      return <span key={partIdx}>{part}</span>;
                    })}
                  </p>
                );
              })}
            </div>
          </div>
          <button
            onClick={copyReport}
            className={`${
              copied ? 'bg-green-500' : 'bg-purple-500 hover:bg-purple-600'
            } text-white px-4 py-2 rounded transition-colors`}
          >
            {copied ? '✓ Copied!' : '📋 Copy Report'}
          </button>
        </div>
      )}
    </section>
  );
});

StockMarketReport.displayName = 'StockMarketReport';

export default StockMarketReport;

