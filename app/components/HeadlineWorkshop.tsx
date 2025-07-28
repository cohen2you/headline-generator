'use client';

import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { cleanHeadline } from './utils';

interface HeadlineWorkshopProps {
  articleText: string;
  onCheckHeadline?: (headline: string) => void;
}

export interface HeadlineWorkshopRef {
  clearData: () => void;
}

interface HeadlineVersion {
  text: string;
  enhancementType?: string;
  timestamp: Date;
}

const HeadlineWorkshop = forwardRef<HeadlineWorkshopRef, HeadlineWorkshopProps>(
  ({ articleText, onCheckHeadline }, ref) => {
        const [step, setStep] = useState<'initial' | 'selection' | 'enhancement' | 'final'>('initial');
    const [initialHeadlines, setInitialHeadlines] = useState<string[]>([]);
    const [keyNames, setKeyNames] = useState<string[]>([]);
    const [directQuotes, setDirectQuotes] = useState<string[]>([]);
    const [loadingDirectQuotes, setLoadingDirectQuotes] = useState(false);
    const [showDirectQuotes, setShowDirectQuotes] = useState(false);
    
    const [currentHeadline, setCurrentHeadline] = useState<string>('');
    const [headlineHistory, setHeadlineHistory] = useState<HeadlineVersion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [customEnhancement, setCustomEnhancement] = useState('');
    const [customHeadline, setCustomHeadline] = useState('');
    const [loadingCustom, setLoadingCustom] = useState(false);

    const clearData = () => {
      setStep('initial');
      setInitialHeadlines([]);
      setKeyNames([]);
      setDirectQuotes([]);
      setLoadingDirectQuotes(false);
      setShowDirectQuotes(false);
      setCurrentHeadline('');
      setHeadlineHistory([]);
      setLoading(false);
      setError('');
      setCopiedIndex(null);
      setCustomEnhancement('');
      setCustomHeadline('');
      setLoadingCustom(false);
    };

    useImperativeHandle(ref, () => ({
      clearData
    }));

    const copyToClipboard = (text: string, index: number) => {
      navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    };

    const checkForDirectQuotes = async () => {
      if (!articleText.trim()) {
        setError('Please enter article text first.');
        return;
      }

      setLoadingDirectQuotes(true);
      setError('');
      try {
        const res = await fetch('/api/generate/direct-quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleText }),
        });

        if (!res.ok) throw new Error('Failed to extract direct quotes');
        const data = await res.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        setDirectQuotes(data.quotes || []);
        setShowDirectQuotes(true);
      } catch (error: unknown) {
        if (error instanceof Error) setError(error.message);
        else setError(String(error));
      } finally {
        setLoadingDirectQuotes(false);
      }
    };

    const selectDirectQuote = async (quote: string) => {
      if (quote.trim()) {
        setLoading(true);
        setError('');
        
        try {
          // Extract a short segment (4 words or less) from the quote
          const words = quote.trim().split(' ');
          const shortSegment = words.slice(0, Math.min(4, words.length)).join(' ');
          
          // Format the short segment with Title Case and single quotes
          const formattedSegment = shortSegment
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
          
          // Call API to generate a new headline incorporating the short segment
          const res = await fetch('/api/generate/headline-workshop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              articleText,
              action: 'incorporate_quote',
              quote: formattedSegment
            }),
          });

          if (!res.ok) throw new Error('Failed to generate headline with quote');
          const data = await res.json();
          
          if (data.error) {
            throw new Error(data.error);
          }

          const newHeadline = cleanHeadline(data.headlines[0]);
          setCurrentHeadline(newHeadline);
          
          // Add to headline history
          setHeadlineHistory(prev => [...prev, {
            text: newHeadline,
            enhancementType: 'direct_quote',
            timestamp: new Date()
          }]);
          
          setStep('enhancement');
        } catch (error: unknown) {
          if (error instanceof Error) setError(error.message);
          else setError(String(error));
        } finally {
          setLoading(false);
        }
      }
    };

    const generateInitialHeadlines = async () => {
      if (!articleText.trim()) {
        setError('Please enter article text first.');
        return;
      }

      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/generate/headline-workshop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            articleText,
            action: 'generate_initial'
          }),
        });

        if (!res.ok) throw new Error('Failed to generate initial headlines');
        const data = await res.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        const cleanedHeadlines = data.headlines.map((hl: string) => cleanHeadline(hl));
        setInitialHeadlines(cleanedHeadlines);
        setKeyNames(data.keyNames || []);
        setStep('selection');
      } catch (error: unknown) {
        if (error instanceof Error) setError(error.message);
        else setError(String(error));
      } finally {
        setLoading(false);
      }
    };

    const selectHeadline = (headline: string) => {
      setCurrentHeadline(headline);
      setHeadlineHistory([{ text: headline, timestamp: new Date() }]);
      setStep('enhancement');
    };

    const enhanceHeadline = async (enhancementType: string, specificQuote?: string) => {
      if (!articleText.trim()) {
        setError('Please enter article text first.');
        return;
      }

      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/generate/headline-workshop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            articleText,
            action: 'generate_new',
            enhancementType,
            specificQuote,
            customEnhancement: enhancementType === 'custom' ? customEnhancement : undefined
          }),
        });

        if (!res.ok) throw new Error('Failed to generate new headline');
        const data = await res.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        const newHeadline = cleanHeadline(data.headlines?.[0] || data.enhancedHeadline || '');
        

        
        // Replace the current headline with the new version
        setCurrentHeadline(newHeadline);
         setHeadlineHistory(prev => [...prev, { 
           text: newHeadline, 
           enhancementType, 
           timestamp: new Date() 
         }]);
         setCustomEnhancement('');
         
         // Update key names if provided
         if (data.keyNames) {
           setKeyNames(data.keyNames);
         }
      } catch (error: unknown) {
        if (error instanceof Error) setError(error.message);
        else setError(String(error));
      } finally {
        setLoading(false);
      }
    };

    const finishWorkshop = () => {
      setStep('final');
    };

    const startOver = () => {
      setStep('initial');
      setInitialHeadlines([]);
      setCurrentHeadline('');
      setHeadlineHistory([]);
    };

    const generateCustomHeadline = async () => {
      if (!articleText.trim()) {
        setError('Please enter article text first.');
        return;
      }

      setLoadingCustom(true);
      setError('');
      try {
        const res = await fetch('/api/generate/custom-headlines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleText }),
        });

        if (!res.ok) throw new Error('Failed to generate custom headline');
        const data = await res.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        const cleanedHeadline = cleanHeadline(data.headlines[0]);
        setCustomHeadline(cleanedHeadline);
      } catch (error: unknown) {
        if (error instanceof Error) setError(error.message);
        else setError(String(error));
      } finally {
        setLoadingCustom(false);
      }
    };

    const enhancementOptions = [
      { type: 'urgent', label: 'Make it more urgent/emotional', icon: '⚡', description: 'Add breaking news urgency' },
      { type: 'specific', label: 'Add specific numbers/data', icon: '📊', description: 'Include exact figures and dates' },
      { type: 'analyst', label: 'Include analyst reactions', icon: '👨‍💼', description: 'Add expert authority' },
      { type: 'context', label: 'Add market context', icon: '🌍', description: 'Connect to broader trends' },
      { type: 'shorter', label: 'Make it shorter for social media', icon: '📱', description: 'Optimize for sharing' },
      { type: 'curiosity', label: 'Add curiosity/teaser element', icon: '❓', description: 'Create click-worthy intrigue' },
      { type: 'risk', label: 'Add risk/warning angle', icon: '⚠️', description: 'Emphasize potential dangers' },
    ];

        return (
      <div className="max-w-4xl mx-auto p-6 border-2 border-blue-600 rounded-lg bg-blue-50">
 
        
        {/* Step 1: Initial Headline Generation */}
        {step === 'initial' && (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4 text-blue-600">🎯 Headline Workshop</h2>
            <p className="text-gray-600 mb-6">Let&apos;s create the perfect headline together, step by step.</p>
            

            
            {/* Custom Headline Section - Always Visible */}
            <div className="mb-6 p-6 border-4 border-green-600 rounded-lg bg-green-50 shadow-lg">
              <h3 className="text-xl font-bold mb-3 text-green-800">✨ Quick Custom Headline</h3>
              <p className="text-base text-green-700 mb-4">Get a thoughtful, AI-generated headline instantly</p>
              
              <div className="space-y-3">
                {customHeadline ? (
                  <div className="bg-white border border-green-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-green-800 mb-2">Your Custom Headline:</h4>
                    <p className="text-lg font-semibold text-green-900 mb-3">{customHeadline}</p>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => selectHeadline(customHeadline)}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                      >
                        Use This Headline
                      </button>
                      <button
                        onClick={generateCustomHeadline}
                        disabled={loadingCustom || !articleText.trim()}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                      >
                        {loadingCustom ? 'Generating...' : 'Generate Another'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={generateCustomHeadline}
                    disabled={loadingCustom || !articleText.trim()}
                    className="bg-green-600 text-white px-8 py-4 rounded-lg disabled:bg-gray-400 hover:bg-green-700 transition-colors w-full max-w-md text-lg font-semibold shadow-md"
                  >
                    {loadingCustom ? 'Generating Custom Headline...' : 'Generate Custom Headline'}
                  </button>
                )}
              </div>
            </div>
            
            <div className="border-t border-gray-200 pt-4">
              <div className="p-4 border-2 border-blue-600 rounded-lg bg-blue-50">
                <h3 className="text-lg font-semibold mb-3 text-blue-800">Or try the full workshop experience:</h3>
                <button
                  onClick={generateInitialHeadlines}
                  disabled={loading || !articleText.trim()}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg disabled:bg-gray-400 hover:bg-blue-700 transition-colors w-full max-w-md"
                >
                  {loading ? 'Generating Initial Headlines...' : 'Start Headline Workshop'}
                </button>
              </div>
            </div>
            
            {error && <p className="text-red-600 mt-4">{error}</p>}
          </div>
        )}

        {/* Step 2: Headline Selection */}
        {step === 'selection' && (
          <div className="text-center">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-semibold text-blue-600">Step 1: Choose Your Starting Point</h2>
                <p className="text-gray-600">Select the headline you&apos;d like to enhance:</p>
              </div>
              <button
                onClick={startOver}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors text-sm"
              >
                🔄 Restart Workshop
              </button>
            </div>
            
            <div className="space-y-3 mb-6">
              {initialHeadlines.map((headline, index) => (
                <div
                  key={index}
                  className="border border-gray-300 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => selectHeadline(headline)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800">{headline}</span>
                    <span className="text-blue-600">→</span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Click to enhance this headline
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep('initial')}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              ← Back
            </button>
          </div>
        )}

        {/* Step 3: Enhancement Process */}
        {step === 'enhancement' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-blue-600">Step 2: Enhance Your Headline</h2>
              <button
                onClick={startOver}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors text-sm"
              >
                🔄 Restart Workshop
              </button>
            </div>
            
            {/* Current Headline Display */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Current Headline:</h3>
              <p className="text-lg font-semibold text-blue-900">{currentHeadline}</p>
            </div>

                         {/* Key Names Display */}
             {keyNames.length > 0 && (
               <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                 <h3 className="text-sm font-medium text-blue-800 mb-2">Key Names/Entities:</h3>
                 <div className="flex flex-wrap gap-2">
                   {keyNames.map((name, index) => (
                     <span key={index} className="text-sm text-blue-700 bg-white border border-blue-300 rounded px-2 py-1">
                       {name}
                     </span>
                   ))}
                 </div>
               </div>
             )}





             {/* Direct Quotes Section */}
             <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
               <div className="flex items-center justify-between mb-3">
                 <h3 className="text-sm font-medium text-purple-800">💬 Direct Quotes</h3>
                 <button
                   onClick={checkForDirectQuotes}
                   disabled={loadingDirectQuotes || !articleText.trim()}
                   className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400 transition-colors text-sm"
                 >
                   {loadingDirectQuotes ? 'Scanning...' : 'Check For Direct Quotes'}
                 </button>
               </div>
               
               {showDirectQuotes && directQuotes.length > 0 && (
                 <div className="space-y-2">
                   <p className="text-sm text-purple-700 mb-3">Select a quote to incorporate into your headline:</p>
                   {directQuotes.map((quote, index) => (
                     <div key={index} className="flex items-center justify-between text-sm text-purple-700 bg-white border border-purple-300 rounded p-3">
                       <div className="flex-1">
                         <span className="font-medium">Quote {index + 1}:</span> &quot;{quote}&quot;
                       </div>
                       <button
                         onClick={() => selectDirectQuote(quote)}
                         className="ml-3 px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors"
                       >
                         Use This Quote
                       </button>
                     </div>
                   ))}
                 </div>
               )}
               
               {showDirectQuotes && directQuotes.length === 0 && (
                 <p className="text-sm text-purple-600">No headline-worthy quotes available.</p>
               )}
             </div>

             {/* Enhancement Options */}
             <div className="mb-6">
               <h3 className="text-lg font-medium mb-3">How would you like to enhance this headline?</h3>
               
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {enhancementOptions.map((option) => (
                  <button
                    key={option.type}
                    onClick={() => enhanceHeadline(option.type)}
                    disabled={loading}
                    className="flex flex-col p-4 border border-gray-300 rounded-lg transition-colors text-left hover:border-blue-400 hover:bg-blue-50"
                  >
                    <div className="flex items-center mb-1">
                      <span className="text-xl mr-3">{option.icon}</span>
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <span className="text-sm text-gray-600">{option.description}</span>
                  </button>
                ))}
              </div>

              {/* Custom Enhancement */}
              <div className="mt-4 p-4 border border-gray-300 rounded-lg">
                <h4 className="font-medium mb-2">Custom Enhancement:</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customEnhancement}
                    onChange={(e) => setCustomEnhancement(e.target.value)}
                    placeholder="Describe how you want to enhance the headline..."
                    className="flex-1 p-2 border border-gray-300 rounded"
                  />
                  <button
                    onClick={() => enhanceHeadline('custom')}
                    disabled={loading || !customEnhancement.trim()}
                    className="bg-purple-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>

            {/* Headline History */}
            {headlineHistory.length > 1 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">Headline Evolution:</h3>
                <div className="space-y-2">
                  {headlineHistory.map((version, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <span className="text-sm text-gray-500">Version {index + 1}:</span>
                        <span className="ml-2 font-medium">{version.text}</span>
                        {version.enhancementType && (
                          <span className="ml-2 text-xs text-blue-600">
                            ({enhancementOptions.find(opt => opt.type === version.enhancementType)?.label})
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => copyToClipboard(version.text, index)}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-2 py-1 rounded text-xs ml-2"
                      >
                        {copiedIndex === index ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={finishWorkshop}
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
              >
                Finish Workshop
              </button>
              <button
                onClick={() => setStep('selection')}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                ← Back to Selection
              </button>
              <button
                onClick={startOver}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Start Over
              </button>
            </div>

            {error && <p className="text-red-600 mt-4">{error}</p>}
          </div>
        )}

        {/* Step 4: Final Result */}
        {step === 'final' && (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4 text-green-600">✅ Workshop Complete!</h2>
            
                         <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
               <h3 className="text-lg font-medium text-green-800 mb-2">Your Final Headline:</h3>
               <p className="text-xl font-bold text-green-900 mb-4">{currentHeadline}</p>
               <div className="flex gap-3">
                 <button
                   onClick={() => copyToClipboard(currentHeadline, -1)}
                   className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
                 >
                   {copiedIndex === -1 ? 'Copied!' : 'Copy Final Headline'}
                 </button>
                 {onCheckHeadline && (
                   <button
                     onClick={() => onCheckHeadline(currentHeadline)}
                     className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                   >
                     Check Headline
                   </button>
                 )}
               </div>
             </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Headline Journey:</h3>
              <div className="space-y-2 max-w-2xl mx-auto">
                {headlineHistory.map((version, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex-1 text-left">
                      <span className="text-sm text-gray-500">Step {index + 1}:</span>
                      <span className="ml-2">{version.text}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(version.text, index)}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-2 py-1 rounded text-xs ml-2"
                    >
                      {copiedIndex === index ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={startOver}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Start New Workshop
            </button>
          </div>
        )}
      </div>
    );
  }
);

HeadlineWorkshop.displayName = 'HeadlineWorkshop';

export default HeadlineWorkshop; 