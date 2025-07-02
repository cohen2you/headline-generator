'use client';

import React, { useState } from 'react';

export default function Page() {
  function toTitleCase(str: string) {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1));
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

  function cleanHeadline(text: string) {
    return toTitleCase(
      text
        .replace(/^["“”']|["“”']$/g, '')
        .replace(/\*\*/g, '')
        .replace(/!+$/g, '')
        .trim()
    );
  }

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
    try {
      const res = await fetch('/api/generate/headlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleText }),
      });
      if (!res.ok) throw new Error('Failed to generate headlines');
      const data = await res.json();
      setHeadlines(data.headlines.map((hl: string) => cleanHeadline(hl)));
    } catch (err) {
      setError((err as Error).message);
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
    try {
      const res = await fetch('/api/generate/no-colon-headlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleText }),
      });
      if (!res.ok) throw new Error('Failed to generate no colon headlines');
      const data = await res.json();
      setNoColonHeadlines(data.headlines.map((hl: string) => cleanHeadline(hl)));
    } catch (err) {
      setError((err as Error).message);
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
    try {
      const res = await fetch('/api/generate/creative-headlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleText }),
      });
      if (!res.ok) throw new Error('Failed to generate creative headlines');
      const data = await res.json();
      // Remove quotes specifically for creative headlines
      const cleaned = data.headlines.map((hl: string) =>
        hl.replace(/^["“”']|["“”']$/g, '').trim()
      );
      setCreativeHeadlines(cleaned.map(cleanHeadline));
    } catch (err) {
      setError((err as Error).message);
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
    try {
      const res = await fetch('/api/generate/similar-headlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headline, articleText }),
      });
      if (!res.ok) throw new Error('Failed to generate similar headlines');
      const data = await res.json();
      setSimilarHeadlines(data.similar.map((hl: string) => cleanHeadline(hl)));
    } catch (err) {
      setError((err as Error).message);
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
      setPunchyVariants(data.variants || []);
    } catch (err) {
      setError((err as Error).message);
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
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingSeo(false);
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
          {loadingMain ? 'Generating Headlines...' : 'Generate 3 Headlines'}
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
                    More Clicky & Punchy
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
                    More Clicky & Punchy
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
                    More Clicky & Punchy
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
    </main>
  );
}
