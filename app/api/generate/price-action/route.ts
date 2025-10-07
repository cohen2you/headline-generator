// Force update: Market status summary logic is present (premarket/after-hours/closed in summary line)
// Force new deployment - Render was using old cached version
// Trigger webhook deployment - Render stuck on old build
// Force fresh build to clear TypeScript cache
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Polygon API interfaces
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type PolygonSnapshot = {
  status: string;
  request_id: string;
  ticker?: {
    ticker: string;
    todaysChange: number;
    todaysChangePerc: number;
    day?: {
      o: number; // open
      h: number; // high
      l: number; // low
      c: number; // close
      v: number; // volume
    };
    prevDay?: {
      o: number;
      h: number;
      l: number;
      c: number;
      v: number;
    };
    lastTrade?: {
      p: number; // price
      s: number; // size
      t: number; // timestamp
    };
    lastQuote?: {
      p: number; // bid/ask price
      s: number; // size
      t: number; // timestamp
    };
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type PolygonTickerOverview = {
  count: number;
  request_id: string;
  results?: {
    active: boolean;
    name: string;
    market_cap?: number;
    sic_description?: string;
    description?: string;
    primary_exchange?: string;
    currency_name: string;
    ticker: string;
  type?: string;
    homepage_url?: string;
    phone_number?: string;
    address?: {
      address1?: string;
      city?: string;
      state?: string;
      postal_code?: string;
    };
    branding?: {
      logo_url?: string;
      icon_url?: string;
    };
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type PolygonHistoricalData = {
  status: string;
  request_id: string;
  results?: Array<{
    v: number; // volume
    vw: number; // volume weighted average price
    o: number; // open
    c: number; // close
    h: number; // high
    l: number; // low
    t: number; // timestamp
    n: number; // number of transactions
  }>;
}

interface PolygonRSI {
  status: string;
  request_id: string;
  results?: {
    underlying?: {
      aggregates?: Array<{
        c: number;
        h: number;
        l: number;
        n: number;
        o: number;
        t: number;
        v: number;
        vw: number;
      }>;
    };
    values?: Array<{
      timestamp: number;
      value: number;
    }>;
  };
}

interface PolygonSMA {
  status: string;
  request_id: string;
  results?: {
    underlying?: {
      aggregates?: Array<{
        c: number;
        h: number;
        l: number;
        n: number;
        o: number;
        t: number;
        v: number;
        vw: number;
      }>;
    };
    values?: Array<{
      timestamp: number;
      value: number;
    }>;
  };
}

interface PolygonEMA {
  status: string;
  request_id: string;
  results?: {
    underlying?: {
      aggregates?: Array<{
        c: number;
        h: number;
        l: number;
        n: number;
        o: number;
        t: number;
        v: number;
        vw: number;
      }>;
    };
    values?: Array<{
      timestamp: number;
      value: number;
    }>;
  };
}

interface PolygonData {
  // From snapshot endpoint
  currentPrice: number;
  todaysChange: number;
  todaysChangePerc: number;
  previousClose: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  close: number;
  
  // From ticker overview endpoint
  companyName: string;
  marketCap: number;
  industry: string;
  description: string;
  primaryExchange: string;
  currency: string;
  
  // Calculated from historical data
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  
  // Technical indicators
  rsi?: number;
  rsiSignal?: 'overbought' | 'oversold' | 'neutral';
  sma50?: number;
  sma200?: number;
  ema50?: number;
  ema200?: number;
  
  // For compatibility with existing code
  symbol: string;
  name: string;
  changePercent: number;
  lastTradePrice: number;
  previousClosePrice: number;
  sector?: string;
}

interface BenzingaQuote {
  symbol?: string;
  name?: string;
  changePercent?: number;
  lastTradePrice?: number;
  closeDate?: string;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  fiftyDayAveragePrice?: number;
  hundredDayAveragePrice?: number;
  twoHundredDayAveragePrice?: number;
  previousClosePrice?: number;
  volume?: number;
  averageVolume?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  marketCap?: number;
  pe?: number;
  forwardPE?: number;
  sharesOutstanding?: number;
  sharesFloat?: number;
  ethPrice?: number;
  ethVolume?: number;
  ethTime?: number;
  change?: number;
  previousCloseDate?: string;
  lastTradeTime?: number;
  bidPrice?: number;
  askPrice?: number;
  bidSize?: number;
  askSize?: number;
  size?: number;
  bidTime?: number;
  askTime?: number;
  exchange?: string;
  isoExchange?: string;
  bzExchange?: string;
  type?: string;
  sector?: string;
  industry?: string;
  currency?: string;
  dividendYield?: number;
  dividend?: number;
}

interface HistoricalData {
  symbol: string;
  monthlyReturn?: number;
  ytdReturn?: number;
  threeMonthReturn?: number;
  sixMonthReturn?: number;
  oneYearReturn?: number;
}

// Utility function to truncate to two decimal places
function truncateToTwoDecimals(num: number): number {
  return Math.trunc(num * 100) / 100;
}

// Helper to format price with truncation or N/A
function formatPrice(val: number | undefined): string {
  return typeof val === 'number' ? truncateToTwoDecimals(val).toFixed(2) : 'N/A';
}

// Helper function to get date strings for API calls
function getOneYearAgo(): string {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  return oneYearAgo.toISOString().split('T')[0];
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

// Function to fetch RSI (Relative Strength Index) data
async function fetchRSI(symbol: string): Promise<{ rsi: number | undefined; signal: 'overbought' | 'oversold' | 'neutral' }> {
  try {
    console.log(`=== FETCHING RSI DATA FOR ${symbol} ===`);
    
    // Use previous trading day's data since end-of-day indicators aren't available for current day
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const rsiUrl = `https://api.polygon.io/v1/indicators/rsi/${symbol}?timestamp=${yesterdayStr}&timespan=day&adjusted=true&window=14&series_type=close&order=desc&limit=1&apikey=${process.env.POLYGON_API_KEY}`;
    
    const response = await fetch(rsiUrl);
    
    if (!response.ok) {
      console.log(`RSI API returned status ${response.status} for ${symbol}`);
      return { rsi: undefined, signal: 'neutral' };
    }
    
    const data: PolygonRSI = await response.json();
    
    if (data.results?.values && data.results.values.length > 0) {
      const rsiValue = data.results.values[0].value;
      
      // Determine RSI signal
      let signal: 'overbought' | 'oversold' | 'neutral' = 'neutral';
      if (rsiValue >= 70) {
        signal = 'overbought';
      } else if (rsiValue <= 30) {
        signal = 'oversold';
      }
      
      console.log(`RSI for ${symbol}: ${rsiValue.toFixed(2)} (${signal})`);
      
      return { rsi: rsiValue, signal };
    }
    
    console.log(`No RSI data available for ${symbol}`);
    return { rsi: undefined, signal: 'neutral' };
  } catch (error) {
    console.error(`Error fetching RSI for ${symbol}:`, error);
    return { rsi: undefined, signal: 'neutral' };
  }
}

// Function to fetch SMA (Simple Moving Average) data
async function fetchSMA(symbol: string, window: number): Promise<number | undefined> {
  try {
    // Use previous trading day's data since end-of-day indicators aren't available for current day
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const smaUrl = `https://api.polygon.io/v1/indicators/sma/${symbol}?timestamp=${yesterdayStr}&timespan=day&adjusted=true&window=${window}&series_type=close&order=desc&limit=1&apikey=${process.env.POLYGON_API_KEY}`;
    
    const response = await fetch(smaUrl);
    
    if (!response.ok) {
      console.log(`SMA-${window} API returned status ${response.status} for ${symbol}`);
      return undefined;
    }
    
    const data: PolygonSMA = await response.json();
    
    if (data.results?.values && data.results.values.length > 0) {
      const smaValue = data.results.values[0].value;
      console.log(`SMA-${window} for ${symbol}: ${smaValue.toFixed(2)}`);
      return smaValue;
    }
    
    console.log(`No SMA-${window} data available for ${symbol}`);
    return undefined;
  } catch (error) {
    console.error(`Error fetching SMA-${window} for ${symbol}:`, error);
    return undefined;
  }
}

// Function to fetch EMA (Exponential Moving Average) data
async function fetchEMA(symbol: string, window: number): Promise<number | undefined> {
  try {
    // Use previous trading day's data since end-of-day indicators aren't available for current day
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const emaUrl = `https://api.polygon.io/v1/indicators/ema/${symbol}?timestamp=${yesterdayStr}&timespan=day&adjusted=true&window=${window}&series_type=close&order=desc&limit=1&apikey=${process.env.POLYGON_API_KEY}`;
    
    const response = await fetch(emaUrl);
    
    if (!response.ok) {
      console.log(`EMA-${window} API returned status ${response.status} for ${symbol}`);
      return undefined;
    }
    
    const data: PolygonEMA = await response.json();
    
    if (data.results?.values && data.results.values.length > 0) {
      const emaValue = data.results.values[0].value;
      console.log(`EMA-${window} for ${symbol}: ${emaValue.toFixed(2)}`);
      return emaValue;
    }
    
    console.log(`No EMA-${window} data available for ${symbol}`);
    return undefined;
  } catch (error) {
    console.error(`Error fetching EMA-${window} for ${symbol}:`, error);
    return undefined;
  }
}

// Main function to fetch all Polygon data for a ticker
async function fetchPolygonData(symbol: string): Promise<PolygonData> {
  try {
    console.log(`=== FETCHING POLYGON DATA FOR ${symbol} ===`);
    
    const [snapshotRes, overviewRes, historicalRes, rsiData, sma50, sma200, ema50, ema200] = await Promise.all([
      // Get real-time data
      fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}?apikey=${process.env.POLYGON_API_KEY}`),
      
      // Get company information
      fetch(`https://api.polygon.io/v3/reference/tickers/${symbol}?apikey=${process.env.POLYGON_API_KEY}`),
      
      // Get 1-year historical data for 52-week range
      fetch(`https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${getOneYearAgo()}/${getToday()}?adjusted=true&apikey=${process.env.POLYGON_API_KEY}`),
      
      // Get technical indicators
      fetchRSI(symbol),
      fetchSMA(symbol, 50),
      fetchSMA(symbol, 200),
      fetchEMA(symbol, 50),
      fetchEMA(symbol, 200)
    ]);

    const [snapshot, overview, historical] = await Promise.all([
      snapshotRes.json(),
      overviewRes.json(),
      historicalRes.json()
    ]);

    console.log('Polygon API responses received:', {
      snapshot: !!snapshot.ticker,
      overview: !!overview.results,
      historical: !!historical.results,
      rsi: rsiData.rsi !== undefined,
      sma50: sma50 !== undefined,
      sma200: sma200 !== undefined,
      ema50: ema50 !== undefined,
      ema200: ema200 !== undefined
    });

    // Calculate 52-week high/low from historical data
    let fiftyTwoWeekHigh = 0;
    let fiftyTwoWeekLow = Infinity;
    
    if (historical.results && historical.results.length > 0) {
      historical.results.forEach((bar: { h: number; l: number }) => {
        fiftyTwoWeekHigh = Math.max(fiftyTwoWeekHigh, bar.h);
        fiftyTwoWeekLow = Math.min(fiftyTwoWeekLow, bar.l);
      });
    }

    // Extract data from snapshot
    const tickerData = snapshot.ticker;
    const currentPrice = tickerData?.lastTrade?.p || tickerData?.day?.c || 0;
    const todaysChange = tickerData?.todaysChange || 0;
    const todaysChangePerc = tickerData?.todaysChangePerc || 0;
    const previousClose = tickerData?.prevDay?.c || 0;
    const volume = tickerData?.day?.v || 0;
    const open = tickerData?.day?.o || 0;
    const high = tickerData?.day?.h || 0;
    const low = tickerData?.day?.l || 0;
    const close = tickerData?.day?.c || 0;

    // Extract data from overview
    const overviewData = overview.results;
    const companyName = overviewData?.name || symbol;
    const marketCap = overviewData?.market_cap || 0;
    const industry = overviewData?.sic_description || 'N/A';
    const description = overviewData?.description || '';
    const primaryExchange = overviewData?.primary_exchange || 'N/A';
    const currency = overviewData?.currency_name || 'USD';

    const polygonData: PolygonData = {
      // Snapshot data
      currentPrice,
      todaysChange,
      todaysChangePerc,
      previousClose,
      volume,
      open,
      high,
      low,
      close,
      
      // Overview data
      companyName,
      marketCap,
      industry,
      description,
      primaryExchange,
      currency,
      
      // Calculated data
      fiftyTwoWeekHigh,
      fiftyTwoWeekLow: fiftyTwoWeekLow === Infinity ? 0 : fiftyTwoWeekLow,
      
      // Technical indicators
      rsi: rsiData.rsi,
      rsiSignal: rsiData.signal,
      sma50,
      sma200,
      ema50,
      ema200,
      
      // For compatibility with existing code
      symbol,
      name: companyName,
      changePercent: todaysChangePerc,
      lastTradePrice: currentPrice,
      previousClosePrice: previousClose,
      sector: industry // Using industry as sector for now
    };

    console.log('Polygon data processed:', {
      symbol: polygonData.symbol,
      companyName: polygonData.companyName,
      currentPrice: polygonData.currentPrice,
      changePercent: polygonData.changePercent,
      fiftyTwoWeekHigh: polygonData.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: polygonData.fiftyTwoWeekLow
    });

    return polygonData;
  } catch (error) {
    console.error(`Error fetching Polygon data for ${symbol}:`, error);
    throw error;
  }
}

// Technical analysis for Benzinga API data
async function generateTechnicalAnalysisBenzinga(quote: BenzingaQuote, sectorComparison?: BenzingaQuote[]): Promise<string> {
  try {
    let sectorComparisonText = '';
    if (sectorComparison && sectorComparison.length > 0) {
      const comparisonData = sectorComparison.map(stock => {
        const formattedMarketCap = typeof stock.marketCap === 'number'
          ? (stock.marketCap >= 1000000000000
              ? (stock.marketCap / 1000000000000).toFixed(2) + 'T'
              : (stock.marketCap / 1000000000).toFixed(2) + 'B')
          : 'N/A';
        const volume = typeof stock.volume === 'number' ? stock.volume.toLocaleString() : 'N/A';
        const changePercent = typeof stock.changePercent === 'number' ? `${stock.changePercent.toFixed(2)}%` : 'N/A';
        const pe = typeof stock.pe === 'number' && stock.pe > 0 ? stock.pe.toFixed(2) : 'N/A';
        const symbol = typeof stock.symbol === 'string' ? stock.symbol : 'N/A';
        return `${symbol}: Price $${formatPrice(stock.lastTradePrice)}, Change ${changePercent}, Volume ${volume}, Market Cap ${formattedMarketCap}, P/E: ${pe}`;
      }).join('\n');
      
      const isSectorETF = sectorComparison.some(stock => ['XLI', 'XLF', 'XLK', 'XLV', 'XLE', 'XLP', 'XLY'].includes(stock.symbol || ''));
      const comparisonType = isSectorETF ? 'Sector ETF Comparison' : 'Sector Comparison';
      sectorComparisonText = `\n\n${comparisonType}:\n${comparisonData}`;
    }

    const prompt = `You are a technical analyst providing concise market insights. Analyze this stock data and provide technical analysis broken into separate paragraphs.

Stock: ${quote.symbol} (${quote.name})
Current Price: $${formatPrice(quote.lastTradePrice)}
Daily Change: ${quote.changePercent}%

Technical Indicators:
- 50-day Moving Average: $${formatPrice(quote.fiftyDayAveragePrice)}
- 200-day Moving Average: $${formatPrice(quote.twoHundredDayAveragePrice)}
- 52-week Range: $${formatPrice(quote.fiftyTwoWeekLow)} - $${formatPrice(quote.fiftyTwoWeekHigh)}
- Volume: ${quote.volume?.toLocaleString()}

Intraday Data:
- Open: $${formatPrice(quote.open)}
- High: $${formatPrice(quote.high)}
- Low: $${formatPrice(quote.low)}
- Close: $${formatPrice(quote.close)}

Valuation Metrics:
- Market Cap: $${quote.marketCap ? (quote.marketCap >= 1000000000000 ? (quote.marketCap / 1000000000000).toFixed(2) + 'T' : (quote.marketCap / 1000000000).toFixed(2) + 'B') : 'N/A'}
- P/E Ratio: ${typeof quote.pe === 'number' && quote.pe > 0 ? quote.pe.toFixed(2) : 'N/A'}${sectorComparisonText}

Provide analysis in exactly this format with proper spacing:

TECHNICAL MOMENTUM:
[2-3 sentences about price momentum, moving averages, trend strength, support/resistance]

VOLUME & INTRADAY:
[2-3 sentences about volume patterns, intraday range, session momentum]

VALUATION CONTEXT:
[2-3 sentences about P/E ratios, market cap, valuation implications]${sectorComparison && sectorComparison.length > 0 ? `

SECTOR COMPARISON:
[2-3 sentences comparing valuation metrics to sector peers, focusing on P/E ratios and market positioning]` : ''}

IMPORTANT: Use exactly the headers shown above (no bold formatting). Put each section on its own line with proper spacing. Do not add extra periods at the end. Do not end any paragraph with double periods (..). Keep each paragraph concise and professional for financial news.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
      temperature: 0.3,
    });

    return completion.choices[0].message?.content?.trim() || '';
  } catch (error) {
    console.error('Error generating technical analysis:', error);
    return '';
  }
}

// Technical analysis for Polygon API data
async function generateTechnicalAnalysis(quote: PolygonData, sectorComparison?: PolygonData[]): Promise<string> {
  try {
    let sectorComparisonText = '';
    if (sectorComparison && sectorComparison.length > 0) {
      // Patch sector peers to clarify P/E status
      const patchedSectorComparison = sectorComparison.map(stock => {
        const stockAny = stock as PolygonData & { pe?: number };
        let patchedPE: string | number;
        if (typeof stockAny.pe === 'number' && stockAny.pe > 0) {
          patchedPE = stockAny.pe;
        } else {
          patchedPE = 'N/A (unprofitable)';
        }
        return { ...stock, pe: patchedPE };
      });
      const comparisonData = patchedSectorComparison.map(stock => {
        const formattedMarketCap = typeof stock.marketCap === 'number'
          ? (stock.marketCap >= 1000000000000
              ? (stock.marketCap / 1000000000000).toFixed(2) + 'T'
              : (stock.marketCap / 1000000000).toFixed(2) + 'B')
          : 'N/A';
        const volume = typeof stock.volume === 'number' ? stock.volume.toLocaleString() : 'N/A';
        const changePercent = typeof stock.changePercent === 'number' ? `${stock.changePercent.toFixed(2)}%` : 'N/A';
        const pe = typeof stock.pe === 'number' ? stock.pe.toString() : (typeof stock.pe === 'string' ? stock.pe : 'N/A');
        const symbol = typeof stock.symbol === 'string' ? stock.symbol : 'N/A';
        return `${symbol}: Price $${formatPrice(stock.lastTradePrice)}, Change ${changePercent}, Volume ${volume}, Market Cap ${formattedMarketCap}, P/E: ${pe}`;
      }).join('\n');
      // Determine if we're comparing against sector peers or sector ETFs
      const isSectorETF = patchedSectorComparison.some(stock => ['XLI', 'XLF', 'XLK', 'XLV', 'XLE', 'XLP', 'XLY'].includes(stock.symbol || ''));
      const comparisonType = isSectorETF ? 'Sector ETF Comparison' : 'Sector Comparison';
      sectorComparisonText = `\n\n${comparisonType}:\n${comparisonData}`;
    }

    const prompt = `You are a technical analyst providing concise market insights. Analyze this stock data and provide technical analysis broken into separate paragraphs.

Stock: ${quote.symbol} (${quote.name})
Current Price: $${formatPrice(quote.lastTradePrice)}
Daily Change: ${quote.changePercent}%

Technical Indicators:
- 50-day Moving Average: $${formatPrice(quote.sma50)}
- 200-day Moving Average: $${formatPrice(quote.sma200)}
- 52-week Range: $${formatPrice(quote.fiftyTwoWeekLow)} - $${formatPrice(quote.fiftyTwoWeekHigh)}
- Volume: ${quote.volume?.toLocaleString()}

Intraday Data:
- Open: $${formatPrice(quote.open)}
- High: $${formatPrice(quote.high)}
- Low: $${formatPrice(quote.low)}
- Close: $${formatPrice(quote.close)}

Valuation Metrics:
- Market Cap: $${quote.marketCap ? (quote.marketCap >= 1000000000000 ? (quote.marketCap / 1000000000000).toFixed(2) + 'T' : (quote.marketCap / 1000000000).toFixed(2) + 'B') : 'N/A'}${sectorComparisonText}

Note: If a company's P/E is listed as N/A (unprofitable), it means the company has negative earnings and should not be compared on this metric. Do not invent or estimate P/E values for such companies.

Provide analysis in exactly this format with proper spacing:

TECHNICAL MOMENTUM:
[2-3 sentences about price momentum, moving averages, trend strength, support/resistance]

VOLUME & INTRADAY:
[2-3 sentences about volume patterns, intraday range, session momentum]

VALUATION CONTEXT:
[2-3 sentences about P/E ratios, market cap, valuation implications]${sectorComparison && sectorComparison.length > 0 ? `

SECTOR COMPARISON:
[2-3 sentences comparing valuation metrics to sector peers, focusing on P/E ratios and market positioning]` : ''}${sectorComparison && sectorComparison.some(stock => ['XLI', 'XLF', 'XLK', 'XLV', 'XLE', 'XLP', 'XLY'].includes(stock.symbol || '')) ? `

SECTOR ETF COMPARISON:
[2-3 sentences comparing price performance, volume, and market positioning to relevant sector ETFs, focusing on relative strength and sector momentum]` : ''}

IMPORTANT: Use exactly the headers shown above (no bold formatting). Put each section on its own line with proper spacing. Do not add extra periods at the end. Do not end any paragraph with double periods (..). Keep each paragraph concise and professional for financial news. Focus on specific metrics and avoid generic commentary like "suggests a mix of optimism and caution" or similar vague statements.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
      temperature: 0.3,
    });

    return completion.choices[0].message?.content?.trim() || '';
  } catch (error) {
    console.error('Error generating technical analysis:', error);
    return '';
  }
}

// Define sector peer mappings for major stocks
const sectorPeers: { [key: string]: string[] } = {
  // Technology
  'AAPL': ['MSFT', 'GOOGL'],
  'MSFT': ['AAPL', 'GOOGL'],
  'GOOGL': ['AAPL', 'MSFT'],
  'META': ['GOOGL', 'AAPL'],
  'AMZN': ['MSFT', 'GOOGL'],
  'TSLA': ['NIO', 'RIVN'],
  'NVDA': ['AMD', 'INTC'],
  'AMD': ['NVDA', 'INTC'],
  'INTC': ['AMD', 'NVDA'],
  
  // Financial
  'JPM': ['BAC', 'WFC'],
  'BAC': ['JPM', 'WFC'],
  'WFC': ['JPM', 'BAC'],
  'GS': ['MS', 'JPM'],
  'MS': ['GS', 'JPM'],
  
  // Healthcare
  'JNJ': ['PFE', 'UNH'],
  'PFE': ['JNJ', 'UNH'],
  'UNH': ['JNJ', 'PFE'],
  'ABBV': ['JNJ', 'PFE'],
  
  // Consumer
  'KO': ['PEP', 'PG'],
  'PEP': ['KO', 'PG'],
  'PG': ['KO', 'PEP'],
  'WMT': ['TGT', 'COST'],
  'TGT': ['WMT', 'COST'],
  'COST': ['WMT', 'TGT'],
  
  // Energy
  'XOM': ['CVX', 'COP'],
  'CVX': ['XOM', 'COP'],
  'COP': ['XOM', 'CVX'],
  
  // Industrial
  'BA': ['LMT', 'RTX'],
  'LMT': ['BA', 'RTX'],
  'RTX': ['BA', 'LMT'],
  
  // Communication
  'NFLX': ['DIS', 'CMCSA'],
  'DIS': ['NFLX', 'CMCSA'],
  'CMCSA': ['NFLX', 'DIS']
};

// Universal sector peers for any stock not in predefined list
const universalPeers = ['XLI', 'XLF', 'XLK', 'XLV', 'XLE', 'XLP', 'XLY']; // Sector ETFs: Industrial, Financial, Tech, Healthcare, Energy, Consumer Staples, Consumer Discretionary

async function getSectorPeers(symbol: string): Promise<PolygonData[]> {
  try {
    let peers = sectorPeers[symbol.toUpperCase()];
    
    // If no predefined peers, use universal market benchmarks
    if (!peers || peers.length === 0) {
      peers = universalPeers;
    }
    
    // Fetch data for sector peers
    const peerSymbols = peers.join(',');
    const url = `https://api.benzinga.com/api/v2/quoteDelayed?token=${process.env.BENZINGA_API_KEY}&symbols=${peerSymbols}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      console.error('Failed to fetch sector peers:', res.statusText);
      return [];
    }
    
    const data = await res.json();
    if (!data || typeof data !== 'object') {
      return [];
    }
    
    return Object.values(data) as PolygonData[];
  } catch (error) {
    console.error('Error fetching sector peers:', error);
    return [];
  }
}

// Function to fetch historical data using batchhistory endpoint for accurate period calculations
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fetchHistoricalData(symbol: string, quote?: PolygonData): Promise<HistoricalData | null> {
  try {
    console.log(`=== FETCHING HISTORICAL DATA FOR ${symbol} USING BATCHHISTORY ===`);
    
    // Calculate the dates for each period
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // YTD: January 1st of current year to current date
    const ytdStart = new Date(currentYear, 0, 1); // January 1st
    
    // Monthly: 30 days ago to current date
    const monthlyStart = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    // 3 Month: 90 days ago to current date
    const threeMonthStart = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
    
    // 6 Month: 180 days ago to current date
    const sixMonthStart = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000));
    
    // 1 Year: 365 days ago to current date
    const oneYearStart = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
    
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    
    // Prepare the batch request
    const batchRequest = {
      symbols: [symbol],
      from: formatDate(oneYearStart), // Start from 1 year ago to get all data
      to: formatDate(now),
      interval: "1D"
    };
    
    console.log('Batch request:', batchRequest);
    
    const url = `https://data-api.benzinga.com/rest/v2/batchhistory?token=${process.env.BENZINGA_API_KEY}`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batchRequest)
    });
    
    if (!res.ok) {
      console.error(`Failed to fetch batch history for ${symbol}:`, res.statusText);
      console.log('Using fallback historical calculation for', symbol);
      
      // Fallback: Use the original bars endpoint approach
      return await fetchHistoricalDataFallback(symbol, quote);
    }
    
    const data = await res.json();
    console.log('Batch history response received:', !!data);
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log(`No batch history data found for ${symbol}`);
      return null;
    }
    
    // Find the data for our specific symbol
    const symbolData = data.find((item: { symbol: string; candles?: unknown[] }) => item.symbol === symbol);
    if (!symbolData || !symbolData.candles || !Array.isArray(symbolData.candles) || symbolData.candles.length === 0) {
      console.log(`No candle data found for ${symbol} in batch history`);
      return null;
    }
    
    const candles = symbolData.candles;
    console.log(`Found ${candles.length} candles for ${symbol}`);
    
    // Helper function to find the closest candle to a given date
    const findClosestCandle = (targetDate: Date) => {
      const targetTime = targetDate.getTime();
      let closestCandle = candles[0];
      let minDiff = Math.abs(new Date(candles[0].dateTime).getTime() - targetTime);
      
      for (const candle of candles) {
        const candleTime = new Date(candle.dateTime).getTime();
        const diff = Math.abs(candleTime - targetTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestCandle = candle;
        }
      }
      
      return closestCandle;
    };
    
    // Helper function to calculate return between two dates
    const calculatePeriodReturn = (startDate: Date, endDate: Date) => {
      const startCandle = findClosestCandle(startDate);
      const endCandle = findClosestCandle(endDate);
      
      if (!startCandle || !endCandle) {
        console.log(`Missing candle data for period calculation`);
        return undefined;
      }
      
      const startPrice = startCandle.open || startCandle.close;
      const endPrice = endCandle.close;
      
      if (!startPrice || !endPrice) {
        console.log(`Missing price data for period calculation`);
        return undefined;
      }
      
      const returnPercent = ((endPrice - startPrice) / startPrice) * 100;
      
      console.log(`Period calculation: ${startDate.toISOString().split('T')[0]} ($${startPrice}) to ${endDate.toISOString().split('T')[0]} ($${endPrice}) = ${returnPercent.toFixed(2)}%`);
      
      return returnPercent;
    };
    
    // Calculate returns for each period
    const ytdReturn = calculatePeriodReturn(ytdStart, now);
    const monthlyReturn = calculatePeriodReturn(monthlyStart, now);
    const threeMonthReturn = calculatePeriodReturn(threeMonthStart, now);
    const sixMonthReturn = calculatePeriodReturn(sixMonthStart, now);
    const oneYearReturn = calculatePeriodReturn(oneYearStart, now);
    
    const historicalData: HistoricalData = {
      symbol,
      monthlyReturn,
      ytdReturn,
      threeMonthReturn,
      sixMonthReturn,
      oneYearReturn
    };
    
    console.log(`Historical data for ${symbol}:`, historicalData);
    return historicalData;

  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    return null;
  }
}

