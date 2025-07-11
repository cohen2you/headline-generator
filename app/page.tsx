// Full updated page.tsx file
/* eslint-disable @typescript-eslint/no-explicit-any, react/jsx-no-comment-textnodes */
'use client';

import React, { useState } from 'react';

export default function Page() {
  function toTitleCase(str: string) {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1));
  }

  function cleanHeadline(text: string, removeAllExclamations = false) {
    let cleaned = text
      .replace(/^["“”']+|["“”']+$/g, '')
      .replace(/\*\*/g, '')
      .trim();

    if (removeAllExclamations) {
      cleaned = cleaned.replace(/!/g, '');
    } else {
      cleaned = cleaned.replace(/!+$/g, '');
    }

    return toTitleCase(cleaned);
  }

  const [articleText, setArticleText] = useState('');
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [noColonHeadlines, setNoColonHeadlines] = useState<string[]>([]);
  const [creativeHeadlines, setCreativeHeadlines] = useState<string[]>([]);
  const [similarHeadlines, setSimilarHeadlines] = useState<string[]>([]);
  const [punchyVariants, setPunchyVariants] = useState<string[]>([]);
  const [seoHeadline, setSeoHeadline] = useState<string>('');
  const [loadingMain, setLoadingMain] = useState(false);
  const [loadingNoColon, setLoadingNoColon] = useState(false);
  const [loadingCreative, setLoadingCreative] = useState(false);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [loadingPunchyVariants, setLoadingPunchyVariants] = useState(false);
  const [loadingSeo, setLoadingSeo] = useState(false);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedSimilarIndex, setCopiedSimilarIndex] = useState<number | null>(null);
  const [copiedSeo, setCopiedSeo] = useState(false);
  const [selectedHeadline, setSelectedHeadline] = useState<string | null>(null);
 // For the headline‐adjuster
const [baseHeadline, setBaseHeadline] = useState('');
const [adjustPrompt, setAdjustPrompt] = useState('');
const [adjustedHeadlines, setAdjustedHeadlines] = useState<string[]>([]);
const [loadingAdjust, setLoadingAdjust] = useState(false);

// For the headline‐checker
const [accuracyHeadline, setAccuracyHeadline] = useState('');
const [accuracyResult, setAccuracyResult] =
  useState<{ review: string; suggestions: string[] } | null>(null);
const [loadingAccuracy, setLoadingAccuracy] = useState(false);

  // Lead Generator state & loading
  const [lead, setLead] = useState('');
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadError, setLeadError] = useState('');

  // H2 Generator state & loading
  const [articleWithH2s, setArticleWithH2s] = useState('');
  const [loadingH2s, setLoadingH2s] = useState(false);
  const [h2Error, setH2Error] = useState('');

  // Analyst Ratings state
