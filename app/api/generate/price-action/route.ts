import { NextResponse } from 'next/server';

interface BenzingaQuote {
  symbol?: string;
  name?: string;
  changePercent?: number;
  lastTradePrice?: number;
  closeDate?: string;
}

export async function POST(request: Request) {
  try {
    const { tickers } = await request.json();

    if (!tickers?.trim()) {
      return NextResponse.json({ priceActions: [], error: 'Ticker(s) required.' });
    }

    const url = `https://api.benzinga.com/api/v2/quoteDelayed?token=${process.env.BENZINGA_API_KEY}&symbols=${tickers}`;

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Benzinga API error: ${text}`);
    }
    const data = await res.json();

    if (!data || typeof data !== 'object') {
      return NextResponse.json({ priceActions: [], error: 'Invalid Benzinga response' });
    }

    const quotes = Object.values(data) as unknown[];

    const priceActions = quotes.map((quote) => {
      if (typeof quote !== 'object' || quote === null) return '';

      const q = quote as BenzingaQuote;

      const symbol = q.symbol ?? 'UNKNOWN';
      const companyName = q.name ?? symbol;
      const changePercent = q.changePercent?.toFixed(2) ?? '0.00';
      const lastPrice = q.lastTradePrice?.toFixed(2) ?? '0.00';

      // Format day of week from closeDate if available, else today
      const date = q.closeDate ? new Date(q.closeDate) : new Date();
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

      return `${symbol} Price Action: ${companyName} shares were ${changePercent}% at $${lastPrice} at the time of publication ${dayOfWeek}, according to Benzinga Pro.`;
    });

    return NextResponse.json({ priceActions });
  } catch (error) {
    console.error('Error fetching price action:', error);
    return NextResponse.json(
      { priceActions: [], error: 'Failed to fetch price action.' },
      { status: 500 }
    );
  }
}
