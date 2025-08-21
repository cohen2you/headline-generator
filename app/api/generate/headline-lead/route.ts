import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const { articleText, headline } = await request.json();

    if (!articleText?.trim()) {
      return NextResponse.json({ lead: '', error: 'Article text is required.' });
    }

    if (!headline?.trim()) {
      return NextResponse.json({ lead: '', error: 'Headline is required.' });
    }

    const prompt = `You are a financial journalist writing for a broad audience.

Your task is to analyze both the headline and article content to create a lead that:
- Matches the tone, style, and energy of the headline
- Incorporates key facts and context from the article
- Provides complementary information that doesn't repeat the headline
- Creates a smooth transition from headline to article body
- Is concise (2-3 sentences maximum)
- Uses simple, direct language; no jargon

ANALYSIS INSTRUCTIONS:
1. First, analyze the headline's tone and style:
   - Is it urgent/breaking news? Use urgent language
   - Is it analytical/insightful? Use analytical language
   - Is it dramatic/sensational? Use dramatic language
   - Is it factual/straightforward? Use factual language

2. Identify key elements from the article that complement the headline:
   - Background context that sets up the headline's claim
   - Supporting data or trends that validate the headline
   - Broader implications that the headline hints at
   - Market context that makes the headline relevant

3. Create a lead that:
   - Echoes the headline's emotional tone and urgency level
   - Provides the "why" or "how" behind the headline
   - Sets up the specific details that follow in the article
   - Avoids repeating the exact same information as the headline

CRITICAL REQUIREMENTS:
- Do NOT repeat the headline's exact words or phrases
- Do NOT start with "In a..." or similar formal phrases
- Do NOT use the same companies, people, or specific details mentioned in the headline
- Focus on providing context, background, or implications that support the headline
- Make the lead feel like a natural extension of the headline's promise
- Use active voice and strong verbs that match the headline's energy

EXAMPLES:
Headline: "Tesla Stock Plunges 15% After Earnings Miss"
Lead: "Investors punished Tesla for falling short of Wall Street expectations, sending shares to their lowest level in months as concerns mount about the electric vehicle maker's growth trajectory."

Headline: "Fed Signals Three Rate Cuts in 2024"
Lead: "The Federal Reserve's latest projections suggest a more dovish monetary policy stance ahead, potentially providing relief to markets that have been grappling with elevated borrowing costs."

Article Headline: "${headline}"

Article:
${articleText}

Lead:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 700,
      temperature: 0.7,
    });

    const lead = completion.choices[0].message?.content?.trim() ?? '';

    return NextResponse.json({ lead });
  } catch (error) {
    console.error('Error generating headline lead:', error);
    return NextResponse.json({ lead: '', error: 'Failed to generate headline lead.' }, { status: 500 });
  }
} 