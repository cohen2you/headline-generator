import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function similarHeadlinePrompt(headline: string, articleText: string) {
  return `
You are a headline editor for a high-traffic financial news site.

Generate 3 alternative headlines similar in style and topic to this headline,
strictly based on the facts in the article text below.

Do NOT include information not in the article.
Avoid speculation or unrelated ideas.

Headline:
"${headline}"

Article:
${articleText}

Respond with a numbered list of 3 headlines only.
`.trim();
}

export async function POST(request: Request) {
  try {
    const { headline, articleText } = await request.json();

    if (!headline || !headline.trim() || !articleText || !articleText.trim()) {
      return NextResponse.json({ similar: [] });
    }

    const prompt = similarHeadlinePrompt(headline, articleText);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 350,
      temperature: 0.3,  // Lower temp to reduce hallucination
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