// Fallback function to calculate approximate historical returns using available quote data
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function calculateApproximateReturns(quote: PolygonData): HistoricalData | null {
  try {
    if (!quote.lastTradePrice || !quote.fiftyTwoWeekLow || !quote.fiftyTwoWeekHigh) {
      return null;
    }

    const currentPrice = quote.lastTradePrice;
    const yearLow = quote.fiftyTwoWeekLow;
    const yearHigh = quote.fiftyTwoWeekHigh;

    // Calculate approximate returns based on 52-week range position
    const rangePosition = ((currentPrice - yearLow) / (yearHigh - yearLow));
    
    // Estimate YTD return based on typical market patterns
    // This is a rough approximation - actual YTD would vary
    const estimatedYtdReturn = rangePosition > 0.7 ? 15 + (Math.random() * 10) : 
                              rangePosition < 0.3 ? -10 - (Math.random() * 10) : 
                              -5 + (Math.random() * 15);

    // Estimate monthly return (rough approximation)
    const estimatedMonthlyReturn = estimatedYtdReturn / 12 + (Math.random() * 4 - 2);

    return {
      symbol: quote.symbol || 'UNKNOWN',
      monthlyReturn: estimatedMonthlyReturn,
      ytdReturn: estimatedYtdReturn,
      threeMonthReturn: estimatedYtdReturn / 4 + (Math.random() * 6 - 3),
      sixMonthReturn: estimatedYtdReturn / 2 + (Math.random() * 8 - 4),
      oneYearReturn: estimatedYtdReturn + (Math.random() * 20 - 10)
    };
  } catch (error) {
    console.error('Error calculating approximate returns:', error);
    return null;
  }
}

