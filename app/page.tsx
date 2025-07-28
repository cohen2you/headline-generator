'use client';

import React, { useState, useRef } from 'react';
import HeadlineGenerator, { HeadlineGeneratorRef } from './components/HeadlineGenerator';
import HeadlineTools, { HeadlineToolsRef } from './components/HeadlineTools';
import ContentGenerator, { ContentGeneratorRef } from './components/ContentGenerator';
import HeadlineWorkshop, { HeadlineWorkshopRef } from './components/HeadlineWorkshop';

export default function Page() {
  const [articleText, setArticleText] = useState('');
  
  // Refs to access child component methods
  const headlineGeneratorRef = useRef<HeadlineGeneratorRef>(null);
  const headlineToolsRef = useRef<HeadlineToolsRef>(null);
  const contentGeneratorRef = useRef<ContentGeneratorRef>(null);
  const headlineWorkshopRef = useRef<HeadlineWorkshopRef>(null);

  const clearAllData = () => {
    // Clear main article text
    setArticleText('');
    
    // Clear data in child components if they have clear methods
    if (headlineGeneratorRef.current?.clearData) {
      headlineGeneratorRef.current.clearData();
    }
    if (headlineToolsRef.current?.clearData) {
      headlineToolsRef.current.clearData();
    }
    if (contentGeneratorRef.current?.clearData) {
      contentGeneratorRef.current.clearData();
    }
    if (headlineWorkshopRef.current?.clearData) {
      headlineWorkshopRef.current.clearData();
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Headline Generator</h1>
        <button
          onClick={clearAllData}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          Clear All Data
        </button>
      </div>

      <HeadlineGenerator 
        ref={headlineGeneratorRef}
        articleText={articleText} 
        setArticleText={setArticleText} 
      />

      <div className="mt-8 p-6 border-2 border-blue-600 rounded-lg bg-blue-50">
        <HeadlineWorkshop 
          ref={headlineWorkshopRef}
          articleText={articleText}
          onCheckHeadline={(headline) => {
            if (headlineToolsRef.current?.checkHeadlineFromWorkshop) {
              headlineToolsRef.current.checkHeadlineFromWorkshop(headline);
            }
          }}
        />
      </div>

      
      <HeadlineTools 
        ref={headlineToolsRef}
        articleText={articleText} 
      />
      
      <ContentGenerator 
        ref={contentGeneratorRef}
        articleText={articleText} 
      />
    </main>
  );
}
