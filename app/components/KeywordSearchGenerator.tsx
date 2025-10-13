'use client';

import React, { useState, forwardRef, useImperativeHandle } from 'react';

export interface KeywordSearchGeneratorRef {
  clearData: () => void;
}

interface Article {
  id: string;
  title: string;
  url: string;
  created: string;
  teaser: string;
  author: string;
  channels?: string[];
  stocks?: string[];
  tags?: string[];
}

const KeywordSearchGenerator = forwardRef<KeywordSearchGeneratorRef>((props, ref) => {
  const [keywords, setKeywords] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const clearData = () => {
    setKeywords('');
    setArticles([]);
    setLoading(false);
    setError('');
    setCopiedUrl(null);
  };

  useImperativeHandle(ref, () => ({
    clearData
  }));

  async function searchNews() {
    if (!keywords.trim()) {
      setError('Please enter keywords to search.');
      return;
    }

    setArticles([]);
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/generate/keyword-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: keywords.trim() }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to search news');
      }

      const data = await res.json();
      setArticles(data.articles || []);

      if (data.articles.length === 0) {
        setError('No articles found for the given keywords.');
      }
    } catch (error: unknown) {
      console.error('Error searching news:', error);
      if (error instanceof Error) setError(error.message);
      else setError(String(error));
    } finally {
      setLoading(false);
    }
  }

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const decodeHtmlEntities = (text: string) => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      searchNews();
    }
  };

  return (
    <section className="p-4 border border-blue-600 rounded-md max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-blue-700">Benzinga News Search</h2>
        {(articles.length > 0 || keywords) && (
          <button
            onClick={clearData}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
          >
            Clear Results
          </button>
        )}
      </div>
      
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Enter keywords or ticker symbols (e.g., AAPL earnings, Tesla stock)"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 p-2 border border-blue-400 rounded"
        />
        <button
          onClick={searchNews}
          disabled={loading || !keywords.trim()}
          className="bg-blue-600 text-white px-6 py-2 rounded disabled:bg-blue-300 font-semibold whitespace-nowrap"
        >
          {loading ? 'Searching...' : '🔍 Search'}
        </button>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {articles.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Found {articles.length} article{articles.length !== 1 ? 's' : ''} (select one):
          </p>
          
          {articles.map((article) => (
            <div 
              key={article.id} 
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
            >
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {decodeHtmlEntities(article.title)}
              </h3>
              
              {article.teaser && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {decodeHtmlEntities(article.teaser)}
                </p>
              )}

              <div className="flex flex-wrap gap-2 mb-3 text-xs text-gray-500 dark:text-gray-400">
                <span>{formatDate(article.created)}</span>
                {article.author && <span>• {article.author}</span>}
                {article.stocks && article.stocks.length > 0 && (
                  <span>• {article.stocks.map((s: { name?: string } | string) => typeof s === 'string' ? s : s.name).filter(Boolean).join(', ')}</span>
                )}
              </div>

              <div className="flex gap-2 items-center">
                <button
                  onClick={() => copyUrl(article.url)}
                  className={`flex-1 ${
                    copiedUrl === article.url
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white px-4 py-2 rounded font-semibold transition-colors`}
                >
                  {copiedUrl === article.url ? '✓ URL Copied!' : '📋 Copy URL'}
                </button>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded transition-colors whitespace-nowrap"
                >
                  View Article →
                </a>
              </div>

              {article.tags && article.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {article.tags.slice(0, 5).map((tag: { name?: string } | string, idx: number) => (
                    <span
                      key={idx}
                      className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded"
                    >
                      {typeof tag === 'string' ? tag : tag.name || ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
});

KeywordSearchGenerator.displayName = 'KeywordSearchGenerator';

export default KeywordSearchGenerator;

