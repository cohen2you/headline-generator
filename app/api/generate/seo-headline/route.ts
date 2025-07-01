import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { seoHeadlinePrompt } from '@/lib/prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { headline } = await request.json();

    if (!headline || headline.trim().length === 0) {
      return NextResponse.json({ seoHeadline: '' });
    }

    const prompt = seoHeadlinePrompt(headline);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 30,
    });

    const seoHeadline = completion.choices[0].message?.content.trim() || '';

    return NextResponse.json({ seoHeadline });
  } catch (error) {
    console.error('Error generating SEO headline:', error);
    return NextResponse.json({ error: 'Failed to generate SEO headline' }, { status: 500 });
  }
}
