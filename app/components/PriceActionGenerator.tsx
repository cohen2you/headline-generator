'use client';

import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';

export interface PriceActionGeneratorRef {
  clearData: () => void;
}

const PriceActionGenerator = forwardRef<PriceActionGeneratorRef>((props, ref) => {
  // Price Action Generator state
  const [tickers, setTickers] = useState('');
  type PriceActionObj = {
    ticker: string;
    companyName: string;
    priceAction: string;
    technicalAnalysis?: string;
    historicalContext?: string;
    fiftyTwoWeekRangeLine?: string;
    grouped?: boolean;
    individualActions?: PriceActionObj[];
    narrativeType?: string;
    smartAnalysis?: boolean;
  };
  const [priceActions, setPriceActions] = useState<(string | PriceActionObj)[]>([]);
  const [loadingPriceAction, setLoadingPriceAction] = useState(false);
  const [priceActionError, setPriceActionError] = useState('');
  const [copiedPriceActionIndex, setCopiedPriceActionIndex] = useState<number | null>(null);

  // Array of refs for price action lines
  const priceActionRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const clearData = () => {
    setTickers('');
    setPriceActions([]);
    setLoadingPriceAction(false);
    setPriceActionError('');
    setCopiedPriceActionIndex(null);
  };

  useImperativeHandle(ref, () => ({
    clearData
  }));

  async function generatePriceAction() {
    if (!tickers.trim()) {
      setPriceActionError('Please enter ticker(s) first.');
      return;
    }
    setPriceActions([]);
    setPriceActionError('');
    setLoadingPriceAction(true);
    try {
      const res = await fetch('/api/generate/price-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers }),
      });
      if (!res.ok) throw new Error('Failed to generate price action');
      const data = await res.json();
      setPriceActions(data.priceActions);
    } catch (error: unknown) {
      console.error('Error generating price action:', error);
      if (error instanceof Error) setPriceActionError(error.message);
      else setPriceActionError(String(error));
    } finally {
      setLoadingPriceAction(false);
    }
  }

  async function generatePriceActionOnly() {
    if (!tickers.trim()) {
      setPriceActionError('Please enter ticker(s) first.');
      return;
    }
    setPriceActions([]);
    setPriceActionError('');
    setLoadingPriceAction(true);
    try {
      const res = await fetch('/api/generate/price-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tickers,
          priceActionOnly: true
        }),
      });
      if (!res.ok) throw new Error('Failed to generate price action');
      const data = await res.json();
      setPriceActions(data.priceActions);
    } catch (error: unknown) {
      console.error('Error generating price action:', error);
      if (error instanceof Error) setPriceActionError(error.message);
      else setPriceActionError(String(error));
    } finally {
      setLoadingPriceAction(false);
    }
  }

  async function generateBriefAnalysis() {
    if (!tickers.trim()) {
      setPriceActionError('Please enter ticker(s) first.');
      return;
    }
    setPriceActions([]);
    setPriceActionError('');
    setLoadingPriceAction(true);
    try {
      const res = await fetch('/api/generate/price-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tickers,
          briefAnalysis: true
        }),
      });
      if (!res.ok) throw new Error('Failed to generate price action');
      const data = await res.json();
      setPriceActions(data.priceActions);
    } catch (error: unknown) {
      console.error('Error generating price action:', error);
      if (error instanceof Error) setPriceActionError(error.message);
      else setPriceActionError(String(error));
    } finally {
      setLoadingPriceAction(false);
    }
  }

  async function generateGroupedPriceAction() {
    if (!tickers.trim()) {
      setPriceActionError('Please enter ticker(s) first.');
      return;
    }
    setPriceActions([]);
    setPriceActionError('');
    setLoadingPriceAction(true);
    try {
      const res = await fetch('/api/generate/price-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tickers,
          grouped: true
        }),
      });
      if (!res.ok) throw new Error('Failed to generate price action');
      const data = await res.json();
      setPriceActions(data.priceActions);
    } catch (error: unknown) {
      console.error('Error generating price action:', error);
      if (error instanceof Error) setPriceActionError(error.message);
      else setPriceActionError(String(error));
    } finally {
      setLoadingPriceAction(false);
    }
  }

  async function generateSmartPriceAction() {
    if (!tickers.trim()) {
      setPriceActionError('Please enter ticker(s) first.');
      return;
    }
    setPriceActions([]);
    setPriceActionError('');
    setLoadingPriceAction(true);
    try {
      const res = await fetch('/api/generate/price-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tickers,
          smartAnalysis: true
        }),
      });
      if (!res.ok) throw new Error('Failed to generate smart price action');
      const data = await res.json();
      setPriceActions(data.priceActions);
    } catch (error: unknown) {
      console.error('Error generating smart price action:', error);
      if (error instanceof Error) setPriceActionError(error.message);
      else setPriceActionError(String(error));
    } finally {
      setLoadingPriceAction(false);
    }
  }

  const renderPriceActionWithBoldLabel = (priceAction: string, idx: number) => {
    const labelMatch = priceAction.match(/^(.*?:)(.*)$/);
    let beforeText = '';
    let mainText = priceAction;
    if (labelMatch) {
      beforeText = labelMatch[1];
      mainText = labelMatch[2];
    }
    
    const hasBenzingaPro = mainText.includes('Benzinga Pro');
    const cleanText = mainText.replace(/,\s*according to Benzinga Pro data\.?$/, '');
    
    return (
      <span className="mb-1 text-gray-900 dark:text-gray-100" ref={el => { priceActionRefs.current[idx] = el; }}>
        <strong>{beforeText}</strong>
        <span className="font-normal">
          {cleanText}
          {hasBenzingaPro && (
            <a
              href="https://www.benzinga.com/pro/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-700 underline hover:text-yellow-900"
            >
              , according to Benzinga Pro data.
            </a>
          )}
        </span>
      </span>
    );
  };

  const copyPriceActionHTML = async (index: number) => {
    // Find the parent li element that contains all the content for this index
    const listItems = document.querySelectorAll('ul li');
    const targetLi = listItems[index];
    
    if (!targetLi) return;
    
    try {
      // Create a clone of the li element to modify
      const clone = targetLi.cloneNode(true) as HTMLElement;
      
      // Remove the copy button from the clone
      const copyButton = clone.querySelector('button');
      if (copyButton) {
        copyButton.remove();
      }
      
      // Copy the modified content as HTML
      const htmlContent = clone.innerHTML;
      await navigator.clipboard.write([
        new window.ClipboardItem({ 'text/html': new Blob([htmlContent], { type: 'text/html' }) })
      ]);
      setCopiedPriceActionIndex(index);
      setTimeout(() => setCopiedPriceActionIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy HTML:', error);
      // Fallback to plain text
      try {
        // Remove the button text from plain text copy as well
        const textContent = targetLi.textContent || '';
        const cleanText = textContent.replace(/Copy|Copied!/g, '').trim();
        await navigator.clipboard.writeText(cleanText);
        setCopiedPriceActionIndex(index);
        setTimeout(() => setCopiedPriceActionIndex(null), 2000);
      } catch (textError) {
        console.error('Failed to copy text:', textError);
      }
    }
  };

  return (
    <section className="p-4 border border-yellow-600 rounded-md max-w-4xl mx-auto">
      <h2 className="text-lg font-semibold mb-4 text-yellow-700">Price Action Generator</h2>
      <input
        type="text"
        placeholder="Enter ticker(s), comma separated (e.g., AAPL, MSFT)"
        value={tickers}
        onChange={(e) => setTickers(e.target.value.toUpperCase())}
        className="w-full p-2 border border-yellow-400 rounded mb-4"
      />
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => generateSmartPriceAction()}
          disabled={loadingPriceAction || !tickers.trim()}
          className="bg-green-600 text-white px-4 py-2 rounded disabled:bg-green-300 mb-4 font-semibold"
        >
          {loadingPriceAction ? 'Analyzing...' : '🧠 Smart Price Action'}
        </button>
        <button
          onClick={() => generatePriceActionOnly()}
          disabled={loadingPriceAction || !tickers.trim()}
          className="bg-yellow-500 text-white px-4 py-2 rounded disabled:bg-yellow-300 mb-4"
        >
          {loadingPriceAction ? 'Generating...' : 'Price Action Only'}
        </button>
        <button
          onClick={() => generateBriefAnalysis()}
          disabled={loadingPriceAction || !tickers.trim()}
          className="bg-yellow-400 text-white px-4 py-2 rounded disabled:bg-yellow-300 mb-4"
        >
          {loadingPriceAction ? 'Generating...' : 'Brief Analysis'}
        </button>
        <button
          onClick={generatePriceAction}
          disabled={loadingPriceAction || !tickers.trim()}
          className="bg-yellow-600 text-white px-4 py-2 rounded disabled:bg-yellow-300 mb-4"
        >
          {loadingPriceAction ? 'Generating Price Action...' : 'Full Analysis'}
        </button>
        <button
          onClick={generateGroupedPriceAction}
          disabled={loadingPriceAction || !tickers.trim()}
          className="bg-yellow-700 text-white px-4 py-2 rounded disabled:bg-yellow-300 mb-4"
        >
          {loadingPriceAction ? 'Generating...' : 'Grouped Price Action'}
        </button>
      </div>
      {priceActionError && <p className="text-red-600 mb-4">{priceActionError}</p>}

      {priceActions.length > 0 && (
        <ul className="space-y-2 font-mono text-sm">
          {priceActions.map((action, i) => {
            if (action && typeof action === 'object' && 'grouped' in action) {
              // Grouped mode
              return (
                <li key={i} className="flex flex-col items-start border-b border-yellow-200 pb-2 mb-2">
                  <span className="block text-gray-900 dark:text-gray-100 mb-2">
                    {renderPriceActionWithBoldLabel(action.priceAction, i)}
                  </span>
                  <button
                    onClick={() => copyPriceActionHTML(i)}
                    className="ml-4 bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-2 py-1 rounded text-xs"
                  >
                    {copiedPriceActionIndex === i ? 'Copied!' : 'Copy'}
                  </button>
                </li>
              );
            } else if (action && typeof action === 'object' && 'smartAnalysis' in action) {
              // Smart Analysis mode
              return (
                <li key={i} className="flex flex-col items-start border-b border-green-200 pb-2 mb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      🧠 {action.narrativeType?.toUpperCase() || 'SMART'} ANALYSIS
                    </span>
                  </div>
                  {renderPriceActionWithBoldLabel(action.priceAction, i)}
                  <button
                    onClick={() => copyPriceActionHTML(i)}
                    className="mt-2 bg-green-200 hover:bg-green-300 text-green-800 px-2 py-1 rounded text-xs"
                  >
                    {copiedPriceActionIndex === i ? 'Copied!' : 'Copy'}
                  </button>
                </li>
              );
            } else if (action && typeof action === 'object' && 'briefAnalysis' in action) {
              // Brief Analysis mode
              return (
                <li key={i} className="flex flex-col items-start border-b border-yellow-200 pb-2 mb-2">
                  {renderPriceActionWithBoldLabel(action.priceAction, i)}
                  <span className="block text-gray-900 dark:text-gray-100 mt-2 mb-2">{typeof action.briefAnalysis === 'string' ? action.briefAnalysis : ''}</span>
                  <button
                    onClick={() => copyPriceActionHTML(i)}
                    className="mt-2 bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-2 py-1 rounded text-xs"
                  >
                    {copiedPriceActionIndex === i ? 'Copied!' : 'Copy'}
                  </button>
                </li>
              );
            } else if (typeof action === 'string') {
              // Price Action Only mode (string)
              return (
                <li key={i} className="flex justify-between items-start">
                  <span className="flex-1 text-gray-900 dark:text-gray-100">
                    {renderPriceActionWithBoldLabel(action, i)}
                  </span>
                  <button
                    onClick={() => copyPriceActionHTML(i)}
                    className="ml-4 bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-2 py-1 rounded text-xs"
                  >
                    {copiedPriceActionIndex === i ? 'Copied!' : 'Copy'}
                  </button>
                </li>
              );
            } else if (action && !('technicalAnalysis' in action)) {
              // Price Action Only mode (object)
              return (
                <li key={i} className="flex justify-between items-start">
                  <span className="flex-1 text-gray-900 dark:text-gray-100">
                    {renderPriceActionWithBoldLabel(action.priceAction, i)}
                  </span>
                  <button
                    onClick={() => copyPriceActionHTML(i)}
                    className="ml-4 bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-2 py-1 rounded text-xs"
                  >
                    {copiedPriceActionIndex === i ? 'Copied!' : 'Copy'}
                  </button>
                </li>
              );
            } else {
              // Full Analysis mode
              return (
                <li key={i} className="flex flex-col items-start border-b border-yellow-200 pb-2 mb-2">
                  {renderPriceActionWithBoldLabel(action.priceAction, i)}
                  {/* Always display the 52-week range line if present, with a space above */}
                  {action.fiftyTwoWeekRangeLine && <span className="block text-gray-900 dark:text-gray-100 mb-2 mt-2">{action.fiftyTwoWeekRangeLine}</span>}
                  <span className="block h-4" />
                  <pre className="whitespace-pre-wrap text-gray-900 dark:text-gray-100" style={{ fontFamily: 'inherit', marginTop: 0 }}>
                    {action.technicalAnalysis}
                  </pre>
                  <button
                    onClick={() => copyPriceActionHTML(i)}
                    className="mt-2 bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-2 py-1 rounded text-xs"
                  >
                    {copiedPriceActionIndex === i ? 'Copied!' : 'Copy'}
                  </button>
                </li>
              );
            }
          })}
        </ul>
      )}
    </section>
  );
});

PriceActionGenerator.displayName = 'PriceActionGenerator';

export default PriceActionGenerator; 