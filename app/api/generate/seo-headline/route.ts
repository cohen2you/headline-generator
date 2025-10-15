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
      return NextResponse.json({ seoHeadlines: [] });
    }

    const prompt = seoHeadlinePrompt(headline);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
    });

    const response = (completion.choices[0].message?.content ?? '').trim();
    
    // Split response into individual headlines (one per line)
    const seoHeadlines = response
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.match(/^(Option|OPTION|\d+[\.\):])/)) // Remove any numbering or labels
      .map(line => line.replace(/^["']|["']$/g, '')); // Remove leading/trailing quotes

    return NextResponse.json({ seoHeadlines });
  } catch (error) {
    console.error('Error generating SEO headlines:', error);
    return NextResponse.json({ error: 'Failed to generate SEO headlines' }, { status: 500 });
  }
}
