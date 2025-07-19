'use client';

import React, { useState, forwardRef, useImperativeHandle } from 'react';

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
    const [priceActions, setPriceActions] = useState<string[]>([]);
    const [loadingPriceAction, setLoadingPriceAction] = useState(false);
    const [priceActionError, setPriceActionError] = useState('');
    const [copiedPriceActionIndex, setCopiedPriceActionIndex] = useState<number | null>(null);

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
        const cleanedText = (data.articleWithH2s || '')
          .split('\n')
          .map((line: string) => line.replace(/^##\s*/, ''))
          .filter((line: string) => {
            const trimmedLine = line.trim();
            return !trimmedLine.includes('Count of H2 headings:') && 
                   !trimmedLine.includes('Count Of H2 Headings:') &&
                   !trimmedLine.includes('Count of H2s:') &&
                   !trimmedLine.includes('Count Of H2s:') &&
                   !trimmedLine.match(/^-+$/); // Remove lines that are just dashes
          })
          .join('\n');
        setArticleWithH2s(cleanedText);
        
        // Extract H2 headings for easy copying
        const lines = cleanedText.split('\n');
        const headings: string[] = [];
        
        // First pass: look for any short, Title Case lines that could be H2s
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          // Very lenient H2 detection: short, Title Case, no punctuation, not empty
          if (
            line &&
            line.length <= 40 && // Increased length limit
            !line.endsWith('.') &&
            !line.endsWith('!') &&
            !line.endsWith('?') &&
            !line.includes('Price Action:') && // Exclude the main title
            !line.includes('according to Benzinga Pro') && // Exclude attribution
            !line.includes('Count of H2 headings:') && // Exclude the count text
            !line.includes('Count Of H2 Headings:') && // Exclude the count text
            !line.includes('Count of H2s:') && // Exclude the count text
            !line.includes('Count Of H2s:') && // Exclude the count text
            !line.match(/^-+$/) && // Exclude lines that are just dashes
            !line.includes('H2:') && // Exclude lines that start with H2:
            i > 0 // Not the first line
          ) {
            // Check if it's Title Case (first letter of each word capitalized)
            const isTitleCase = line === line.split(' ').map((word: string) => {
              if (word.length === 0) return word;
              return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }).join(' ');
            
            if (isTitleCase) {
              const cleanLine = line.trim();
              if (cleanLine && cleanLine !== '---') {
                headings.push(cleanLine);
              }
            }
          }
        }
        
        // Second pass: if we still don't have enough, look for any short lines that might be H2s
        if (headings.length < 3) {
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (
              line &&
              line.length <= 35 &&
              !line.endsWith('.') &&
              !line.endsWith('!') &&
              !line.endsWith('?') &&
              !line.includes('Price Action:') &&
              !line.includes('according to Benzinga Pro') &&
              !line.includes('Count') &&
              !line.includes('H2:') &&
              !line.match(/^-+$/) &&
              !headings.includes(line) && // Don't duplicate
              i > 0
            ) {
              // More lenient check for potential H2s
              const words = line.split(' ');
              const isPotentialH2 = words.length <= 4 && words.every((word: string) => 
                word.length > 0 && word.charAt(0) === word.charAt(0).toUpperCase()
              );
              
              if (isPotentialH2) {
                const cleanLine = line.trim();
                if (cleanLine && cleanLine !== '---' && !headings.includes(cleanLine)) {
                  headings.push(cleanLine);
                  if (headings.length >= 3) break;
                }
              }
            }
          }
        }
        
        // Take the first 3 headings found (ESLint fix: using let since it gets reassigned)
        let finalHeadings = headings.slice(0, 3);
        
        // If we don't have exactly 3 headings, generate a fallback H2
        if (finalHeadings.length < 3) {
          const fallbackH2s = [
            'Market Analysis',
            'Technical Insights',
            'Investment Strategy',
            'Risk Factors',
            'Growth Potential',
            'Market Trends',
            'Trading Signals',
            'Future Outlook'
          ];
          
          // Add fallback H2s until we have 3
          for (let i = finalHeadings.length; i < 3; i++) {
            const fallbackIndex = (i - finalHeadings.length) % fallbackH2s.length;
            finalHeadings.push(fallbackH2s[fallbackIndex]);
          }
        }
        
        setH2HeadingsOnly(finalHeadings);
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
          <button
            onClick={generatePriceAction}
            disabled={loadingPriceAction || !tickers.trim()}
            className="bg-yellow-600 text-white px-4 py-2 rounded disabled:bg-yellow-300 mb-4"
          >
            {loadingPriceAction ? 'Generating Price Action...' : 'Generate Price Action'}
          </button>
          {priceActionError && <p className="text-red-600 mb-4">{priceActionError}</p>}

          {priceActions.length > 0 && (
            <ul className="space-y-2 font-mono text-sm">
              {priceActions.map((line, i) => {
                const phrase = 'according to Benzinga Pro';
                const hasPhrase = line.includes(phrase);

                if (!hasPhrase) {
                  return (
                    <li key={i} className="flex justify-between items-start">
                      <span className="flex-1 whitespace-pre-wrap">{line}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(line);
                          setCopiedPriceActionIndex(i);
                          setTimeout(() => setCopiedPriceActionIndex(null), 2000);
                        }}
                        className="ml-4 bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-2 py-1 rounded text-xs"
                      >
                        {copiedPriceActionIndex === i ? 'Copied!' : 'Copy'}
                      </button>
                    </li>
                  );
                }

                const [before, after] = line.split(phrase);
                const afterClean = after.startsWith('.') ? after.substring(1) : after;

                // Extract and bold "SYMBOL Price Action:"
                const colonIndex = before.indexOf(':');
                const boldPart = colonIndex !== -1 ? before.slice(0, colonIndex + 1) : '';
                const restPart = colonIndex !== -1 ? before.slice(colonIndex + 1) : before;

                return (
                  <li key={i} className="flex justify-between items-start break-words">
                    <span className="flex-1 whitespace-pre-wrap">
                      <strong>{boldPart}</strong>
                      {restPart}{' '}
                      <a
                        href="https://www.benzinga.com/pro/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-yellow-700 underline hover:text-yellow-900"
                      >
                        {phrase}
                      </a>
                      {afterClean}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(line);
                        setCopiedPriceActionIndex(i);
                        setTimeout(() => setCopiedPriceActionIndex(null), 2000);
                      }}
                      className="ml-4 bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-2 py-1 rounded text-xs"
                    >
                      {copiedPriceActionIndex === i ? 'Copied!' : 'Copy'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* H2 Generator Section */}
        <section className="mt-8 p-4 border border-indigo-600 rounded-md max-w-4xl mx-auto">
          <h2 className="text-lg font-semibold mb-4 text-indigo-700">H2 Generator</h2>
          <button
            onClick={generateH2s}
            disabled={loadingH2s || !articleText.trim()}
            className="bg-indigo-600 text-white px-4 py-2 rounded disabled:bg-indigo-300 mb-4"
          >
            {loadingH2s ? 'Generating H2 Headings...' : 'Generate H2 Headings'}
          </button>
          {h2Error && <p className="text-red-600 mb-4">{h2Error}</p>}
          
          {/* H2 Headings Only Section */}
          {h2HeadingsOnly.length > 0 && (
            <div className="mb-6">
              <h3 className="text-md font-semibold mb-3 text-indigo-600">Generated H2 Headings (Easy Copy)</h3>
              <div className="bg-indigo-50 border border-indigo-200 rounded p-4 mb-3">
                <ol className="list-decimal list-inside space-y-2">
                  {h2HeadingsOnly.map((heading, index) => (
                    <li key={index} className="flex justify-between items-center">
                      <span className="font-medium text-indigo-800">{heading}</span>
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
                {copiedAllH2s ? 'Copied!' : 'Copy All H2s'}
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