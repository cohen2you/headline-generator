import { NextResponse } from 'next/server';

const CTA_SECOND_SENTENCES = [
  // Action-oriented CTAs
  'See the full story here.',
  'Get the complete picture here.',
  'Check out the latest moves here.',
  'Track the action here.',
  'Watch the momentum here.',
  'See what is happening here.',
  
  // Urgency-based CTAs
  'Get the scoop here.',
  'Stay ahead of the curve here.',
  'Get the latest updates here.',
  'See what is driving the move here.',
  'Track the latest developments here.',
  'Follow the breaking news here.',
  
  // Value-focused CTAs
  'See if it is worth your attention here.',
  'Check the market position here.',
  'Get the complete analysis here.',
  'See the full breakdown here.',
  'Check the fundamentals here.',
  'Review the technical setup here.',
  
  // Curiosity-driven CTAs
  'See what is driving the movement here.',
  'Find out why here.',
  'Get the inside scoop here.',
  'See what the experts say here.',
  'Check the analyst take here.',
  'See the market dynamics here.',
  
  // Professional CTAs
  'Get the details here.',
  'See the complete data here.',
  'Check the full analysis here.',
  'View the charts here.',
  'Get the market research here.',
  'See the trading setup here.'
];

function getBenzingaLink(ticker: string) {
  return `https://www.benzinga.com/quote/${ticker.toUpperCase()}`;
}

function hyperlinkSentence(sentence: string, ticker: string) {
  const link = getBenzingaLink(ticker);
  return `<a href="${link}" target="_blank" rel="noopener noreferrer">${sentence}</a>`;
}

type Quote = {
  changePercent?: number;
  volume?: number;
  averageVolume?: number;
  lastTradePrice?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  pe?: number;
  sector?: string;
  industry?: string;
};

