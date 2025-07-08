import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

interface AnalystRating {
  ticker: string;
  analyst: string;
  action_company: string;
  action_pt?: string;
  rating_current: string;
  rating_prior?: string;
  date: string;
  pt_current?: string;
  pt_prior?: string;
}

async function fetchAnalystRatings(ticker: string): Promise<AnalystRating[]> {
  const url = 'https://api.benzinga.com/api/v2.1/calendar/ratings' +
    `?token=${process.env.BENZINGA_API_KEY}` +
    `&parameters[tickers]=${encodeURIComponent(ticker)}` +
    `&parameters[range]=6m`;

  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Benzinga API error ${res.status} ${res.statusText}: ${body || '<no body>'}`
    );
  }

  const raw = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    throw new Error('Invalid JSON from Benzinga');
  }

  const ratingsArray: AnalystRating[] = Array.isArray(parsed)
    ? parsed as AnalystRating[]
    : (parsed as { ratings?: AnalystRating[] }).ratings ?? [];

  return ratingsArray;
}

function formatRatingsBlock(ratings: AnalystRating[]): string {
  return ratings
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 5)
    .map(r => {
      const date = new Date(r.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      let line = `${date}: ${r.analyst} rated ${r.ticker} ${r.action_company} ${r.rating_current}`;
      if (r.rating_prior && r.rating_prior !== r.rating_current) {
        line += ` (prior ${r.rating_prior})`;
      }
      if (r.pt_current) {
        line += ` and set a $${parseFloat(r.pt_current).toFixed(2)} target`;
        if (r.pt_prior && parseFloat(r.pt_prior) !== parseFloat(r.pt_current)) {
          line += ` (prior $${parseFloat(r.pt_prior).toFixed(2)})`;
        }
      }
      return line;
    })
    .join('\n');
}

export async function POST(request: Request) {
  try {
    const { ticker } = await request.json() as { ticker?: string };
    const symbol = (ticker ?? '').trim().toUpperCase();
    if (!symbol) {
      return NextResponse.json({ paragraph: '', error: 'Ticker parameter is required.' }, { status: 400 });
    }

    const ratings = await fetchAnalystRatings(symbol);
    if (ratings.length === 0) {
      return NextResponse.json({ paragraph: `No recent analyst ratings found for ${symbol}.` });
    }

    // Prepare block for AI
    const block = formatRatingsBlock(ratings);
    const prompt = `Here are the five most recent analyst actions for ${symbol}:\n${block}\n\n` +
      `Write a concise two-paragraph summary: first highlighting the overall trend, then listing each action in a reader-friendly flow.`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a financial news writer.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    const paragraph = completion.choices?.[0]?.message?.content.trim() || '';
    return NextResponse.json({ paragraph });
  } catch (err: any) {
    console.error('Error in /api/generate/analyst-ratings:', err);
    return NextResponse.json(
      { paragraph: '', error: err.message || 'Failed to generate summary.' },
      { status: 500 }
    );
  }
}
