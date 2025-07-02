import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const { headline, articleText } = await request.json();

    if (!headline?.trim() || !articleText?.trim()) {
      return NextResponse.json({
        review: 'Headline or article text missing.',
        suggestions: [],
      });
    }

    const prompt = `
You are an expert headline editor for a financial news website.

Given the article below and a headline, provide:

- A thoughtful and balanced review highlighting how well the headline draws readers and its strengths in engagement.
- Politely note any areas where the headline might cause minor confusion or could be clearer, without being overly critical.
- Suggest two alternative headlines that preserve the strong engagement but improve clarity or accuracy slightly.

Article:
${articleText}

Headline to review:
"${headline}"

Respond in JSON format exactly as follows:

{
  "review": "Your balanced review highlighting engagement strengths and polite notes on clarity.",
  "suggestions": [
    "Alternative headline 1",
    "Alternative headline 2"
  ]
}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0.7,
    });

    const text = completion.choices[0].message?.content || '';

    let jsonResult;
    try {
      jsonResult = JSON.parse(text);
    } catch {
      return NextResponse.json({
        review: 'Could not parse response from AI.',
        suggestions: [],
      });
    }

    return NextResponse.json(jsonResult);
  } catch (error) {
    console.error('Error in headline context review:', error);
    return NextResponse.json(
      {
        review: 'Failed to review headline context.',
        suggestions: [],
      },
      { status: 500 }
    );
  }
}
