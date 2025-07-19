'use client';

import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { cleanHeadline } from './utils';

interface HeadlineEnhancerProps {
  articleText: string;
}

export interface HeadlineEnhancerRef {
  clearData: () => void;
}

const HeadlineEnhancer = forwardRef<HeadlineEnhancerRef, HeadlineEnhancerProps>(
  ({ articleText }, ref) => {
    const [similarHeadlines, setSimilarHeadlines] = useState<string[]>([]);
    const [punchyVariants, setPunchyVariants] = useState<string[]>([]);
    const [seoHeadline, setSeoHeadline] = useState<string>('');
    const [loadingSimilar, setLoadingSimilar] = useState(false);
    const [loadingPunchyVariants, setLoadingPunchyVariants] = useState(false);
    const [loadingSeo, setLoadingSeo] = useState(false);
    const [selectedHeadline, setSelectedHeadline] = useState<string | null>(null);
    const [copiedSimilarIndex, setCopiedSimilarIndex] = useState<number | null>(null);
    const [copiedSeo, setCopiedSeo] = useState(false);

    // Listen for headline selection events from other components
    React.useEffect(() => {
      const handleHeadlineSelected = (event: CustomEvent) => {
        setSelectedHeadline(event.detail);
      };

      window.addEventListener('headlineSelected', handleHeadlineSelected as EventListener);
      
      return () => {
        window.removeEventListener('headlineSelected', handleHeadlineSelected as EventListener);
      };
    }, []);

    // Monitor state changes
    React.useEffect(() => {
      console.log('similarHeadlines state changed to:', similarHeadlines);
    }, [similarHeadlines]);

    React.useEffect(() => {
      console.log('punchyVariants state changed to:', punchyVariants);
    }, [punchyVariants]);



    const clearData = () => {
      setSimilarHeadlines([]);
      setPunchyVariants([]);
      setSeoHeadline('');
      setLoadingSimilar(false);
      setLoadingPunchyVariants(false);
      setLoadingSeo(false);
      setSelectedHeadline(null);
      setCopiedSimilarIndex(null);
      setCopiedSeo(false);
    };

    useImperativeHandle(ref, () => ({
      clearData
    }));

    function copyToClipboard(text: string, index: number, isSimilar = false) {
      navigator.clipboard.writeText(text);
      if (isSimilar) {
        setCopiedSimilarIndex(index);
        setTimeout(() => setCopiedSimilarIndex(null), 2000);
      }
    }

    function copySeoToClipboard() {
      if (!seoHeadline) return;
      navigator.clipboard.writeText(seoHeadline);
      setCopiedSeo(true);
      setTimeout(() => setCopiedSeo(false), 2000);
    }

    async function generateSimilar(headline: string) {
      console.log('generateSimilar called with headline:', headline);
      console.log('articleText length:', articleText?.length || 0);
      setLoadingSimilar(true);
      setSimilarHeadlines([]);
      setSeoHeadline('');
      setSelectedHeadline(headline);
      try {
        console.log('Making API call to /api/generate/similar-headlines');
        const requestBody = { headline, articleText };
        console.log('Request body:', requestBody);
        
        const res = await fetch('/api/generate/similar-headlines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
        console.log('API response status:', res.status);
        console.log('API response headers:', Object.fromEntries(res.headers.entries()));
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('API error response:', errorText);
          throw new Error(`Failed to generate similar headlines: ${res.status} ${errorText}`);
        }
        
        const data = await res.json();
        console.log('API response data:', data);
        
        if (!data.similar || !Array.isArray(data.similar)) {
          console.error('Invalid response format - missing or invalid similar array:', data);
          throw new Error('Invalid response format from API');
        }
        
        console.log('Processing similar headlines:', data.similar);
        const cleanedHeadlines = data.similar.map((hl: string) => cleanHeadline(hl));
        console.log('Cleaned headlines:', cleanedHeadlines);
        console.log('About to set similar headlines state with:', cleanedHeadlines);
        setSimilarHeadlines(cleanedHeadlines);
        console.log('State update called for similar headlines');
      } catch (error: unknown) {
        console.error('Error generating similar headlines:', error);
        alert(`Error generating similar headlines: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setLoadingSimilar(false);
      }
    }

    async function generatePunchyVariants(headline: string) {
      console.log('generatePunchyVariants called with headline:', headline);
      setLoadingPunchyVariants(true);
      setPunchyVariants([]);
      try {
        console.log('Making API call to /api/generate/punchy-variants');
        const requestBody = { headline };
        console.log('Request body:', requestBody);
        
        const res = await fetch('/api/generate/punchy-variants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
        console.log('API response status:', res.status);
        console.log('API response headers:', Object.fromEntries(res.headers.entries()));
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('API error response:', errorText);
          throw new Error(`Failed to generate punchy variants: ${res.status} ${errorText}`);
        }
        
        const data = await res.json();
        console.log('API response data:', data);
        
        if (!data.variants || !Array.isArray(data.variants)) {
          console.error('Invalid response format - missing or invalid variants array:', data);
          throw new Error('Invalid response format from API');
        }
        
        console.log('Processing punchy variants:', data.variants);
        const cleaned = data.variants.map((hl: string) => cleanHeadline(hl, true));
        console.log('Cleaned variants:', cleaned);
        setPunchyVariants(cleaned);
      } catch (error: unknown) {
        console.error('Error generating punchy variants:', error);
        alert(`Error generating punchy variants: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setLoadingPunchyVariants(false);
      }
    }

    async function generateSeoHeadline() {
      if (!selectedHeadline) return;
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
        console.error('Error generating SEO headline:', error);
      } finally {
        setLoadingSeo(false);
      }
    }

    return (
      <>
        {loadingSimilar && (
          <p className="mt-6 text-gray-700 font-semibold">Generating similar headlines...</p>
        )}

        {/* Similar Headlines */}
        {similarHeadlines.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xl font-semibold mb-2">Similar Headlines</h2>
            <ul className="list-disc list-inside space-y-1">
              {similarHeadlines.map((hl, i) => (
                <li key={i} className="flex items-center justify-between">
                  <span>{hl}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedHeadline(hl)}
                      className="bg-blue-200 hover:bg-blue-300 text-blue-800 px-3 py-1 rounded text-sm"
                    >
                      Use This
                    </button>
                    <button
                      onClick={() => copyToClipboard(hl, i, true)}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm"
                    >
                      {copiedSimilarIndex === i ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedHeadline(hl)}
                      className="bg-red-200 hover:bg-red-300 text-red-800 px-3 py-1 rounded text-sm"
                    >
                      Use This
                    </button>
                    <button
                      onClick={() => copyToClipboard(hl, i, true)}
                      className="bg-red-200 hover:bg-red-300 text-red-800 px-3 py-1 rounded text-sm"
                    >
                      {copiedSimilarIndex === i ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
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

        {/* Headline Selection */}
          <section className="mt-8 p-4 border border-gray-400 rounded-md max-w-xl mx-auto">
            <h2 className="text-lg font-semibold mb-2 text-gray-800">Headline Enhancement</h2>
            <input
              type="text"
              placeholder="Enter or paste a headline to enhance"
              value={selectedHeadline || ''}
              onChange={(e) => setSelectedHeadline(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded mb-3"
            />
            
                      {/* Headline Enhancement Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                console.log('Generate Similar clicked, selectedHeadline:', selectedHeadline);
                if (selectedHeadline) {
                  generateSimilar(selectedHeadline);
                } else {
                  console.log('No headline selected!');
                }
              }}
              disabled={loadingSimilar || !articleText.trim() || !selectedHeadline?.trim()}
              className="bg-blue-500 text-white px-4 py-2 rounded text-sm disabled:bg-gray-400"
            >
              {loadingSimilar ? 'Generating...' : 'Generate Similar'}
            </button>
            <button
              onClick={() => {
                console.log('Generate Punchy clicked, selectedHeadline:', selectedHeadline);
                if (selectedHeadline) {
                  generatePunchyVariants(selectedHeadline);
                } else {
                  console.log('No headline selected!');
                }
              }}
              disabled={loadingPunchyVariants || !selectedHeadline?.trim()}
              className="bg-red-500 text-white px-4 py-2 rounded text-sm disabled:bg-gray-400"
            >
              {loadingPunchyVariants ? 'Generating...' : 'More Clicky & Punchy'}
            </button>
          </div>
        </section>
      </>
    );
  }
);

HeadlineEnhancer.displayName = 'HeadlineEnhancer';

export default HeadlineEnhancer; 