import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const { headline, tweak, articleText } = await request.json();

    if (!headline?.trim() || !tweak?.trim() || !articleText?.trim()) {
      return NextResponse.json({ headlines: [] });
    }

    const prompt = `You are a financial headline editor for a high-impact news site.

Your task is to revise an existing headline based on a specific instruction. Your edits should reflect the requested tweak **while preserving the structure, tone, and main phrasing of the original headline** wherever possible.

You're allowed to reword or restructure only as much as necessary to fulfill the instruction or improve clarity/engagement.

Avoid clichés. Be punchy, vivid, and stay under 12 words.

Original Headline:
"${headline}"

Instruction:
"${tweak}"

Article Text:
${articleText}

Respond only with valid JSON in this format, no code block, no explanation:
{"headlines":["Adjusted Headline 1","Adjusted Headline 2","Adjusted Headline 3"]}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 700,
      temperature: 0.7,
    });

    const raw = response.choices[0].message?.content?.trim() ?? '';
    const cleaned = raw.replace(/```json|```/g, '').trim();

    let result;
    try {
      result = JSON.parse(cleaned);
    } catch (e) {
      console.error('Adjust-headline parse error:', e, 'raw:', raw);
      return NextResponse.json({ headlines: [] }, { status: 502 });
    }

    if (!Array.isArray(result.headlines)) {
      result.headlines = [];
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Error in adjust-headline route:', err);
    return NextResponse.json({ headlines: [] }, { status: 500 });
  }
}
