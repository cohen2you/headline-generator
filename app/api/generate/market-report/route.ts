import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const POLYGON_API_KEY = process.env.POLYGON_API_KEY!;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface TickerSnapshot {
  ticker: string;
  todaysChangePerc: number;
  todaysChange: number;
  day?: {
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
    vw: number;
  };
  prevDay?: {
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
    vw: number;
  };
  lastTrade?: {
    p: number;
  };
}

interface MarketData {
  indices: TickerSnapshot[];
  sectors: TickerSnapshot[];
  gainers: TickerSnapshot[];
  losers: TickerSnapshot[];
}

// Major market indices
const INDICES = ['SPY', 'QQQ', 'DIA', 'IWM']; // S&P 500, Nasdaq, Dow, Russell 2000

// 11 Sector ETFs
const SECTORS = ['XLK', 'XLF', 'XLE', 'XLV', 'XLI', 'XLP', 'XLY', 'XLU', 'XLRE', 'XLC', 'XLB'];

export async function POST() {
  try {
    console.log('=== GENERATING MARKET REPORT ===');

    // Fetch all market data in parallel
    const [indicesRes, sectorsRes, gainersRes, losersRes] = await Promise.all([
      // Major indices
      fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${INDICES.join(',')}&apikey=${POLYGON_API_KEY}`),
      
      // Sector ETFs
      fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${SECTORS.join(',')}&apikey=${POLYGON_API_KEY}`),
      
      // Top gainers
      fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/gainers?apikey=${POLYGON_API_KEY}`),
      
      // Top losers
      fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/losers?apikey=${POLYGON_API_KEY}`)
    ]);

    const [indicesData, sectorsData, gainersData, losersData] = await Promise.all([
      indicesRes.json(),
      sectorsRes.json(),
      gainersRes.json(),
      losersRes.json()
    ]);

    console.log('Market data fetched:', {
      indices: indicesData.tickers?.length || 0,
      sectors: sectorsData.tickers?.length || 0,
      gainers: gainersData.tickers?.length || 0,
      losers: losersData.tickers?.length || 0
    });

    const marketData: MarketData = {
      indices: indicesData.tickers || [],
      sectors: sectorsData.tickers || [],
      gainers: (gainersData.tickers || []).slice(0, 10), // Top 10
      losers: (losersData.tickers || []).slice(0, 10)    // Top 10
    };

    // Filter gainers/losers to meaningful stocks (price > $5, volume > 1M)
    marketData.gainers = marketData.gainers.filter(t => 
      t.lastTrade?.p && t.lastTrade.p > 5 && 
      t.day?.v && t.day.v > 1000000 &&
      !t.ticker.endsWith('W') // Exclude warrants
    ).slice(0, 5);

    marketData.losers = marketData.losers.filter(t => 
      t.lastTrade?.p && t.lastTrade.p > 5 && 
      t.day?.v && t.day.v > 1000000 &&
      !t.ticker.endsWith('W') // Exclude warrants
    ).slice(0, 5);

    console.log('Filtered movers:', {
      gainers: marketData.gainers.length,
      losers: marketData.losers.length
    });

    // Generate comprehensive market report using AI
    const report = await generateMarketReport(marketData);

    return NextResponse.json({ report });

  } catch (error) {
    console.error('Error generating market report:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to generate market report.' 
    }, { status: 500 });
  }
}

// Helper to get Eastern Time components without manual DST math
function getEasternTimeParts(date: Date): { dayIndex: number; weekday: string; hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const weekday = parts.find(part => part.type === 'weekday')?.value ?? 'Sunday';
  const hourString = parts.find(part => part.type === 'hour')?.value ?? '00';
  const minuteString = parts.find(part => part.type === 'minute')?.value ?? '00';

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayIndex = dayNames.indexOf(weekday);

  return {
    dayIndex: dayIndex === -1 ? 0 : dayIndex,
    weekday,
    hour: parseInt(hourString, 10),
    minute: parseInt(minuteString, 10),
  };
}

