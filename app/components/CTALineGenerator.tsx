import React, { useState } from 'react';

// Add this CSS to your global stylesheet (e.g., globals.css):
// .cta-html-output a {
//   color: #2563eb; /* Tailwind blue-600 */
//   text-decoration: underline;
//   font-weight: 500;
// }

const CTALineGenerator: React.FC = () => {
  const [ticker, setTicker] = useState('');
  const [cta, setCta] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const generateCTA = async () => {
    setError('');
    setCta('');
    setLoading(true);
    try {
      const res = await fetch('/api/generate/cta-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        console.log('CTA HTML:', data.cta); // Log the raw HTML
        setCta(data.cta);
      }
    } catch {
      setError('Failed to generate CTA.');
    } finally {
      setLoading(false);
    }
  };

  const copyCTA = async () => {
    if (!cta) return;
    // Copy as HTML to clipboard
    try {
      await navigator.clipboard.write([
        new window.ClipboardItem({ 'text/html': new Blob([cta], { type: 'text/html' }) })
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: copy as plain text
      await navigator.clipboard.writeText(cta.replace(/<[^>]+>/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="mt-8 p-4 border border-blue-500 rounded-md max-w-2xl mx-auto">
      <h2 className="text-lg font-semibold mb-4 text-blue-700">CTA Line Generator</h2>
      <input
        type="text"
        placeholder="Enter ticker (e.g., TSLA)"
        value={ticker}
        onChange={e => setTicker(e.target.value.toUpperCase())}
        className="w-full p-2 border border-blue-400 rounded mb-4"
      />
      <button
        onClick={generateCTA}
        disabled={loading || !ticker.trim()}
        className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-blue-300 mb-4"
      >
        {loading ? 'Generating...' : 'Generate CTA'}
      </button>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {cta && (
        <div className="cta-html-output p-3 rounded text-sm mt-4 border border-gray-200">
          <div dangerouslySetInnerHTML={{ __html: cta }} />
          <button
            onClick={copyCTA}
            className="ml-4 mt-2 bg-blue-200 hover:bg-blue-300 text-blue-800 px-2 py-1 rounded text-xs"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
    </section>
  );
};

export default CTALineGenerator; 