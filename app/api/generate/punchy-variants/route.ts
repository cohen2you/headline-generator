import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const { headline } = await request.json();
    
    if (!headline || !headline.trim()) {
      return NextResponse.json({ variants: [] });
    }

    const prompt = `
You are a master of clickbait and viral headlines. Transform this headline into 3 EXTREMELY punchy, emotionally charged, and attention-grabbing variants.

Original headline: "${headline}"

Requirements for each variant:
- Use POWERFUL, emotionally charged words (crash, surge, explode, collapse, dominate, crush, soar, plunge, etc.)
- Create URGENCY and FOMO (immediate, now, shocking, stunning, devastating, etc.)
- Use numbers when possible (3 reasons, 5 ways, 10x, etc.)
- Include emotional triggers (fear, greed, curiosity, outrage, excitement)
- Make it SHORT and IMPACTFUL (under 10 words)
- Use Title Case for all words (first letter capitalized)
- Include dramatic punctuation (!!!, ??, ...)
- Make it feel like breaking news or insider information

Examples of the style you should aim for:
- "Tesla Crashes 50% - What Insiders Know Now"
- "This Stock Will Explode 10x - Here's Why"
- "Shocking: The Real Reason Apple Is Doomed"
- "3 Reasons Why This Will Crush the Market"

Respond with a numbered list of 3 headlines only.
`.trim();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 1.0,
    });

    const text = completion.choices[0].message?.content || '';
    
    const variants = text
      .split('\n')
      .map(line => line.replace(/^\d+\.?\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 3);

    return NextResponse.json({ variants });
  } catch (error) {
    console.error('Error generating punchy variants:', error);
    return NextResponse.json({ error: 'Failed to generate punchy variants' }, { status: 500 });
  }
}
