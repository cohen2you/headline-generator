'use client';

import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';

export interface PriceActionGeneratorRef {
  clearData: () => void;
}

const PriceActionGenerator = forwardRef<PriceActionGeneratorRef>((props, ref) => {
  // Price Action Generator state
  const [tickers, setTickers] = useState('');
  const [primaryTicker, setPrimaryTicker] = useState('');
  const [comparisonTickers, setComparisonTickers] = useState('');
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
    vsAnalysis?: boolean;
    briefAnalysis?: string;
    fullAnalysis?: string;
  };
  const [priceActions, setPriceActions] = useState<(string | PriceActionObj)[]>([]);
  const [loadingPriceAction, setLoadingPriceAction] = useState(false);
  const [priceActionError, setPriceActionError] = useState('');
  const [copiedPriceActionIndex, setCopiedPriceActionIndex] = useState<number | null>(null);

  // Array of refs for price action lines
  const priceActionRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const clearData = () => {
    setTickers('');
    setPrimaryTicker('');
    setComparisonTickers('');
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

  async function generatePriceActionWithETFs() {
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
          priceActionOnly: true,
          includeETFs: true
        }),
      });
      if (!res.ok) throw new Error('Failed to generate price action with ETFs');
      const data = await res.json();
      setPriceActions(data.priceActions);
    } catch (error: unknown) {
      console.error('Error generating price action with ETFs:', error);
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

  async function generateVsSmartPriceAction() {
    if (!primaryTicker.trim() || !comparisonTickers.trim()) {
      setPriceActionError('Please enter both primary ticker and comparison ticker(s).');
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
          primaryTicker: primaryTicker.trim(),
          comparisonTickers: comparisonTickers.trim(),
          vsAnalysis: true
        }),
      });
      if (!res.ok) throw new Error('Failed to generate vs smart price action');
      const data = await res.json();
      setPriceActions(data.priceActions);
    } catch (error: unknown) {
      console.error('Error generating vs smart price action:', error);
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
    
    // Split by double newlines to create separate paragraphs
    const paragraphs = cleanText.split(/\n\n/);
    
    return (
      <span className="mb-1 text-gray-900 dark:text-gray-100" ref={el => { priceActionRefs.current[idx] = el; }}>
        <strong>{beforeText}</strong>
        <span className="font-normal">
          {paragraphs.map((para, pIdx) => (
            <span key={pIdx}>
              {pIdx > 0 && <><br /><br /></>}
              <span dangerouslySetInnerHTML={{ __html: para.replace(/\n/g, '<br>') }} />
            </span>
          ))}
          {hasBenzingaPro && (
            <>
              , <a
                href="https://www.benzinga.com/pro/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-700 underline hover:text-yellow-900"
              >
                according to Benzinga Pro data
              </a>.
            </>
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
      
      // Check if there are any links in the content
      const hasLinks = clone.querySelectorAll('a').length > 0;
      
      if (hasLinks) {
        // Copy as HTML to preserve links
        const htmlContent = clone.innerHTML.trim();
        
        // Create a blob with HTML content
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const plainText = clone.textContent?.trim() || '';
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        
        // Copy both HTML and plain text to clipboard
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': blob,
            'text/plain': textBlob
          })
        ]);
      } else {
        // No links - copy as plain text
        const textParts: string[] = [];
        
        // Get all spans (for Price Action Only and other simple modes)
        const spans = clone.querySelectorAll('span');
        spans.forEach((span) => {
          const text = span.textContent?.trim();
          if (text && text !== '' && !text.includes('Copy')) {
            textParts.push(text);
          }
        });
        
        // Get all div text (for Full Analysis mode)
        const divs = clone.querySelectorAll('div');
        divs.forEach((div) => {
          // Only get direct text, not nested content
          const text = div.textContent?.trim();
          if (text && text !== '' && !text.includes('Copy') && !textParts.includes(text)) {
            textParts.push(text);
          }
        });
        
        // Get all paragraph text (for Full Analysis and Vs. Analysis modes)
        const paragraphs = clone.querySelectorAll('p');
        paragraphs.forEach((p) => {
          const text = p.textContent?.trim();
          if (text && text !== '' && !text.includes('Copy')) {
            textParts.push(text);
          }
        });
        
        // If we got content from divs/paragraphs, use that; otherwise use the textContent
        let plainText = '';
        if (textParts.length > 0) {
          // Remove duplicates while preserving order
          const uniqueParts = textParts.filter((text, index) => textParts.indexOf(text) === index);
          plainText = uniqueParts.join('\n\n').trim();
        } else {
          // Fallback to entire text content
          plainText = clone.textContent?.trim() || '';
        }
        
        // Copy as plain text
        await navigator.clipboard.writeText(plainText);
      }
      
      setCopiedPriceActionIndex(index);
      setTimeout(() => setCopiedPriceActionIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback to plain text
      try {
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
      
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => generateSmartPriceAction()}
          disabled={loadingPriceAction || !tickers.trim()}
          className="bg-green-600 text-white px-4 py-2 rounded disabled:bg-green-300 font-semibold"
        >
          {loadingPriceAction ? 'Analyzing...' : '🧠 Smart Price Action'}
        </button>
        <button
          onClick={() => generatePriceActionOnly()}
          disabled={loadingPriceAction || !tickers.trim()}
          className="bg-yellow-500 text-white px-4 py-2 rounded disabled:bg-yellow-300"
        >
          {loadingPriceAction ? 'Generating...' : 'Price Action Only'}
        </button>
        <button
          onClick={() => generatePriceActionWithETFs()}
          disabled={loadingPriceAction || !tickers.trim()}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300"
        >
          {loadingPriceAction ? 'Generating...' : 'Price Action w/ ETFs'}
        </button>
        <button
          onClick={() => generateBriefAnalysis()}
          disabled={loadingPriceAction || !tickers.trim()}
          className="bg-orange-500 text-white px-4 py-2 rounded disabled:bg-orange-300"
        >
          {loadingPriceAction ? 'Generating...' : 'Brief Analysis'}
        </button>
        <button
          onClick={generatePriceAction}
          disabled={loadingPriceAction || !tickers.trim()}
          className="bg-purple-600 text-white px-4 py-2 rounded disabled:bg-purple-300"
        >
          {loadingPriceAction ? 'Generating Price Action...' : 'Full Analysis'}
        </button>
        <button
          onClick={generateGroupedPriceAction}
          disabled={loadingPriceAction || !tickers.trim()}
          className="bg-slate-600 text-white px-4 py-2 rounded disabled:bg-slate-300"
        >
          {loadingPriceAction ? 'Generating...' : 'Grouped Price Action'}
        </button>
      </div>

      {priceActionError && <p className="text-red-600 mb-4">{priceActionError}</p>}

      {/* Main Section Results - Above Vs. Smart Price Action */}
      {priceActions.length > 0 && priceActions.some(action => !(action && typeof action === 'object' && 'vsAnalysis' in action)) && (
        <ul className="space-y-2 font-mono text-sm mb-6">
          {priceActions.map((action, i) => {
            // Skip Vs. Analysis results - they'll be shown below
            if (action && typeof action === 'object' && 'vsAnalysis' in action) {
              return null;
            }
            
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
            } else if (action && !('technicalAnalysis' in action) && !('fullAnalysis' in action)) {
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
              // Full Analysis mode - use unified analysis text
              const fullAnalysisText = action.fullAnalysis || action.priceAction;
              
              return (
                <li key={i} className="flex flex-col items-start border-b border-yellow-200 pb-2 mb-2">
                  <div className="text-gray-900 dark:text-gray-100 mb-2">
                    {fullAnalysisText.split('\n\n').filter((p: string) => p.trim()).map((paragraph: string, pIndex: number) => (
                      <p key={pIndex} className="mb-2">{paragraph.trim()}</p>
                    ))}
                  </div>
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
      
      {/* Vs. Smart Price Action - Separate Section Below */}
      <div className="border-t-2 border-yellow-600 pt-6 mt-6">
        <h3 className="text-lg font-semibold mb-3 text-blue-700">Vs. Smart Price Action</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Primary Ticker
            </label>
            <input
              type="text"
              placeholder="e.g., AAPL"
              value={primaryTicker}
              onChange={(e) => setPrimaryTicker(e.target.value.toUpperCase())}
              className="w-full p-2 border border-blue-400 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Comparison Ticker(s)
            </label>
            <input
              type="text"
              placeholder="e.g., MSFT, GOOGL, TSLA"
              value={comparisonTickers}
              onChange={(e) => setComparisonTickers(e.target.value.toUpperCase())}
              className="w-full p-2 border border-blue-400 rounded"
            />
          </div>
        </div>
        <button
          onClick={() => generateVsSmartPriceAction()}
          disabled={loadingPriceAction || !primaryTicker.trim() || !comparisonTickers.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-blue-300 font-semibold w-full md:w-auto mb-4"
        >
          {loadingPriceAction ? 'Comparing...' : '⚔️ Generate Vs. Smart Price Action'}
        </button>
        
        {/* Vs. Analysis Results - Below Vs. Section */}
        {priceActions.length > 0 && priceActions.some(action => action && typeof action === 'object' && 'vsAnalysis' in action) && (
          <ul className="space-y-2 font-mono text-sm mt-4">
            {priceActions.map((action, i) => {
              // Only show Vs. Analysis results here
              if (action && typeof action === 'object' && 'vsAnalysis' in action) {
                console.log('VS Analysis action data:', action);
                
                // Remove ** markdown formatting
                const cleanPriceAction = action.priceAction.replace(/\*\*/g, '');
                const cleanBriefAnalysis = action.briefAnalysis?.replace(/\*\*/g, '') || '';
                
                return (
                  <li key={i} className="flex flex-col items-start border-b border-blue-200 pb-2 mb-2">
                    {renderPriceActionWithBoldLabel(cleanPriceAction, i)}
                    {cleanBriefAnalysis && (
                      <div className="text-gray-900 dark:text-gray-100 mt-2 mb-2">
                        {cleanBriefAnalysis.split('\n').filter((p: string) => p.trim()).map((paragraph: string, pIndex: number) => (
                          <p key={pIndex} className="mb-2">{paragraph.trim()}</p>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => copyPriceActionHTML(i)}
                      className="mt-2 bg-blue-200 hover:bg-blue-300 text-blue-800 px-2 py-1 rounded text-xs"
                    >
                      {copiedPriceActionIndex === i ? 'Copied!' : 'Copy'}
                    </button>
                  </li>
                );
              }
              return null;
            })}
          </ul>
        )}
      </div>
    </section>
  );
});

PriceActionGenerator.displayName = 'PriceActionGenerator';

export default PriceActionGenerator; 