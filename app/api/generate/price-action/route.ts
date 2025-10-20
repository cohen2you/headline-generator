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
  averageVolume?: number;
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
  pe?: number | null;
  
  // Calculated from historical data
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  supportLevel?: number | null;
  resistanceLevel?: number | null;
  ytdReturn?: number | null;
  
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function truncateToTwoDecimals(num: number): number {
  return Math.floor(num * 100) / 100;
}

// Helper to format price with truncation or N/A
function formatPrice(val: number | string | undefined): string {
  if (val === undefined || val === null) return 'N/A';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num) || !isFinite(num)) return 'N/A';
  // Ensure we truncate to exactly 2 decimal places
  const truncated = Math.floor(num * 100) / 100;
  return truncated.toFixed(2);
}

// Helper to normalize company name capitalization (e.g., "NVIDIA" -> "Nvidia")
function normalizeCompanyName(name: string): string {
  if (!name) return name;
  
  // If the entire name is uppercase (like "NVIDIA"), convert to title case
  if (name === name.toUpperCase() && name.length > 1) {
    // Convert to title case: first letter uppercase, rest lowercase
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }
  
  // Otherwise return as-is (already has proper mixed case)
  return name;
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
    
    // Get the last trading day (skip weekends)
    const date = new Date();
    const dayOfWeek = date.getDay();
    
    // If today is Monday (1), go back to Friday (subtract 3 days)
    if (dayOfWeek === 1) {
      date.setDate(date.getDate() - 3);
    }
    // If today is Sunday (0), go back to Friday (subtract 2 days)
    else if (dayOfWeek === 0) {
      date.setDate(date.getDate() - 2);
    }
    // If today is Saturday (6), go back to Friday (subtract 1 day)
    else if (dayOfWeek === 6) {
      date.setDate(date.getDate() - 1);
    }
    // Otherwise, use yesterday
    else {
      date.setDate(date.getDate() - 1);
    }
    
    const yesterdayStr = date.toISOString().split('T')[0];
    console.log(`Using date: ${yesterdayStr} (${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]})`);
    
    const rsiUrl = `https://api.polygon.io/v1/indicators/rsi/${symbol}?timestamp=${yesterdayStr}&timespan=day&adjusted=true&window=14&series_type=close&order=desc&limit=1&apikey=${process.env.POLYGON_API_KEY}`;
    
    const response = await fetch(rsiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`RSI API returned status ${response.status} for ${symbol}`);
      console.log(`RSI API error response:`, errorText.substring(0, 200));
      return { rsi: undefined, signal: 'neutral' };
    }
    
    const data: PolygonRSI = await response.json();
    console.log(`RSI API response for ${symbol}:`, JSON.stringify(data).substring(0, 300));
    
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
    // Get the last trading day (skip weekends)
    const date = new Date();
    const dayOfWeek = date.getDay();
    
    if (dayOfWeek === 1) date.setDate(date.getDate() - 3); // Monday → Friday
    else if (dayOfWeek === 0) date.setDate(date.getDate() - 2); // Sunday → Friday
    else if (dayOfWeek === 6) date.setDate(date.getDate() - 1); // Saturday → Friday
    else date.setDate(date.getDate() - 1); // Otherwise yesterday
    
    const yesterdayStr = date.toISOString().split('T')[0];
    
    const smaUrl = `https://api.polygon.io/v1/indicators/sma/${symbol}?timestamp=${yesterdayStr}&timespan=day&adjusted=true&window=${window}&series_type=close&order=desc&limit=1&apikey=${process.env.POLYGON_API_KEY}`;
    
    const response = await fetch(smaUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`SMA-${window} API returned status ${response.status} for ${symbol}`);
      console.log(`SMA-${window} API error:`, errorText.substring(0, 200));
      return undefined;
    }
    
    const data: PolygonSMA = await response.json();
    console.log(`SMA-${window} response:`, JSON.stringify(data).substring(0, 200));
    
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
    // Get the last trading day (skip weekends)
    const date = new Date();
    const dayOfWeek = date.getDay();
    
    if (dayOfWeek === 1) date.setDate(date.getDate() - 3); // Monday → Friday
    else if (dayOfWeek === 0) date.setDate(date.getDate() - 2); // Sunday → Friday
    else if (dayOfWeek === 6) date.setDate(date.getDate() - 1); // Saturday → Friday
    else date.setDate(date.getDate() - 1); // Otherwise yesterday
    
    const yesterdayStr = date.toISOString().split('T')[0];
    
    const emaUrl = `https://api.polygon.io/v1/indicators/ema/${symbol}?timestamp=${yesterdayStr}&timespan=day&adjusted=true&window=${window}&series_type=close&order=desc&limit=1&apikey=${process.env.POLYGON_API_KEY}`;
    
    const response = await fetch(emaUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`EMA-${window} API returned status ${response.status} for ${symbol}`);
      console.log(`EMA-${window} API error:`, errorText.substring(0, 200));
      return undefined;
    }
    
    const data: PolygonEMA = await response.json();
    console.log(`EMA-${window} response:`, JSON.stringify(data).substring(0, 200));
    
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

// Function to fetch financial ratios from Polygon
async function fetchFinancialRatios(symbol: string): Promise<{
  averageVolume?: number;
  pe?: number;
  priceToBook?: number;
  priceToSales?: number;
  dividendYield?: number;
} | null> {
  try {
    const url = `https://api.polygon.io/stocks/financials/v1/ratios?ticker=${symbol}&apikey=${process.env.POLYGON_API_KEY}`;
    const res = await fetch(url);
    
    if (!res.ok) {
      console.log(`Ratios endpoint not available for ${symbol}`);
      return null;
    }
    
    const data = await res.json();
    if (!data?.results || data.results.length === 0) {
      return null;
    }
    
    const ratios = data.results[0];
    console.log(`Financial ratios for ${symbol}:`, {
      avgVolume: ratios.average_volume ? (ratios.average_volume / 1000000).toFixed(1) + 'M' : 'N/A',
      pe: ratios.price_to_earnings?.toFixed(2) || 'N/A',
      pb: ratios.price_to_book?.toFixed(2) || 'N/A',
      ps: ratios.price_to_sales?.toFixed(2) || 'N/A'
    });
    
    return {
      averageVolume: ratios.average_volume,
      pe: ratios.price_to_earnings,
      priceToBook: ratios.price_to_book,
      priceToSales: ratios.price_to_sales,
      dividendYield: ratios.dividend_yield
    };
  } catch (error) {
    console.error(`Error fetching ratios for ${symbol}:`, error);
    return null;
  }
}

