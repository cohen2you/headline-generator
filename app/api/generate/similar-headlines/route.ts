import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { headline } = await request.json();

    if (!headline || headline.trim().length === 0) {
      return NextResponse.json({ similar: [] });
    }

    const prompt = `Generate 3 alternative headlines similar in style and topic to the following headline:

"${headline}"

Respond with a numbered list of 3 headlines only.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
    });

    const text = completion.choices[0].message?.content || '';

    const similar = text
      .split('\n')
      .map(line => line.replace(/^\d+\.?\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 3);

    return NextResponse.json({ similar });
  } catch (error) {
    console.error('Error generating similar headlines:', error);
    return NextResponse.json({ error: 'Failed to generate similar headlines' }, { status: 500 });
  }
}
