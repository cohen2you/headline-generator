import { NextResponse } from 'next/server';

const CTA_SECOND_SENTENCES = [
  'Check the latest price here.',
  'See real-time price here.',
  'See the chart here.',
  'Track it now here.',
  'Check the price action here.',
  'Track live prices here.'
];

function getBenzingaLink(ticker: string) {
  return `https://www.benzinga.com/quote/${ticker.toUpperCase()}`;
}

function hyperlinkSentence(sentence: string, ticker: string) {
  const link = getBenzingaLink(ticker);
  return `<a href="${link}" target="_blank" rel="noopener noreferrer">${sentence}</a>`;
}

function getFirstSentence(ticker: string, quote: any) {
  const symbol = ticker.toUpperCase();
  const changePercent = typeof quote.changePercent === 'number' ? quote.changePercent : 0;
  const volume = quote.volume;
  const avgVolume = quote.averageVolume;
  const lastPrice = quote.lastTradePrice;
  const fiftyTwoWeekHigh = quote.fiftyTwoWeekHigh;
  const fiftyTwoWeekLow = quote.fiftyTwoWeekLow;
  const pe = quote.pe;
  const marketCap = quote.marketCap;
  const sector = quote.sector;
  const industry = quote.industry;
  const fiftyDayAvg = quote.fiftyDayAveragePrice;
  const hundredDayAvg = quote.hundredDayAveragePrice;
  const twoHundredDayAvg = quote.twoHundredDayAveragePrice;

  // Template sets for each scenario
  const templates = {
    surging: [
      `${symbol} stock is surging on strong momentum.`,
      `${symbol} shares are rallying sharply today.`,
      `${symbol} is posting impressive gains in the latest session.`,
      `${symbol} stock is on the move, climbing higher.`,
    ],
    slumping: [
      `${symbol} stock is slumping fast.`,
      `${symbol} shares are under heavy selling pressure.`,
      `${symbol} is seeing a sharp decline in price.`,
      `${symbol} stock is tumbling in today's session.`,
    ],
    higher: [
      `${symbol} stock is moving higher.`,
      `${symbol} shares are trending up modestly.`,
      `${symbol} is gaining ground.`,
      `${symbol} stock is ticking upward.`,
    ],
    underperforming: [
      `${symbol} stock is underperforming.`,
      `${symbol} shares are lagging the market.`,
      `${symbol} is slipping lower.`,
      `${symbol} stock is drifting down.`,
    ],
    steady: [
      `${symbol} is consolidating in a tight range.`,
      `${symbol} shares are holding firm.`,
      `${symbol} is trading sideways.`,
      `${symbol} is showing resilience.`,
      `${symbol} is maintaining stability.`,
      `${symbol} is range-bound.`,
      `${symbol} is showing little movement.`,
      `${symbol} is holding its ground.`,
      `${symbol} is consolidating in the middle of its 52-week range.`,
      `${symbol} is maintaining a large market cap in the ${sector || 'market'} sector.`,
      `${symbol} is trading with a P/E ratio of ${pe ? pe.toFixed(1) : 'N/A'}.`,
      `${symbol} is steady in the ${industry || 'market'} industry.`,
      `${symbol} is holding near its 50-day moving average.`,
      `${symbol} is trading in the upper third of its 52-week range.`,
      `${symbol} is trading in the lower third of its 52-week range.`,
    ],
    high: [
      `${symbol} stock is testing its 52-week high.`,
      `${symbol} shares are trading near their annual peak.`,
      `${symbol} is challenging its highest level of the year.`,
    ],
    low: [
      `${symbol} stock is testing its 52-week low.`,
      `${symbol} shares are trading near their annual bottom.`,
      `${symbol} is approaching its lowest level of the year.`,
    ],
    volume: [
      `${symbol} stock spikes on heavy volume.`,
      `${symbol} shares are seeing a surge in trading activity.`,
      `${symbol} is experiencing unusually high volume.`,
    ],
  };

  // Determine scenario
  if (fiftyTwoWeekHigh && lastPrice >= fiftyTwoWeekHigh * 0.995) {
    return templates.high[Math.floor(Math.random() * templates.high.length)];
  } else if (fiftyTwoWeekLow && lastPrice <= fiftyTwoWeekLow * 1.005) {
    return templates.low[Math.floor(Math.random() * templates.low.length)];
  } else if (volume && avgVolume && volume > avgVolume * 2) {
    return templates.volume[Math.floor(Math.random() * templates.volume.length)];
  } else if (changePercent > 3) {
    return templates.surging[Math.floor(Math.random() * templates.surging.length)];
  } else if (changePercent < -3) {
    return templates.slumping[Math.floor(Math.random() * templates.slumping.length)];
  } else if (changePercent > 1) {
    return templates.higher[Math.floor(Math.random() * templates.higher.length)];
  } else if (changePercent < -1) {
    return templates.underperforming[Math.floor(Math.random() * templates.underperforming.length)];
  } else {
    // For steady, pick a random descriptive template
    // Use 52-week range position for more context
    if (fiftyTwoWeekHigh && fiftyTwoWeekLow && lastPrice) {
      const range = fiftyTwoWeekHigh - fiftyTwoWeekLow;
      const pos = (lastPrice - fiftyTwoWeekLow) / range;
      if (pos > 0.7) {
        return templates.steady[13];
      } else if (pos < 0.3) {
        return templates.steady[14];
      } else {
        // Randomly pick from the rest
        const idx = Math.floor(Math.random() * 9);
        return templates.steady[idx];
      }
    }
    // Fallback
    return templates.steady[Math.floor(Math.random() * templates.steady.length)];
  }
}

export async function POST(request: Request) {
  try {
    const { ticker } = await request.json();
    if (!ticker || typeof ticker !== 'string') {
      return NextResponse.json({ error: 'Ticker is required.' }, { status: 400 });
    }
    // Fetch price action data from Benzinga
    const url = `https://api.benzinga.com/api/v2/quoteDelayed?token=${process.env.BENZINGA_API_KEY}&symbols=${ticker}`;
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch price data.' }, { status: 500 });
    }
    const data = await res.json();
    const quote = data && data[ticker.toUpperCase()];
    if (!quote) {
      return NextResponse.json({ error: 'No data found for ticker.' }, { status: 404 });
    }
    // Generate first sentence based on real data
    const firstSentence = getFirstSentence(ticker, quote);
    // Randomly select a CTA phrase for the second sentence
    const secondSentence = CTA_SECOND_SENTENCES[Math.floor(Math.random() * CTA_SECOND_SENTENCES.length)];
    const secondSentenceLinked = hyperlinkSentence(secondSentence, ticker);
    const cta = `${firstSentence} ${secondSentenceLinked}`;
    return NextResponse.json({ cta });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate CTA.' }, { status: 500 });
  }
} 