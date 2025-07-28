// Force update: marketStatusNote is no longer used; summary line includes market status
'use client';

import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';

interface ContentGeneratorProps {
  articleText: string;
}

export interface ContentGeneratorRef {
  clearData: () => void;
}

const ContentGenerator = forwardRef<ContentGeneratorRef, ContentGeneratorProps>(
  ({ articleText }, ref) => {
    // Lead Generator state & loading
    const [lead, setLead] = useState('');
    const [leadLoading, setLeadLoading] = useState(false);
    const [leadError, setLeadError] = useState('');
    const [copiedLead, setCopiedLead] = useState(false);

    // H2 Generator state & loading
    const [articleWithH2s, setArticleWithH2s] = useState('');
    const [h2HeadingsOnly, setH2HeadingsOnly] = useState<string[]>([]);
    const [loadingH2s, setLoadingH2s] = useState(false);
    const [h2Error, setH2Error] = useState('');
    const [copiedH2Index, setCopiedH2Index] = useState<number | null>(null);
    const [copiedAllH2s, setCopiedAllH2s] = useState(false);
    const [copiedArticleWithH2s, setCopiedArticleWithH2s] = useState(false);

    // Analyst Ratings state
    const [analystTicker, setAnalystTicker] = useState<string>('');
    const [analystParagraph, setAnalystParagraph] = useState<string>('');
    const [loadingRatings, setLoadingRatings] = useState<boolean>(false);
    const [ratingsError, setRatingsError] = useState<string>('');

    // Price Action Generator state
    const [tickers, setTickers] = useState('');
    // Update the priceActions state type
    type PriceActionObj = {
      ticker: string;
      companyName: string;
      priceAction: string;
      technicalAnalysis?: string;
      historicalContext?: string;
      fiftyTwoWeekRangeLine?: string; // Added this field
      grouped?: boolean;
      individualActions?: PriceActionObj[];
    };
    const [priceActions, setPriceActions] = useState<(string | PriceActionObj)[]>([]);
    const [loadingPriceAction, setLoadingPriceAction] = useState(false);
    const [priceActionError, setPriceActionError] = useState('');
    const [copiedPriceActionIndex, setCopiedPriceActionIndex] = useState<number | null>(null);

    // Array of refs for price action lines
    const priceActionRefs = useRef<(HTMLSpanElement | null)[]>([]);

    const clearData = () => {
      setLead('');
      setLeadLoading(false);
      setLeadError('');
      setCopiedLead(false);
      setArticleWithH2s('');
      setH2HeadingsOnly([]);
      setLoadingH2s(false);
      setH2Error('');
      setCopiedH2Index(null);
      setCopiedAllH2s(false);
      setCopiedArticleWithH2s(false);
      setAnalystTicker('');
      setAnalystParagraph('');
      setLoadingRatings(false);
      setRatingsError('');
      setTickers('');
      setPriceActions([]);
      setLoadingPriceAction(false);
      setPriceActionError('');
      setCopiedPriceActionIndex(null);
    };

    useImperativeHandle(ref, () => ({
      clearData
    }));

    async function generateLead(style: string) {
      if (!articleText.trim()) {
        setLeadError('Please enter article text first.');
        return;
      }
      setLead('');
      setLeadError('');
      setLeadLoading(true);
      try {
        const res = await fetch('/api/generate/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleText, style }),
        });
        if (!res.ok) throw new Error('Failed to generate lead');
        const data = await res.json();
        setLead(data.lead);
      } catch (error: unknown) {
        if (error instanceof Error) setLeadError(error.message);
        else setLeadError(String(error));
      } finally {
        setLeadLoading(false);
      }
    }

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
        if (!res.ok) throw new Error('Failed to generate H2 headings');
        const data = await res.json();
        
        // Set the article with embedded H2s
        setArticleWithH2s(data.articleWithH2s || '');
        
        // Set the standalone H2 headings
        if (data.h2HeadingsOnly && Array.isArray(data.h2HeadingsOnly)) {
          setH2HeadingsOnly(data.h2HeadingsOnly);
        } else {
          // Fallback if the API doesn't return h2HeadingsOnly
          const fallbackH2s = [
            'Why This Move Changes Everything',
            'The Hidden Signal Smart Money Sees',
            'Three Catalysts Driving This Action'
          ];
          setH2HeadingsOnly(fallbackH2s);
        }
      } catch (error: unknown) {
        if (error instanceof Error) setH2Error(error.message);
        else setH2Error(String(error));
      } finally {
        setLoadingH2s(false);
      }
    }

    async function fetchAnalystRatings() {
      console.log('▶️ fetchAnalystRatings() called with', analystTicker);
      setLoadingRatings(true);
      setRatingsError('');
      setAnalystParagraph('');        // clear out old text
      
      try {
        const res = await fetch('/api/generate/analyst-ratings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker: analystTicker.trim().toUpperCase() }),
        });
        const data = await res.json();
        console.log('◀️ /api/generate/analyst-ratings response:', data);
        if (data.error) {
          setRatingsError(data.error);
        } else {
          setAnalystParagraph(data.paragraph);
        }
      } catch (err) {
        console.error('💥 fetchAnalystRatings error', err);
        setRatingsError((err as Error).message);
      } finally {
        setLoadingRatings(false);
      }
    }
     
    async function generatePriceAction() {
      setPriceActionError('');
      setLoadingPriceAction(true);
      setPriceActions([]);
      try {
        const res = await fetch('/api/generate/price-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tickers }),
        });
        if (!res.ok) throw new Error('Failed to fetch price action');
        const data = await res.json();
        if (data.error) {
          setPriceActionError(data.error);
        } else if (Array.isArray(data.priceActions)) {
          setPriceActions(data.priceActions);
        } else {
          setPriceActionError('Invalid response format');
        }
      } catch (error: unknown) {
        if (error instanceof Error) setPriceActionError(error.message);
        else setPriceActionError(String(error));
      } finally {
        setLoadingPriceAction(false);
      }
    }

    async function generatePriceActionOnly() {
      setPriceActionError('');
      setLoadingPriceAction(true);
      setPriceActions([]);
      try {
        const res = await fetch('/api/generate/price-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tickers, priceActionOnly: true }),
        });
        if (!res.ok) throw new Error('Failed to fetch price action');
        const data = await res.json();
        if (data.error) {
          setPriceActionError(data.error);
        } else if (Array.isArray(data.priceActions)) {
          setPriceActions(data.priceActions);
        } else {
          setPriceActionError('Invalid response format');
        }
      } catch (error: unknown) {
        if (error instanceof Error) setPriceActionError(error.message);
        else setPriceActionError(String(error));
      } finally {
        setLoadingPriceAction(false);
      }
    }

    async function generateBriefAnalysis() {
      setPriceActionError('');
      setLoadingPriceAction(true);
      setPriceActions([]);
      try {
        const res = await fetch('/api/generate/price-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tickers, briefAnalysis: true }),
        });
        if (!res.ok) throw new Error('Failed to fetch brief analysis');
        const data = await res.json();
        if (data.error) {
          setPriceActionError(data.error);
        } else if (Array.isArray(data.priceActions)) {
          setPriceActions(data.priceActions);
        } else {
          setPriceActionError('Invalid response format');
        }
      } catch (error: unknown) {
        if (error instanceof Error) setPriceActionError(error.message);
        else setPriceActionError(String(error));
      } finally {
        setLoadingPriceAction(false);
      }
    }

    async function generateGroupedPriceAction() {
      setPriceActionError('');
      setLoadingPriceAction(true);
      setPriceActions([]);
      try {
        const res = await fetch('/api/generate/price-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tickers, grouped: true }),
        });
        if (!res.ok) throw new Error('Failed to fetch grouped price action');
        const data = await res.json();
        if (data.error) {
          setPriceActionError(data.error);
        } else if (Array.isArray(data.priceActions)) {
          setPriceActions(data.priceActions);
        } else {
          setPriceActionError('Invalid response format');
        }
      } catch (error: unknown) {
        if (error instanceof Error) setPriceActionError(error.message);
        else setPriceActionError(String(error));
      } finally {
        setLoadingPriceAction(false);
      }
    }

    return (
      <>
        {/* Lead Generator Section */}
        <section className="mt-8 p-4 border border-green-500 rounded-md max-w-4xl mx-auto">
          <h2 className="text-lg font-semibold mb-4 text-green-700">Lead Generator</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={() => generateLead('standard')}
              disabled={leadLoading}
              className="bg-green-600 text-white px-4 py-2 rounded disabled:bg-green-300"
            >
              {leadLoading ? 'Generating...' : 'Generate Lead'}
            </button>
            {['hook', 'context'].map((style) => (
              <button
                key={style}
                onClick={() => generateLead(style)}
                disabled={leadLoading}
                className="bg-green-600 text-white px-4 py-2 rounded disabled:bg-green-300"
              >
                {leadLoading ? 'Generating...' : style.charAt(0).toUpperCase() + style.slice(1) + ' Lead'}
              </button>
            ))}
          </div>
          {leadError && <p className="text-red-600 mb-4">{leadError}</p>}
          {lead && (
            <>
              <textarea
                readOnly
                value={lead}
                rows={12}
                className="w-full p-3 border border-green-400 rounded resize-none font-mono mb-2 text-sm"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(lead);
                  setCopiedLead(true);
                  setTimeout(() => setCopiedLead(false), 2000);
                }}
                className="bg-green-700 text-white px-4 py-2 rounded"
              >
                {copiedLead ? 'Copied!' : 'Copy Lead'}
              </button>
            </>
          )}
        </section>

        {/* Analyst Ratings Section */}
        <section className="mt-8 p-4 border border-sky-600 rounded-md max-w-4xl mx-auto">
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
          {analystParagraph && (
            <p className="bg-sky-50 border border-sky-200 p-3 rounded text-sm">
              {analystParagraph}
            </p>
          )}
        </section>

        {/* Price Action Generator Section */}
        <section className="mt-8 p-4 border border-yellow-600 rounded-md max-w-4xl mx-auto">
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
                // Helper to render price action line with only the label bolded
                const renderPriceActionWithBoldLabel = (priceAction: string, idx: number) => {
                  const labelMatch = priceAction.match(/^(.*?:)(.*)$/);
                  let beforeText = '';
                  let mainText = priceAction;
                  if (labelMatch) {
                    beforeText = labelMatch[1];
                    mainText = labelMatch[2];
                  }
                  const phrase = 'according to Benzinga Pro.';
                  const phraseIndex = mainText.indexOf(phrase);
                  let mainBefore = mainText;
                  let mainAfter = '';
                  if (phraseIndex !== -1) {
                    mainBefore = mainText.slice(0, phraseIndex);
                    mainAfter = mainText.slice(phraseIndex + phrase.length);
                  }
                  return (
                    <span className="mb-1 text-black" ref={el => { priceActionRefs.current[idx] = el; }}>
                      <strong>{beforeText}</strong>
                      <span className="font-normal">{mainBefore}
                        {phraseIndex !== -1 && (
                          <>
                            <a
                              href="https://www.benzinga.com/pro/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-yellow-700 underline hover:text-yellow-900"
                            >
                              {phrase}
                            </a>
                            {mainAfter}
                          </>
                        )}
                      </span>
                    </span>
                  );
                };

                // Helper to render grouped price action with better formatting
                const renderGroupedPriceAction = (priceAction: string, idx: number) => {
                  // Handle the attribution at the end with hyperlink
                  const phrase = ', according to Benzinga Pro data.';
                  const phraseIndex = priceAction.indexOf(phrase);
                  
                  if (phraseIndex !== -1) {
                    const beforePhrase = priceAction.slice(0, phraseIndex);
                    const afterPhrase = priceAction.slice(phraseIndex + phrase.length);
                    
                    return (
                      <span className="mb-1 text-black" ref={el => { priceActionRefs.current[idx] = el; }}>
                        <strong>Price Action:</strong>
                        <span className="font-normal">{beforePhrase}
                          <a
                            href="https://www.benzinga.com/pro/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-yellow-700 underline hover:text-yellow-900"
                          >
                            {phrase}
                          </a>
                          {afterPhrase}
                        </span>
                      </span>
                    );
                  }
                  
                  return (
                    <span className="mb-1 text-black" ref={el => { priceActionRefs.current[idx] = el; }}>
                      <strong>Price Action:</strong>
                      <span className="font-normal">{priceAction}</span>
                    </span>
                  );
                };

                // Helper to copy the rendered HTML of the price action line
                const copyPriceActionHTML = async () => {
                  const ref = priceActionRefs.current[i];
                  if (ref) {
                    const outer = ref.outerHTML;
                    try {
                      await navigator.clipboard.write([
                        new window.ClipboardItem({ 'text/html': new Blob([outer], { type: 'text/html' }) })
                      ]);
                      setCopiedPriceActionIndex(i);
                      setTimeout(() => setCopiedPriceActionIndex(null), 2000);
                      return;
                    } catch {
                      // fallback: copy as plain text
                      await navigator.clipboard.writeText(ref.textContent || '');
                      setCopiedPriceActionIndex(i);
                      setTimeout(() => setCopiedPriceActionIndex(null), 2000);
                      return;
                    }
                  }
                };

                if (action && typeof action === 'object' && action.grouped) {
                  // Grouped Price Action mode
                  return (
                    <li key={i} className="flex justify-between items-start">
                      <span className="flex-1 text-black">
                        {renderGroupedPriceAction(action.priceAction, i)}
                      </span>
                      <button
                        onClick={copyPriceActionHTML}
                        className="ml-4 bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-2 py-1 rounded text-xs"
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
                      <span className="block text-black mt-2 mb-2">{typeof action.briefAnalysis === 'string' ? action.briefAnalysis : ''}</span>
                      <button
                        onClick={copyPriceActionHTML}
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
                      <span className="flex-1 text-black">
                        {renderPriceActionWithBoldLabel(action, i)}
                      </span>
                      <button
                        onClick={copyPriceActionHTML}
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
                      <span className="flex-1 text-black">
                        {renderPriceActionWithBoldLabel(action.priceAction, i)}
                      </span>
                      <button
                        onClick={copyPriceActionHTML}
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
                      {action.fiftyTwoWeekRangeLine && <span className="block text-black mb-2 mt-2">{action.fiftyTwoWeekRangeLine}</span>}
                      <span className="block h-4" />
                      <pre className="whitespace-pre-wrap text-black" style={{ fontFamily: 'inherit', marginTop: 0 }}>
                        {action.technicalAnalysis}
                      </pre>
                      <button
                        onClick={copyPriceActionHTML}
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

        {/* Subhead Generator Section */}
        <section className="mt-8 p-4 border border-indigo-600 rounded-md max-w-4xl mx-auto">
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
      </>
    );
  }
);

ContentGenerator.displayName = 'ContentGenerator';

export default ContentGenerator; 