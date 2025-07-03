import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const { articleText, style } = await request.json();

    if (!articleText?.trim()) {
      return NextResponse.json({ lead: '', error: 'Article text is required.' });
    }

    const stylePrompts: Record<string, string> = {
      normal: `You are a professional financial journalist writing for a high-traffic news website.

Write an engaging lead paragraph that introduces the key story, sets the stakes, and entices readers to continue. Do NOT include detailed descriptions, product specs, or specific numbers that are covered later in the article. Instead, focus on:

- The big picture significance
- What makes this story important or timely
- Any relevant time references (dates, quarters, periods)
- Preserving all ticker symbols, financial terms, and formatting exactly as they appear

Make the lead paragraph ${style || 'normal'} in length and tone.`,

      longer: `You are a professional financial journalist writing for a high-traffic news website.

Write a detailed but still introductory lead paragraph that clearly frames the story’s importance and key narratives without revealing detailed data or figures that appear later. Use narrative and context to draw in the reader. Preserve ticker symbols, dates, and formatting exactly as in the article.

Make the lead paragraph longer and richer in tone.`,

      shorter: `You are a professional financial journalist writing for a high-traffic news website.

Write a short, punchy lead that hooks readers by highlighting the story’s core significance and stakes, avoiding detailed numbers or descriptions. Preserve ticker symbols, dates, and formatting.`,

      'more narrative': `You are a professional financial journalist writing for a high-traffic news website.

Craft a storytelling-focused lead paragraph that draws readers in by emphasizing the narrative and importance of the story, without including detailed product info or numbers found later. Preserve tickers, dates, and financial terms.`,

      'more context': `You are a professional financial journalist writing for a high-traffic news website.

Write a lead paragraph that provides clear background and context explaining why this story matters, while avoiding detailed data or specifics covered later. Maintain all ticker symbols, dates, and formatting.`,
    };

    const chosenStyle = stylePrompts[style?.toLowerCase()] ? style?.toLowerCase() : 'normal';
    const promptInstructions = stylePrompts[chosenStyle];

    const prompt = `
${promptInstructions}

Article:
${articleText}

Lead paragraph:
`.trim();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.7,
    });

    const lead = completion.choices[0].message?.content.trim() || '';

    return NextResponse.json({ lead });
  } catch (error) {
    console.error('Error generating lead:', error);
    return NextResponse.json({ lead: '', error: 'Failed to generate lead paragraph.' }, { status: 500 });
  }
}
