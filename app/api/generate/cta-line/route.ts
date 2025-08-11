import { NextResponse } from 'next/server';

const CTA_SECOND_SENTENCES = [
  // Action-oriented CTAs
  'See the live chart here.',
  'Track the momentum here.',
  'Watch the price action here.',
  'Monitor the movement here.',
  'Follow the trend here.',
  'Check the real-time data here.',
  
  // Urgency-based CTAs
  'Don\'t miss the action here.',
  'Stay ahead of the curve here.',
  'Get the latest updates here.',
  'See what\'s happening now here.',
  'Catch the latest moves here.',
  'Track the latest developments here.',
  
  // Value-focused CTAs
  'See if it\'s worth your attention here.',
  'Check if it\'s time to act here.',
  'See the full picture here.',
  'Get the complete story here.',
  'Discover the real story here.',
  'See what the numbers say here.',
  
  // Curiosity-driven CTAs
  'See what happens next here.',
  'Find out why here.',
  'See the full analysis here.',
  'Get the inside scoop here.',
  'See what the experts say here.',
  'Discover the truth here.',
  
  // Generic but varied CTAs
  'Click here for more.',
  'Learn more here.',
  'Get the details here.',
  'See the full data here.',
  'Check it out here.',
  'Explore further here.'
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
      `${symbol} is absolutely crushing it today with explosive momentum.`,
      `${symbol} shares are on fire, posting monster gains.`,
      `${symbol} is making a massive move higher.`,
      `${symbol} stock is absolutely soaring right now.`,
      `${symbol} is the hottest stock in the market today.`,
      `${symbol} shares are exploding to the upside.`,
      `${symbol} is delivering jaw-dropping gains.`,
      `${symbol} stock is unstoppable today.`,
    ],
    slumping: [
      `${symbol} is getting absolutely hammered today.`,
      `${symbol} shares are in freefall mode.`,
      `${symbol} is getting destroyed by sellers.`,
      `${symbol} stock is bleeding red today.`,
      `${symbol} is the biggest loser in the market.`,
      `${symbol} shares are tanking hard.`,
      `${symbol} is getting crushed by bearish pressure.`,
      `${symbol} stock is in a tailspin.`,
    ],
    higher: [
      `${symbol} is quietly building momentum.`,
      `${symbol} shares are steadily climbing higher.`,
      `${symbol} is making a nice move to the upside.`,
      `${symbol} stock is gaining traction.`,
      `${symbol} is showing some bullish strength.`,
      `${symbol} shares are trending in the right direction.`,
      `${symbol} is picking up steam.`,
      `${symbol} stock is on the rise.`,
    ],
    underperforming: [
      `${symbol} is struggling to find buyers.`,
      `${symbol} shares are losing ground.`,
      `${symbol} is under selling pressure.`,
      `${symbol} stock is drifting lower.`,
      `${symbol} is having a rough session.`,
      `${symbol} shares are feeling the heat.`,
      `${symbol} is getting left behind.`,
      `${symbol} stock is in a slump.`,
    ],
    steady: [
      // Technical analysis focused
      `${symbol} is stuck in a rut.`,
      `${symbol} shares are going nowhere fast.`,
      `${symbol} is spinning its wheels.`,
      `${symbol} stock is in a coma.`,
      `${symbol} is playing dead.`,
      `${symbol} shares are frozen in time.`,
      `${symbol} is stuck in quicksand.`,
      `${symbol} stock is in a deep sleep.`,
      
      // Fundamental focused
      `${symbol} is a ${pe && pe < 15 ? 'dirt-cheap' : pe && pe > 25 ? 'overpriced' : 'fairly valued'} stock at ${pe ? pe.toFixed(1) : 'N/A'}x earnings.`,
      `${symbol} is a ${sector ? sector.toLowerCase() : 'market'} sector underdog.`,
      `${symbol} shares are ${volume && averageVolume && volume > averageVolume * 1.5 ? 'on fire' : 'dead'} with trading activity.`,
      `${symbol} is a ${industry ? industry.toLowerCase() : 'market'} space warrior.`,
      
      // Market position focused
      `${symbol} is ${fiftyTwoWeekHigh && fiftyTwoWeekLow && lastPrice ? ((lastPrice - fiftyTwoWeekLow) / (fiftyTwoWeekHigh - fiftyTwoWeekLow) > 0.7 ? 'flying high' : (lastPrice - fiftyTwoWeekLow) / (fiftyTwoWeekHigh - fiftyTwoWeekLow) < 0.3 ? 'crawling in the gutter' : 'muddling through') : 'muddling through'}.`,
      `${symbol} shares are ${fiftyTwoWeekHigh && lastPrice && lastPrice > fiftyTwoWeekHigh * 0.95 ? 'about to explode' : fiftyTwoWeekLow && lastPrice && lastPrice < fiftyTwoWeekLow * 1.05 ? 'about to implode' : 'just existing'}.`,
    ],
    high: [
      `${symbol} is about to blast off.`,
      `${symbol} shares are ready to rocket.`,
      `${symbol} is on the launchpad.`,
      `${symbol} stock is about to explode.`,
      `${symbol} is ready to soar.`,
      `${symbol} shares are about to take flight.`,
      `${symbol} is on the verge of liftoff.`,
      `${symbol} stock is about to go ballistic.`,
    ],
    low: [
      `${symbol} is on the brink of disaster.`,
      `${symbol} shares are in the danger zone.`,
      `${symbol} is flirting with catastrophe.`,
      `${symbol} stock is hanging by a thread.`,
      `${symbol} is teetering on the edge.`,
      `${symbol} shares are at rock bottom.`,
      `${symbol} is in the red zone.`,
      `${symbol} stock is circling the drain.`,
    ],
  };

  const steadyUpper = [
    `${symbol} is riding high.`,
    `${symbol} is on top of the world.`,
    `${symbol} is living large.`,
    `${symbol} is in the sweet spot.`,
    `${symbol} is sitting pretty.`,
    `${symbol} is on cloud nine.`,
    `${symbol} is in the zone.`,
    `${symbol} is on a roll.`
  ];
  const steadyLower = [
    `${symbol} is stuck in the basement.`,
    `${symbol} is trapped in the cellar.`,
    `${symbol} is languishing at the bottom.`,
    `${symbol} is stuck in the doldrums.`,
    `${symbol} is wallowing in the depths.`,
    `${symbol} is stuck in the gutter.`,
    `${symbol} is in the doghouse.`,
    `${symbol} is at the bottom of the barrel.`
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