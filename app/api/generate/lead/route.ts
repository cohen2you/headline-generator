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
      normal: `You are a financial journalist writing for a broad audience.

Write a lead that:
- Opens with the broader industry shift or trend this story exemplifies.
- Clearly states why this development changes the market or investor view.
- Avoids rehashing the article’s first sentence; focus on significance.
- Uses simple, direct language; no jargon.

Lead:`,

      longer: `You are a financial journalist writing for a broad audience.

Write a detailed lead that:
- Highlights the three most critical insights from the article.
- Provides necessary background but emphasizes why each point matters today.
- Connects these insights to bigger economic or sector-wide implications.
- Uses clear, engaging language without technical jargon.

Lead:`,

      shorter: `You are a financial journalist writing for a broad audience.

Write a very brief lead (under 20 words) that:
- Delivers a clever hook or surprising angle related to the article’s core news.
- Tells the reader why they should keep reading in one punchy sentence.
- Avoids restating basic facts; focus on intrigue.

Lead:`,

      'more narrative': `You are a financial journalist writing for a broad audience.

Write a narrative-style lead that:
- Opens with a compelling takeaway or surprising data point from the article (e.g., "Q3 revenue jumped 24% sequentially").
- Shows why that detail matters for the industry or investors.
- Reflects the article’s facts—no invented scenes or characters.
- Maintains a conversational, engaging tone without jargon.

Lead:`,

      'more context': `You are a financial journalist writing for a broad audience.

Write a context-rich lead that:
- Maps out the long-term trends or past events leading to this news.
- Explains how this story fits into the broader economic backdrop.
- Highlights potential future impacts or risks for investors.
- Uses straightforward language; no jargon.

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
