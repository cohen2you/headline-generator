import { NextResponse } from 'next/server';

// Context-specific question templates for different scenarios
const CTA_QUESTIONS = {
  surging: [
    'Why is {{TICKER}} stock surging?',
    'What\'s driving {{TICKER}} stock higher?',
    'What\'s behind {{TICKER}} gains?',
    'Why are {{TICKER}} shares rallying?',
    'What\'s fueling {{TICKER}} momentum?',
    'Why is {{TICKER}} stock up today?'
  ],
  dropping: [
    'Why is {{TICKER}} stock falling?',
    'What\'s weighing on {{TICKER}} shares?',
    'Why are {{TICKER}} shares down?',
    'What\'s pressuring {{TICKER}} stock?',
    'Why is {{TICKER}} stock dropping?',
    'What\'s behind {{TICKER}} decline?'
  ],
  higher: [
    'Why is {{TICKER}} stock trading higher?',
    'What\'s driving {{TICKER}} shares up?',
    'Why are {{TICKER}} shares climbing?',
    'What\'s pushing {{TICKER}} stock higher?',
    'Why is {{TICKER}} stock advancing?'
  ],
  lower: [
    'Why is {{TICKER}} stock trading lower?',
    'What\'s pulling {{TICKER}} shares down?',
    'Why are {{TICKER}} shares declining?',
    'What\'s driving {{TICKER}} stock lower?',
    'Why is {{TICKER}} stock retreating?'
  ],
  atHigh: [
    'Why did {{TICKER}} hit a new high?',
    'What\'s driving {{TICKER}} to record levels?',
    'Why is {{TICKER}} stock breaking out?',
    'What\'s behind {{TICKER}} new highs?',
    'Why are {{TICKER}} shares at highs?'
  ],
  atLow: [
    'Why is {{TICKER}} stock at lows?',
    'What\'s pressuring {{TICKER}}?',
    'Why did {{TICKER}} hit a new low?',
    'What\'s behind {{TICKER}} weakness?',
    'Why are {{TICKER}} shares at support?'
  ],
  steady: [
    'What\'s next for {{TICKER}} stock?',
    'Where is {{TICKER}} stock headed?',
    'What\'s the outlook for {{TICKER}} shares?',
    'What should traders watch with {{TICKER}}?',
    'What\'s ahead for {{TICKER}} stock?',
    'Where are {{TICKER}} shares going?'
  ]
};

function getBenzingaLink(ticker: string) {
  return `https://www.benzinga.com/quote/${ticker.toUpperCase()}`;
}

function hyperlinkSentence(sentence: string, ticker: string) {
  const link = getBenzingaLink(ticker);
  return `<a href="${link}" target="_blank" rel="noopener noreferrer">${sentence}</a>`;
}

