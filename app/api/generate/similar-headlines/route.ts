import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { similarHeadlinePrompt } from '@/lib/prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { headline, articleText } = await request.json();

    if (!headline || !articleText || !headline.trim() || !articleText.trim()) {
      return NextResponse.json({ similar: [] });
    }

    const prompt = similarHeadlinePrompt(headline, articleText);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 350,
    });

    const text = completion.choices[0].message?.content || '';

    const similar = text
      .split('\n')
      .map((line) => line.replace(/^\d+\.?\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 3);

    return NextResponse.json({ similar });
  } catch (error) {
    console.error('Error generating similar headlines:', error);
    return NextResponse.json({ error: 'Failed to generate similar headlines' }, { status: 500 });
  }
}
