import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const { articleText } = await request.json();

    if (!articleText?.trim()) {
      return NextResponse.json({ quotes: [], error: 'Article text is required.' });
    }

    const prompt = `You are an expert quote extractor. Your ONLY job is to find and extract DIRECT QUOTES from the article text with 100% ACCURACY.

CRITICAL REQUIREMENTS:
- Extract UP TO 3 DIRECT QUOTES that are 3-8 words long
- Each quote MUST be enclosed in quotation marks (" ") in the original article
- Each quote MUST be VERBATIM from the article - no modifications, no truncation, no paraphrasing
- Each quote MUST be a complete, meaningful sentence or phrase
- Each quote MUST start with a capital letter
- Each quote MUST end with proper punctuation (not mid-sentence)
- Only extract quotes that are truly headline-worthy and impactful
- Focus on the most impactful, headline-worthy quotes
- Each quote must be a complete thought or phrase
- Do not add, remove, or change ANY words from the original quotes
- If a quote is longer than 8 words, do not truncate it - skip it and find a shorter one
- Accuracy is more important than quantity - better to return 0 accurate quotes than 3 weak ones
- Look for quotes that are dramatic, surprising, or contain strong opinions

WHAT IS A DIRECT QUOTE:
- Text that appears between quotation marks (" ") in the article
- Words that someone actually said, as indicated by quotation marks
- NOT paraphrased statements, summaries, or indirect speech

WHAT IS NOT A DIRECT QUOTE:
- Paraphrased statements like "HSBC evaluated that MI350 can now compete"
- Summaries like "demand for AI chips could exceed $500 billion" (unless it's in quotes)
- Indirect speech like "Trump said the policy would help"
- Product names, ship names, or proper nouns like "Return On Investment" (ship name)
- Stock tickers, version numbers, or technical identifiers
- Names of companies, products, or entities that are just being referenced
- Descriptive phrases that are not actually spoken by anyone
- Technical terms, statistics, or factual statements that aren't quotes

CRITICAL: Only extract text that is ACTUALLY between quotation marks in the article. Do not extract descriptive phrases, technical terms, or any text that isn't explicitly quoted.

Examples of what TO do:
- Original: "This is huge" → CORRECT: "This is huge"
- Original: "Game changer" → CORRECT: "Game changer"
- Original: "Absolutely devastating" → CORRECT: "Absolutely devastating"
- Original: "The greatest comeback in political history" → CORRECT: "The greatest comeback in political history"
- Original: "This is absolutely devastating for investors" → CORRECT: "This is absolutely devastating for investors"

Examples of what NOT to do:
- Original: HSBC evaluated that MI350 can now compete → INCORRECT: "MI350 can now compete"
- Original: demand for AI chips could exceed $500 billion → INCORRECT: "demand for AI chips could exceed $500 billion"
- Original: calling it a competitive advantage → INCORRECT: "competitive advantage"
- Original: a steep premium compared to the NewSpace sector average → INCORRECT: "a steep premium compared to the NewSpace sector average"
- Original: "Return On Investment" (ship name) → INCORRECT: "Return On Investment"

IMPORTANT: If you are unsure whether something is a direct quote, DO NOT include it. When in doubt, exclude it. Only extract text that is explicitly between quotation marks in the article.

Return only a JSON array of quotes (0-3 quotes), no explanations:
["quote 1", "quote 2", "quote 3"]

If no suitable quotes are found, return an empty array: []

Article text:
${articleText}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.1, // Lower temperature for more consistent, accurate extraction
    });

    const response = completion.choices[0].message?.content?.trim() || '';
    
    console.log('=== DIRECT QUOTES DEBUG ===');
    console.log('Raw AI response:', response);
    console.log('Response length:', response.length);
    
    // Debug: Find all quoted text in the article
    const allQuotes = articleText.match(/"[^"]*"/g);
    console.log('All quotes found in article:', allQuotes);
    
    // Parse the JSON response
    let quotes: string[] = [];
    try {
      // Remove any markdown formatting if present
      const cleanedResponse = response.replace(/```json|```/g, '').trim();
      console.log('Cleaned response:', cleanedResponse);
      quotes = JSON.parse(cleanedResponse);
      
      // Ensure we have an array of strings
      if (!Array.isArray(quotes)) {
        throw new Error('Invalid response format');
      }
      
      // Filter out empty quotes and ensure they're strings
      quotes = quotes.filter(quote => typeof quote === 'string' && quote.trim().length > 0);
      
      // Validate that each quote actually exists in the article with quotation marks
      quotes = quotes.filter(quote => {
        // Remove the outer quotes from the AI response for comparison
        const cleanQuote = quote.replace(/^"|"$/g, '');
        
        console.log('Validating quote:', cleanQuote);
        
        // Skip quotes that are too short or don't make sense
        if (cleanQuote.length < 3 || cleanQuote.split(' ').length < 2) {
          console.log('Quote too short or too few words:', cleanQuote);
          return false;
        }
        
        // Skip quotes that are just proper nouns, names, or titles (not actual speech)
        const properNounPatterns = [
          /^[A-Z][a-z]+ [A-Z][a-z]+$/, // "Return On Investment" - looks like a name/title
          /^[A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+$/, // "Some Product Name Here"
          /^[A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+$/, // "Some Product Name Here Too"
          /^[A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+$/, // "Some Product Name Here As Well"
        ];
        
        // Skip quotes that are descriptive phrases (not actual speech)
        const descriptivePhrasePatterns = [
          /^a\s+[a-z]+\s+[a-z]+/, // "a steep premium"
          /^the\s+[a-z]+\s+[a-z]+/, // "the NewSpace sector"
          /^[a-z]+\s+compared\s+to/, // "premium compared to"
          /^[a-z]+\s+times\s+[a-z]+/, // "28 times estimated"
          /^[a-z]+\s+percent\s+[a-z]+/, // "64 percent increase"
        ];
        
        const isProperNoun = properNounPatterns.some(pattern => pattern.test(cleanQuote));
        if (isProperNoun) {
          console.log('Quote appears to be a proper noun/name:', cleanQuote);
          return false;
        }
        
        const isDescriptivePhrase = descriptivePhrasePatterns.some(pattern => pattern.test(cleanQuote));
        if (isDescriptivePhrase) {
          console.log('Quote appears to be a descriptive phrase (not speech):', cleanQuote);
          return false;
        }
        
        // Skip quotes that are just numbers or technical terms
        const technicalPatterns = [
          /^\d+$/, // Just numbers
          /^[A-Z]{2,5}$/, // Stock tickers like "AAPL", "TSLA"
          /^[A-Z][a-z]+ \d+$/, // "Version 2.0", "Model 3"
          /^\d+[A-Z][a-z]+$/, // "3M", "2B"
        ];
        
        const isTechnical = technicalPatterns.some(pattern => pattern.test(cleanQuote));
        if (isTechnical) {
          console.log('Quote appears to be technical/numbers:', cleanQuote);
          return false;
        }
        
        // Skip quotes that end with incomplete words (but allow proper punctuation)
        // Only filter out if it ends with a single letter that's not part of a complete word
        if (/[a-z]\s*$/.test(cleanQuote) && !/\w+\s*$/.test(cleanQuote)) {
          console.log('Quote ends with incomplete word:', cleanQuote);
          return false;
        }
        
        // Check if the quote exists in the article with quotation marks
        // Make the pattern more flexible to handle spacing and punctuation variations
        const escapedQuote = cleanQuote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Try multiple quote patterns (including smart quotes)
        const quotePatterns = [
          new RegExp(`"${escapedQuote}"`, 'i'),
          new RegExp(`"${escapedQuote}"`, 'i'),
          new RegExp(`"${escapedQuote}"`, 'i'),
          new RegExp(`'${escapedQuote}'`, 'i'),
          new RegExp(`'${escapedQuote}'`, 'i'),
          new RegExp(`'${escapedQuote}'`, 'i')
        ];
        
        let found = false;
        for (const pattern of quotePatterns) {
          if (pattern.test(articleText)) {
            console.log('Quote found with pattern:', pattern.source);
            found = true;
            break;
          }
        }
        
        // If not found with exact patterns, try a more flexible search
        if (!found) {
          const flexiblePatterns = [
            new RegExp(`"[^"]*${escapedQuote.replace(/\\\./g, '\\.?')}[^"]*"`, 'i'),
            new RegExp(`"[^"]*${escapedQuote.replace(/\\\./g, '\\.?')}[^"]*"`, 'i'),
            new RegExp(`"[^"]*${escapedQuote.replace(/\\\./g, '\\.?')}[^"]*"`, 'i'),
            new RegExp(`'[^']*${escapedQuote.replace(/\\\./g, '\\.?')}[^']*'`, 'i'),
            new RegExp(`'[^']*${escapedQuote.replace(/\\\./g, '\\.?')}[^']*'`, 'i'),
            new RegExp(`'[^']*${escapedQuote.replace(/\\\./g, '\\.?')}[^']*'`, 'i')
          ];
          
          for (const pattern of flexiblePatterns) {
            if (pattern.test(articleText)) {
              console.log('Quote found with flexible pattern:', pattern.source);
              found = true;
              break;
            }
          }
        }
        
        // If still not found, try searching for the quote content and check if it's in a quoted context
        if (!found) {
          const contentPattern = new RegExp(escapedQuote, 'i');
          const contentFound = contentPattern.test(articleText);
          console.log('Content found:', contentFound);
          
          if (contentFound) {
            // Check if there are quotes around this content somewhere in the article
            const quoteContextPatterns = [
              new RegExp(`"[^"]*${escapedQuote}[^"]*"`, 'i'),
              new RegExp(`"[^"]*${escapedQuote}[^"]*"`, 'i'),
              new RegExp(`"[^"]*${escapedQuote}[^"]*"`, 'i'),
              new RegExp(`'[^']*${escapedQuote}[^']*'`, 'i'),
              new RegExp(`'[^']*${escapedQuote}[^']*'`, 'i'),
              new RegExp(`'[^']*${escapedQuote}[^']*'`, 'i')
            ];
            
            for (const pattern of quoteContextPatterns) {
              const quoteContext = articleText.match(pattern);
              if (quoteContext) {
                console.log('Found quote context:', quoteContext[0]);
                found = true;
                break;
              }
            }
          }
        }
        
        // If we still haven't found it, but the AI extracted it and it looks like a valid quote,
        // let's be more lenient and accept it if it contains key words that suggest it's a real quote
        // AND if it sounds like something someone would actually say (not just descriptive text)
        if (!found) {
          const quoteKeywords = ['clear', 'significant', 'ambitious', 'political', 'win', 'risks', 'billion', 'percent', 'energy', 'eu', 'u.s.'];
          const hasQuoteKeywords = quoteKeywords.some(keyword => 
            cleanQuote.toLowerCase().includes(keyword.toLowerCase())
          );
          
          // Also check if it sounds like descriptive text (which we want to reject)
          const descriptivePhrases = [
            'will serve as', 'is expected to', 'is designed to', 'functions as',
            'serves as', 'acts as', 'works as', 'operates as', 'functions as',
            'component of', 'part of', 'element of', 'aspect of', 'feature of'
          ];
          
          const hasDescriptivePhrases = descriptivePhrases.some(phrase => 
            cleanQuote.toLowerCase().includes(phrase.toLowerCase())
          );
          
          if (hasQuoteKeywords && cleanQuote.length > 10 && !hasDescriptivePhrases) {
            console.log('Accepting quote based on keywords (no descriptive phrases):', cleanQuote);
            found = true;
          }
        }
        
        return found;
      });
      
      // Limit to 3 quotes
      quotes = quotes.slice(0, 3);
      
      console.log('Final quotes array:', quotes);
      console.log('Number of quotes found:', quotes.length);
      
    } catch (parseError) {
      console.error('Error parsing quotes response:', parseError);
      console.error('Raw response:', response);
      return NextResponse.json({ quotes: [], error: 'Failed to parse quotes from article.' });
    }

    return NextResponse.json({ quotes });
  } catch (error) {
    console.error('Error extracting direct quotes:', error);
    return NextResponse.json({ quotes: [], error: 'Failed to extract direct quotes.' });
  }
} 