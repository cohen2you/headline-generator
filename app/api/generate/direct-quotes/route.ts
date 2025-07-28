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
- Extract UP TO 3 DIRECT QUOTES that are 2-8 words long
- Each quote MUST be enclosed in quotation marks (" ") in the original article
- Each quote MUST be VERBATIM from the article - no modifications, no truncation, no paraphrasing
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

IMPORTANT: If you are unsure whether something is a direct quote, DO NOT include it. When in doubt, exclude it.

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
        // Check if the quote exists in the article with quotation marks
        const quotePattern = new RegExp(`"${cleanQuote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'i');
        return quotePattern.test(articleText);
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