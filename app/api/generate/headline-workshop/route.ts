import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const { articleText, action, selectedHeadline, enhancementType, customEnhancement } = await request.json();

    if (!articleText?.trim()) {
      return NextResponse.json({ error: 'Article text is required.' });
    }

    // Step 1: Generate initial headlines
    if (action === 'generate_initial') {
      const prompt = `
You are a top-tier financial headline writer. Generate exactly 3 diverse, compelling headlines for this article.

CRITICAL REQUIREMENTS:
- Generate EXACTLY 3 headlines - no more, no less
- Each headline must be in a different format/style:
  1. QUESTION format: Pose an urgent question about the key event or risk
  2. STATEMENT-BUT format: State the main fact, then contrast with a "but" clause
  3. ACTION/METAPHOR format: Use a vivid action verb or metaphor to dramatize the shift

- Each headline must be under 12 words
- Start with the full company name (no "Inc." or tickers)
- Focus on the single biggest investor takeaway
- Use plain, everyday language—no jargon
- Use numerals for any data points
- Be highly engaging and clickable

Article:
${articleText}

Respond with exactly 3 headlines, numbered 1-3.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.8,
      });

      const text = completion.choices[0].message?.content || '';
      const headlines = text
        .split('\n')
        .map(line => line.replace(/^\d+\.?\s*/, '').trim())
        .filter(Boolean)
        .slice(0, 3);

      return NextResponse.json({ headlines });
    }

    // Step 2: Enhance selected headline
    if (action === 'enhance' && selectedHeadline) {
      let enhancementPrompt = '';
      
      switch (enhancementType) {
        case 'urgent':
          enhancementPrompt = `Make this headline more urgent and emotional. Add intensity and immediacy without changing the core message.`;
          break;
        case 'specific':
          enhancementPrompt = `Add specific numbers, data points, or concrete details from the article to make this headline more precise and credible.`;
          break;
        case 'analyst':
          enhancementPrompt = `Include analyst reactions, ratings changes, or expert opinions to add credibility and authority.`;
          break;
        case 'context':
          enhancementPrompt = `Add market context, competitor comparison, or broader industry implications to give the headline more depth.`;
          break;
        case 'shorter':
          enhancementPrompt = `Make this headline shorter and punchier, optimized for social media sharing (under 8 words).`;
          break;
        case 'curiosity':
          enhancementPrompt = `Add a curiosity gap or teaser element that makes readers want to click and learn more.`;
          break;
        case 'risk':
          enhancementPrompt = `Add a risk factor, warning, or cautionary element to balance the headline and show both sides.`;
          break;
        case 'custom':
          enhancementPrompt = customEnhancement || 'Improve this headline based on the article content.';
          break;
        default:
          enhancementPrompt = 'Improve this headline to make it more engaging and accurate.';
      }

      const prompt = `
You are a financial headline editor. Enhance this headline based on the specific instruction.

Original Headline: "${selectedHeadline}"

Enhancement Instruction: ${enhancementPrompt}

Article Context:
${articleText}

CRITICAL REQUIREMENTS:
- Keep the enhanced headline under 12 words
- Maintain the core message and accuracy
- Follow the specific enhancement instruction
- Make it more engaging and clickable
- Use numerals for any data points
- Start with the company name

Respond with the enhanced headline only.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.7,
      });

      const enhancedHeadline = completion.choices[0].message?.content?.trim() || selectedHeadline;

      return NextResponse.json({ 
        enhancedHeadline,
        originalHeadline: selectedHeadline,
        enhancementType 
      });
    }

    return NextResponse.json({ error: 'Invalid action specified.' });
  } catch (error) {
    console.error('Error in headline workshop:', error);
    return NextResponse.json({ error: 'Failed to process headline workshop request.' }, { status: 500 });
  }
} 