async function generateMarketReport(data: MarketData): Promise<string> {
  try {
    // Get current day of week and time of day
    const { weekday: dayOfWeek, hour, minute } = getEasternTimeParts(new Date());
    const timeInMinutes = hour * 60 + minute;
    
    // Market hours: 9:30 AM (570) to 4:00 PM (960)
    let timeOfDay = '';
    if (timeInMinutes < 570) {
      timeOfDay = 'premarket';
    } else if (timeInMinutes >= 570 && timeInMinutes < 660) { // 9:30 AM - 11:00 AM
      timeOfDay = 'early morning';
    } else if (timeInMinutes >= 660 && timeInMinutes < 840) { // 11:00 AM - 2:00 PM
      timeOfDay = 'midday';
    } else if (timeInMinutes >= 840 && timeInMinutes < 960) { // 2:00 PM - 4:00 PM
      timeOfDay = 'afternoon';
    } else {
      timeOfDay = 'after-hours';
    }

    // Format indices data (percentage only, no prices)
    const indicesText = data.indices.map(idx => {
      const name = idx.ticker === 'SPY' ? 'S&P 500' : 
                   idx.ticker === 'QQQ' ? 'Nasdaq' : 
                   idx.ticker === 'DIA' ? 'Dow Jones' : 
                   idx.ticker === 'IWM' ? 'Russell 2000' : idx.ticker;
      const change = idx.todaysChangePerc || 0;
      return `${name} (${idx.ticker}): ${change > 0 ? '+' : ''}${change.toFixed(2)}%`;
    }).join('\n');

    // Format sector data - sort by performance and get top stocks for ALL sectors
    const sortedSectors = [...data.sectors].sort((a, b) => (b.todaysChangePerc || 0) - (a.todaysChangePerc || 0));
    
    // Map sector ETFs to major stock tickers (top holdings)
    const sectorStocks: Record<string, string[]> = {
      'XLK': ['AAPL', 'MSFT', 'NVDA', 'AVGO', 'ORCL'],  // Technology
      'XLF': ['BRK.B', 'JPM', 'V', 'MA', 'BAC'],        // Financials
      'XLE': ['XOM', 'CVX', 'COP', 'SLB', 'EOG'],       // Energy
      'XLV': ['LLY', 'UNH', 'JNJ', 'ABBV', 'MRK'],      // Healthcare
      'XLI': ['GE', 'CAT', 'RTX', 'HON', 'UNP'],        // Industrials
      'XLP': ['PG', 'COST', 'KO', 'PEP', 'WMT'],        // Consumer Staples
      'XLY': ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE'],      // Consumer Discretionary
      'XLU': ['NEE', 'DUK', 'SO', 'D', 'AEP'],          // Utilities
      'XLRE': ['PLD', 'AMT', 'EQIX', 'PSA', 'SPG'],     // Real Estate
      'XLC': ['META', 'GOOGL', 'GOOG', 'NFLX', 'DIS'],  // Communication
      'XLB': ['LIN', 'APD', 'SHW', 'ECL', 'NEM']        // Materials
    };
    
    // Fetch data for major stocks in ALL sectors
    const stocksToFetch = sortedSectors
      .map(s => sectorStocks[s.ticker] || [])
      .flat(); // Get all stocks from all sectors
    
    let sectorLeadersText = '';
    if (stocksToFetch.length > 0) {
      try {
        const stocksRes = await fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${stocksToFetch.join(',')}&apikey=${POLYGON_API_KEY}`);
        const stocksData = await stocksRes.json();
        
        if (stocksData.tickers) {
          // Get company names
          const stockDetailsRes = await fetch(`https://api.polygon.io/v3/reference/tickers?ticker=${stocksToFetch.join(',')}&limit=50&apikey=${POLYGON_API_KEY}`);
          const stockDetailsData = await stockDetailsRes.json();
          const stockNameMap: Record<string, string> = {};
          if (stockDetailsData.results) {
            stockDetailsData.results.forEach((t: { ticker: string; name?: string }) => {
              stockNameMap[t.ticker] = t.name || t.ticker;
            });
            console.log('Company names fetched:', Object.keys(stockNameMap).length, 'stocks');
            console.log('Sample names:', Object.entries(stockNameMap).slice(0, 5));
          }
          
          // Format leaders for each key sector - sorted by performance
          const formatSectorLeaders = (sectorTicker: string, sectorName: string, sectorChange: number) => {
            const sectorStockTickers = sectorStocks[sectorTicker] || [];
            let sectorStockData = stocksData.tickers.filter((t: TickerSnapshot) => 
              sectorStockTickers.includes(t.ticker)
            );
            
            // Sort by performance: 
            // - For positive sectors, show biggest gainers
            // - For negative sectors, show biggest decliners
            sectorStockData = sectorStockData.sort((a: TickerSnapshot, b: TickerSnapshot) => {
              const aChange = a.todaysChangePerc || 0;
              const bChange = b.todaysChangePerc || 0;
              return sectorChange >= 0 ? bChange - aChange : aChange - bChange;
            }).slice(0, 3); // Top 3 based on performance
            
            console.log(`Sector ${sectorName} (${sectorTicker}):`, {
              sectorChange: sectorChange.toFixed(2) + '%',
              expectedTickers: sectorStockTickers,
              foundStocks: sectorStockData.map((s: TickerSnapshot) => `${s.ticker} ${(s.todaysChangePerc || 0).toFixed(1)}%`),
              count: sectorStockData.length
            });
            
            if (sectorStockData.length > 0) {
              const stocksInfo = sectorStockData.map((s: TickerSnapshot) => {
                const name = stockNameMap[s.ticker] || s.ticker;
                const change = s.todaysChangePerc || 0;
                return `**${name}** (${s.ticker}) ${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
              }).join(', ');
              return `${sectorName}: ${stocksInfo}`;
            }
            return '';
          };
          
          // Format leaders for ALL sectors
          const getSectorName = (ticker: string) => {
            return ticker === 'XLK' ? 'Technology' :
                   ticker === 'XLF' ? 'Financials' :
                   ticker === 'XLE' ? 'Energy' :
                   ticker === 'XLV' ? 'Healthcare' :
                   ticker === 'XLI' ? 'Industrials' :
                   ticker === 'XLP' ? 'Consumer Staples' :
                   ticker === 'XLY' ? 'Consumer Discretionary' :
                   ticker === 'XLU' ? 'Utilities' :
                   ticker === 'XLRE' ? 'Real Estate' :
                   ticker === 'XLC' ? 'Communication Services' :
                   ticker === 'XLB' ? 'Materials' : ticker;
          };
          
          const allSectorLeaders: string[] = [];
          sortedSectors.forEach(sector => {
            const sectorName = getSectorName(sector.ticker);
            const sectorChange = sector.todaysChangePerc || 0;
            const leaders = formatSectorLeaders(sector.ticker, sectorName, sectorChange);
            if (leaders) {
              allSectorLeaders.push(leaders);
            }
          });
          
          if (allSectorLeaders.length > 0) {
            sectorLeadersText = '\n\nMAJOR STOCKS IN EACH SECTOR:\n' + allSectorLeaders.join('\n');
          }
        }
      } catch (error) {
        console.error('Error fetching sector leaders:', error);
      }
    }
    
    const sectorsText = sortedSectors.map(sector => {
      const name = sector.ticker === 'XLK' ? 'Technology' :
                   sector.ticker === 'XLF' ? 'Financials' :
                   sector.ticker === 'XLE' ? 'Energy' :
                   sector.ticker === 'XLV' ? 'Healthcare' :
                   sector.ticker === 'XLI' ? 'Industrials' :
                   sector.ticker === 'XLP' ? 'Consumer Staples' :
                   sector.ticker === 'XLY' ? 'Consumer Discretionary' :
                   sector.ticker === 'XLU' ? 'Utilities' :
                   sector.ticker === 'XLRE' ? 'Real Estate' :
                   sector.ticker === 'XLC' ? 'Communication Services' :
                   sector.ticker === 'XLB' ? 'Materials' : sector.ticker;
      const change = sector.todaysChangePerc || 0;
      return `${name} (${sector.ticker}): ${change > 0 ? '+' : ''}${change.toFixed(2)}%`;
    }).join('\n');

    // Fetch exchange and company name info for gainers and losers
    const allMovers = [...data.gainers, ...data.losers];
    const moverTickers = allMovers.map(s => s.ticker).join(',');
    
          const exchangeMap: Record<string, string> = {};
          const companyNameMap: Record<string, string> = {};
    if (moverTickers) {
      try {
        const detailsRes = await fetch(`https://api.polygon.io/v3/reference/tickers?ticker=${moverTickers}&limit=100&apikey=${POLYGON_API_KEY}`);
        const detailsData = await detailsRes.json();
        if (detailsData.results) {
          detailsData.results.forEach((ticker: { ticker: string; primary_exchange?: string; name?: string }) => {
            const exchange = ticker.primary_exchange === 'XNAS' ? 'NASDAQ' :
                           ticker.primary_exchange === 'XNYS' ? 'NYSE' :
                           ticker.primary_exchange === 'ARCX' ? 'NYSE ARCA' :
                           ticker.primary_exchange || 'NASDAQ';
            exchangeMap[ticker.ticker] = exchange;
            companyNameMap[ticker.ticker] = ticker.name || ticker.ticker;
          });
        }
      } catch (error) {
        console.error('Error fetching ticker details:', error);
      }
    }

    // Format top gainers with company name and exchange
    const gainersText = data.gainers.map((stock, idx) => {
      const companyName = companyNameMap[stock.ticker] || stock.ticker;
      const price = stock.lastTrade?.p || stock.day?.c || 0;
      const change = stock.todaysChangePerc || 0;
      const volume = stock.day?.v || 0;
      const prevVolume = stock.prevDay?.v || 0;
      const volumeChange = prevVolume > 0 ? ((volume - prevVolume) / prevVolume * 100).toFixed(0) : 'N/A';
      const exchange = exchangeMap[stock.ticker] || 'NASDAQ';
      return `${idx + 1}. ${companyName} (${exchange}: ${stock.ticker}) - +${change.toFixed(1)}% to $${price.toFixed(2)}, Volume: ${(volume / 1000000).toFixed(1)}M (${volumeChange}% vs prev day)`;
    }).join('\n');

    // Format top losers with company name and exchange
    const losersText = data.losers.map((stock, idx) => {
      const companyName = companyNameMap[stock.ticker] || stock.ticker;
      const price = stock.lastTrade?.p || stock.day?.c || 0;
      const change = stock.todaysChangePerc || 0;
      const volume = stock.day?.v || 0;
      const prevVolume = stock.prevDay?.v || 0;
      const volumeChange = prevVolume > 0 ? ((volume - prevVolume) / prevVolume * 100).toFixed(0) : 'N/A';
      const exchange = exchangeMap[stock.ticker] || 'NASDAQ';
      return `${idx + 1}. ${companyName} (${exchange}: ${stock.ticker}) - ${change.toFixed(1)}% to $${price.toFixed(2)}, Volume: ${(volume / 1000000).toFixed(1)}M (${volumeChange}% vs prev day)`;
    }).join('\n');

    // Calculate market breadth
    const advancers = data.sectors.filter(s => (s.todaysChangePerc || 0) > 0).length;
    const decliners = data.sectors.filter(s => (s.todaysChangePerc || 0) < 0).length;
    const breadthRatio = decliners > 0 ? (advancers / decliners).toFixed(1) : 'N/A';

    const prompt = `You are a professional market analyst writing a comprehensive daily market report. Create a flowing, conversational narrative that synthesizes all the market data provided below.

DAY: ${dayOfWeek}
TIME OF DAY: ${timeOfDay}

MAJOR INDICES (percentage change only):
${indicesText}

SECTOR PERFORMANCE (sorted by performance):
${sectorsText}
${sectorLeadersText}

MARKET BREADTH:
Sectors advancing: ${advancers}
Sectors declining: ${decliners}
Advance/Decline Ratio: ${breadthRatio}

TOP GAINERS (filtered for meaningful stocks, includes exchange):
${gainersText}

TOP LOSERS (filtered for meaningful stocks, includes exchange):
${losersText}

TASK: Write a comprehensive, conversational market report that flows naturally and tells the story of the market's performance on ${dayOfWeek}.

STRUCTURE:
1. Opening paragraph: Start with time context ("${timeOfDay === 'early morning' ? 'In early morning trading' : timeOfDay === 'midday' ? 'At midday' : timeOfDay === 'afternoon' ? 'In afternoon trading' : 'In ' + timeOfDay + ' trading'} on ${dayOfWeek}...") then overall market direction and key indices performance (2-3 sentences)
2. Sector analysis: Discuss the top 2-3 leading sectors and bottom 1-2 lagging sectors. For EACH sector mentioned, include 2-3 specific major stocks driving the move with their performance (e.g., "Technology led, up 1.5%, driven by strong gains in **Apple** (AAPL) +2.1%, **Microsoft** (MSFT) +1.8%, and **Nvidia** (NVDA) +2.5%"). Use bold markdown (**Name**) for ALL company names and include full ticker symbols. This should be 3-4 sentences total covering multiple sectors (2-3 sentences)
3. Market breadth: What the advance/decline ratio tells us about market health (1-2 sentences)
4. Notable gainers: Format as "**Company Name** (EXCHANGE: TICKER)" - e.g., "**Omeros Corporation** (NASDAQ: OMER)" - Use bold markdown for company names. Highlight 3-5 with volume context (2-3 sentences)
5. Notable losers: Format as "**Company Name** (EXCHANGE: TICKER)" - e.g., "**Tesla** (NASDAQ: TSLA)" - Use bold markdown for company names. Highlight 3-5 with volume context (2-3 sentences)
6. Market outlook: What current action suggests about sentiment and direction (2-3 sentences)

CRITICAL RULES:
- START with time of day context to confirm markets are actively trading
- Format tickers as "(EXCHANGE: TICKER)" - use the exchange provided in the data
- ALWAYS use markdown bold **Full Company Name** for every company mentioned - use the EXACT full name from the data (e.g., "**Broadcom Inc.** (NASDAQ: AVGO)", "**Microsoft Corporation** (NASDAQ: MSFT)", "**Apple Inc.** (NASDAQ: AAPL)")
- DO NOT include prices for indices - only percentage changes
- Write in flowing paragraphs - MAXIMUM 2-3 sentences per paragraph
- Use ${dayOfWeek} consistently - NEVER use "today" or "yesterday"
- Be conversational but professional - avoid overly formal language
- Connect the dots - explain what sector rotation or movers suggest about sentiment
- When mentioning volume multiples (e.g., "100x previous volume"), express it naturally (e.g., "more than 100 times")
- DO NOT use summary phrases like "In summary", "In conclusion", "Overall"
- Keep total length to 6-8 short paragraphs
- Use markdown bold (**text**) for company names, but plain text for everything else
- Make it read like a professional market commentary

Write the complete market report now:`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.4,
    });

    return completion.choices[0].message?.content?.trim() || 'Market report unavailable.';

  } catch (error) {
    console.error('Error generating market report:', error);
    return 'Failed to generate market report due to an error.';
  }
}

