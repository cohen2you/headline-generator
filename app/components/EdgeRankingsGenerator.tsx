'use client';

import React, { useState, forwardRef, useImperativeHandle } from 'react';

export interface EdgeRankingsGeneratorRef {
  clearData: () => void;
}

type EdgeRankingsData = {
  momentum?: number;
  growth?: number;
  quality?: number;
  value?: number;
  ticker?: string;
};

const EdgeRankingsGenerator = forwardRef<EdgeRankingsGeneratorRef>((props, ref) => {
  const [ticker, setTicker] = useState('');
  const [rankings, setRankings] = useState<EdgeRankingsData | null>(null);
  const [rankingsParagraph, setRankingsParagraph] = useState('');
  const [edgeTease, setEdgeTease] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const clearData = () => {
    setTicker('');
    setRankings(null);
    setRankingsParagraph('');
    setEdgeTease('');
    setLoading(false);
    setError('');
    setCopied(false);
  };

  useImperativeHandle(ref, () => ({
    clearData
  }));

  const generateEdgeRankings = async () => {
    if (!ticker.trim()) {
      setError('Please enter a ticker first.');
      return;
    }

    setError('');
    setRankings(null);
    setRankingsParagraph('');
    setLoading(true);

    try {
      const res = await fetch('/api/generate/edge-rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker }),
      });

      const data = await res.json();
      
             if (data.error) {
         setError(data.error);
       } else {
         setRankings(data.rankings);
         setRankingsParagraph(data.rankingsParagraph);
         
         // Generate edge tease
         const tease = generateEdgeTease(data.rankings);
         setEdgeTease(tease);
       }
    } catch (error) {
      setError('Failed to generate edge rankings.');
    } finally {
      setLoading(false);
    }
  };

  const generateEdgeTease = (rankings: EdgeRankingsData) => {
    const { ticker, momentum, growth, quality, value } = rankings;
    
    const metrics = [
      { name: 'Momentum', value: momentum },
      { name: 'Growth', value: growth },
      { name: 'Quality', value: quality },
      { name: 'Value', value: value }
    ].filter(metric => metric.value !== null && metric.value !== undefined);
    
    if (metrics.length === 0) {
      return `${ticker} edge rankings data is currently unavailable.`;
    }
    
    // Find the highest scoring metric
    const topMetric = metrics.reduce((prev, current) => 
      (current.value as number) > (prev.value as number) ? current : prev
    );
    
    const score = topMetric.value as number;
    let description = '';
    
    if (score >= 80) description = 'excellent';
    else if (score >= 60) description = 'strong';
    else if (score >= 40) description = 'moderate';
    else if (score >= 20) description = 'weak';
    else description = 'poor';
    
    return `${ticker} shows ${description} ${topMetric.name} with a score of ${score}/100. To find out how ${ticker} ranks in the other categories, click here.`;
  };

  const copyRankings = async () => {
    if (!rankingsParagraph) return;
    
    try {
      await navigator.clipboard.writeText(rankingsParagraph);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy rankings:', error);
    }
  };

  const copyEdgeTease = async () => {
    if (!edgeTease) return;
    
    try {
      await navigator.clipboard.writeText(edgeTease);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy edge tease:', error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    if (score >= 20) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreDescription = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Strong';
    if (score >= 40) return 'Moderate';
    if (score >= 20) return 'Weak';
    return 'Poor';
  };

  return (
    <section className="p-4 border border-purple-600 rounded-md max-w-2xl mx-auto">
      <h2 className="text-lg font-semibold mb-4 text-purple-700">Edge Rankings Generator</h2>
      <input
        type="text"
        placeholder="Enter ticker (e.g., AAPL)"
        value={ticker}
        onChange={(e) => setTicker(e.target.value.toUpperCase())}
        className="w-full p-2 border border-purple-400 rounded mb-4"
      />
      <button
        onClick={generateEdgeRankings}
        disabled={loading || !ticker.trim()}
        className="bg-purple-600 text-white px-4 py-2 rounded disabled:bg-purple-300 mb-4"
      >
        {loading ? 'Generating...' : 'Generate Edge Rankings'}
      </button>
      
      {error && <p className="text-red-600 mb-4">{error}</p>}
      
      {rankings && (
        <div className="space-y-4">
          {/* Individual Metrics Display */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {rankings.momentum !== null && rankings.momentum !== undefined && (
              <div className="p-3 border border-purple-200 rounded">
                <div className="text-sm font-semibold text-purple-700">Momentum</div>
                <div className={`text-lg font-bold ${getScoreColor(rankings.momentum)}`}>
                  {rankings.momentum}/100
                </div>
                <div className="text-xs text-gray-600">{getScoreDescription(rankings.momentum)}</div>
              </div>
            )}
            
            {rankings.growth !== null && rankings.growth !== undefined && (
              <div className="p-3 border border-purple-200 rounded">
                <div className="text-sm font-semibold text-purple-700">Growth</div>
                <div className={`text-lg font-bold ${getScoreColor(rankings.growth)}`}>
                  {rankings.growth}/100
                </div>
                <div className="text-xs text-gray-600">{getScoreDescription(rankings.growth)}</div>
              </div>
            )}
            
            {rankings.quality !== null && rankings.quality !== undefined && (
              <div className="p-3 border border-purple-200 rounded">
                <div className="text-sm font-semibold text-purple-700">Quality</div>
                <div className={`text-lg font-bold ${getScoreColor(rankings.quality)}`}>
                  {rankings.quality}/100
                </div>
                <div className="text-xs text-gray-600">{getScoreDescription(rankings.quality)}</div>
              </div>
            )}
            
            {rankings.value !== null && rankings.value !== undefined && (
              <div className="p-3 border border-purple-200 rounded">
                <div className="text-sm font-semibold text-purple-700">Value</div>
                <div className={`text-lg font-bold ${getScoreColor(rankings.value)}`}>
                  {rankings.value}/100
                </div>
                <div className="text-xs text-gray-600">{getScoreDescription(rankings.value)}</div>
              </div>
            )}
          </div>

                     {/* Rankings Paragraph */}
           {rankingsParagraph && (
             <div className="p-3 bg-purple-50 border border-purple-200 rounded">
               <div className="text-sm font-semibold text-purple-700 mb-2">Edge Rankings Summary:</div>
               <p className="text-black mb-2">{rankingsParagraph}</p>
               <button
                 onClick={copyRankings}
                 className="bg-purple-200 hover:bg-purple-300 text-purple-800 px-2 py-1 rounded text-xs"
               >
                 {copied ? 'Copied!' : 'Copy'}
               </button>
             </div>
           )}

           {/* Edge Tease */}
           {edgeTease && (
             <div className="p-3 bg-purple-100 border border-purple-300 rounded">
               <div className="text-sm font-semibold text-purple-700 mb-2">Edge Tease:</div>
               <p className="text-black mb-2">
                 {edgeTease.replace('click here.', '')}
                 <a
                   href={`https://www.benzinga.com/quote/${ticker}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="text-purple-700 underline hover:text-purple-900"
                 >
                   click here.
                 </a>
               </p>
               <button
                 onClick={copyEdgeTease}
                 className="bg-purple-300 hover:bg-purple-400 text-purple-800 px-2 py-1 rounded text-xs"
               >
                 {copied ? 'Copied!' : 'Copy'}
               </button>
             </div>
           )}
        </div>
      )}
    </section>
  );
});

EdgeRankingsGenerator.displayName = 'EdgeRankingsGenerator';

export default EdgeRankingsGenerator;
