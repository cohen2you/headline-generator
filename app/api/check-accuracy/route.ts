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

Task: Verify each element of the headline against the article and then offer improved alternatives that preserve key elements of the original.

Instructions:
- Break the headline into bulletized components under "Headline Components"."
- For each component, indicate:
    • Supported: quote the exact article sentence or fact that confirms it.
    • Unsupported: mark it as "unsupported detail".
- List any overall accuracy issues in one brief sentence under "Overall Accuracy Issues".
- Under "Suggested Alternatives", provide 3 new headlines that:
    • Keep the core structure or key phrase from the original (e.g., "This Smart", "Snapdragon 8 Elite").
    • Fix any unsupported or unclear details.
    • Use fresh, specific wording but avoid generic or overused verbs.
    • Maintain the original tone (conversational, engaging) and stay under 12 words.

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