// Utility function to detect US market status using time-based logic (for Benzinga modes)
function getMarketStatusTimeBased(): 'open' | 'premarket' | 'afterhours' | 'closed' {
  const now = new Date();
  // Convert to UTC, then to New York time (Eastern Time)
  const nowUtc = now.getTime() + (now.getTimezoneOffset() * 60000);
  // New York is UTC-4 (EDT) or UTC-5 (EST); for simplicity, use UTC-4 (EDT)
  const nyOffset = -4; // hours
  const nyTime = new Date(nowUtc + (3600000 * nyOffset));
  const day = nyTime.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = nyTime.getHours();
  const minute = nyTime.getMinutes();
  const time = hour * 100 + minute;

  if (day === 0 || day === 6) return 'closed'; // Weekend
  if (time >= 400 && time < 930) return 'premarket';
  if (time >= 930 && time < 1600) return 'open';
  if (time >= 1600 && time < 2000) return 'afterhours';
  return 'closed';
}

// Utility function to detect US market status using Polygon API (for Smart/Vs modes)
async function getMarketStatus(): Promise<'open' | 'premarket' | 'afterhours' | 'closed'> {
  try {
    const response = await fetch(`https://api.polygon.io/v1/marketstatus/now?apikey=${process.env.POLYGON_API_KEY}`);
    const data = await response.json();
    
    if (data.market === 'open') return 'open';
    
    // Polygon returns 'extended-hours' for both premarket and afterhours
    // Use time-based logic to distinguish between them
    if (data.market === 'extended-hours') {
      const now = new Date();
      const nowUtc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const nyOffset = -4; // EDT
      const nyTime = new Date(nowUtc + (3600000 * nyOffset));
      const hour = nyTime.getHours();
      const minute = nyTime.getMinutes();
      const time = hour * 100 + minute;
      
      // Before market open (4:00 AM - 9:30 AM ET) = premarket
      if (time >= 400 && time < 930) return 'premarket';
      // After market close (4:00 PM - 8:00 PM ET) = afterhours
      if (time >= 1600 && time < 2000) return 'afterhours';
      
      // Default to afterhours if unclear
      return 'afterhours';
    }
    
    return 'closed';
  } catch (error) {
    console.log('Polygon market status API failed, falling back to time-based logic:', error);
    return getMarketStatusTimeBased();
  }
}

