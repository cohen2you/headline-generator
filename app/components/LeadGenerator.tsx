'use client';

import React, { useState, forwardRef, useImperativeHandle } from 'react';

interface LeadGeneratorProps {
  articleText: string;
}

export interface LeadGeneratorRef {
  clearData: () => void;
}

const LeadGenerator = forwardRef<LeadGeneratorRef, LeadGeneratorProps>(({ articleText }, ref) => {
  // Lead Generator state & loading
  const [lead, setLead] = useState('');
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadError, setLeadError] = useState('');
  const [copiedLead, setCopiedLead] = useState(false);
  const [headline, setHeadline] = useState('');
  const [showHeadlineInput, setShowHeadlineInput] = useState(false);

  const clearData = () => {
    setLead('');
    setLeadLoading(false);
    setLeadError('');
    setCopiedLead(false);
    setHeadline('');
    setShowHeadlineInput(false);
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
      console.error('Error generating lead:', error);
      if (error instanceof Error) setLeadError(error.message);
      else setLeadError(String(error));
    } finally {
      setLeadLoading(false);
    }
  }

  async function generateHeadlineLead() {
    if (!articleText.trim()) {
      setLeadError('Please enter article text first.');
      return;
    }
    if (!headline.trim()) {
      setLeadError('Please enter a headline first.');
      return;
    }
    setLead('');
    setLeadError('');
    setLeadLoading(true);
    try {
      const res = await fetch('/api/generate/headline-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleText, headline }),
      });
      if (!res.ok) throw new Error('Failed to generate headline lead');
      const data = await res.json();
      setLead(data.lead);
    } catch (error: unknown) {
      console.error('Error generating headline lead:', error);
      if (error instanceof Error) setLeadError(error.message);
      else setLeadError(String(error));
    } finally {
      setLeadLoading(false);
    }
  }

  async function generateOneSentenceLead() {
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
        body: JSON.stringify({ 
          articleText, 
          style: 'one_sentence',
          mode: 'add_to_existing'
        }),
      });
      if (!res.ok) throw new Error('Failed to generate one sentence lead');
      const data = await res.json();
      setLead(data.lead);
    } catch (error: unknown) {
      console.error('Error generating one sentence lead:', error);
      if (error instanceof Error) setLeadError(error.message);
      else setLeadError(String(error));
    } finally {
      setLeadLoading(false);
    }
  }

  return (
    <section className="p-4 border border-green-500 rounded-md max-w-4xl mx-auto">
      <h2 className="text-lg font-semibold mb-4 text-green-700">Lead Generator</h2>
      
      {/* Headline Input Section */}
      {showHeadlineInput && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
          <label className="block text-sm font-medium text-green-700 mb-2">
            Enter Article Headline:
          </label>
          <textarea
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Paste the article headline here..."
            rows={2}
            className="w-full p-2 border border-green-300 rounded resize-none text-sm"
          />
        </div>
      )}

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
        <button
          onClick={() => {
            setShowHeadlineInput(!showHeadlineInput);
            if (showHeadlineInput) {
              setHeadline('');
              setLead('');
            }
          }}
          disabled={leadLoading}
          className="bg-green-700 text-white px-4 py-2 rounded disabled:bg-green-300"
        >
          {showHeadlineInput ? 'Cancel Headline Lead' : 'Headline Lead'}
        </button>
        {showHeadlineInput && (
          <button
            onClick={generateHeadlineLead}
            disabled={leadLoading || !headline.trim()}
            className="bg-green-800 text-white px-4 py-2 rounded disabled:bg-green-300 font-semibold"
          >
            {leadLoading ? 'Generating...' : 'Generate Headline Lead'}
          </button>
        )}
        <button
          onClick={generateOneSentenceLead}
          disabled={leadLoading}
          className="bg-green-800 text-white px-4 py-2 rounded disabled:bg-green-300 font-semibold"
        >
          {leadLoading ? 'Generating...' : 'One Sentence Lead'}
        </button>
      </div>
      {leadError && <p className="text-red-600 mb-4">{leadError}</p>}
      {lead && (
        <>
          <div className="mb-3">
            <div className="text-sm text-green-700 font-medium mb-2">Generated Lead:</div>
            <div className="w-full p-3 border border-green-400 rounded bg-white text-sm">
              {lead.split('\n\n').filter((p: string) => p.trim()).map((paragraph: string, pIndex: number) => {
                // Convert markdown bold (**text**) to HTML bold
                const parts = paragraph.split(/(\*\*.*?\*\*)/g);
                return (
                  <p key={pIndex} className="mb-2 last:mb-0">
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
          <div className="flex gap-2">
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
            {lead.includes('\n') && (
              <button
                onClick={() => {
                  const oneSentence = lead.split('\n')[0];
                  navigator.clipboard.writeText(oneSentence);
                  setCopiedLead(true);
                  setTimeout(() => setCopiedLead(false), 2000);
                }}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Copy First Sentence Only
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
});

LeadGenerator.displayName = 'LeadGenerator';

export default LeadGenerator; 