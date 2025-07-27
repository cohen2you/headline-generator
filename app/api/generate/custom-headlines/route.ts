import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { articleText } = await request.json();

    if (!articleText || !articleText.trim()) {
      return NextResponse.json({ headlines: [] });
    }

    const prompt = `
You are an expert headline writer for a top-tier financial publication. Create 1 thoughtful, context-rich headline that provides insight while being highly engaging.

Your headline should follow these principles:

1. **Use vivid, specific language** - Avoid generic terms. Use "Sledgehammer Policies" instead of "tough policies"
2. **Strong action verbs** - Use words like "ignited," "crushing," "unhinged," "dominating"
3. **Historical or comparative context** when relevant - "More Unhinged Than Dot-Com," "Crushing The US At Its Own Game"
4. **Balanced tone** - Informative but engaging, not hysterical
5. **Insight-driven** - Reveal deeper meaning, not just report facts
6. **Use metaphors and personification** - "AI Brains," "Wall Street's Hottest Trade"
7. **Create intrigue** while providing enough context to understand the topic

Examples of the style you should aim for:
- "Trump's Sledgehammer Policies Have Ignited Wall Street's Hottest Trade—And It's Not AI"
- "Trump Wanted To Break China—Now It's Crushing The US At Its Own Game"
- "Elon Musk Wants 50 Million AI Brains—Nvidia Still Sets The Standard"
- "AI Bubble Is More Unhinged Than Dot-Com—A Chilling Warning From The Inside"

Focus on:
- The single biggest investor takeaway
- Unexpected angles or ironies
- Market implications and context
- Vivid, memorable language
- Under 15 words

Article:
${articleText}

Respond with exactly 1 headline only.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.8,
    });

    const text = completion.choices[0].message?.content || '';
    const headline = text.trim();

    return NextResponse.json({ headlines: [headline] });
  } catch (error) {
    console.error('Error generating custom headlines:', error);
    return NextResponse.json({ error: 'Failed to generate custom headlines' }, { status: 500 });
  }
} 