// Function to calculate support and resistance levels from historical data
function calculateSupportResistance(historicalData: { h: number; l: number; c: number }[], currentPrice: number, symbol: string) {
  console.log(`=== CALCULATING SUPPORT/RESISTANCE FOR ${symbol} ===`);
  console.log(`Current price: $${currentPrice.toFixed(2)}`);
  console.log(`Historical data bars: ${historicalData?.length || 0}`);
  
  if (!historicalData || historicalData.length < 20) {
    console.log('Insufficient historical data for support/resistance calculation');
    return { support: null, resistance: null };
  }

  // Prioritize last 20 days for most recent levels, but keep 60 days for backup
  const last20Days = historicalData.slice(-20);
  const last60Days = historicalData.slice(-60);
  
  console.log(`Analyzing last 20 days (priority) and last 60 days (backup)`);
  
  // Find swing highs and lows with dates
  const findSwings = (data: typeof historicalData) => {
    const swingHighs: Array<{price: number; timestamp: number; index: number}> = [];
    const swingLows: Array<{price: number; timestamp: number; index: number}> = [];
    
    for (let i = 2; i < data.length - 2; i++) {
      const current = data[i];
      const prev2 = data[i - 2];
      const prev1 = data[i - 1];
      const next1 = data[i + 1];
      const next2 = data[i + 2];
      
      // Swing high: higher than 2 bars before and 2 bars after
      if (current.h > prev2.h && current.h > prev1.h && current.h > next1.h && current.h > next2.h) {
        swingHighs.push({price: current.h, timestamp: (current as { t?: number }).t || 0, index: i});
      }
      
      // Swing low: lower than 2 bars before and 2 bars after
      if (current.l < prev2.l && current.l < prev1.l && current.l < next1.l && current.l < next2.l) {
        swingLows.push({price: current.l, timestamp: (current as { t?: number }).t || 0, index: i});
      }
    }
    return { swingHighs, swingLows };
  };
  
  // Get swings from both timeframes
  const recent = findSwings(last20Days);
  const extended = findSwings(last60Days);
  
  console.log(`Recent (20d): ${recent.swingHighs.length} highs, ${recent.swingLows.length} lows`);
  console.log(`Extended (60d): ${extended.swingHighs.length} highs, ${extended.swingLows.length} lows`);
  
  // Combine and prioritize recent swings
  const allSwingHighs = [...recent.swingHighs, ...extended.swingHighs];
  const allSwingLows = [...recent.swingLows, ...extended.swingLows];
  
  // Remove duplicates (same price within $0.50)
  const uniqueHighs = allSwingHighs.filter((swing, index, arr) => 
    arr.findIndex(s => Math.abs(s.price - swing.price) < 0.5) === index
  );
  const uniqueLows = allSwingLows.filter((swing, index, arr) => 
    arr.findIndex(s => Math.abs(s.price - swing.price) < 0.5) === index
  );
  
  console.log(`Unique swing highs:`, uniqueHighs.slice(0, 5).map(s => `$${s.price.toFixed(2)} (${new Date(s.timestamp).toISOString().slice(0, 10)})`));
  console.log(`Unique swing lows:`, uniqueLows.slice(0, 5).map(s => `$${s.price.toFixed(2)} (${new Date(s.timestamp).toISOString().slice(0, 10)})`));
  
  // Filter resistance candidates: above current price AND within 15% (tighter range)
  // Prioritize swings from last 20 days, only use older if none found
  const now = Date.now();
  const twentyDaysAgo = now - (20 * 24 * 60 * 60 * 1000);
  
  let resistanceCandidates = uniqueHighs
    .filter(s => s.price > currentPrice && s.price < currentPrice * 1.15 && s.timestamp > twentyDaysAgo)
    .sort((a, b) => a.price - b.price); // Sort by price (lowest first)
  
  // If no recent resistance found, look in extended range but still within 15%
  if (resistanceCandidates.length === 0) {
    resistanceCandidates = uniqueHighs
      .filter(s => s.price > currentPrice && s.price < currentPrice * 1.15)
      .sort((a, b) => a.price - b.price);
  }
  
  // Filter support candidates: below current price AND within 15% (tighter range)
  let supportCandidates = uniqueLows
    .filter(s => s.price < currentPrice && s.price > currentPrice * 0.85 && s.timestamp > twentyDaysAgo)
    .sort((a, b) => b.price - a.price); // Sort by price (highest first)
  
  // If no recent support found, look in extended range but still within 15%
  if (supportCandidates.length === 0) {
    supportCandidates = uniqueLows
      .filter(s => s.price < currentPrice && s.price > currentPrice * 0.85)
      .sort((a, b) => b.price - a.price);
  }
  
  // Select the nearest meaningful levels
  const resistance = resistanceCandidates.length > 0 ? resistanceCandidates[0].price : null;
  const resistanceDate = resistanceCandidates.length > 0 ? new Date(resistanceCandidates[0].timestamp).toISOString().slice(0, 10) : null;
  const resistanceRecent = resistanceCandidates.length > 0 && resistanceCandidates[0].timestamp > twentyDaysAgo;
  
  const support = supportCandidates.length > 0 ? supportCandidates[0].price : null;
  const supportDate = supportCandidates.length > 0 ? new Date(supportCandidates[0].timestamp).toISOString().slice(0, 10) : null;
  const supportRecent = supportCandidates.length > 0 && supportCandidates[0].timestamp > twentyDaysAgo;
  
  console.log(`Selected support: ${support ? '$' + support.toFixed(2) + ' (' + supportDate + ')' + (supportRecent ? ' [RECENT]' : ' [OLDER]') : 'N/A'} (highest swing low below current, within 15%)`);
  console.log(`Selected resistance: ${resistance ? '$' + resistance.toFixed(2) + ' (' + resistanceDate + ')' + (resistanceRecent ? ' [RECENT]' : ' [OLDER]') : 'N/A'} (lowest swing high above current, within 15%)`);
  
  return { support, resistance };
}

