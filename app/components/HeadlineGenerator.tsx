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

    // Function to clean article text by removing UI elements and formatting
    const cleanArticleText = (text: string): string => {
      return text
        // Remove UI elements and buttons - more comprehensive patterns
        .replace(/\+\s*Free\s*Alerts?/gi, '')
        .replace(/Get\s+Free\s+Report/gi, '')
        .replace(/Get\s+Free/gi, '') // Catch "Get Free" by itself
        .replace(/See\s+the\s+chart\s+here/gi, '')
        .replace(/Click\s+here/gi, '')
        .replace(/Read\s+more/gi, '')
        .replace(/Subscribe/gi, '')
        .replace(/Sign\s+up/gi, '')
        .replace(/Free\s+Report/gi, '')
        .replace(/Free\s+Alerts?/gi, '')
        
        // Remove stock ticker formatting with percentages
        .replace(/\b[A-Z]{1,5}\s*[+-]\d+\.?\d*%/g, '')
        
        // Remove standalone stock tickers (but keep them in context)
        .replace(/\b[A-Z]{1,5}\s*$/gm, '')
        
        // Remove common financial website UI elements
        .replace(/Download\s+App/gi, '')
        .replace(/Get\s+Started/gi, '')
        .replace(/Learn\s+More/gi, '')
        .replace(/Watch\s+Now/gi, '')
        .replace(/Listen\s+Now/gi, '')
        
        // Remove extra whitespace and clean up formatting
        .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
        .replace(/[ \t]+/g, ' ') // Normalize spaces and tabs (but preserve line breaks)
        .trim();
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const originalText = e.target.value;
      const cleanedText = cleanArticleText(originalText);
      
      // Debug logging to see what's being cleaned
      if (originalText !== cleanedText) {
        console.log('Text cleaning applied:', {
          originalLength: originalText.length,
          cleanedLength: cleanedText.length,
          removedElements: originalText.includes('Get Free') || originalText.includes('Free Report') || originalText.includes('Free Alerts')
        });
      }
      
      setArticleText(cleanedText);
    };

    useImperativeHandle(ref, () => ({
      clearData
    }));

    return (
      <>
        <textarea
          rows={8}
          className="w-full p-3 border border-gray-300 rounded-md mb-4 resize-none"
          placeholder="Paste article text here... (UI elements will be automatically cleaned)"
          value={articleText}
          onChange={handleTextChange}
        />
        {error && <p className="text-red-600 mt-4">{error}</p>}
      </>
    );
  }
);

HeadlineGenerator.displayName = 'HeadlineGenerator';

export default HeadlineGenerator; 