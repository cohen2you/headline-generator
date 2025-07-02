import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const { headline } = await request.json();
    if (!headline || !headline.trim()) return NextResponse.json({ variants: [] });

    const prompt = `
Generate 3 extremely punchy, bold, and emotionally gripping variants of this headline:
"${headline}"

Use vivid, powerful verbs and concise phrasing. Make each headline short, hard-hitting, and designed to grab immediate attention.

Respond with a numbered list of 3 headlines only.
`.trim();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.9,
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
