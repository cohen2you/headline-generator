import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const { headline, tweak, articleText } = await request.json();

    if (!headline?.trim() || !tweak?.trim() || !articleText?.trim()) {
      return NextResponse.json({ headlines: [] });
    }

    const prompt = `You are a financial headline editor tasked with tweaking an existing headline based on a short instruction.

Original Headline:
"${headline}"

Instruction:
"${tweak}"

Article Text:
${articleText}

Generate exactly 3 alternative headlines under 12 words each that apply the instruction while preserving core facts and engagement. Respond with a JSON object:
{ "headlines": ["...", "...", "..."] }`;    

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.7,
    });

    const raw = response.choices[0].message?.content?.trim() ?? '';
    let result;
    try {
      result = JSON.parse(raw);
    } catch (e) {
      console.error('Adjust-headline parse error:', e, 'raw:', raw);
      return NextResponse.json({ headlines: [] }, { status: 502 });
    }

    // Ensure array
    if (!Array.isArray(result.headlines)) {
      result.headlines = [];
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Error in adjust-headline route:', err);
    return NextResponse.json({ headlines: [] }, { status: 500 });
  }
}
