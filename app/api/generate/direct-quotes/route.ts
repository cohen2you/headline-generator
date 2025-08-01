import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const { articleText } = await request.json();

    if (!articleText?.trim()) {
      return NextResponse.json({ quotes: [], error: 'Article text is required.' });
    }

    const prompt = `You are an expert quote extractor. Your ONLY job is to find and extract direct quotes from the article text with 100% ACCURACY.

CRITICAL REQUIREMENTS:
- Extract UP TO 3 direct quotes that are 4 words or less
- Each quote MUST be VERBATIM from the article - no modifications, no truncation, no paraphrasing
- Only extract quotes that are truly headline-worthy and impactful
- If you cannot find any suitable quotes of 4 words or less, return an empty array
- Focus on the most impactful, headline-worthy quotes
- Each quote must be a complete thought or phrase
- Do not add, remove, or change ANY words from the original quotes
- If a quote is longer than 4 words, do not truncate it - skip it and find a shorter one
- Accuracy is more important than quantity - better to return 0 accurate quotes than 3 weak ones
- ONLY extract quotes that are clearly attributed to a specific person (e.g., "said", "noted", "expressed")
- DO NOT extract phrases from article titles, related article links, or unattributed text
- DO NOT extract generic phrases that aren't actual quotes
- If in doubt, DO NOT include the quote - it's better to miss a quote than present a fake one

Examples of what NOT to do:
- Original: "The greatest comeback in political history" → WRONG: "The greatest comeback in history"
- Original: "This is absolutely devastating for investors" → WRONG: "This is absolutely devastating"
- Original: "We're very concerned about the market" → WRONG: "We're very concerned"
- Article title: "Paramount's Super Bowl Boost" → WRONG: "Super Bowl Boost" (not a quote)
- Unattributed text: "Game changer" → WRONG: "Game changer" (no attribution)

Examples of what TO do:
- Original: "This is huge" → CORRECT: "This is huge" (only if attributed to someone)
- Original: "Game changer" → CORRECT: "Game changer" (only if attributed to someone)
- Original: "Absolutely devastating" → CORRECT: "Absolutely devastating" (only if attributed to someone)

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
    
    // Parse the JSON response
    let quotes: string[] = [];
    try {
      // Remove any markdown formatting if present
      const cleanedResponse = response.replace(/```json|```/g, '').trim();
      quotes = JSON.parse(cleanedResponse);
      
      // Ensure we have an array of strings
      if (!Array.isArray(quotes)) {
        throw new Error('Invalid response format');
      }
      
      // Filter out empty quotes and ensure they're strings
      quotes = quotes.filter(quote => typeof quote === 'string' && quote.trim().length > 0);
      
      // If we don't have 3 quotes, pad with empty strings
      while (quotes.length < 3) {
        quotes.push('');
      }
      
      // Limit to 3 quotes
      quotes = quotes.slice(0, 3);
      
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