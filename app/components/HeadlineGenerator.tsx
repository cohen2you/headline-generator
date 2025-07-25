'use client';

import React, { useState, forwardRef, useImperativeHandle } from 'react';

interface HeadlineGeneratorProps {
  articleText: string;
  setArticleText: (text: string) => void;
}

export interface HeadlineGeneratorRef {
  clearData: () => void;
}

const HeadlineGenerator = forwardRef<HeadlineGeneratorRef, HeadlineGeneratorProps>(
  ({ articleText, setArticleText }, ref) => {
    const [error, setError] = useState('');

    const clearData = () => {
      setError('');
    };

    useImperativeHandle(ref, () => ({
      clearData
    }));

    return (
      <>
        <textarea
          rows={8}
          className="w-full p-3 border border-gray-300 rounded-md mb-4 resize-none"
          placeholder="Paste article text here..."
          value={articleText}
          onChange={(e) => setArticleText(e.target.value)}
        />
        {error && <p className="text-red-600 mt-4">{error}</p>}
      </>
    );
  }
);

HeadlineGenerator.displayName = 'HeadlineGenerator';

export default HeadlineGenerator; 