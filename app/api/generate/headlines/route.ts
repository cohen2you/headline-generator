import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { headlinePrompt } from '@/lib/prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { articleText } = await request.json();

    if (!articleText || articleText.trim().length === 0) {
      return NextResponse.json({ headlines: [] });
    }

    const prompt = headlinePrompt(articleText);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 350,
    });

    const text = completion.choices[0].message?.content || '';

    const headlines = text
      .split('\n')
      .map(line => line.replace(/^\d+\.?\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 7);

    return NextResponse.json({ headlines });
  } catch (error) {
    console.error('Error generating headlines:', error);
    return NextResponse.json({ error: 'Failed to generate headlines' }, { status: 500 });
  }
}
