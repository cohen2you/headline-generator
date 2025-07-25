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
    const [selectedHeadline, setSelectedHeadline] = useState<string>('');
    const [currentHeadline, setCurrentHeadline] = useState<string>('');
    const [headlineHistory, setHeadlineHistory] = useState<HeadlineVersion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [customEnhancement, setCustomEnhancement] = useState('');

    const clearData = () => {
      setStep('initial');
      setInitialHeadlines([]);
      setSelectedHeadline('');
      setCurrentHeadline('');
      setHeadlineHistory([]);
      setLoading(false);
      setError('');
      setCopiedIndex(null);
      setCustomEnhancement('');
    };

    useImperativeHandle(ref, () => ({
      clearData
    }));

    const copyToClipboard = (text: string, index: number) => {
      navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
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
        setStep('selection');
      } catch (error: unknown) {
        if (error instanceof Error) setError(error.message);
        else setError(String(error));
      } finally {
        setLoading(false);
      }
    };

    const selectHeadline = (headline: string) => {
      setSelectedHeadline(headline);
      setCurrentHeadline(headline);
      setHeadlineHistory([{ text: headline, timestamp: new Date() }]);
      setStep('enhancement');
    };

    const enhanceHeadline = async (enhancementType: string) => {
      if (!currentHeadline.trim()) return;

      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/generate/headline-workshop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            articleText,
            action: 'enhance',
            selectedHeadline: currentHeadline,
            enhancementType,
            customEnhancement: enhancementType === 'custom' ? customEnhancement : undefined
          }),
        });

        if (!res.ok) throw new Error('Failed to enhance headline');
        const data = await res.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        const enhancedHeadline = cleanHeadline(data.enhancedHeadline);
        setCurrentHeadline(enhancedHeadline);
        setHeadlineHistory(prev => [...prev, { 
          text: enhancedHeadline, 
          enhancementType, 
          timestamp: new Date() 
        }]);
        setCustomEnhancement('');
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
      setSelectedHeadline('');
      setCurrentHeadline('');
      setHeadlineHistory([]);
    };

    const enhancementOptions = [
      { type: 'urgent', label: 'Make it more urgent/emotional', icon: '⚡' },
      { type: 'specific', label: 'Add specific numbers/data', icon: '📊' },
      { type: 'analyst', label: 'Include analyst reactions', icon: '👨‍💼' },
      { type: 'context', label: 'Add market context', icon: '🌍' },
      { type: 'shorter', label: 'Make it shorter for social media', icon: '📱' },
      { type: 'curiosity', label: 'Add curiosity/teaser element', icon: '❓' },
      { type: 'risk', label: 'Add risk/warning angle', icon: '⚠️' },
    ];

    return (
      <div className="max-w-4xl mx-auto">
        {/* Step 1: Initial Headline Generation */}
        {step === 'initial' && (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4 text-blue-600">🎯 Headline Workshop</h2>
            <p className="text-gray-600 mb-6">Let's create the perfect headline together, step by step.</p>
            <button
              onClick={generateInitialHeadlines}
              disabled={loading || !articleText.trim()}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg disabled:bg-gray-400 hover:bg-blue-700 transition-colors"
            >
              {loading ? 'Generating Initial Headlines...' : 'Start Headline Workshop'}
            </button>
            {error && <p className="text-red-600 mt-4">{error}</p>}
          </div>
        )}

        {/* Step 2: Headline Selection */}
        {step === 'selection' && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-blue-600">Step 1: Choose Your Starting Point</h2>
            <p className="text-gray-600 mb-4">Select the headline you'd like to enhance:</p>
            
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
                    {index === 0 ? 'Question format' : index === 1 ? 'Statement-But format' : 'Action/Metaphor format'}
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
            <h2 className="text-xl font-semibold mb-4 text-blue-600">Step 2: Enhance Your Headline</h2>
            
            {/* Current Headline Display */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Current Headline:</h3>
              <p className="text-lg font-semibold text-blue-900">{currentHeadline}</p>
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
                    className="flex items-center p-3 border border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 transition-colors text-left"
                  >
                    <span className="text-xl mr-3">{option.icon}</span>
                    <span className="font-medium">{option.label}</span>
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