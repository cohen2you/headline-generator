'use client';

import React, { useState, useRef } from 'react';
import HeadlineGenerator, { HeadlineGeneratorRef } from './components/HeadlineGenerator';
import HeadlineTools, { HeadlineToolsRef } from './components/HeadlineTools';
import HeadlineWorkshop, { HeadlineWorkshopRef } from './components/HeadlineWorkshop';
import CTALineGenerator, { CTALineGeneratorRef } from './components/CTALineGenerator';
import PriceActionGenerator, { PriceActionGeneratorRef } from './components/PriceActionGenerator';
import KeywordSearchGenerator, { KeywordSearchGeneratorRef } from './components/KeywordSearchGenerator';
import EdgeRankingsGenerator, { EdgeRankingsGeneratorRef } from './components/EdgeRankingsGenerator';
import AnalystRatingsGenerator, { AnalystRatingsGeneratorRef } from './components/AnalystRatingsGenerator';
import LeadGenerator, { LeadGeneratorRef } from './components/LeadGenerator';
import SubheadGenerator, { SubheadGeneratorRef } from './components/SubheadGenerator';
import AltTextGenerator, { AltTextGeneratorRef } from './components/AltTextGenerator';

export default function Page() {
  const [articleText, setArticleText] = useState('');
  
  // Refs to access child component methods
  const headlineGeneratorRef = useRef<HeadlineGeneratorRef>(null);
  const headlineToolsRef = useRef<HeadlineToolsRef>(null);
  const headlineWorkshopRef = useRef<HeadlineWorkshopRef>(null);
  const ctaLineGeneratorRef = useRef<CTALineGeneratorRef>(null);
  const priceActionGeneratorRef = useRef<PriceActionGeneratorRef>(null);
  const keywordSearchGeneratorRef = useRef<KeywordSearchGeneratorRef>(null);
  const edgeRankingsGeneratorRef = useRef<EdgeRankingsGeneratorRef>(null);
  const analystRatingsGeneratorRef = useRef<AnalystRatingsGeneratorRef>(null);
  const leadGeneratorRef = useRef<LeadGeneratorRef>(null);
  const subheadGeneratorRef = useRef<SubheadGeneratorRef>(null);
  const altTextGeneratorRef = useRef<AltTextGeneratorRef>(null);

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
    if (headlineWorkshopRef.current?.clearData) {
      headlineWorkshopRef.current.clearData();
    }
    if (ctaLineGeneratorRef.current?.clearData) {
      ctaLineGeneratorRef.current.clearData();
    }
    if (priceActionGeneratorRef.current?.clearData) {
      priceActionGeneratorRef.current.clearData();
    }
    if (keywordSearchGeneratorRef.current?.clearData) {
      keywordSearchGeneratorRef.current.clearData();
    }
    if (edgeRankingsGeneratorRef.current?.clearData) {
      edgeRankingsGeneratorRef.current.clearData();
    }
    if (analystRatingsGeneratorRef.current?.clearData) {
      analystRatingsGeneratorRef.current.clearData();
    }
    if (leadGeneratorRef.current?.clearData) {
      leadGeneratorRef.current.clearData();
    }
    if (subheadGeneratorRef.current?.clearData) {
      subheadGeneratorRef.current.clearData();
    }
    if (altTextGeneratorRef.current?.clearData) {
      altTextGeneratorRef.current.clearData();
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Benzinga Content Tools</h1>
        <button
          onClick={clearAllData}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          Clear All Data
        </button>
      </div>

      {/* Top Priority Tools */}
      <div className="mb-8">
        
        {/* Price Action Generator - First */}
        <div className="mb-6">
          <PriceActionGenerator ref={priceActionGeneratorRef} />
        </div>

        {/* Keyword Search Generator - Second */}
        <div className="mb-6">
          <KeywordSearchGenerator ref={keywordSearchGeneratorRef} />
        </div>

        {/* CTA Line Generator - Third */}
        <div className="mb-6">
          <CTALineGenerator ref={ctaLineGeneratorRef} />
        </div>

        {/* Edge Rankings Generator - Third */}
        <div className="mb-6">
          <EdgeRankingsGenerator ref={edgeRankingsGeneratorRef} />
        </div>

        {/* Analyst Ratings - Fourth */}
        <div className="mb-6">
          <AnalystRatingsGenerator ref={analystRatingsGeneratorRef} />
        </div>
      </div>

      {/* Article Text Input Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b border-gray-300 pb-2">
          Article Text Input
        </h2>
        <HeadlineGenerator 
          ref={headlineGeneratorRef}
          articleText={articleText} 
          setArticleText={setArticleText} 
        />
      </div>

      {/* Content Creation Tools */}
      <div className="mb-8">
        
        {/* Lead Generator */}
        <div className="mb-6">
          <LeadGenerator ref={leadGeneratorRef} articleText={articleText} />
        </div>

        {/* Subhead Generator */}
        <div className="mb-6">
          <SubheadGenerator ref={subheadGeneratorRef} articleText={articleText} />
        </div>
      </div>

      {/* Headline Tools */}
      <div className="mb-8">
        
        {/* Headline Workshop */}
        <div className="mb-6">
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

        {/* Headline Checker */}
        <div className="mb-6">
          <HeadlineTools 
            ref={headlineToolsRef}
            articleText={articleText}
          />
        </div>
      </div>

      {/* Alt-Text Generator */}
      <div className="mb-8">
        <AltTextGenerator ref={altTextGeneratorRef} />
      </div>
    </main>
  );
}
