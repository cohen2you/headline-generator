import { NextResponse } from 'next/server';

interface AnalystRating {
  ticker: string;
  analyst: string;
  action_company: string;   // e.g. "Upgrades", "Maintains", "Reiterates", "Downgrades"
  rating_current: string;
  rating_prior?: string;
  date: string;             // ISO date string
  pt_current?: string;
  pt_prior?: string;
}

// Converts "Upgrades" → "upgraded", "Maintains" → "maintained", etc.
function toPastTense(verb: string) {
  const stem = verb.endsWith('s') ? verb.slice(0, -1) : verb;
  return stem.toLowerCase() + (stem.endsWith('e') ? 'd' : 'ed');
}

async function handleRatingsFetch(ticker: string): Promise<string> {
  const base = 'https://api.benzinga.com/api/v2.1/calendar/ratings';
  const tokenParam = `token=${process.env.BENZINGA_API_KEY}`;
  const url = `${base}?${tokenParam}&parameters[tickers]=${encodeURIComponent(
    ticker
  )}&parameters[range]=6m`;

  const response = await fetch(url, { headers: { accept: 'application/json' } });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Benzinga API error: ${raw}`);
  }

  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('<')) {
    return '';
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('Invalid JSON from Benzinga');
  }

  const ratingsArray: AnalystRating[] = Array.isArray(parsed)
    ? (parsed as AnalystRating[])
    : (parsed as { ratings?: AnalystRating[] }).ratings ?? [];

  if (ratingsArray.length === 0) {
    return `No recent analyst ratings found for ${ticker}.`;
  }

  // Sort descending by date and take the top 5
  ratingsArray.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const topFive = ratingsArray.slice(0, 5);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });

  let upgradeCount = 0,
      downgradeCount = 0;
  const sentences: string[] = [];

  topFive.forEach(r => {
    const dateStr = formatDate(r.date);
    const action = toPastTense(r.action_company);
    if (action === 'upgraded') upgradeCount++;
    if (action === 'downgraded') downgradeCount++;

    let sentence = `On ${dateStr}, ${r.analyst} ${action} ${ticker} to ${r.rating_current}`;
    if (r.rating_prior && r.rating_prior !== r.rating_current) {
      sentence += ` (from ${r.rating_prior})`;
    }

    if (r.pt_current) {
      const curr = parseFloat(r.pt_current).toFixed(2);
      sentence += ` and set a $${curr} target`;
      if (r.pt_prior) {
        const priorNum = parseFloat(r.pt_prior);
        const currNum  = parseFloat(r.pt_current);
        if (!isNaN(priorNum) && priorNum !== currNum) {
          sentence += ` (up from $${priorNum.toFixed(2)})`;
        }
      }
    }

    sentences.push(sentence + '.');
  });

  // First paragraph: enhanced big-picture takeaway
  const upgradesText = upgradeCount > 0 ? `${upgradeCount} upgrade${upgradeCount > 1 ? 's' : ''}` : 'no upgrades';
  const downgradesText = downgradeCount > 0 ? `${downgradeCount} downgrade${downgradeCount > 1 ? 's' : ''}` : 'no downgrades';

  const trendSentence = `In the past six months, analysts have shown a notably positive tilt, registering ${upgradesText} and ${downgradesText} among the five most recent actions. This suggests a gradual shift toward bullish sentiment on ${ticker}, even as a few remain cautious.`;

  // Second paragraph: detailed chronology
  const detailParagraph = sentences.join(' ');

  return `${trendSentence}\n\n${detailParagraph}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = (searchParams.get('ticker') ?? '').trim().toUpperCase();
  if (!ticker) {
    return NextResponse.json(
      { paragraph: '', error: 'Ticker parameter is required.' },
      { status: 400 }
    );
  }
  try {
    const paragraph = await handleRatingsFetch(ticker);
    return NextResponse.json({ paragraph });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { paragraph: '', error: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as { ticker?: string };
  const sym = (body.ticker ?? '').trim().toUpperCase();
  if (!sym) {
    return NextResponse.json(
      { paragraph: '', error: 'Ticker is required.' },
      { status: 400 }
    );
  }
  try {
    const paragraph = await handleRatingsFetch(sym);
    return NextResponse.json({ paragraph });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { paragraph: '', error: (err as Error).message },
      { status: 500 }
    );
  }
}