function getFirstSentence(ticker: string, quote: Quote) {
  const symbol = ticker.toUpperCase();
  const changePercent = typeof quote.changePercent === 'number' ? quote.changePercent : 0;
  const lastPrice = quote.lastTradePrice;
  const fiftyTwoWeekHigh = quote.fiftyTwoWeekHigh;
  const fiftyTwoWeekLow = quote.fiftyTwoWeekLow;
  const pe = quote.pe;
  const sector = quote.sector;
  const industry = quote.industry;
  const volume = quote.volume;
  const averageVolume = quote.averageVolume;

  // Template sets for each scenario
  const templates = {
    surging: [
      `${symbol} is charging ahead with explosive momentum.`,
      `${symbol} shares are powering higher on strong volume.`,
      `${symbol} is surging to new heights today.`,
      `${symbol} stock is racing ahead of the pack.`,
      `${symbol} is among today's top performers.`,
      `${symbol} shares are climbing with conviction.`,
      `${symbol} is delivering impressive returns.`,
      `${symbol} stock is showing exceptional strength.`,
    ],
    slumping: [
      `${symbol} is taking a hit from negative sentiment.`,
      `${symbol} shares are sliding on disappointing news.`,
      `${symbol} is feeling the pressure from bearish momentum.`,
      `${symbol} stock is struggling to find support.`,
      `${symbol} is among today's weakest performers.`,
      `${symbol} shares are retreating from recent levels.`,
      `${symbol} is encountering selling pressure.`,
      `${symbol} stock is showing notable weakness.`,
    ],
    higher: [
      `${symbol} is building positive momentum.`,
      `${symbol} shares are advancing steadily.`,
      `${symbol} is showing upward movement.`,
      `${symbol} stock is gaining positive traction.`,
      `${symbol} is demonstrating bullish strength.`,
      `${symbol} shares are trending higher.`,
      `${symbol} is gathering positive momentum.`,
      `${symbol} stock is moving in positive territory.`,
    ],
    underperforming: [
      `${symbol} is facing resistance from sellers.`,
      `${symbol} shares are experiencing downward pressure.`,
      `${symbol} is under selling pressure.`,
      `${symbol} stock is trending lower.`,
      `${symbol} is having a challenging session.`,
      `${symbol} shares are under pressure.`,
      `${symbol} is lagging behind market performance.`,
      `${symbol} stock is showing weakness.`,
    ],
    steady: [
      // Technical analysis focused
      `${symbol} is holding steady in today's choppy market.`,
      `${symbol} shares are consolidating after recent moves.`,
      `${symbol} is biding its time at current levels.`,
      `${symbol} stock is taking a breather.`,
      `${symbol} is trading in a tight range.`,
      `${symbol} shares are showing limited movement.`,
      `${symbol} is maintaining a sideways pattern.`,
      `${symbol} stock is staying put for now.`,
      
      // Fundamental focused
      `${symbol} is trading at ${pe ? pe.toFixed(1) : 'N/A'}x earnings, ${pe && pe < 15 ? 'below market average' : pe && pe > 25 ? 'above market average' : 'in line with market average'}.`,
      `${symbol} operates in the ${sector ? sector.toLowerCase() : 'market'} sector.`,
      `${symbol} shares are ${volume && averageVolume && volume > averageVolume * 1.5 ? 'experiencing above-average volume' : 'trading with typical volume'}.`,
      `${symbol} is a ${industry ? industry.toLowerCase() : 'market'} sector company.`,
      
      // Market position focused
      `${symbol} is ${fiftyTwoWeekHigh && fiftyTwoWeekLow && lastPrice ? ((lastPrice - fiftyTwoWeekLow) / (fiftyTwoWeekHigh - fiftyTwoWeekLow) > 0.7 ? 'trading near its 52-week high' : (lastPrice - fiftyTwoWeekLow) / (fiftyTwoWeekHigh - fiftyTwoWeekLow) < 0.3 ? 'trading near its 52-week low' : 'trading in the middle of its 52-week range') : 'trading within its historical range'}.`,
      `${symbol} shares are ${fiftyTwoWeekHigh && lastPrice && lastPrice > fiftyTwoWeekHigh * 0.95 ? 'approaching resistance levels' : fiftyTwoWeekLow && lastPrice && lastPrice < fiftyTwoWeekLow * 1.05 ? 'testing support levels' : 'trading within normal parameters'}.`,
    ],
    high: [
      `${symbol} is approaching key resistance levels.`,
      `${symbol} shares are testing new highs.`,
      `${symbol} is reaching significant price levels.`,
      `${symbol} stock is challenging resistance.`,
      `${symbol} is poised for potential breakout.`,
      `${symbol} shares are at critical resistance.`,
      `${symbol} is testing upper boundaries.`,
      `${symbol} stock is at important technical levels.`,
    ],
    low: [
      `${symbol} is testing key support levels.`,
      `${symbol} shares are approaching critical lows.`,
      `${symbol} is at significant support.`,
      `${symbol} stock is testing lower boundaries.`,
      `${symbol} is at important technical levels.`,
      `${symbol} shares are near support zones.`,
      `${symbol} is testing critical support.`,
      `${symbol} stock is at key technical levels.`,
    ],
  };

  const steadyUpper = [
    `${symbol} is trading near recent highs.`,
    `${symbol} is performing well relative to peers.`,
    `${symbol} is showing positive momentum.`,
    `${symbol} is in a favorable position.`,
    `${symbol} is trading at elevated levels.`,
    `${symbol} is demonstrating strength.`,
    `${symbol} is in positive territory.`,
    `${symbol} is showing upward bias.`
  ];
  const steadyLower = [
    `${symbol} is trading near recent lows.`,
    `${symbol} is underperforming relative to peers.`,
    `${symbol} is showing downward pressure.`,
    `${symbol} is in a challenging position.`,
    `${symbol} is trading at depressed levels.`,
    `${symbol} is demonstrating weakness.`,
    `${symbol} is in negative territory.`,
    `${symbol} is showing downward bias.`
  ];

  // Determine scenario
  if (fiftyTwoWeekHigh && lastPrice !== undefined && lastPrice >= fiftyTwoWeekHigh * 0.995) {
    return templates.high[Math.floor(Math.random() * templates.high.length)];
  } else if (fiftyTwoWeekLow && lastPrice !== undefined && lastPrice <= fiftyTwoWeekLow * 1.005) {
    return templates.low[Math.floor(Math.random() * templates.low.length)];
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
    if (fiftyTwoWeekHigh && fiftyTwoWeekLow && lastPrice !== undefined) {
      const range = fiftyTwoWeekHigh - fiftyTwoWeekLow;
      const pos = (lastPrice - fiftyTwoWeekLow) / range;
      if (pos > 0.7) {
        return steadyUpper[Math.floor(Math.random() * steadyUpper.length)];
      } else if (pos < 0.3) {
        return steadyLower[Math.floor(Math.random() * steadyLower.length)];
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
  } catch {
    return NextResponse.json({ error: 'Failed to generate CTA.' }, { status: 500 });
  }
} 