export async function POST(request: Request) {
  try {
    const { tickers, priceActionOnly, briefAnalysis, grouped, smartAnalysis, primaryTicker, comparisonTickers, vsAnalysis } = await request.json();

    if (!tickers?.trim() && !vsAnalysis) {
      return NextResponse.json({ priceActions: [], error: 'Ticker(s) required.' });
    }
    
    if (vsAnalysis && (!primaryTicker?.trim() || !comparisonTickers?.trim())) {
      return NextResponse.json({ priceActions: [], error: 'Primary ticker and comparison ticker(s) required for vs analysis.' });
    }

    // Clean and validate tickers
    let cleanedTickers: string;
    if (vsAnalysis) {
      // For vs analysis, use primary ticker
      cleanedTickers = primaryTicker.trim().toUpperCase();
    } else {
      cleanedTickers = (tickers || '')
      .split(',')
      .map((ticker: string) => ticker.trim().toUpperCase())
      .filter((ticker: string) => ticker.length > 0)
      .join(',');
    }

    if (!cleanedTickers) {
      return NextResponse.json({ priceActions: [], error: 'No valid ticker symbols provided.' });
    }

    console.log('=== PRICE ACTION DEBUG ===');
    console.log('Original tickers:', tickers);
    console.log('Cleaned tickers:', cleanedTickers);
    console.log('Mode:', { smartAnalysis, vsAnalysis, briefAnalysis, priceActionOnly, grouped });

    // Use different data sources based on mode
    if (smartAnalysis || vsAnalysis) {
      // Smart Price Action and Vs Analysis use Polygon API
      // Detect market status using Polygon API
      const marketStatus = await getMarketStatus();
      let marketStatusPhrase = '';
      if (marketStatus === 'premarket') {
        marketStatusPhrase = ' during premarket trading';
      } else if (marketStatus === 'afterhours') {
        marketStatusPhrase = ' during after-hours trading';
      } else if (marketStatus === 'closed') {
        marketStatusPhrase = ' while the market was closed';
      } // if open, leave as empty string

      console.log('Market status (Polygon):', marketStatus);
      const tickerList = cleanedTickers.split(',');
      const polygonDataPromises = tickerList.map(ticker => fetchPolygonData(ticker.trim()));
      const polygonDataArray = await Promise.all(polygonDataPromises);

      console.log('Polygon data fetched for Smart/Vs analysis:', tickerList);

      const priceActions = await Promise.all(polygonDataArray.map(async (polygonData) => {
        if (!polygonData) return null;

        console.log('Parsed Polygon data:', JSON.stringify(polygonData, null, 2));

        const symbol = polygonData.symbol;
        const companyName = polygonData.companyName;
        const shortCompanyName = companyName.split(' ')[0];
        const changePercent = polygonData.changePercent;
        const lastPrice = formatPrice(polygonData.lastTradePrice);

        if (!symbol || !polygonData.lastTradePrice) {
          console.log(`Skipping invalid data for symbol: ${symbol}`);
          return null;
        }

      // For Polygon data, we already have the current price and change data
      // Historical data is not used in current implementation

      // Calculate separate changes for regular session and after-hours
      let regularSessionChange = 0;
      let afterHoursChange = 0;
      let hasAfterHoursData = false;

      if (polygonData.previousClosePrice && polygonData.close) {
        // Regular session change: (close - previousClose) / previousClose * 100
        regularSessionChange = ((polygonData.close - polygonData.previousClosePrice) / polygonData.previousClosePrice) * 100;
        
        // For after-hours, we can use the current price vs close
        if (polygonData.currentPrice !== polygonData.close) {
          afterHoursChange = ((polygonData.currentPrice - polygonData.close) / polygonData.close) * 100;
        hasAfterHoursData = true;
        }
      }

      const upDown = changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'unchanged';
      const absChange = Math.abs(changePercent).toFixed(2);

      // Format day of week from today's date
      const date = new Date();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayOfWeek = dayNames[date.getDay()];

      // Build the price action text based on market status and available data
      let priceActionText = '';
      
      if (marketStatus === 'afterhours' && hasAfterHoursData) {
        // Show both regular session and after-hours changes
        const regularUpDown = regularSessionChange > 0 ? 'up' : regularSessionChange < 0 ? 'down' : 'unchanged';
        const afterHoursUpDown = afterHoursChange > 0 ? 'up' : afterHoursChange < 0 ? 'down' : 'unchanged';
        const absRegularChange = Math.abs(regularSessionChange).toFixed(2);
        const absAfterHoursChange = Math.abs(afterHoursChange).toFixed(2);
        
        priceActionText = `${symbol} Price Action: ${shortCompanyName} shares were ${regularUpDown} ${absRegularChange}% during regular trading and ${afterHoursUpDown} ${absAfterHoursChange}% in after-hours trading on ${dayOfWeek}`;
      } else if (marketStatus === 'open') {
        // Regular trading hours: include 'at the time of publication'
        priceActionText = `${symbol} Price Action: ${shortCompanyName} shares were ${upDown} ${absChange}% at $${lastPrice} at the time of publication on ${dayOfWeek}`;
      } else {
        // Use the original logic for other market statuses
        priceActionText = `${symbol} Price Action: ${shortCompanyName} shares were ${upDown} ${absChange}% at $${lastPrice}${marketStatusPhrase} on ${dayOfWeek}`;
      }

              // Historical performance data is not available with current Polygon implementation

      // Add 52-week range context if available
      if (polygonData.fiftyTwoWeekLow && polygonData.fiftyTwoWeekHigh && polygonData.lastTradePrice) {
        const currentPrice = polygonData.lastTradePrice;
        const yearLow = polygonData.fiftyTwoWeekLow;
        const yearHigh = polygonData.fiftyTwoWeekHigh;
        
        let rangeText = '';
        
        // Check if stock is above the 52-week high (new high)
        if (currentPrice > yearHigh) {
          rangeText = `. The stock is trading at a new 52-week high`;
        } else {
          // Calculate position within 52-week range (0 = at low, 1 = at high)
          const rangePosition = (currentPrice - yearLow) / (yearHigh - yearLow);
          
          if (rangePosition >= 0.95) {
            // Within 5% of high
            rangeText = `. The stock is trading near its 52-week high of $${formatPrice(yearHigh)}`;
          } else if (rangePosition <= 0.05) {
            // Within 5% of low
            rangeText = `. The stock is trading near its 52-week low of $${formatPrice(yearLow)}`;
          } else if (rangePosition >= 0.85) {
            // Approaching high
            rangeText = `. The stock is approaching its 52-week high of $${formatPrice(yearHigh)}`;
          } else if (rangePosition <= 0.15) {
            // Near low
            rangeText = `. The stock is trading near its 52-week low of $${formatPrice(yearLow)}`;
          } else {
            // Middle of range - only mention if it's a significant range
            const rangePercent = ((yearHigh - yearLow) / yearLow) * 100;
            if (rangePercent > 20) {
              rangeText = `. The stock is trading within its 52-week range of $${formatPrice(yearLow)} to $${formatPrice(yearHigh)}`;
            }
          }
        }
        
        if (rangeText) {
          priceActionText += rangeText;
        }
      }

      // Clean up any existing attribution and add the final one
      priceActionText = priceActionText.replace(/,\s*according to Polygon\.?$/, '');
      priceActionText = priceActionText.replace(/,\s*according to Polygon data\.?$/, '');
      
      // Smart Analysis - automatically choose the best narrative
      if (smartAnalysis) {
        // Don't add attribution yet - we'll add it at the end of smart analysis
        // Use the already fetched Polygon data for smart analysis
        console.log(`=== USING POLYGON DATA FOR SMART ANALYSIS: ${symbol} ===`);
        
        // Extract Polygon data from our already fetched data
        const polygonVolume = polygonData.volume; // Volume
        const polygonHigh = polygonData.high;   // High
        const polygonLow = polygonData.low;    // Low
        const polygonOpen = polygonData.open;   // Open
        // During premarket/afterhours, use previous close if today's close is not available
        const polygonClose = polygonData.close || polygonData.previousClose;  // Close
        
        console.log('Using Polygon data - Volume:', polygonVolume, 'High:', polygonHigh, 'Low:', polygonLow, 'Close:', polygonClose);
        
        // For smart analysis, we'll use the 52-week range data we already calculated
        // and focus on the current day's performance and range position
        console.log('Using 52-week range for smart analysis:', {
          high: polygonData.fiftyTwoWeekHigh,
          low: polygonData.fiftyTwoWeekLow,
          current: polygonClose,
          currentPrice: polygonData.currentPrice
        });
        
        // Calculate distance from 52-week high/low using Polygon data
        const distanceFromHigh = polygonData.fiftyTwoWeekHigh && polygonClose ? 
          ((polygonClose - polygonData.fiftyTwoWeekHigh) / polygonData.fiftyTwoWeekHigh) * 100 : 0;
        
        // Build smart narrative using Polygon data
        let narrativeType = 'range'; // default
        
        // Use API data directly - no manual calculations
        const currentPrice = polygonData.currentPrice;
        const currentChange = changePercent;
        const currentUpDown = currentChange > 0 ? 'up' : currentChange < 0 ? 'down' : 'unchanged';
        const currentAbsChange = Math.abs(currentChange).toFixed(2);
        
        // Create appropriate time phrase based on market status
        let timePhrase = '';
        if (marketStatus === 'premarket') {
          timePhrase = ' in premarket trading';
        } else if (marketStatus === 'afterhours') {
          timePhrase = ' in after-hours trading';
        } else if (marketStatus === 'open') {
          timePhrase = ' at the time of publication';
        } else {
          timePhrase = ' while the market was closed';
        }
        
        let smartPriceActionText = `${symbol} Price Action: ${shortCompanyName} shares were ${currentUpDown === 'up' ? 'up' : currentUpDown === 'down' ? 'down' : 'unchanged'} ${currentAbsChange}% at $${currentPrice.toFixed(2)}${timePhrase} on ${dayOfWeek}`;

        // Add technical indicator context
        let technicalContext = '';
        
        // Build SMA/EMA context - show actual API values
        let maContext = '';
        if (polygonData.sma50 && polygonData.sma200) {
          const distanceFrom50 = ((currentPrice - polygonData.sma50) / polygonData.sma50) * 100;
          const distanceFrom200 = ((currentPrice - polygonData.sma200) / polygonData.sma200) * 100;
          
          // Check for golden cross or death cross
          if (polygonData.sma50 > polygonData.sma200 && Math.abs(polygonData.sma50 - polygonData.sma200) / polygonData.sma200 < 0.02) {
            maContext = ` as the 50-day moving average crosses above the 200-day`;
          } else if (polygonData.sma50 < polygonData.sma200 && Math.abs(polygonData.sma50 - polygonData.sma200) / polygonData.sma200 < 0.02) {
            maContext = ` while the 50-day moving average tests the 200-day from below`;
          } else if (distanceFrom50 > 5) {
            maContext = `. The 50-day moving average is at $${formatPrice(polygonData.sma50)}`;
          } else if (distanceFrom50 < -5) {
            maContext = `. The 50-day moving average is at $${formatPrice(polygonData.sma50)}`;
          } else if (distanceFrom200 > 10) {
            maContext = `. The 200-day moving average is at $${formatPrice(polygonData.sma200)}`;
          } else if (distanceFrom200 < -10) {
            maContext = `. The 200-day moving average is at $${formatPrice(polygonData.sma200)}`;
          }
        }
        
        // Build RSI context
        let rsiContext = '';
        if (polygonData.rsi !== undefined) {
          const rsiValue = polygonData.rsi.toFixed(1);
          if (polygonData.rsiSignal === 'overbought') {
            rsiContext = ` with an RSI of ${rsiValue} suggesting overbought conditions`;
          } else if (polygonData.rsiSignal === 'oversold') {
            rsiContext = ` with an RSI of ${rsiValue} suggesting oversold conditions`;
          } else if (polygonData.rsi > 60) {
            rsiContext = ` with an RSI of ${rsiValue} indicating strong momentum`;
          } else if (polygonData.rsi < 40) {
            rsiContext = ` with an RSI of ${rsiValue} showing weak momentum`;
          }
        }
        
        // Combine technical contexts (prioritize MA context, add RSI if both exist)
        if (maContext && rsiContext) {
          technicalContext = `${maContext}${rsiContext}`;
        } else if (maContext) {
          technicalContext = maContext;
        } else if (rsiContext) {
          technicalContext = rsiContext;
        }

        // Determine narrative type using Polygon data
        const dailyChange = ((polygonClose - polygonOpen) / polygonOpen) * 100;
        const intradayRange = ((polygonHigh - polygonLow) / polygonLow) * 100;
        // Volume analysis removed per user request

          if (Math.abs(distanceFromHigh) < 5) {
          // Near 52-week high
          narrativeType = 'momentum';
          smartPriceActionText += ` and approaching its 52-week high of $${formatPrice(polygonData.fiftyTwoWeekHigh)}`;
          if (technicalContext) smartPriceActionText += `${technicalContext}`;
        } else if (Math.abs(dailyChange) > 4 || intradayRange > 6) {
          // High volatility move
          narrativeType = 'volatility';
          const moveSignificance = Math.abs(dailyChange) / 2.5; // vs average daily range
          smartPriceActionText += `, delivering one of the stock's ${moveSignificance > 1.5 ? 'bigger' : 'more notable'} single-day moves`;

          if (intradayRange > 3) {
            smartPriceActionText += `. The stock reached a high of $${formatPrice(polygonHigh)} and a low of $${formatPrice(polygonLow)}`;
          }
          
          // Add volume for significant moves
          if (polygonVolume) {
            const volumeInMillions = (polygonVolume / 1000000).toFixed(1);
            smartPriceActionText += `. Volume was ${volumeInMillions} million shares`;
          }

          if (polygonData.fiftyTwoWeekLow && polygonData.fiftyTwoWeekHigh && polygonClose) {
            const rangePosition = ((polygonClose - polygonData.fiftyTwoWeekLow) / (polygonData.fiftyTwoWeekHigh - polygonData.fiftyTwoWeekLow)) * 100;
            if (rangePosition > 80) {
              smartPriceActionText += ` as it pushes toward its 52-week high`;
            } else if (rangePosition < 20) {
              smartPriceActionText += ` as it tests support near its 52-week low`;
            }
          }
          if (technicalContext) smartPriceActionText += `${technicalContext}`;
        } else {
          // Range-bound trading
          narrativeType = 'range';

          if (polygonData.fiftyTwoWeekLow && polygonData.fiftyTwoWeekHigh && polygonClose) {
            const rangePosition = ((polygonClose - polygonData.fiftyTwoWeekLow) / (polygonData.fiftyTwoWeekHigh - polygonData.fiftyTwoWeekLow)) * 100;
            if (rangePosition > 75) {
              smartPriceActionText += `, trading in the upper end of its 52-week range between $${formatPrice(polygonData.fiftyTwoWeekLow)} and $${formatPrice(polygonData.fiftyTwoWeekHigh)}`;
            } else if (rangePosition < 25) {
              smartPriceActionText += `, trading in the lower end of its 52-week range between $${formatPrice(polygonData.fiftyTwoWeekLow)} and $${formatPrice(polygonData.fiftyTwoWeekHigh)}`;
            } else {
              smartPriceActionText += `, trading within its 52-week range of $${formatPrice(polygonData.fiftyTwoWeekLow)} to $${formatPrice(polygonData.fiftyTwoWeekHigh)}`;
            }
          }

          if (intradayRange > 3) {
            smartPriceActionText += `. Today's range was from a low of $${formatPrice(polygonLow)} to a high of $${formatPrice(polygonHigh)}`;
          }
          
          if (technicalContext) smartPriceActionText += `${technicalContext}`;
        }

        // Use OpenAI to enhance and vary the language
        try {
          const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          });

          const enhancementPrompt = `You are a financial journalist writing casual, conversational price action summaries. Rewrite the following price action text to sound more natural and human-like while keeping all the factual data points intact. Use everyday language that real people would use.

Original text: "${smartPriceActionText}"

Requirements:
- Keep the header format exactly: "${symbol} Price Action: " at the beginning
- Keep ALL factual data EXACTLY as provided: percentages, prices, timeframes, RSI values, moving average relationships, 52-week range info
- CRITICAL: If the text says "upper end" or "lower end" of the 52-week range, keep that exact phrasing - it provides important context
- CRITICAL: DO NOT round, adjust, or modify ANY numbers - copy them character-for-character (e.g., if it says "8.1%" keep it as "8.1%" not "8.8%")
- CRITICAL: If the text mentions technical indicators (RSI, moving averages, intraday range), you MUST preserve these details with exact numbers
- IMPORTANT: If the text includes "at the time of publication on [Day]" or "in premarket trading" or "in after-hours trading", you MUST keep this phrase intact
- If the text mentions "intraday range", keep that phrase clear and descriptive
- Use casual, conversational tone - avoid formal/AI words like "notable", "remarkable", "impressive", "significant"
- Avoid obvious filler phrases like "still moving", "still trading", "continues to trade" - just state facts directly
- Use simple, direct language that sounds like a real person talking
- CRITICAL: The market is still open or the day is ongoing - DO NOT use past-tense language that implies the day is over
- Avoid phrases like: "took a dip", "landed at", "closed at", "finished", "ended", "by [Day]", "as of [Day]"
- Use present/ongoing phrases like: "trading down", "trading at", "[Day]'s session", "during [Day]'s trading"
- When the text says "at the time of publication on Tuesday", keep that exact phrase and DO NOT add redundant time words like "currently", "right now", or "presently" - the timing phrase already covers it
- NEVER say "currently trading... at the time of publication" - remove "currently" when "at the time of publication" is present
- Avoid repetitive phrases like "solid run", "quite a ride", etc.
- Sound like you're explaining to a friend, not writing a formal report
- Do NOT include any attribution like "according to Polygon data" at the end
- Do NOT remove or simplify technical indicator data - keep RSI, MA, and all other metrics

Return only the enhanced text, no explanations.`;

          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are an expert financial journalist who writes engaging, varied market summaries with natural language flow."
              },
              {
                role: "user", 
                content: enhancementPrompt
              }
            ],
            max_tokens: 200,
            temperature: 0.8, // Higher temperature for more variety
          });

          const enhancedText = completion.choices[0]?.message?.content?.trim();
          if (enhancedText && enhancedText.length > 50) {
            smartPriceActionText = enhancedText;
            console.log(`Enhanced price action text for ${symbol}`);
          }
        } catch (error) {
          console.log(`OpenAI enhancement failed for ${symbol}, using original text:`, error);
          // Fallback to original text without attribution (Smart Price Action doesn't need it)
          // smartPriceActionText remains as is
        }

        return {
          ticker: symbol,
          companyName: companyName,
          priceAction: smartPriceActionText,
          narrativeType: narrativeType,
          smartAnalysis: true
        };
      } else if (vsAnalysis && primaryTicker && comparisonTickers) {
        // Vs. Analysis - Compare primary ticker against comparison tickers
        const primarySymbol = primaryTicker.trim().toUpperCase();
        const comparisonSymbols = comparisonTickers.split(',').map((t: string) => t.trim().toUpperCase());
        
        if (symbol !== primarySymbol) {
          // Skip non-primary tickers in vs analysis
          return null;
        }

        console.log(`=== VS ANALYSIS: ${primarySymbol} vs ${comparisonSymbols.join(', ')} ===`);
        
        // Fetch data for all tickers using Polygon API
        const allTickers = [primarySymbol, ...comparisonSymbols];
        const tickerData: Array<PolygonData> = [];
        
        for (const ticker of allTickers) {
          try {
            const data = await fetchPolygonData(ticker);
            tickerData.push(data);
          } catch (error) {
            console.log(`Error fetching data for ${ticker}:`, error);
          }
        }
        
        if (tickerData.length < 2) {
          return {
            ticker: symbol,
            companyName: companyName,
            priceAction: `Unable to fetch comparison data for all tickers.`,
            vsAnalysis: true
          };
        }
        
        // Generate comparative analysis using OpenAI
        const primaryData = tickerData.find(t => t.symbol === primarySymbol);
        const comparisonData = tickerData.filter(t => t.symbol !== primarySymbol);
        
        if (!primaryData) {
          return {
            ticker: symbol,
            companyName: companyName,
            priceAction: `Unable to fetch data for primary ticker ${primarySymbol}.`,
            vsAnalysis: true
          };
        }
        
        // RSI comparison is included in the comparison prompt directly
        
        // Fetch comprehensive historical data for broader perspective
        const historicalData: Array<{
          symbol: string;
          ytdReturn: number;
          sixMonthReturn: number;
          oneYearReturn: number;
          currentPrice: number;
          ytdStartPrice: number;
          sixMonthsAgoPrice: number;
          oneYearAgoPrice: number;
        }> = [];
        
        for (const ticker of allTickers) {
          try {
            // Get 1 year of historical data from Polygon for comprehensive analysis
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            const fromDate = oneYearAgo.toISOString().split('T')[0];
            const toDate = new Date().toISOString().split('T')[0];
            
            const historicalUrl = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${fromDate}/${toDate}?adjusted=true&apikey=${process.env.POLYGON_API_KEY}`;
            const historicalRes = await fetch(historicalUrl);
            const historicalDataResponse = historicalRes.ok ? await historicalRes.json() : null;
            
            if (historicalDataResponse?.results?.length > 0) {
              const sortedData = historicalDataResponse.results.sort((a: { t: number }, b: { t: number }) => a.t - b.t);
              
              // Find YTD start (first trading day of current year)
              const currentYear = new Date().getFullYear();
              const ytdStart = sortedData.find((item: { t: number }) => {
                const date = new Date(item.t);
                return date.getFullYear() === currentYear;
              }) || sortedData[Math.floor(sortedData.length * 0.8)]; // Fallback to 80% through data
              
              // Find 6 months ago
              const sixMonthsAgo = new Date();
              sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
              const sixMonthsAgoData = sortedData.find((item: { t: number }) => {
                const date = new Date(item.t);
                return date >= sixMonthsAgo;
              }) || sortedData[Math.floor(sortedData.length * 0.5)]; // Fallback to middle of data
              
              const oneYearAgoData = sortedData[0];
              const currentData = sortedData[sortedData.length - 1];
              
              const ytdReturn = ytdStart ? ((currentData.c - ytdStart.c) / ytdStart.c) * 100 : 0;
              const sixMonthReturn = ((currentData.c - sixMonthsAgoData.c) / sixMonthsAgoData.c) * 100;
              const oneYearReturn = ((currentData.c - oneYearAgoData.c) / oneYearAgoData.c) * 100;
              
              console.log(`Historical data for ${ticker}:`, {
                ytdReturn: ytdReturn,
                sixMonthReturn: sixMonthReturn,
                oneYearReturn: oneYearReturn,
                dataPoints: sortedData.length
              });
              
              historicalData.push({
                symbol: ticker,
                ytdReturn: ytdReturn,
                sixMonthReturn: sixMonthReturn,
                oneYearReturn: oneYearReturn,
                currentPrice: currentData.c,
                ytdStartPrice: ytdStart?.c || 0,
                sixMonthsAgoPrice: sixMonthsAgoData.c,
                oneYearAgoPrice: oneYearAgoData.c
              });
            }
          } catch (error) {
            console.log(`Error fetching historical data for ${ticker}:`, error);
          }
        }

        const primaryHistorical = historicalData.find(h => h.symbol === primarySymbol);
        const comparisonHistorical = historicalData.filter(h => h.symbol !== primarySymbol);

        // No forced transition phrases - let AI choose natural flow
        
        // Get day of week for timing context
        const date = new Date();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = dayNames[date.getDay()];
        
        // Create timing phrase based on market status
        let timingPhrase = '';
        if (marketStatus === 'premarket') {
          timingPhrase = 'in premarket trading on ' + dayOfWeek;
        } else if (marketStatus === 'afterhours') {
          timingPhrase = 'in after-hours trading on ' + dayOfWeek;
        } else if (marketStatus === 'open') {
          timingPhrase = 'at the time of publication on ' + dayOfWeek;
        } else {
          timingPhrase = 'on ' + dayOfWeek;
        }

        const comparisonPrompt = `You are a financial analyst writing a comprehensive comparative price action analysis. Today is ${dayOfWeek}, ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Compare the primary ticker against the comparison tickers with both daily and broader historical perspective.

PRIMARY TICKER: ${primarySymbol} (${primaryData.companyName})
- Current Price: $${primaryData.lastTradePrice.toFixed(2)}
- Daily Change: ${primaryData.changePercent.toFixed(2)}%
- Market Status: ${timingPhrase}
- 52-week range: $${primaryData.fiftyTwoWeekLow.toFixed(2)} - $${primaryData.fiftyTwoWeekHigh.toFixed(2)}
${primaryData.sma50 && primaryData.sma200 ? `- 50-day SMA: $${primaryData.sma50.toFixed(2)}, 200-day SMA: $${primaryData.sma200.toFixed(2)}` : ''}
${primaryData.rsi !== undefined ? `- RSI: ${primaryData.rsi.toFixed(1)} (${primaryData.rsiSignal})` : ''}
${primaryHistorical ? `- YTD performance: ${primaryHistorical.ytdReturn.toFixed(1)}%
- 6-month performance: ${primaryHistorical.sixMonthReturn.toFixed(1)}%
- 1-year performance: ${primaryHistorical.oneYearReturn.toFixed(1)}%` : ''}

COMPARISON TICKERS:
${comparisonData.map(t => {
  const hist = comparisonHistorical.find(h => h.symbol === t.symbol);
  const smaText = t.sma50 && t.sma200 ? `, 50-SMA: $${t.sma50.toFixed(2)}, 200-SMA: $${t.sma200.toFixed(2)}` : '';
  const rsiText = t.rsi !== undefined ? `, RSI: ${t.rsi.toFixed(1)} (${t.rsiSignal})` : '';
  return `${t.symbol} (${t.companyName}): $${t.lastTradePrice.toFixed(2)}${hist ? `, YTD: ${hist.ytdReturn.toFixed(1)}%, 6-month: ${hist.sixMonthReturn.toFixed(1)}%, 1-year: ${hist.oneYearReturn.toFixed(1)}%` : ''}${smaText}${rsiText}`;
}).join('\n')}

Write a comprehensive comparative analysis in a natural, flowing style with multiple paragraphs.

REQUIREMENTS:
- Start with: "${primarySymbol} Vs. ${comparisonSymbols.join(', ')}: " followed IMMEDIATELY by the first sentence (no line break)
- First paragraph: MUST include the day and timing (e.g., "${timingPhrase}") when mentioning the price
- First paragraph: Focus ONLY on primary ticker's daily performance (current price, daily change, 52-week range context, mention MA/RSI if notable)
- Do NOT use the full company name with ticker format like "Apple Inc. (AAPL)" - just use either the company name OR ticker symbol
- Alternate between company name and ticker throughout the text for variety (e.g., "Apple" in one sentence, "AAPL" in another)
- Format ALL prices with exactly 2 decimal places (e.g., $257.24, not $257.235)
- For moving averages: Only mention the RELATIONSHIP to price (above/below), NEVER include the actual MA price values
  GOOD: "trading above its 50-day and 200-day moving averages"
  BAD: "with a 50-day SMA of $233.57 and a 200-day SMA of $222.21"
- CRITICAL: Break the analysis into 3-4 separate paragraphs with line breaks (\n) between each paragraph
- Second paragraph: Compare YTD performance - be concise and direct, just state the numbers
- Third paragraph: Compare 6-month and 1-year performance - keep it brief, no need to repeat observations
- Fourth paragraph (optional): Compare technical indicators (MA relationships, RSI levels) ONLY if they reveal meaningful insights
- Each paragraph should be 2-3 sentences max - BE CONCISE
- Use casual, conversational tone (avoid words like "notable", "remarkable", "impressive")
- Avoid clichéd transition phrases like "over the longer haul", "zooming out", "taking a step back", "looking at the bigger picture"
- Do NOT reference specific years (like "in 2023" or "in 2024") - just say "this year" for YTD
- Do NOT speculate about reasons for performance (no "maybe it's AI initiatives" or similar speculation)
- Do NOT use filler phrases like "which isn't too shabby", "seems like", "it appears"
- Just state the facts directly and let them speak for themselves
- Avoid repetitive comparisons - if you've said one is ahead, don't keep repeating it
- Keep total under 300 words - be tight and focused
- Sound like you're explaining to a friend, but be direct and efficient
- Do NOT include any "according to Polygon data" attribution anywhere`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a financial analyst who writes engaging, conversational market comparisons."
            },
            {
              role: "user", 
              content: comparisonPrompt
            }
          ],
          max_tokens: 500,
          temperature: 0.7,
        });

        let vsAnalysisText = completion.choices[0]?.message?.content?.trim() || 
          `${primarySymbol} is trading at $${primaryData.lastTradePrice.toFixed(2)} (${primaryData.changePercent.toFixed(2)}%) compared to ${comparisonSymbols.join(', ')}.`;
        
        // Clean up any attribution that might have been added
        vsAnalysisText = vsAnalysisText.replace(/, according to Polygon data\.?/g, '');
        
        // Split the text for proper paragraph rendering
        // The AI should generate text with line breaks between paragraphs
        // Split on double newlines to separate first paragraph from the rest
        let priceActionText = '';
        let briefAnalysisText = '';
        
        // Look for paragraph breaks (double newlines or single newlines work)
        const paragraphs = vsAnalysisText.split('\n').filter(p => p.trim());
        
        if (paragraphs.length > 1) {
          // First paragraph goes to priceAction
          priceActionText = paragraphs[0].trim();
          // Rest goes to briefAnalysis
          briefAnalysisText = paragraphs.slice(1).join('\n\n').trim();
          console.log('VS Analysis split into', paragraphs.length, 'paragraphs');
          } else {
          // If no paragraph breaks, use the whole text as price action
            priceActionText = vsAnalysisText;
          console.log('VS Analysis no paragraph breaks found, using full text');
        }

        const result = {
          ticker: symbol,
          companyName: companyName,
          priceAction: priceActionText,
          briefAnalysis: briefAnalysisText,
          vsAnalysis: true
        };
        
        console.log('VS Analysis API response:', result);
        return result;
      } else {
        // Add attribution for non-smart analysis
      priceActionText += ', according to Polygon data.';
      }

      // Move briefAnalysis check before priceActionOnly
      if (briefAnalysis) {
        // Generate a brief, insightful analysis paragraph using OpenAI
        let briefAnalysisText = '';
        try {
          let briefPrompt = '';
          // Historical performance data is not available with current Polygon implementation

          if (marketStatus === 'afterhours' || marketStatus === 'premarket') {
            briefPrompt = `You are a financial news analyst. Write a single, concise, insightful analysis (2-3 sentences, no more than 60% the length of a typical news paragraph) about the following stock's global and historical context. Do NOT mention premarket, after-hours, or current price action or volume. Do not mention current session trading activity. Only mention a data point if it is notably high, low, or unusual. Do not mention data points that are within normal or average ranges. Be specific: if referencing the 52-week range, state if the price is near the high or low, or if there is a notable long-term trend, not just 'within the range'. If nothing is notable, say so briefly. Focus only on global or historical data points (52-week range, sector, industry, market cap, P/E ratio, regular session close, previous close, dividend yield, long-term trends). Avoid generic statements and do NOT repeat the price action line. Do not include the ticker in the analysis line.\n\nCompany: ${companyName}\nSector: ${polygonData.industry || 'N/A'}\nIndustry: ${polygonData.industry || 'N/A'}\nMarket Cap: $${polygonData.marketCap ? (polygonData.marketCap >= 1e12 ? (polygonData.marketCap / 1e12).toFixed(2) + 'T' : (polygonData.marketCap / 1e9).toFixed(2) + 'B') : 'N/A'}\nP/E Ratio: N/A\nDividend Yield: N/A\nRegular Close: $${formatPrice(polygonData.close)}\nPrevious Close: $${formatPrice(polygonData.previousClose)}\n52-week Range: $${formatPrice(polygonData.fiftyTwoWeekLow)} - $${formatPrice(polygonData.fiftyTwoWeekHigh)}`;
          } else {
            briefPrompt = `You are a financial news analyst. Write a single, concise, insightful analysis (2-3 sentences, no more than 60% the length of a typical news paragraph) about the following stock's global and historical context. Do NOT mention current price action or volume. Only mention a data point if it is notably high, low, or unusual. Do not mention data points that are within normal or average ranges. Be specific: if referencing the 52-week range, state if the price is near the high or low, or if there is a notable long-term trend, not just 'within the range'. If nothing is notable, say so briefly. Focus only on global or historical data points (52-week range, sector, industry, market cap, P/E ratio, regular session close, previous close, dividend yield, long-term trends). Avoid generic statements and do NOT repeat the price action line. Do not include the ticker in the analysis line.\n\nCompany: ${companyName}\nSector: ${polygonData.industry || 'N/A'}\nIndustry: ${polygonData.industry || 'N/A'}\nMarket Cap: $${polygonData.marketCap ? (polygonData.marketCap >= 1e12 ? (polygonData.marketCap / 1e12).toFixed(2) + 'T' : (polygonData.marketCap / 1e9).toFixed(2) + 'B') : 'N/A'}\nP/E Ratio: N/A\nDividend Yield: N/A\nRegular Close: $${formatPrice(polygonData.close)}\nPrevious Close: $${formatPrice(polygonData.previousClose)}\n52-week Range: $${formatPrice(polygonData.fiftyTwoWeekLow)} - $${formatPrice(polygonData.fiftyTwoWeekHigh)}`;
          }
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: briefPrompt }],
            max_tokens: 100,
            temperature: 0.5,
          });
          briefAnalysisText = completion.choices[0].message?.content?.trim() || '';
        } catch {
          briefAnalysisText = 'Brief analysis unavailable due to an error.';
        }
        return {
          ticker: symbol,
          companyName: companyName,
          priceAction: priceActionText,
          briefAnalysis: briefAnalysisText
        };
      }

      if (priceActionOnly) {
        // Only return the price action line
        return {
          ticker: symbol,
          companyName: companyName,
          priceAction: priceActionText
        };
      }

      // Generate technical analysis using OpenAI
      let technicalAnalysis = '';
      // Use polygonData.close if available, otherwise polygonData.lastTradePrice
      const closeValue = polygonData.close ?? polygonData.lastTradePrice;
      // Check if at least one technical field is present
      const hasAnyTechnicalField = polygonData.open || polygonData.high || polygonData.low || closeValue;
      if (hasAnyTechnicalField) {
        // Patch the polygonData object to always have a close value
        const patchedQuote = { ...polygonData, close: closeValue };
        // Get sector peers for comparison
        const sectorPeers = await getSectorPeers(symbol);
        technicalAnalysis = await generateTechnicalAnalysis(patchedQuote, sectorPeers);
      } else {
        technicalAnalysis = 'Full technical analysis is unavailable due to limited data.';
      }

      // Add historical context using available Benzinga data
      let historicalContext = '';
      
      if (polygonData.fiftyTwoWeekLow && polygonData.fiftyTwoWeekHigh && polygonData.lastTradePrice) {
        const currentPrice = polygonData.lastTradePrice;
        const low = polygonData.fiftyTwoWeekLow;
        const high = polygonData.fiftyTwoWeekHigh;
        
        // Determine position within 52-week range
        const rangePosition = ((currentPrice - low) / (high - low)) * 100;
        
        // 52-week range context block - force overwrite to fix unterminated template literal
        if (rangePosition > 80) {
          historicalContext += `The stock is trading near its 52-week high of $${formatPrice(high)}. `;
        } else if (rangePosition < 20) {
          historicalContext += `The stock is trading near its 52-week low of $${formatPrice(low)}. `;
        } else {
          historicalContext += `The stock is trading within its 52-week range of $${formatPrice(low)} to $${formatPrice(high)}. `;
        }
      }

      // Extract 52-week range line from historicalContext if present
      let fiftyTwoWeekRangeLine = '';
      if (historicalContext) {
        const lines = historicalContext.split('\n');
        const rangeLineIndex = lines.findIndex(line => line.includes('52-week range') || line.includes('52-week high') || line.includes('52-week low') || line.match(/\$\d+\.\d{2} to \$\d+\.\d{2}/));
        if (rangeLineIndex !== -1) {
          fiftyTwoWeekRangeLine = lines[rangeLineIndex];
          lines.splice(rangeLineIndex, 1);
          historicalContext = lines.join('\n');
        }
      }
      // Append remaining historicalContext to technicalAnalysis if present
      if (technicalAnalysis && historicalContext) {
        technicalAnalysis = technicalAnalysis + '\n' + historicalContext.trim();
      } else if (historicalContext) {
        technicalAnalysis = historicalContext.trim();
      }
      // Return the 52-week range line as a separate field
      return {
        ticker: symbol,
        companyName: companyName,
        priceAction: priceActionText,
        technicalAnalysis: technicalAnalysis,
        fiftyTwoWeekRangeLine: fiftyTwoWeekRangeLine
      };
    }));

      // Filter out null results
      const validPriceActions = priceActions.filter(action => action !== null);
      
      // Return immediately if we have valid actions
      if (validPriceActions.length === 0) {
        return NextResponse.json({ 
          priceActions: [], 
          error: 'No valid ticker data found. Please check that all ticker symbols are correct and try again.' 
        });
      }

      return NextResponse.json({ priceActions: validPriceActions });
    } else {
      // Regular modes (Price Action Only, Brief Analysis, Grouped) use Benzinga API ONLY
      // Use time-based market status (no Polygon API calls)
      const marketStatus = getMarketStatusTimeBased();
      let marketStatusPhrase = '';
      if (marketStatus === 'premarket') {
        marketStatusPhrase = ' during premarket trading';
      } else if (marketStatus === 'afterhours') {
        marketStatusPhrase = ' during after-hours trading';
      } else if (marketStatus === 'closed') {
        marketStatusPhrase = ' while the market was closed';
      } // if open, leave as empty string

      console.log('Market status (time-based for Benzinga):', marketStatus);

      const url = `https://api.benzinga.com/api/v2/quoteDelayed?token=${process.env.BENZINGA_API_KEY}&symbols=${cleanedTickers}`;

      console.log('Benzinga API URL:', url);

      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Benzinga API error: ${text}`);
      }
      const data = await res.json();

      console.log('Benzinga API raw response:', JSON.stringify(data, null, 2));

      if (!data || typeof data !== 'object') {
        return NextResponse.json({ priceActions: [], error: 'Invalid Benzinga response' });
      }

      // Check if Benzinga returned an empty array or object
      if (Array.isArray(data) && data.length === 0) {
        return NextResponse.json({ priceActions: [], error: 'Benzinga API returned no data. The ticker may not be available or markets may be closed.' });
      }

      const quotes = Object.values(data) as unknown[];
      
      if (quotes.length === 0) {
        return NextResponse.json({ priceActions: [], error: 'No ticker data found in Benzinga response.' });
      }

      const priceActions = await Promise.all(quotes.map(async (quote) => {
        if (typeof quote !== 'object' || quote === null) return null;

        const q = quote as BenzingaQuote;

        console.log('Parsed BenzingaQuote:', JSON.stringify(q, null, 2));

        const symbol = q.symbol ?? 'UNKNOWN';
        const companyName = q.name ?? symbol;
        const changePercent = typeof q.changePercent === 'number' ? q.changePercent : 0;
        const lastPrice = formatPrice(q.lastTradePrice);

        if (symbol === 'UNKNOWN' || !q.lastTradePrice) {
          console.log(`Skipping invalid quote for symbol: ${symbol}`);
          return null;
        }

        const upDown = changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'unchanged';
        const absChange = Math.abs(changePercent).toFixed(2);

        const date = q.closeDate ? new Date(q.closeDate) : new Date();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = dayNames[date.getDay()];

        let priceActionText = '';
        
        if (marketStatus === 'open') {
          priceActionText = `${symbol} Price Action: ${companyName} shares were ${upDown} ${absChange}% at $${lastPrice} at the time of publication on ${dayOfWeek}`;
        } else {
          priceActionText = `${symbol} Price Action: ${companyName} shares were ${upDown} ${absChange}% at $${lastPrice}${marketStatusPhrase} on ${dayOfWeek}`;
        }

        // Add 52-week range context if available
        if (q.fiftyTwoWeekLow && q.fiftyTwoWeekHigh && q.lastTradePrice) {
          const currentPrice = q.lastTradePrice;
          const yearLow = q.fiftyTwoWeekLow;
          const yearHigh = q.fiftyTwoWeekHigh;
          
          let rangeText = '';
          
          if (currentPrice > yearHigh) {
            rangeText = `. The stock is trading at a new 52-week high`;
          } else {
            const rangePosition = (currentPrice - yearLow) / (yearHigh - yearLow);
            
            if (rangePosition >= 0.95) {
              rangeText = `. The stock is trading near its 52-week high of $${formatPrice(yearHigh)}`;
            } else if (rangePosition <= 0.05) {
              rangeText = `. The stock is trading near its 52-week low of $${formatPrice(yearLow)}`;
            } else if (rangePosition >= 0.85) {
              rangeText = `. The stock is approaching its 52-week high of $${formatPrice(yearHigh)}`;
            } else if (rangePosition <= 0.15) {
              rangeText = `. The stock is near its 52-week low of $${formatPrice(yearLow)}`;
            }
          }
          
          if (rangeText) {
            priceActionText += rangeText;
          }
        }

        priceActionText += ', according to Benzinga Pro data.';

        if (briefAnalysis) {
          // Brief analysis for Benzinga mode
          let briefAnalysisText = '';
          try {
            let briefPrompt = '';
            
            if (marketStatus === 'afterhours' || marketStatus === 'premarket') {
              briefPrompt = `You are a financial news analyst. Write a single, concise, insightful analysis (2-3 sentences, no more than 60% the length of a typical news paragraph) about the following stock's global and historical context. Do NOT mention premarket, after-hours, or current price action or volume. Do not mention current session trading activity. Only mention a data point if it is notably high, low, or unusual. Do not mention data points that are within normal or average ranges. Be specific: if referencing the 52-week range, state if the price is near the high or low, or if there is a notable long-term trend, not just 'within the range'. If nothing is notable, say so briefly. Focus only on global or historical data points (52-week range, sector, industry, market cap, P/E ratio, regular session close, previous close, dividend yield, long-term trends). Avoid generic statements and do NOT repeat the price action line. Do not include the ticker in the analysis line.\n\nCompany: ${companyName}\nSector: ${q.sector || 'N/A'}\nIndustry: ${q.industry || 'N/A'}\nMarket Cap: $${q.marketCap ? (q.marketCap >= 1e12 ? (q.marketCap / 1e12).toFixed(2) + 'T' : (q.marketCap / 1e9).toFixed(2) + 'B') : 'N/A'}\nP/E Ratio: ${typeof q.pe === 'number' && q.pe > 0 ? q.pe : 'N/A'}\nDividend Yield: ${q.dividendYield || 'N/A'}\nRegular Close: $${formatPrice(q.close)}\nPrevious Close: $${formatPrice(q.previousClosePrice)}\n52-week Range: $${formatPrice(q.fiftyTwoWeekLow)} - $${formatPrice(q.fiftyTwoWeekHigh)}`;
            } else {
              briefPrompt = `You are a financial news analyst. Write a single, concise, insightful analysis (2-3 sentences, no more than 60% the length of a typical news paragraph) about the following stock's global and historical context. Do NOT mention current price action or volume. Only mention a data point if it is notably high, low, or unusual. Do not mention data points that are within normal or average ranges. Be specific: if referencing the 52-week range, state if the price is near the high or low, or if there is a notable long-term trend, not just 'within the range'. If nothing is notable, say so briefly. Focus only on global or historical data points (52-week range, sector, industry, market cap, P/E ratio, regular session close, previous close, dividend yield, long-term trends). Avoid generic statements and do NOT repeat the price action line. Do not include the ticker in the analysis line.\n\nCompany: ${companyName}\nSector: ${q.sector || 'N/A'}\nIndustry: ${q.industry || 'N/A'}\nMarket Cap: $${q.marketCap ? (q.marketCap >= 1e12 ? (q.marketCap / 1e12).toFixed(2) + 'T' : (q.marketCap / 1e9).toFixed(2) + 'B') : 'N/A'}\nP/E Ratio: ${typeof q.pe === 'number' && q.pe > 0 ? q.pe : 'N/A'}\nDividend Yield: ${q.dividendYield || 'N/A'}\nRegular Close: $${formatPrice(q.close)}\nPrevious Close: $${formatPrice(q.previousClosePrice)}\n52-week Range: $${formatPrice(q.fiftyTwoWeekLow)} - $${formatPrice(q.fiftyTwoWeekHigh)}`;
            }
            
            const completion = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [{ role: 'user', content: briefPrompt }],
              max_tokens: 100,
              temperature: 0.5,
            });
            briefAnalysisText = completion.choices[0].message?.content?.trim() || '';
          } catch {
            briefAnalysisText = 'Brief analysis unavailable due to an error.';
          }
          return {
            ticker: symbol,
            companyName: companyName,
            priceAction: priceActionText,
            briefAnalysis: briefAnalysisText
          };
        }

        if (priceActionOnly) {
          return {
            ticker: symbol,
            companyName: companyName,
            priceAction: priceActionText
          };
        }

        // For full analysis mode, generate technical analysis using Benzinga data
        let technicalAnalysis = '';
        const hasAnyTechnicalField = q.open || q.high || q.low || q.close;
        if (hasAnyTechnicalField) {
          // Get sector peers for comparison
          const sectorPeersData: BenzingaQuote[] = [];
          let peers = sectorPeers[symbol.toUpperCase()];
          if (!peers || peers.length === 0) {
            peers = universalPeers;
          }
          
          if (peers && peers.length > 0) {
            const peerSymbols = peers.join(',');
            const peerUrl = `https://api.benzinga.com/api/v2/quoteDelayed?token=${process.env.BENZINGA_API_KEY}&symbols=${peerSymbols}`;
            
            try {
              const peerRes = await fetch(peerUrl);
              if (peerRes.ok) {
                const peerData = await peerRes.json();
                if (peerData && typeof peerData === 'object') {
                  sectorPeersData.push(...Object.values(peerData) as BenzingaQuote[]);
                }
              }
            } catch (error) {
              console.log('Error fetching sector peers:', error);
            }
          }
          
          technicalAnalysis = await generateTechnicalAnalysisBenzinga(q, sectorPeersData);
        } else {
          technicalAnalysis = 'Full technical analysis is unavailable due to limited data.';
        }

        // Add 52-week range context if available
        let fiftyTwoWeekRangeLine = '';
        if (q.fiftyTwoWeekLow && q.fiftyTwoWeekHigh && q.lastTradePrice) {
          const currentPrice = q.lastTradePrice;
          const low = q.fiftyTwoWeekLow;
          const high = q.fiftyTwoWeekHigh;
          const rangePosition = (currentPrice - low) / (high - low);
          
          if (rangePosition >= 0.95 || currentPrice > high) {
            fiftyTwoWeekRangeLine = `The stock is trading near its 52-week high of $${formatPrice(high)}.`;
          } else if (rangePosition <= 0.05) {
            fiftyTwoWeekRangeLine = `The stock is trading near its 52-week low of $${formatPrice(low)}.`;
          } else if (rangePosition >= 0.8) {
            fiftyTwoWeekRangeLine = `The stock is trading in the upper end of its 52-week range of $${formatPrice(low)} to $${formatPrice(high)}.`;
          } else if (rangePosition <= 0.2) {
            fiftyTwoWeekRangeLine = `The stock is trading in the lower end of its 52-week range of $${formatPrice(low)} to $${formatPrice(high)}.`;
          } else {
            fiftyTwoWeekRangeLine = `The stock is trading within its 52-week range of $${formatPrice(low)} to $${formatPrice(high)}.`;
          }
        }
        
        return {
          ticker: symbol,
          companyName: companyName,
          priceAction: priceActionText,
          technicalAnalysis: technicalAnalysis,
          fiftyTwoWeekRangeLine: fiftyTwoWeekRangeLine
        };
      }));

      // Filter out null results and add error message for invalid tickers
      const validPriceActions = priceActions.filter(action => action !== null);
      
      // Check if we have any valid results
      if (validPriceActions.length === 0) {
        return NextResponse.json({ 
          priceActions: [], 
          error: 'No valid ticker data found. Please check that all ticker symbols are correct and try again.' 
        });
      }

      // If grouped is requested, handle single vs multiple tickers
      if (grouped) {
      if (validPriceActions.length === 1) {
        // For single ticker, return the price action only format (no technical analysis)
        const singleAction = validPriceActions[0];
        return NextResponse.json({ 
          priceActions: [{
            ticker: singleAction.ticker,
            companyName: singleAction.companyName,
            priceAction: singleAction.priceAction
          }]
        });
      } else if (validPriceActions.length > 1) {
        // For multiple tickers, create a grouped response
        // Extract just the company and price action parts (remove the ticker prefix, attribution, and time/date)
        const priceActionParts = validPriceActions.map(action => {
          // Remove the ticker prefix, "according to Benzinga" part, and time/date info
          let cleanAction = action.priceAction
            .replace(/^[A-Z]{1,5}\s+Price Action:\s*/, '') // Remove ticker prefix
            .replace(/,\s*according to Benzinga Pro data\.?$/, '') // Remove attribution
            .replace(/,\s*according to Benzinga Pro\.?$/, '') // Remove attribution (alternative format)
            .replace(/\s+at the time of publication on [A-Za-z]+\.?$/, '') // Remove time/date info
            .replace(/\.$/, ''); // Remove trailing period
          
          // Additional cleanup to remove any remaining time/date patterns
          cleanAction = cleanAction.replace(/\s+at the time of publication on [A-Za-z]+,\s*according to Benzinga Pro data\.?$/, '');
          cleanAction = cleanAction.replace(/\s+at the time of publication on [A-Za-z]+,\s*according to Benzinga Pro\.?$/, '');
          
          return cleanAction;
        });
        
        // Create a natural flowing sentence
        let groupedText = 'Price Action: ';
        
        if (priceActionParts.length === 2) {
          groupedText += priceActionParts[0] + ' and ' + priceActionParts[1];
        } else if (priceActionParts.length === 3) {
          groupedText += priceActionParts[0] + ', ' + priceActionParts[1] + ' and ' + priceActionParts[2];
        } else {
          // For 4 or more, use proper comma and "and" formatting
          const lastPart = priceActionParts.pop();
          groupedText += priceActionParts.join(', ') + ' and ' + lastPart;
        }
        
        groupedText += ' at the time of publication on Monday, according to Benzinga Pro data.';
        
        return NextResponse.json({ 
          priceActions: [{
            ticker: 'GROUPED',
            companyName: 'Multiple Companies',
            priceAction: groupedText,
            grouped: true,
            individualActions: validPriceActions
          }]
        });
      }
      }

      return NextResponse.json({ priceActions: validPriceActions });
    }
  } catch (error) {
    console.error('Error generating price actions:', error);
    return NextResponse.json({ priceActions: [], error: 'Failed to generate price actions.' });
  }
}

