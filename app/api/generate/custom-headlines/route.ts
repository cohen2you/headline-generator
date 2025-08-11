import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { articleText, selectedHeadline = '', generateSimilar = false } = await request.json();

    if (!articleText || !articleText.trim()) {
      return NextResponse.json({ headlines: [] });
    }

    let prompt = '';

    if (generateSimilar && selectedHeadline) {
      // Generate 3 headlines similar to the selected one
      prompt = `
You are an expert headline writer for a top-tier financial publication. Create exactly 3 headlines that are variations of the selected headline, maintaining the same style and approach.

SELECTED HEADLINE: "${selectedHeadline}"

STEP-BY-STEP ANALYSIS OF THE SELECTED HEADLINE:
1. **Structural Pattern**: ${selectedHeadline.includes('?') ? 'Question format' : selectedHeadline.includes(':') ? 'Colon format' : selectedHeadline.includes('But') || selectedHeadline.includes('but') ? 'Contrast format' : 'Statement format'}
2. **Tone**: ${selectedHeadline.includes('!') ? 'Urgent/Exclamatory' : selectedHeadline.includes('?') ? 'Curious/Questioning' : 'Informative/Analytical'}
3. **Focus**: ${selectedHeadline.includes('$') ? 'Financial/Numbers' : selectedHeadline.includes('Analyst') ? 'Analyst Coverage' : selectedHeadline.includes('Recovery') || selectedHeadline.includes('improve') ? 'Business Outlook' : 'Market Reaction'}
4. **Language Style**: ${selectedHeadline.includes('Initiates') || selectedHeadline.includes('Sets') ? 'Formal/Business' : selectedHeadline.includes('Gets') || selectedHeadline.includes('Eyes') ? 'Casual/Modern' : 'Standard/Professional'}

CRITICAL REQUIREMENTS FOR VARIATIONS:
- Generate EXACTLY 3 headlines - no more, no less
- Each headline must be under 15 words and highly clickable
- MAINTAIN the same structural pattern as the selected headline
- MAINTAIN the same tone and urgency level
- MAINTAIN the same focus area (financial, analyst, business, market)
- MAINTAIN the same language style (formal/casual/technical)
- Use SIMILAR but DIFFERENT action verbs and vocabulary
- Use the SAME company name and key numbers from the article
- MANDATORY: DO NOT use analyst names or firm names at all
- MANDATORY: DO NOT use "price target" or "target" in headlines

VARIATION TECHNIQUES TO USE:
1. **Synonym Substitution**: Replace key verbs with similar ones (e.g., "Initiates" → "Launches", "Sets" → "Establishes", "Gets" → "Receives")
2. **Phrase Restructuring**: Keep the same meaning but change word order slightly
3. **Alternative Expressions**: Use different ways to express the same concept
4. **Number Repositioning**: Move numbers to different positions in the headline
5. **Punctuation Variation**: Use different punctuation while maintaining the same structure

EXAMPLES OF GOOD VARIATIONS:
If selected headline is: "Analyst Initiates Hudson Pacific Coverage Amid Recovery"
Good variations would be:
- "Analyst Launches Hudson Pacific Coverage Amid Recovery"
- "Analyst Establishes Hudson Pacific Coverage Amid Recovery" 
- "Analyst Begins Hudson Pacific Coverage Amid Recovery"

Article:
${articleText}

Respond with exactly 3 headlines, numbered 1-3, that are clear variations of the selected headline.`;
    } else {
      // Generate 3 completely different headlines
      prompt = `
You are an expert headline writer for a top-tier financial publication. Create exactly 3 compelling, specific headlines that capture the most important details from this article.

CRITICAL REQUIREMENTS:
- Generate EXACTLY 3 headlines - no more, no less
- Each headline must be under 15 words and highly clickable
- Each headline must use a COMPLETELY DIFFERENT approach and style
- MANDATORY: Include specific numbers, facts, and details from the article
- MANDATORY: Use the exact company name and key figures mentioned
- MANDATORY: DO NOT use analyst names or firm names (except JPMorgan or Goldman Sachs)
- Focus on different aspects of the story (financial, analyst, business, market, etc.)
- Use different structural patterns (questions, statements, contrasts, etc.)
- Use different tones (urgent, analytical, optimistic, etc.)

HEADLINE VARIETY REQUIREMENTS:
Headline 1: Focus on analyst coverage and ratings (rating, but NO analyst names)
Headline 2: Focus on financial details and business strategy (specific numbers, equity raise, business units)
Headline 3: Focus on market outlook and timing (improving conditions, turnaround, breakeven timeline)

STRUCTURAL VARIETY:
- Use different sentence structures (questions, statements, contrasts, etc.)
- Use different punctuation patterns
- Vary the length and complexity
- Use different action verbs and vocabulary

LANGUAGE REQUIREMENTS:
- Use vivid, specific language - avoid generic terms
- Strong action verbs: "ignited," "crushing," "unhinged," "dominating," "plundering," "defecting," "shattering," "revolutionizing," "disrupting," "transforming"
- Use metaphors and personification when appropriate
- Create intrigue while providing enough context
- MANDATORY: Include exact numbers like "$690 million," "$3," "0.40%," "$2.51"
- MANDATORY: Include specific company names like "Hudson Pacific Properties"
- MANDATORY: DO NOT include analyst names or firm names at all
- MANDATORY: DO NOT use "price target" or "target" in headlines
- MANDATORY: Include specific details like "West Coast office," "studio business," "second quarter of 2026"

EXAMPLES OF GOOD HEADLINES (showing the specificity and detail you should aim for):
- "Analyst Initiates Hudson Pacific Coverage Amid $690M Equity Boost"
- "Hudson Pacific's $690M Cash Injection: Can Studio Business Hit Breakeven By Q2 2026?"
- "Hudson Pacific Properties Rises 0.40% As Market Sees West Coast Office Revival"

Article:
${articleText}

Respond with exactly 3 headlines, numbered 1-3, each using a completely different approach and focus.`;
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using gpt-4o-mini for better cost/performance ratio
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500, // Increased for better quality headlines
      temperature: 0.6, // Lower temperature for more focused, accurate headlines
      top_p: 0.85, // Slightly lower for more predictable quality
      frequency_penalty: 0.1, // Lower penalty to allow some repetition of key terms
      presence_penalty: 0.1, // Lower penalty to focus on the main story
    });

    const text = completion.choices[0].message?.content || '';
    const headlines = text
      .split('\n')
      .map(line => line.replace(/^\d+\.?\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 3);

    return NextResponse.json({ headlines });
  } catch (error) {
    console.error('Error generating custom headlines:', error);
    return NextResponse.json({ error: 'Failed to generate custom headlines' }, { status: 500 });
  }
} 