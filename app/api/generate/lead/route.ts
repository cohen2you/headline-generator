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
      normal: `You are a financial journalist writing clear, reader-friendly leads for a broad audience.

Write a lead that:
- Gives a quick hint of what’s ahead in the article.
- Explains the story’s industry context.
- Shows why this news matters now.
- Uses simple, direct language and avoids complex financial jargon.
- Keeps any tickers, dates, and key terms exactly as in the article.

Lead:`,

      longer: `You are a financial journalist writing clear, reader-friendly leads for a broad audience.

Write a longer lead that:
- Previews the main points of the article.
- Gives background on the industry.
- Explains why this development is important.
- Uses simple, direct language and avoids complex financial jargon.
- Keeps any tickers, dates, and key terms exactly as in the article.

Lead:`,

      shorter: `You are a financial journalist writing clear, reader-friendly leads for a broad audience.

Write a short, punchy lead that:
- Briefly previews the article’s main point.
- Highlights why the news matters now.
- Uses simple, direct language without jargon.
- Keeps any tickers, dates, and key terms exactly as in the article.

Lead:`,

      'more narrative': `You are a financial journalist writing clear, reader-friendly leads for a broad audience.

Write a narrative-style lead that:
- Tells a quick story hinting at the article’s focus.
- Sets the scene in the broader industry context.
- Shows why this moment matters.
- Uses simple, direct language without jargon.
- Keeps any tickers, dates, and key terms exactly as in the article.

Lead:`,

      'more context': `You are a financial journalist writing clear, reader-friendly leads for a broad audience.

Write a context-rich lead that:
- Explains the background of the issue.
- Shows why this news changes the bigger picture.
- Uses simple, direct language without jargon.
- Keeps any tickers, dates, and key terms exactly as in the article.

Lead:`,
    };

    const key = style?.toLowerCase() in stylePrompts ? style.toLowerCase() : 'normal';
    const prompt = `${stylePrompts[key]}

Article:
${articleText}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.7,
    });

    const lead = completion.choices[0].message?.content?.trim() ?? '';

    return NextResponse.json({ lead });
  } catch (error) {
    console.error('Error generating lead:', error);
    return NextResponse.json({ lead: '', error: 'Failed to generate lead paragraph.' }, { status: 500 });
  }
}
