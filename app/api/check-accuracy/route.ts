import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const { headline, articleText } = await request.json();

    if (!headline?.trim() || !articleText?.trim()) {
      return NextResponse.json({ review: 'Headline or article text missing.', suggestions: [] });
    }

    const prompt = `You are an expert headline editor for a financial news website.

Given an article and a headline, return a JSON object with two keys in this exact format, using literal "\n" to indicate line breaks within strings:

{"review":"What's Accurate:
• Claim A
• Claim B

What Could Be Tweaked:
• Tweak A
• Tweak B","suggestions":["Alt1","Alt2","Alt3"]}

Instructions for "review":
- Use "\n" to separate lines within the review string.
- Begin with "What's Accurate:\n" then bullet each factual claim prefixed by "• " and separated by "\n".
- After accuracy bullets, append "\nWhat Could Be Tweaked:\n" followed by bullets for each tweak, separated by "\n".

Instructions for "suggestions":
- Provide exactly three headline variants under 12 words each, preserving facts and tone.
- Be creative: use vivid verbs, conversational phrasing, or playful twists that reflect the article’s voice.
- Avoid clichés, generic templates, and ensure each headline retains a connection to the original phrase.

Article:
${articleText}

Headline:
"${headline}"

Respond with JSON only, one line with escaped newlines.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0.7,
    });

    const text = completion.choices[0].message?.content?.trim() || '';

    try {
      const result = JSON.parse(text);
      // Ensure suggestions is always an array to prevent undefined errors
      if (!Array.isArray(result.suggestions)) {
        result.suggestions = [];
      }
      return NextResponse.json(result);
    } catch (err) {
      console.error('Parsing error:', err, 'raw response:', text);
      return NextResponse.json(
        { review: 'Could not parse response from AI.', suggestions: [] },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('Error in headline context review:', error);
    return NextResponse.json(
      { review: 'Failed to review headline context.', suggestions: [] },
      { status: 500 }
    );
  }
}
