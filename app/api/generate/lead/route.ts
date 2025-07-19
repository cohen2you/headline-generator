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
      standard: `You are a financial journalist writing for a broad audience.

Write a standard lead that:
- Is concise (2-3 sentences maximum).
- Provides broader context that sets up the specific story in the article.
- Creates a smooth transition into the existing first paragraph.
- Does NOT repeat or reword what's already in the article's first paragraph.
- Focuses on the bigger picture or trend that leads to this specific development.
- Uses simple, direct language; no jargon.
- Can be added to the beginning of the article without requiring any changes to existing content.
- IMPORTANT: Do NOT start with "In a..." or similar phrases. Vary your opening structure.
- The lead should flow naturally into the article's existing first paragraph.

Lead:`,

      hook: `You are a financial journalist writing for a broad audience.

Write a hook lead that:
- Is concise (2-3 sentences maximum).
- Creates an attention-grabbing opening that hints at the story without revealing it.
- Poses a question or presents a surprising angle that leads to the article's topic.
- Makes readers want to continue reading to discover the answer or details.
- Does NOT repeat or reword what's already in the article's first paragraph.
- Can be added to the beginning of the article without requiring any changes to existing content.
- IMPORTANT: Do NOT start with "In a..." or similar phrases. Vary your opening structure.
- The hook should create curiosity that flows into the article's existing first paragraph.
- Examples: "What if the biggest story in tech isn't about AI, but about..." or "Few expected this development to reshape the industry..."

Lead:`,

      context: `You are a financial journalist writing for a broad audience.

Write a context lead that:
- Is concise (2-3 sentences maximum).
- Provides broader market context and background that sets up the specific story.
- Explains the bigger picture or trend that leads to this particular development.
- Gives readers the necessary background to understand why this story matters.
- Does NOT repeat or reword what's already in the article's first paragraph.
- Uses straightforward language; no jargon.
- Can be added to the beginning of the article without requiring any changes to existing content.
- IMPORTANT: Do NOT start with "In a..." or similar phrases. Vary your opening structure.
- The context should provide background that flows naturally into the article's existing first paragraph.
- Examples: "Digital transformation continues reshaping traditional finance..." or "As blockchain technology matures, new opportunities emerge..."

Lead:`,
    };

    const key = style?.toLowerCase() in stylePrompts ? style.toLowerCase() : 'standard';
    const prompt = `${stylePrompts[key]}

Article:
${articleText}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 700,
      temperature: 0.7,
    });

    const lead = completion.choices[0].message?.content?.trim() ?? '';

    return NextResponse.json({ lead });
  } catch (error) {
    console.error('Error generating lead:', error);
    return NextResponse.json({ lead: '', error: 'Failed to generate lead paragraph.' }, { status: 500 });
  }
}