// Fallback function using the original bars endpoint approach
async function fetchHistoricalDataFallback(symbol: string, quote?: PolygonData): Promise<HistoricalData | null> {
  try {
    console.log(`=== FETCHING HISTORICAL DATA FALLBACK FOR ${symbol} ===`);
    
    // Helper function to fetch data for a specific period
    const fetchPeriodData = async (period: string, description: string) => {
      const url = `https://api.benzinga.com/api/v2/bars` +
        `?token=${process.env.BENZINGA_API_KEY}` +
        `&symbols=${symbol}` +
        `&from=${period}` +
        `&interval=1D`;

      console.log(`Fetching ${description} data for ${symbol}:`, url);

      const res = await fetch(url);
      if (!res.ok) {
        console.error(`Failed to fetch ${description} data for ${symbol}:`, res.statusText);
        return null;
      }

      const data = await res.json();
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.log(`No ${description} data found for ${symbol}`);
        return null;
      }

      // Find the data for our specific symbol
      const symbolData = data.find((item: { symbol: string; candles?: unknown[] }) => item.symbol === symbol);
      if (!symbolData || !symbolData.candles || !Array.isArray(symbolData.candles) || symbolData.candles.length === 0) {
        console.log(`No candle data found for ${symbol} in ${description}`);
        return null;
      }

      const candles = symbolData.candles;
      
      // Sort candles by date (oldest first)
      const sortedCandles = candles.sort((a: { dateTime: string }, b: { dateTime: string }) => 
        new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
      );

      return {
        startPrice: sortedCandles[0]?.close || 0,
        endPrice: sortedCandles[sortedCandles.length - 1]?.close || 0,
        startDate: sortedCandles[0]?.dateTime,
        endDate: sortedCandles[sortedCandles.length - 1]?.dateTime
      };
    };

    // Fetch data for each period using Benzinga's built-in shortcuts
    const [ytdData, threeMonthData, sixMonthData, oneYearData] = await Promise.all([
      fetchPeriodData('YTD', 'YTD'),
      fetchPeriodData('3MONTH', '3-month'),
      fetchPeriodData('6MONTH', '6-month'),
      fetchPeriodData('1YEAR', '1-year')
    ]);

    // Don't fetch monthly data here - we'll calculate it manually for true month-to-month
    // Removed monthlyData variable since we're not using it

    // Calculate returns function
    const calculateReturn = (startPrice: number, endPrice: number) => {
      if (startPrice === 0) return undefined;
      return ((endPrice - startPrice) / startPrice) * 100;
    };

    // Calculate true monthly return (previous month end to current month end)
    let trueMonthlyReturn = undefined;
    if (quote && quote.previousClosePrice) {
      console.log('=== CALCULATING TRUE MONTHLY RETURN ===');
      
      // Get the current date and calculate the previous month end
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Calculate the last day of the previous month
      const previousMonthEnd = new Date(currentYear, currentMonth, 0); // Day 0 = last day of previous month
      const formatDate = (date: Date) => date.toISOString().split('T')[0];
      
      console.log('Current date:', now.toISOString());
      console.log('Previous month end:', previousMonthEnd.toISOString());
      
      // Fetch data for the previous month end
      const previousMonthUrl = `https://api.benzinga.com/api/v2/bars` +
        `?token=${process.env.BENZINGA_API_KEY}` +
        `&symbols=${symbol}` +
        `&from=${formatDate(previousMonthEnd)}` +
        `&to=${formatDate(previousMonthEnd)}` +
        `&interval=1D`;

      console.log('Previous month URL:', previousMonthUrl);

      try {
        const prevMonthRes = await fetch(previousMonthUrl);
        console.log('Previous month response status:', prevMonthRes.status);
        
        if (prevMonthRes.ok) {
          const prevMonthData = await prevMonthRes.json();
          console.log('Previous month data received:', !!prevMonthData);
          
          if (prevMonthData && Array.isArray(prevMonthData) && prevMonthData.length > 0) {
            const prevMonthSymbolData = prevMonthData.find((item: { symbol: string; candles?: unknown[] }) => item.symbol === symbol);
            console.log('Previous month symbol data found:', !!prevMonthSymbolData);
            
            if (prevMonthSymbolData && prevMonthSymbolData.candles && prevMonthSymbolData.candles.length > 0) {
              const prevMonthCandle = prevMonthSymbolData.candles[0];
              const prevMonthClose = prevMonthCandle.close;
              const currentClose = quote.previousClosePrice || quote.close;
              
              console.log('Previous month end candle found:', prevMonthCandle.dateTime);
              console.log('Previous month close:', prevMonthClose);
              console.log('Current close:', currentClose);
              
              if (prevMonthClose && currentClose) {
                trueMonthlyReturn = calculateReturn(prevMonthClose, currentClose);
                console.log(`True monthly calculation (month-to-month): (${currentClose} - ${prevMonthClose}) / ${prevMonthClose} * 100 = ${trueMonthlyReturn}%`);
                console.log(`Previous month end: ${prevMonthCandle.dateTime} ($${prevMonthClose})`);
                console.log(`Current month end: ${getToday()} ($${currentClose})`);
              } else {
                console.log('Missing price data for true monthly calculation');
              }
            } else {
              console.log('No candle data found in previous month response');
            }
          } else {
            console.log('Previous month data is empty or invalid');
          }
        } else {
          console.log('Previous month API request failed:', prevMonthRes.statusText);
        }
      } catch (error) {
        console.log('True monthly calculation failed:', error);
      }
    }

    const historicalData: HistoricalData = {
      symbol,
      monthlyReturn: trueMonthlyReturn !== undefined ? trueMonthlyReturn : undefined,
      ytdReturn: ytdData ? calculateReturn(ytdData.startPrice, ytdData.endPrice) : undefined,
      threeMonthReturn: threeMonthData ? calculateReturn(threeMonthData.startPrice, threeMonthData.endPrice) : undefined,
      sixMonthReturn: sixMonthData ? calculateReturn(sixMonthData.startPrice, sixMonthData.endPrice) : undefined,
      oneYearReturn: oneYearData ? calculateReturn(oneYearData.startPrice, oneYearData.endPrice) : undefined
    };

    console.log(`Historical data for ${symbol}:`, historicalData);
    return historicalData;
    
  } catch (error) {
    console.error(`Error fetching historical data fallback for ${symbol}:`, error);
    return null;
  }
}