type Quote = {
  name?: string;
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
  // Use company name if available, otherwise use ticker
  const companyName = quote.name || symbol;
  const changePercent = typeof quote.changePercent === 'number' ? quote.changePercent : 0;
  const lastPrice = quote.lastTradePrice;
  const fiftyTwoWeekHigh = quote.fiftyTwoWeekHigh;
  const fiftyTwoWeekLow = quote.fiftyTwoWeekLow;
  const pe = quote.pe;
  const sector = quote.sector;
  const industry = quote.industry;
  const volume = quote.volume;
  const averageVolume = quote.averageVolume;

  // Template sets for each scenario - using company name
  const templates = {
    surging: [
      `${companyName} stock is charging ahead with explosive momentum.`,
      `${companyName} shares are powering higher.`,
      `${companyName} stock is surging to new heights today.`,
      `${companyName} stock is among today's top performers.`,
      `${companyName} shares are climbing with conviction.`,
      `${companyName} stock is showing exceptional strength.`,
    ],
    slumping: [
      `${companyName} stock is taking a hit today.`,
      `${companyName} shares are sliding.`,
      `${companyName} stock is feeling bearish pressure.`,
      `${companyName} stock is among today's weakest performers.`,
      `${companyName} shares are retreating from recent levels.`,
      `${companyName} stock is showing notable weakness.`,
    ],
    higher: [
      `${companyName} stock is building positive momentum.`,
      `${companyName} shares are advancing steadily.`,
      `${companyName} stock is showing upward movement.`,
      `${companyName} stock is gaining positive traction.`,
      `${companyName} shares are trending higher.`,
      `${companyName} stock is moving in positive territory.`,
    ],
    underperforming: [
      `${companyName} stock is facing resistance.`,
      `${companyName} shares are experiencing downward pressure.`,
      `${companyName} stock is under selling pressure.`,
      `${companyName} stock is trending lower.`,
      `${companyName} shares are under pressure.`,
      `${companyName} stock is showing weakness.`,
    ],
    steady: [
      `${companyName} stock is holding steady today.`,
      `${companyName} shares are consolidating.`,
      `${companyName} stock is trading in a tight range.`,
      `${companyName} shares are showing limited movement.`,
      `${companyName} stock is taking a breather.`,
    ],
    high: [
      `${companyName} stock is approaching key resistance levels.`,
      `${companyName} shares are testing new highs.`,
      `${companyName} stock is challenging resistance.`,
      `${companyName} stock is at critical resistance.`,
    ],
    low: [
      `${companyName} stock is testing key support levels.`,
      `${companyName} shares are approaching critical lows.`,
      `${companyName} stock is at significant support.`,
      `${companyName} stock is testing lower boundaries.`,
    ],
  };

  const steadyUpper = [
    `${companyName} stock is trading near recent highs.`,
    `${companyName} stock is showing positive momentum.`,
    `${companyName} stock is trading at elevated levels.`,
    `${companyName} stock is showing upward bias.`
  ];
  const steadyLower = [
    `${companyName} stock is trading near recent lows.`,
    `${companyName} stock is showing downward pressure.`,
    `${companyName} stock is trading at depressed levels.`,
    `${companyName} stock is showing downward bias.`
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

function getCtaQuestion(ticker: string, quote: Quote): string {
  const symbol = ticker.toUpperCase();
  const changePercent = typeof quote.changePercent === 'number' ? quote.changePercent : 0;
  const lastPrice = quote.lastTradePrice;
  const fiftyTwoWeekHigh = quote.fiftyTwoWeekHigh;
  const fiftyTwoWeekLow = quote.fiftyTwoWeekLow;

  let questionArray: string[];

  // Determine which question set to use based on scenario
  if (fiftyTwoWeekHigh && lastPrice !== undefined && lastPrice >= fiftyTwoWeekHigh * 0.995) {
    questionArray = CTA_QUESTIONS.atHigh;
  } else if (fiftyTwoWeekLow && lastPrice !== undefined && lastPrice <= fiftyTwoWeekLow * 1.005) {
    questionArray = CTA_QUESTIONS.atLow;
  } else if (changePercent > 3) {
    questionArray = CTA_QUESTIONS.surging;
  } else if (changePercent < -3) {
    questionArray = CTA_QUESTIONS.dropping;
  } else if (changePercent > 1) {
    questionArray = CTA_QUESTIONS.higher;
  } else if (changePercent < -1) {
    questionArray = CTA_QUESTIONS.lower;
  } else {
    questionArray = CTA_QUESTIONS.steady;
  }

  // Select a random question from the appropriate array
  const questionTemplate = questionArray[Math.floor(Math.random() * questionArray.length)];
  
  // Replace {{TICKER}} with the actual ticker
  return questionTemplate.replace(/\{\{TICKER\}\}/g, symbol);
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
    // Generate context-specific question for the second sentence
    const question = getCtaQuestion(ticker, quote);
    const questionLinked = hyperlinkSentence(question, ticker);
    const cta = `${firstSentence} ${questionLinked}`;
    return NextResponse.json({ cta });
  } catch {
    return NextResponse.json({ error: 'Failed to generate CTA.' }, { status: 500 });
  }
} 