// Main function to fetch all Polygon data for a ticker
async function fetchPolygonData(symbol: string): Promise<PolygonData> {
  try {
    console.log(`=== FETCHING POLYGON DATA FOR ${symbol} ===`);
    
    const [snapshotRes, overviewRes, historicalRes, rsiData, sma50, sma200, ema50, ema200, ratios] = await Promise.all([
      // Get real-time data
      fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}?apikey=${process.env.POLYGON_API_KEY}`),
      
      // Get company information
      fetch(`https://api.polygon.io/v3/reference/tickers/${symbol}?apikey=${process.env.POLYGON_API_KEY}`),
      
      // Get 1-year historical data for 52-week range and support/resistance
      fetch(`https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${getOneYearAgo()}/${getToday()}?adjusted=true&apikey=${process.env.POLYGON_API_KEY}`),
      
      // Get technical indicators
      fetchRSI(symbol),
      fetchSMA(symbol, 50),
      fetchSMA(symbol, 200),
      fetchEMA(symbol, 50),
      fetchEMA(symbol, 200),
      
      // Get financial ratios (includes average volume and P/E)
      fetchFinancialRatios(symbol)
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
    
    // Get financial ratios data (P/E, average volume, etc.)
    const averageVolume = ratios?.averageVolume || null;
    const peRatio = ratios?.pe || null;
    // Additional ratios available but not currently used
    // const priceToBook = ratios?.priceToBook || null;
    // const dividendYield = ratios?.dividendYield || null;

    // Calculate support and resistance levels from historical data
    const { support, resistance } = calculateSupportResistance(historical.results || [], currentPrice, symbol);

    // Calculate YTD performance
    let ytdReturn = null;
    if (historical.results && historical.results.length > 0) {
      const currentYear = new Date().getFullYear();
      const ytdStart = new Date(currentYear, 0, 1).getTime(); // January 1st
      
      // Find the first trading day of the year
      const ytdBar = historical.results.find((bar: { t: number }) => bar.t >= ytdStart);
      if (ytdBar && ytdBar.c && currentPrice) {
        ytdReturn = ((currentPrice - ytdBar.c) / ytdBar.c) * 100;
        console.log(`YTD Performance: ${ytdReturn.toFixed(1)}% (from $${ytdBar.c.toFixed(2)} on ${new Date(ytdBar.t).toISOString().slice(0, 10)})`);
      }
    }

    const polygonData: PolygonData = {
      // Snapshot data
      currentPrice,
      todaysChange,
      todaysChangePerc,
      previousClose,
      volume,
      averageVolume: averageVolume || undefined,
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
      pe: peRatio,
      
      // Calculated data
      fiftyTwoWeekHigh,
      fiftyTwoWeekLow: fiftyTwoWeekLow === Infinity ? 0 : fiftyTwoWeekLow,
      supportLevel: support,
      resistanceLevel: resistance,
      ytdReturn,
      
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

// Unified Full Analysis for Benzinga API data - generates one complete text block
async function generateUnifiedFullAnalysisBenzinga(priceActionText: string, quote: BenzingaQuote, sectorComparison?: BenzingaQuote[]): Promise<string> {
  try {
    // Sector comparison is available but not currently used in the prompt
    // Keeping the logic for future enhancement
    if (sectorComparison && sectorComparison.length > 0) {
      const comparisonData = sectorComparison.map(stock => {
        const formattedMarketCap = typeof stock.marketCap === 'number'
          ? (stock.marketCap >= 1000000000000
              ? (stock.marketCap / 1000000000000).toFixed(2) + 'T'
              : (stock.marketCap / 1000000000).toFixed(2) + 'B')
          : 'N/A';
        const volume = typeof stock.volume === 'number' ? `${(stock.volume / 1000000).toFixed(1)} million` : 'N/A';
        const changePercent = typeof stock.changePercent === 'number' ? `${stock.changePercent.toFixed(2)}%` : 'N/A';
        const pe = typeof stock.pe === 'number' && stock.pe > 0 ? stock.pe.toFixed(2) : 'N/A';
        const symbol = typeof stock.symbol === 'string' ? stock.symbol : 'N/A';
        return `${symbol}: Price $${formatPrice(stock.lastTradePrice)}, Change ${changePercent}, Volume ${volume}, Market Cap ${formattedMarketCap}, P/E: ${pe}`;
      }).join('\n');
      
      const isSectorETF = sectorComparison.some(stock => ['XLI', 'XLF', 'XLK', 'XLV', 'XLE', 'XLP', 'XLY'].includes(stock.symbol || ''));
      const comparisonType = isSectorETF ? 'Sector ETF Comparison' : 'Sector Comparison';
      // Sector comparison text prepared but not currently used in prompt
      console.log(`${comparisonType}:\n${comparisonData}`);
    }

    // Get day of week for context
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    const dayOfWeek = dayNames[today.getDay()];
    
    // Calculate percentage distances from moving averages
    const sma50Pct = quote.fiftyDayAveragePrice && quote.lastTradePrice 
      ? (((quote.lastTradePrice - quote.fiftyDayAveragePrice) / quote.fiftyDayAveragePrice) * 100).toFixed(1)
      : null;
    const sma200Pct = quote.twoHundredDayAveragePrice && quote.lastTradePrice
      ? (((quote.lastTradePrice - quote.twoHundredDayAveragePrice) / quote.twoHundredDayAveragePrice) * 100).toFixed(1)
      : null;
    
    const prompt = `You are a financial analyst writing a complete market analysis. Create a unified, flowing analysis that seamlessly continues from the provided price action information.

PRICE ACTION CONTEXT:
${priceActionText}

STOCK DATA:
Stock: ${quote.symbol} (${quote.name})
Current Price: $${formatPrice(quote.lastTradePrice)}
Daily Change: ${quote.changePercent}%

Technical Indicators:
- 50-day Moving Average: ${sma50Pct ? `${Math.abs(parseFloat(sma50Pct))}% ${parseFloat(sma50Pct) >= 0 ? 'above' : 'below'}` : 'N/A'}
- 200-day Moving Average: ${sma200Pct ? `${Math.abs(parseFloat(sma200Pct))}% ${parseFloat(sma200Pct) >= 0 ? 'above' : 'below'}` : 'N/A'}
- 52-week Range: $${formatPrice(quote.fiftyTwoWeekLow)} - $${formatPrice(quote.fiftyTwoWeekHigh)}
- Volume: ${quote.volume ? (quote.volume / 1000000).toFixed(1) + ' million' : 'N/A'}

Intraday Data:
- Open: $${formatPrice(quote.open)}
- High: $${formatPrice(quote.high)}
- Low: $${formatPrice(quote.low)}
- Close: $${formatPrice(quote.close)}

Day of Week: ${dayOfWeek}

TASK: Write a complete unified analysis that flows naturally from the price action context. Your response should be the ENTIRE analysis from start to finish, including the price action information seamlessly integrated with technical analysis.

FORMAT YOUR RESPONSE AS:
${priceActionText} [Continue seamlessly with technical analysis, moving averages, volume analysis, support/resistance levels, and overall market outlook in multiple short paragraphs.]

CRITICAL RULES:
- Write the COMPLETE unified analysis - include the price action context naturally
- DO NOT use separate headers or labels
- DO NOT repeat the price action information - build upon it
- Use PERCENTAGES for moving averages (e.g., "trading 4.4% above its 50-day moving average" OR "trading above its 50-day moving average of $259.58")
- DO NOT combine dollar value AND percentage in confusing ways (e.g., DON'T say "above its 50-day moving average of $259.58, which is approximately 2.3% higher")
- PREFERRED FORMAT: "trading approximately 2.3% above its 50-day moving average" (percentage only, more concise)
- Use ${dayOfWeek} when mentioning volume timing
- Include support/resistance levels and overall technical outlook
- Break content into SHORT paragraphs - MAXIMUM 2 sentences per paragraph
- DO NOT use summary phrases like "In summary", "In conclusion", "Overall", "To summarize"
- Use plain text only - no special formatting or markup
- Write as one continuous, professional analysis with natural paragraph breaks`;

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

// Unified Full Analysis for Polygon API data - generates one complete text block
async function generateUnifiedFullAnalysis(priceActionText: string, quote: PolygonData, sectorComparison?: PolygonData[], marketStatus?: string): Promise<string> {
  try {
    // Market status is used in the AI prompt to adjust instructions for after-hours analysis
    const isAfterHours = marketStatus === 'afterhours' || false;
    
    // Calculate Market Cap comparisons with sector peers (P/E often not available from Polygon)
    let sectorComparisonText = '';
    if (sectorComparison && sectorComparison.length > 0) {
      // Format peer comparison data - focus on Market Cap which is always available
      const peerData = sectorComparison.map(stock => {
        const formattedMarketCap = typeof stock.marketCap === 'number' && stock.marketCap > 0
          ? (stock.marketCap >= 1000000000000
              ? (stock.marketCap / 1000000000000).toFixed(2) + 'T'
              : (stock.marketCap / 1000000000).toFixed(2) + 'B')
          : 'N/A';
        const symbol = typeof stock.symbol === 'string' ? stock.symbol : 'N/A';
        return `${symbol}: Market Cap ${formattedMarketCap}`;
      }).join('\n');
      
      const comparisonType = 'Related Companies';
      
      // Calculate main stock's market cap for context
      const mainMarketCap = typeof quote.marketCap === 'number' && quote.marketCap > 0
        ? (quote.marketCap >= 1000000000000
            ? (quote.marketCap / 1000000000000).toFixed(2) + 'T'
            : (quote.marketCap / 1000000000).toFixed(2) + 'B')
        : 'N/A';
      
      sectorComparisonText = `\n\n${comparisonType}:\n${peerData}\n${quote.symbol}: Market Cap ${mainMarketCap}`;
    }

    // Get day of week for context
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    const dayOfWeek = dayNames[today.getDay()];
    
    // Calculate percentage distances from moving averages
    const sma50Pct = quote.sma50 && quote.lastTradePrice 
      ? (((quote.lastTradePrice - quote.sma50) / quote.sma50) * 100).toFixed(1)
      : null;
    const sma200Pct = quote.sma200 && quote.lastTradePrice
      ? (((quote.lastTradePrice - quote.sma200) / quote.sma200) * 100).toFixed(1)
      : null;
    
    // Check if volume data is available and meaningful
    // During market hours, volume is incomplete and misleading - skip it
    // Only analyze volume when market is closed (comparing full day to average)
    const currentMarketStatus = await getMarketStatus();
    const hasVolume = currentMarketStatus === 'closed' && quote.volume && quote.volume > 0;
    
    const prompt = `You are a financial analyst writing a complete market analysis. Create a unified, flowing analysis that seamlessly continues from the provided price action information.

PRICE ACTION CONTEXT:
${priceActionText}

STOCK DATA:
Stock: ${quote.symbol} (${quote.name})
Current Price: $${formatPrice(quote.lastTradePrice)}
Daily Change: ${quote.changePercent}%${isAfterHours ? ' (combined regular + after-hours)' : ''}
YTD Performance: ${quote.ytdReturn ? quote.ytdReturn.toFixed(1) + '%' : 'N/A'}
Market Cap: ${quote.marketCap ? (quote.marketCap >= 1000000000000 ? (quote.marketCap / 1000000000000).toFixed(2) + 'T' : (quote.marketCap / 1000000000).toFixed(2) + 'B') : 'N/A'}
RSI: ${quote.rsi ? quote.rsi.toFixed(2) : 'N/A'}
RSI Signal: ${quote.rsiSignal || 'neutral'}

Technical Indicators:
- 50-day Moving Average: $${formatPrice(quote.sma50)} (${sma50Pct ? `${Math.abs(parseFloat(sma50Pct))}% ${parseFloat(sma50Pct) >= 0 ? 'above' : 'below'}` : 'N/A'})
- 200-day Moving Average: $${formatPrice(quote.sma200)} (${sma200Pct ? `${Math.abs(parseFloat(sma200Pct))}% ${parseFloat(sma200Pct) >= 0 ? 'above' : 'below'}` : 'N/A'})
- 52-week Range: $${formatPrice(quote.fiftyTwoWeekLow)} - $${formatPrice(quote.fiftyTwoWeekHigh)}
- Previous Close: $${formatPrice(quote.previousClosePrice)}
- Current Volume: ${hasVolume ? (quote.volume / 1000000).toFixed(1) + ' million' : 'N/A (too early in session)'}
- Average Volume (30-day): ${quote.averageVolume ? (quote.averageVolume / 1000000).toFixed(1) + ' million' : 'N/A'}

Support/Resistance Levels (calculated from recent price action):
- Support: ${quote.supportLevel ? '$' + formatPrice(quote.supportLevel) : 'N/A'}
- Resistance: ${quote.resistanceLevel ? '$' + formatPrice(quote.resistanceLevel) : 'N/A'}
${sectorComparisonText}

Day of Week: ${dayOfWeek}

TASK: Write a complete unified analysis that flows naturally from the price action context. Your response should be the ENTIRE analysis from start to finish, including the price action information seamlessly integrated with technical analysis.

FORMAT YOUR RESPONSE AS:
${priceActionText} [Continue seamlessly with technical analysis, moving averages, ${hasVolume ? 'volume analysis,' : ''} support/resistance levels, and overall market outlook in multiple short paragraphs.]

CRITICAL RULES:
- Write the COMPLETE unified analysis - include the price action context naturally
- DO NOT use separate headers or labels
- DO NOT repeat the price action information - build upon it
- ALWAYS use day of week (Monday, Tuesday, etc.) - NEVER use "today", "yesterday", or "this week"
- ${isAfterHours ? 'The price action shows SEPARATE regular session and after-hours changes - DO NOT reference the combined daily change percentage, reference the specific session changes mentioned in the price action context' : 'Use the daily change percentage when referencing price movement'}
- Use PERCENTAGES for moving averages (e.g., "trading 4.4% above its 50-day moving average" OR "trading above its 50-day moving average of $259.58")
- DO NOT combine dollar value AND percentage in confusing ways (e.g., DON'T say "above its 50-day moving average of $259.58, which is approximately 2.3% higher")
- PREFERRED FORMAT: "trading approximately 2.3% above its 50-day moving average" (percentage only, more concise)
- VERIFY THE DIRECTION (e.g., if price is $710 and MA is $670, the price is ABOVE the MA, not below)
- ${hasVolume ? `When mentioning volume, ALWAYS compare to the 30-day average volume provided (e.g., "above average at X million vs Y million average" or "below average")` : 'DO NOT mention volume or volume analysis at all - market is still open and volume is incomplete/misleading'}
- For support/resistance levels, use the CALCULATED support/resistance levels provided (based on recent swing highs/lows from chart data)
- If calculated support is N/A (common for high-momentum stocks), use the 50-day MA as the primary support level instead
- If calculated resistance is N/A, use the 52-week high or psychological round numbers as resistance
- You can also reference the 50-day MA, 200-day MA, 52-week high/low, or psychological round numbers as additional levels
- DO NOT use intraday highs/lows for support/resistance - these are temporary and not meaningful
- If YTD performance is provided, weave it naturally into the analysis to provide year-long context (e.g., "up 45% year-to-date despite today's pullback")
- If related companies comparison data is provided, briefly mention the market cap positioning relative to peers in ONE sentence (e.g., "among the largest", "mid-sized player", etc.)
- DO NOT focus heavily on peer comparison - it should be contextual, not a main point
- Break content into SHORT paragraphs - MAXIMUM 2 sentences per paragraph
- DO NOT use summary phrases like "In summary", "In conclusion", "Overall", "To summarize", "As the market continues", "monitoring these levels will be crucial"
- DO NOT repeat information or restate points already made
- End with a SPECIFIC technical insight about the current setup, NOT with generic statements about "staying attuned" or "monitoring" 
- Keep total length to 4-5 short paragraphs maximum (NOT 6+)
- Use plain text only - no special formatting or markup
- Write as one continuous, professional analysis with natural paragraph breaks`;

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
    // Use Polygon's Related Companies endpoint to get dynamic peers
    const relatedUrl = `https://api.polygon.io/v1/related-companies/${symbol}?apikey=${process.env.POLYGON_API_KEY}`;
    
    const relatedRes = await fetch(relatedUrl);
    if (!relatedRes.ok) {
      console.error('Failed to fetch related companies from Polygon:', relatedRes.statusText);
      return [];
    }
    
    const relatedData = await relatedRes.json();
    if (!relatedData?.results || !Array.isArray(relatedData.results)) {
      console.log('No related companies found for', symbol);
      return [];
    }
    
    // Get top 3 related tickers
    const relatedTickers = relatedData.results.slice(0, 3).map((item: { ticker: string }) => item.ticker);
    
    if (relatedTickers.length === 0) {
      return [];
    }
    
    console.log(`Found related companies for ${symbol}:`, relatedTickers);
    
    // Fetch Polygon data for each related ticker
    const peerDataPromises = relatedTickers.map((ticker: string) => 
      fetchPolygonData(ticker).catch(err => {
        console.error(`Failed to fetch data for peer ${ticker}:`, err);
        return null;
      })
    );
    
    const peerDataArray = await Promise.all(peerDataPromises);
    
    // Filter out any failed fetches
    return peerDataArray.filter((data): data is PolygonData => data !== null);
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
    if (smartAnalysis || vsAnalysis || (!priceActionOnly && !briefAnalysis && !grouped)) {
      // Smart Price Action, Vs Analysis, and Full Analysis use Polygon API
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

        // Build technical context - choose EITHER MA or RSI, not both
        let technicalContext = '';
        
        // First check for significant MA signals
        if (polygonData.sma50 && polygonData.sma200) {
          const distanceFrom50 = ((currentPrice - polygonData.sma50) / polygonData.sma50) * 100;
          const distanceFrom200 = ((currentPrice - polygonData.sma200) / polygonData.sma200) * 100;
          
          // Check for golden cross or death cross (priority)
          if (polygonData.sma50 > polygonData.sma200 && Math.abs(polygonData.sma50 - polygonData.sma200) / polygonData.sma200 < 0.02) {
            technicalContext = ` as the 50-day moving average crosses above the 200-day`;
          } else if (polygonData.sma50 < polygonData.sma200 && Math.abs(polygonData.sma50 - polygonData.sma200) / polygonData.sma200 < 0.02) {
            technicalContext = ` while the 50-day moving average tests the 200-day from below`;
          } 
          // Otherwise show percentage distance from MA
          else if (Math.abs(distanceFrom50) > 3) {
            // Use 50-day if distance is significant
            if (distanceFrom50 > 0) {
              technicalContext = `. The stock is trading ${distanceFrom50.toFixed(1)}% above its 50-day moving average`;
            } else {
              technicalContext = `. The stock is trading ${Math.abs(distanceFrom50).toFixed(1)}% below its 50-day moving average`;
            }
          } else if (Math.abs(distanceFrom200) > 5) {
            // Use 200-day if distance is significant
            if (distanceFrom200 > 0) {
              technicalContext = `. The stock is trading ${distanceFrom200.toFixed(1)}% above its 200-day moving average`;
            } else {
              technicalContext = `. The stock is trading ${Math.abs(distanceFrom200).toFixed(1)}% below its 200-day moving average`;
            }
          }
        }
        
        // If no MA context, use RSI
        if (!technicalContext && polygonData.rsi !== undefined) {
          const rsiValue = polygonData.rsi.toFixed(1);
          if (polygonData.rsiSignal === 'overbought') {
            technicalContext = ` with an RSI of ${rsiValue} suggesting overbought conditions`;
          } else if (polygonData.rsiSignal === 'oversold') {
            technicalContext = ` with an RSI of ${rsiValue} suggesting oversold conditions`;
          } else if (polygonData.rsi > 60) {
            technicalContext = ` with an RSI of ${rsiValue} indicating strong momentum`;
          } else if (polygonData.rsi < 40) {
            technicalContext = ` with an RSI of ${rsiValue} showing weak momentum`;
          }
        }

        // Determine narrative type using Polygon data
        const dailyChange = ((polygonClose - polygonOpen) / polygonOpen) * 100;
        const intradayRange = ((polygonHigh - polygonLow) / polygonLow) * 100;
        // Volume analysis removed per user request

          if (Math.abs(distanceFromHigh) < 5) {
          // Near 52-week high
          narrativeType = 'momentum';
          const distanceFromHighPct = Math.abs(distanceFromHigh).toFixed(1);
          smartPriceActionText += `, trading ${distanceFromHighPct}% below its 52-week high`;
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
            // Calculate distance from both high and low
            console.log(`${symbol} 52-week range: High=$${polygonData.fiftyTwoWeekHigh}, Low=$${polygonData.fiftyTwoWeekLow}, Current=$${polygonClose}`);
            const distFromHigh = ((polygonData.fiftyTwoWeekHigh - polygonClose) / polygonData.fiftyTwoWeekHigh) * 100;
            const distFromLow = ((polygonClose - polygonData.fiftyTwoWeekLow) / polygonData.fiftyTwoWeekLow) * 100;
            console.log(`${symbol} distances: ${distFromHigh.toFixed(1)}% from high, ${distFromLow.toFixed(1)}% from low`);
            
            // Show distance from whichever is closer
            if (distFromHigh < distFromLow) {
              // Closer to high
              smartPriceActionText += `. The stock is ${distFromHigh.toFixed(1)}% below its 52-week high`;
            } else {
              // Closer to low
              smartPriceActionText += `. The stock is ${distFromLow.toFixed(1)}% above its 52-week low`;
            }
          }
          if (technicalContext) smartPriceActionText += `${technicalContext}`;
        } else {
          // Range-bound trading
          narrativeType = 'range';

          if (polygonData.fiftyTwoWeekLow && polygonData.fiftyTwoWeekHigh && polygonClose) {
            // Calculate distance from both high and low
            const distFromHigh = ((polygonData.fiftyTwoWeekHigh - polygonClose) / polygonData.fiftyTwoWeekHigh) * 100;
            const distFromLow = ((polygonClose - polygonData.fiftyTwoWeekLow) / polygonData.fiftyTwoWeekLow) * 100;
            
            // Show distance from whichever is closer
            if (distFromHigh < distFromLow) {
              // Closer to high
              smartPriceActionText += `, trading ${distFromHigh.toFixed(1)}% below its 52-week high`;
            } else {
              // Closer to low
              smartPriceActionText += `, trading ${distFromLow.toFixed(1)}% above its 52-week low`;
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
- CRITICAL: If the text says "X% below its 52-week high" or "X% above its 52-week low", keep those EXACT percentages and phrasing
- CRITICAL: If the text says "X% above/below its 50-day moving average" or "X% above/below its 200-day moving average", keep those EXACT percentages
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

        // Helper function to format percentages (remove .0 for whole numbers)
        const formatPct = (num: number) => {
          const rounded = parseFloat(num.toFixed(1));
          return rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
        };
        
        // Calculate percentage distances for primary ticker
        const primaryDistFromHigh = primaryData.fiftyTwoWeekHigh ? ((primaryData.fiftyTwoWeekHigh - primaryData.lastTradePrice) / primaryData.fiftyTwoWeekHigh) * 100 : 0;
        const primaryDistFromLow = primaryData.fiftyTwoWeekLow ? ((primaryData.lastTradePrice - primaryData.fiftyTwoWeekLow) / primaryData.fiftyTwoWeekLow) * 100 : 0;
        const primary52WeekContext = primaryDistFromHigh < primaryDistFromLow 
          ? `${formatPct(primaryDistFromHigh)}% below its 52-week high`
          : `${formatPct(primaryDistFromLow)}% above its 52-week low`;
        
        // Calculate MA percentage for primary ticker (choose one)
        let primaryMAContext = '';
        if (primaryData.sma50 && primaryData.sma200) {
          const distFrom50 = ((primaryData.lastTradePrice - primaryData.sma50) / primaryData.sma50) * 100;
          const distFrom200 = ((primaryData.lastTradePrice - primaryData.sma200) / primaryData.sma200) * 100;
          
          if (Math.abs(distFrom50) > 3) {
            primaryMAContext = distFrom50 > 0 
              ? `${formatPct(distFrom50)}% above its 50-day MA` 
              : `${formatPct(Math.abs(distFrom50))}% below its 50-day MA`;
          } else if (Math.abs(distFrom200) > 5) {
            primaryMAContext = distFrom200 > 0 
              ? `${formatPct(distFrom200)}% above its 200-day MA` 
              : `${formatPct(Math.abs(distFrom200))}% below its 200-day MA`;
          }
        }

        const comparisonPrompt = `You are a financial analyst writing a concise comparative price action analysis. Today is ${dayOfWeek}, ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. Compare the primary ticker against the comparison tickers.

PRIMARY TICKER: ${primarySymbol}
- Current Price: $${primaryData.lastTradePrice.toFixed(2)}
- Daily Change: ${formatPct(primaryData.changePercent)}%
- Market Status: ${timingPhrase}
- 52-week position: ${primary52WeekContext}
${primaryMAContext ? `- Moving Average: ${primaryMAContext}` : ''}
${primaryData.rsi !== undefined ? `- RSI: ${formatPct(primaryData.rsi)}` : ''}
${primaryHistorical ? `- YTD: ${formatPct(primaryHistorical.ytdReturn)}%, 6-month: ${formatPct(primaryHistorical.sixMonthReturn)}%, 1-year: ${formatPct(primaryHistorical.oneYearReturn)}%` : ''}

COMPARISON TICKERS:
${comparisonData.map(t => {
  const hist = comparisonHistorical.find(h => h.symbol === t.symbol);
  return `${t.symbol}: $${t.lastTradePrice.toFixed(2)}${hist ? `, YTD: ${formatPct(hist.ytdReturn)}%, 6M: ${formatPct(hist.sixMonthReturn)}%, 1Y: ${formatPct(hist.oneYearReturn)}%` : ''}`;
}).join('\n')}

Write a concise comparative analysis in 3 short paragraphs with natural, conversational flow.

REQUIREMENTS:
- Start with: "${primarySymbol} Vs. ${comparisonSymbols.join(', ')}: " followed IMMEDIATELY by the first sentence (no line break)
- First paragraph: Include timing (${timingPhrase}), price, daily change, 52-week position (use exact data provided). Add EITHER the MA percentage OR RSI if provided. Use natural transitions between facts.
- Second paragraph: Compare YTD returns - keep it simple and conversational
- Third paragraph: Compare 6-month and 1-year returns briefly
- Each paragraph: 2-3 sentences - concise but with natural flow
- Write like you're talking to someone, not writing a data sheet
- Avoid obvious filler: "comfortable", "robust", "impressive", "showcasing", "teetering", "warranted", "solid"
- Avoid redundancy: Don't say the same thing twice ("slipped...settling", "declined...down")
- Use natural transitions: "Over the past year", "Looking back", "On the technical side" - but don't overuse them
- Keep it factual but conversational
- Keep total under 180 words
- Do NOT include any "according to Polygon data" attribution anywhere`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a financial analyst who writes concise market comparisons with natural, conversational flow. Keep it brief but readable."
            },
            {
              role: "user", 
              content: comparisonPrompt
            }
          ],
          max_tokens: 350,
          temperature: 0.6,
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
        // No attribution needed for Full Analysis
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
            max_tokens: 200,
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

      // Generate unified Full Analysis using OpenAI - one complete text block
      let fullAnalysisText = '';
      // Use polygonData.close if available, otherwise polygonData.lastTradePrice or previousClose
      const closeValue = polygonData.close ?? polygonData.lastTradePrice ?? polygonData.previousClose;
      // Check if at least one technical field is present (expanded to include previousClose)
      const hasAnyTechnicalField = polygonData.open || polygonData.high || polygonData.low || closeValue || polygonData.previousClose;
      if (hasAnyTechnicalField) {
        // Patch the polygonData object to always have a close value
        const patchedQuote = { ...polygonData, close: closeValue };
        // Get sector peers for comparison
        const sectorPeers = await getSectorPeers(symbol);
        fullAnalysisText = await generateUnifiedFullAnalysis(priceActionText, patchedQuote, sectorPeers, marketStatus);
      } else {
        fullAnalysisText = priceActionText + ' Full technical analysis is unavailable due to limited data.';
      }

      // Clean the unified text to remove any special characters that WordPress might interpret as code
      const cleanedFullAnalysis = fullAnalysisText
        .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
        .replace(/\u00A0/g, ' ') // Replace non-breaking spaces with regular spaces
        .replace(/\r\n/g, '\n') // Normalize line endings
        .trim();
      
      // Return unified Full Analysis
      return {
        ticker: symbol,
        companyName: companyName,
        priceAction: priceActionText,
        fullAnalysis: cleanedFullAnalysis
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
        const companyName = normalizeCompanyName(q.name ?? symbol);
        
        if (symbol === 'UNKNOWN' || !q.lastTradePrice) {
          console.log(`Skipping invalid quote for symbol: ${symbol}`);
          return null;
        }

        const changePercent = typeof q.changePercent === 'number' ? q.changePercent : 0;
        // Format price to ensure exactly 2 decimal places - moved after validation
        const lastPrice = formatPrice(q.lastTradePrice);
        console.log(`[${symbol}] Raw lastTradePrice:`, q.lastTradePrice, `typeof:`, typeof q.lastTradePrice, `Formatted lastPrice:`, lastPrice, `typeof formatted:`, typeof lastPrice);

        const upDown = changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'unchanged';
        const absChange = Math.abs(changePercent).toFixed(2);

        const date = q.closeDate ? new Date(q.closeDate) : new Date();
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeek = dayNames[date.getDay()];

        // Build price action text with explicit string concatenation to ensure no floating point issues
        let priceActionText = '';
        const priceString = String(lastPrice); // Ensure it's definitely a string
        
        if (marketStatus === 'open') {
          priceActionText = `${symbol} Price Action: ${companyName} shares were ${upDown} ${absChange}% at $${priceString} at the time of publication on ${dayOfWeek}`;
        } else {
          priceActionText = `${symbol} Price Action: ${companyName} shares were ${upDown} ${absChange}% at $${priceString}${marketStatusPhrase} on ${dayOfWeek}`;
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
        console.log(`[${symbol}] Final priceActionText:`, priceActionText);

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
              max_tokens: 200,
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
        // Check for any useful technical data (not just today's OHLC, which may not be available during premarket)
        const hasAnyTechnicalField = q.open || q.high || q.low || q.close || 
                                      q.previousClosePrice || q.lastTradePrice ||
                                      q.fiftyDayAveragePrice || q.hundredDayAveragePrice || q.twoHundredDayAveragePrice;
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
          
          // Generate unified Full Analysis using OpenAI - one complete text block
          const fullAnalysisText = await generateUnifiedFullAnalysisBenzinga(priceActionText, q, sectorPeersData);
          
          // Clean the unified text to remove any special characters that WordPress might interpret as code
          const cleanedFullAnalysis = fullAnalysisText
            .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
            .replace(/\u00A0/g, ' ') // Replace non-breaking spaces with regular spaces
            .replace(/\r\n/g, '\n') // Normalize line endings
            .trim();

          return {
            ticker: symbol,
            companyName: companyName,
            priceAction: priceActionText,
            fullAnalysis: cleanedFullAnalysis
          };
        } else {
          return {
            ticker: symbol,
            companyName: companyName,
            priceAction: priceActionText,
            fullAnalysis: priceActionText + ' Full technical analysis is unavailable due to limited data.'
          };
        }
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
        // First, extract timing information from the first ticker to use at the end
        const firstAction = validPriceActions[0].priceAction;
        let timingPhrase = '';
        let dayOfWeek = '';
        
        // Extract timing phrase (premarket, afterhours, etc.)
        const timingMatch = firstAction.match(/(during premarket trading|during after-hours trading|while the market was closed|at the time of publication) on ([A-Za-z]+)/);
        if (timingMatch) {
          timingPhrase = timingMatch[1];
          dayOfWeek = timingMatch[2];
        }
        
        // Extract just the company and price action parts (remove the ticker prefix, attribution, and time/date)
        const priceActionParts = validPriceActions.map((action, index) => {
          // Start with the full price action text
          console.log(`[GROUPED ${index}] Original priceAction:`, action.priceAction);
          let cleanAction = action.priceAction;
          
          // Remove ticker prefix (e.g., "TSLA Price Action: ")
          cleanAction = cleanAction.replace(/^[A-Z]{1,5}\s+Price Action:\s*/, '');
          
          // Remove attribution first (before removing 52-week range)
          cleanAction = cleanAction.replace(/,\s*according to Benzinga Pro data\.?$/, '');
          cleanAction = cleanAction.replace(/,\s*according to Benzinga Pro\.?$/, '');
          
          // Remove 52-week range sentences (e.g., ". The stock is trading near its 52-week high of $195.30")
          // Match until comma or end of string, not until period (to avoid matching decimal points in prices)
          cleanAction = cleanAction.replace(/\.\s*The stock is (trading|approaching|near)[^,]*52-week[^,]*(,|$)/g, '');
          
          // Remove timing phrases
          cleanAction = cleanAction.replace(/\s+(during premarket trading|during after-hours trading|while the market was closed|at the time of publication) on [A-Za-z]+\.?/g, '');
          
          // Remove any trailing periods
          cleanAction = cleanAction.replace(/\.$/, '');
          
          const trimmed = cleanAction.trim();
          console.log(`[GROUPED ${index}] Cleaned priceAction:`, trimmed);
          return trimmed;
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
        
        // Add the timing phrase and attribution
        if (timingPhrase && dayOfWeek) {
          groupedText += ` ${timingPhrase} on ${dayOfWeek}, according to Benzinga Pro data.`;
        } else {
          groupedText += ', according to Benzinga Pro data.';
        }
        
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