// Analyst Ratings state
const [analystTicker, setAnalystTicker] = useState<string>('');
const [analystParagraph, setAnalystParagraph] = useState<string>('');
const [loadingRatings,   setLoadingRatings]   = useState<boolean>(false);
const [ratingsError,     setRatingsError]     = useState<string>('');

  // Price Action Generator state
  const [tickers, setTickers] = useState('');
  const [priceActions, setPriceActions] = useState<string[]>([]);
  const [loadingPriceAction, setLoadingPriceAction] = useState(false);
  const [priceActionError, setPriceActionError] = useState('');
  async function generateHeadlines() {
    setError('');
    setLoadingMain(true);
    setHeadlines([]);
    setNoColonHeadlines([]);
    setCreativeHeadlines([]);
    setSimilarHeadlines([]);
    setPunchyVariants([]);
    setSeoHeadline('');
    setSelectedHeadline(null);
    setAccuracyResult(null);
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
    setSimilarHeadlines([]);
    setPunchyVariants([]);
    setSeoHeadline('');
    setSelectedHeadline(null);
    setAccuracyResult(null);
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
    setSimilarHeadlines([]);
    setPunchyVariants([]);
    setSeoHeadline('');
    setSelectedHeadline(null);
    setAccuracyResult(null);
    try {
      const res = await fetch('/api/generate/creative-headlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleText }),
      });
      if (!res.ok) throw new Error('Failed to generate creative headlines');
      const data = await res.json();
      const cleaned = data.headlines
        .map((hl: string) => hl.replace(/^["“”']|["“”']$/g, '').trim())
        .map(cleanHeadline);
      setCreativeHeadlines(cleaned);
    } catch (error: unknown) {
      if (error instanceof Error) setError(error.message);
      else setError(String(error));
    } finally {
      setLoadingCreative(false);
    }
  }
  async function generateSimilar(headline: string) {
    setError('');
    setLoadingSimilar(true);
    setSimilarHeadlines([]);
    setSeoHeadline('');
    setSelectedHeadline(headline);
    setAccuracyResult(null);
    try {
      const res = await fetch('/api/generate/similar-headlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline, articleText }),
      });
      if (!res.ok) throw new Error('Failed to generate similar headlines');
      const data = await res.json();
      setSimilarHeadlines(data.similar.map((hl: string) => cleanHeadline(hl)));
    } catch (error: unknown) {
      if (error instanceof Error) setError(error.message);
      else setError(String(error));
    } finally {
      setLoadingSimilar(false);
    }
  }

  async function generatePunchyVariants(headline: string) {
    setError('');
    setLoadingPunchyVariants(true);
    setPunchyVariants([]);
    try {
      const res = await fetch('/api/generate/punchy-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline }),
      });
      if (!res.ok) throw new Error('Failed to generate punchy variants');
      const data = await res.json();
      const cleaned = (data.variants || []).map((hl: string) => cleanHeadline(hl, true));
      setPunchyVariants(cleaned);
    } catch (error: unknown) {
      if (error instanceof Error) setError(error.message);
      else setError(String(error));
    } finally {
      setLoadingPunchyVariants(false);
    }
  }

  async function generateSeoHeadline() {
    if (!selectedHeadline) return;
    setError('');
    setLoadingSeo(true);
    setSeoHeadline('');
    setCopiedSeo(false);
    try {
      const res = await fetch('/api/generate/seo-headline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline: selectedHeadline }),
      });
      if (!res.ok) throw new Error('Failed to generate SEO headline');
      const data = await res.json();
      setSeoHeadline(cleanHeadline(data.seoHeadline || ''));
    } catch (error: unknown) {
      if (error instanceof Error) setError(error.message);
      else setError(String(error));
    } finally {
      setLoadingSeo(false);
    }
  }

  async function checkHeadlineAccuracy() {
    if (!accuracyHeadline.trim() || !articleText.trim()) {
      setAccuracyResult(null);
      setError('Please enter both article text and a headline to check.');
      return;
    }
    setError('');
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
      if (error instanceof Error) setError(error.message);
      else setError(String(error));
    } finally {
      setLoadingAccuracy(false);
    }
  }
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
        .join('\n');
      setArticleWithH2s(cleanedText);
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

  function copyToClipboard(text: string, index: number, isSimilar = false) {
    navigator.clipboard.writeText(text);
    if (isSimilar) {
      setCopiedSimilarIndex(index);
      setTimeout(() => setCopiedSimilarIndex(null), 2000);
    } else {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  }

  function copySeoToClipboard() {
    if (!seoHeadline) return;
    navigator.clipboard.writeText(seoHeadline);
    setCopiedSeo(true);
    setTimeout(() => setCopiedSeo(false), 2000);
  }
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Headline Generator</h1>

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
                  <button
                    onClick={() => generateSimilar(hl)}
                    disabled={loadingSimilar}
                    className="text-left flex-1"
                  >
                    {hl}
                  </button>
                  <button
                    onClick={() => generatePunchyVariants(hl)}
                    disabled={loadingPunchyVariants}
                    className="ml-2 bg-red-500 text-white px-2 py-1 rounded text-sm"
                  >
                    {loadingPunchyVariants ? 'Generating...' : 'More Clicky & Punchy'}
                  </button>
                </div>
                <button
                  onClick={() => copyToClipboard(hl, i)}
                  className="ml-4 bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm"
                >
                  {copiedIndex === i ? 'Copied!' : 'Copy'}
                </button>
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
                <button
                  onClick={() => generateSimilar(hl)}
                  disabled={loadingSimilar}
                  className="text-left flex-1"
                >
                  {hl}
                </button>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => generatePunchyVariants(hl)}
                    disabled={loadingPunchyVariants}
                    className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                  >
                    {loadingPunchyVariants ? 'Generating...' : 'More Clicky & Punchy'}
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
                <button
                  onClick={() => generateSimilar(hl)}
                  disabled={loadingSimilar}
                  className="text-left flex-1"
                >
                  {hl}
                </button>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => generatePunchyVariants(hl)}
                    disabled={loadingPunchyVariants}
                    className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                  >
                    {loadingPunchyVariants ? 'Generating...' : 'More Clicky & Punchy'}
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

      {loadingSimilar && (
        <p className="mt-6 text-gray-700 font-semibold">Generating similar headlines...</p>
      )}

      {similarHeadlines.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Similar Headlines</h2>
          <ul className="list-disc list-inside space-y-1">
            {similarHeadlines.map((hl, i) => (
              <li key={i} className="flex items-center justify-between">
                <span>{hl}</span>
                <button
                  onClick={() => copyToClipboard(hl, i, true)}
                  className="ml-4 bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm"
                >
                  {copiedSimilarIndex === i ? 'Copied!' : 'Copy'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {punchyVariants.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xl font-semibold mb-2 text-red-700">Punchy Variants</h2>
          <ul className="list-disc list-inside space-y-1">
            {punchyVariants.map((hl, i) => (
              <li key={i} className="flex items-center justify-between">
                <span>{hl}</span>
                <button
                  onClick={() => copyToClipboard(hl, i, true)}
                  className="ml-4 bg-red-200 hover:bg-red-300 text-red-800 px-3 py-1 rounded text-sm"
                >
                  {copiedSimilarIndex === i ? 'Copied!' : 'Copy'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {/* SEO Headline Section */}
      {selectedHeadline && (
        <section className="mt-8 p-4 border border-blue-400 rounded-md bg-blue-50 max-w-xl">
          <h2 className="text-lg font-semibold mb-2">SEO Headline for:</h2>
          <p className="italic mb-3">&quot;{selectedHeadline}&quot;</p>
          <button
            onClick={generateSeoHeadline}
            disabled={loadingSeo}
            className="bg-green-600 text-white px-4 py-2 rounded-md disabled:bg-gray-400 mb-3"
          >
            {loadingSeo ? 'Generating SEO Headline...' : 'Generate SEO Headline'}
          </button>
          {seoHeadline && (
            <div className="flex items-center justify-between bg-white border border-green-400 rounded-md p-3">
              <p className="text-green-800 font-semibold">{seoHeadline}</p>
              <button
                onClick={copySeoToClipboard}
                className="bg-green-200 hover:bg-green-300 text-green-800 px-3 py-1 rounded text-sm"
              >
                {copiedSeo ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}
        </section>
      )}




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



      {/* Lead Generator Section */}
      <section className="mt-8 p-4 border border-green-500 rounded-md max-w-4xl mx-auto">
        <h2 className="text-lg font-semibold mb-4 text-green-700">Lead Generator</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => generateLead('normal')}
            disabled={leadLoading}
            className="bg-green-600 text-white px-4 py-2 rounded disabled:bg-green-300"
          >
            {leadLoading ? 'Generating...' : 'Generate'}
          </button>
          {['longer', 'shorter', 'more narrative', 'more context'].map((style) => (
            <button
              key={style}
              onClick={() => generateLead(style)}
              disabled={leadLoading || !lead}
              className="bg-green-600 text-white px-4 py-2 rounded disabled:bg-green-300"
            >
              {leadLoading ? 'Generating...' : style.charAt(0).toUpperCase() + style.slice(1)}
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
                alert('Lead copied to clipboard!');
              }}
              className="bg-green-700 text-white px-4 py-2 rounded"
            >
              Copy Lead
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

        if (!hasPhrase) return <li key={i}>{line}</li>;

        const [before, after] = line.split(phrase);
        const afterClean = after.startsWith('.') ? after.substring(1) : after;

        // Extract and bold "SYMBOL Price Action:"
        const colonIndex = before.indexOf(':');
        const boldPart = colonIndex !== -1 ? before.slice(0, colonIndex + 1) : '';
        const restPart = colonIndex !== -1 ? before.slice(colonIndex + 1) : before;

        return (
          <li key={i} className="break-words">
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
            {afterClean}.
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
        {articleWithH2s && (
          <>
            <textarea
              readOnly
              value={articleWithH2s}
              rows={16}
              className="w-full p-3 border border-indigo-400 rounded resize-none font-mono text-sm mb-2"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(articleWithH2s);
                alert('Article with H2s copied to clipboard!');
              }}
              className="bg-indigo-700 text-white px-4 py-2 rounded"
            >
              Copy Article with H2s
            </button>
          </>
        )}
      </section>
    </main>
  );
}
