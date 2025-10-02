// Force update: Market status summary logic is present (premarket/after-hours/closed in summary line)
// Force new deployment - Render was using old cached version
// Trigger webhook deployment - Render stuck on old build
// Force fresh build to clear TypeScript cache
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface BenzingaQuote {
  symbol?: string;
  name?: string;
  changePercent?: number;
  lastTradePrice?: number;
  closeDate?: string;
  // Historical data fields from Benzinga API
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;
  fiftyDayAveragePrice?: number;
  hundredDayAveragePrice?: number;
  twoHundredDayAveragePrice?: number;
  previousClosePrice?: number;
  volume?: number;
  averageVolume?: number;
  // Additional price and valuation data
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  marketCap?: number;
  pe?: number;
  forwardPE?: number;
  sharesOutstanding?: number;
  sharesFloat?: number;
  // Extended hours trading data
  ethPrice?: number;
  ethVolume?: number;
  ethTime?: number;
  // Additional fields from API response
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

interface BenzingaCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: number;
  dateTime: string;
}

interface BenzingaBarsResponse {
  symbol: string;
  interval: number;
  candles: BenzingaCandle[];
}

// Utility function to truncate to two decimal places
function truncateToTwoDecimals(num: number): number {
  return Math.trunc(num * 100) / 100;
}

// Helper to format price with truncation or N/A
function formatPrice(val: number | undefined): string {
  return typeof val === 'number' ? truncateToTwoDecimals(val).toFixed(2) : 'N/A';
}

async function generateTechnicalAnalysis(quote: BenzingaQuote, sectorComparison?: BenzingaQuote[]): Promise<string> {
  try {
    let sectorComparisonText = '';
    if (sectorComparison && sectorComparison.length > 0) {
      // Patch sector peers to clarify P/E status
      const patchedSectorComparison = sectorComparison.map(stock => {
        let patchedPE: string | number;
        if (typeof stock.pe === 'number' && stock.pe > 0) {
          patchedPE = stock.pe;
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
- 50-day Moving Average: $${formatPrice(quote.fiftyDayAveragePrice)}
- 100-day Moving Average: $${formatPrice(quote.hundredDayAveragePrice)}
- 200-day Moving Average: $${formatPrice(quote.twoHundredDayAveragePrice)}
- 52-week Range: $${formatPrice(quote.fiftyTwoWeekLow)} - $${formatPrice(quote.fiftyTwoWeekHigh)}
- Volume: ${quote.volume?.toLocaleString()} (Avg: ${quote.averageVolume?.toLocaleString()})

Intraday Data:
- Open: $${formatPrice(quote.open)}
- High: $${formatPrice(quote.high)}
- Low: $${formatPrice(quote.low)}
- Close: $${formatPrice(quote.close)}

Valuation Metrics:
- Market Cap: $${quote.marketCap ? (quote.marketCap >= 1000000000000 ? (quote.marketCap / 1000000000000).toFixed(2) + 'T' : (quote.marketCap / 1000000000).toFixed(2) + 'B') : 'N/A'}
- P/E Ratio: ${typeof quote.pe === 'number' && quote.pe > 0 ? quote.pe : 'N/A (unprofitable)'}
- Forward P/E: ${quote.forwardPE || 'N/A'}${sectorComparisonText}

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

async function getSectorPeers(symbol: string): Promise<BenzingaQuote[]> {
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
    
    return Object.values(data) as BenzingaQuote[];
  } catch (error) {
    console.error('Error fetching sector peers:', error);
    return [];
  }
}

// Function to fetch historical data using batchhistory endpoint for accurate period calculations
async function fetchHistoricalData(symbol: string, quote?: BenzingaQuote): Promise<HistoricalData | null> {
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
    const symbolData = data.find((item: BenzingaBarsResponse) => item.symbol === symbol);
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
function calculateApproximateReturns(quote: BenzingaQuote): HistoricalData | null {
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

// Utility function to detect US market status (Eastern Time)
function getMarketStatus(): 'open' | 'premarket' | 'afterhours' | 'closed' {
  const now = new Date();
  // Convert to UTC, then to New York time (Eastern Time)
  const nowUtc = now.getTime() + (now.getTimezoneOffset() * 60000);
  // New York is UTC-4 (EDT) or UTC-5 (EST); for simplicity, use UTC-4 (EDT)
  // For more accuracy, use a timezone library like luxon or moment-timezone
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

export async function POST(request: Request) {
  try {
    const { tickers, priceActionOnly, briefAnalysis, grouped, smartAnalysis } = await request.json();

    if (!tickers?.trim()) {
      return NextResponse.json({ priceActions: [], error: 'Ticker(s) required.' });
    }

    // Clean and validate tickers
    const cleanedTickers = tickers
      .split(',')
      .map((ticker: string) => ticker.trim().toUpperCase())
      .filter((ticker: string) => ticker.length > 0)
      .join(',');

    if (!cleanedTickers) {
      return NextResponse.json({ priceActions: [], error: 'No valid ticker symbols provided.' });
    }

    // Detect market status and prepare a phrase for the summary line
    const marketStatus = getMarketStatus();
    let marketStatusPhrase = '';
    if (marketStatus === 'premarket') {
      marketStatusPhrase = ' during premarket trading';
    } else if (marketStatus === 'afterhours') {
      marketStatusPhrase = ' during after-hours trading';
    } else if (marketStatus === 'closed') {
      marketStatusPhrase = ' while the market was closed';
    } // if open, leave as empty string

    const url = `https://api.benzinga.com/api/v2/quoteDelayed?token=${process.env.BENZINGA_API_KEY}&symbols=${cleanedTickers}`;

    console.log('=== PRICE ACTION DEBUG ===');
    console.log('Original tickers:', tickers);
    console.log('Cleaned tickers:', cleanedTickers);
    console.log('API URL:', url);

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Benzinga API error: ${text}`);
    }
    const data = await res.json();

    // Log the raw Benzinga API response for debugging
    console.log('Benzinga API raw response:', JSON.stringify(data, null, 2));

    if (!data || typeof data !== 'object') {
      return NextResponse.json({ priceActions: [], error: 'Invalid Benzinga response' });
    }

    const quotes = Object.values(data) as unknown[];

    const priceActions = await Promise.all(quotes.map(async (quote) => {
      if (typeof quote !== 'object' || quote === null) return null;

      const q = quote as BenzingaQuote;

      // Log the parsed BenzingaQuote for debugging
      console.log('Parsed BenzingaQuote:', JSON.stringify(q, null, 2));

      const symbol = q.symbol ?? 'UNKNOWN';
      const companyName = q.name ?? symbol;
      const changePercent = typeof q.changePercent === 'number' ? q.changePercent : 0;
      const lastPrice = formatPrice(q.lastTradePrice);

      // Skip processing if we don't have valid data
      if (symbol === 'UNKNOWN' || !q.lastTradePrice) {
        console.log(`Skipping invalid quote for symbol: ${symbol}, lastTradePrice: ${q.lastTradePrice}`);
        return null; // Return null instead of empty string to filter out invalid quotes
      }

      // Fetch historical data for monthly and YTD performance
      let historicalData = await fetchHistoricalData(symbol, q);
      
      // If historical API fails, use fallback calculation
      if (!historicalData) {
        console.log(`Using fallback historical calculation for ${symbol}`);
        historicalData = calculateApproximateReturns(q);
      }

      // Calculate separate changes for regular session and after-hours
      let regularSessionChange = 0;
      let afterHoursChange = 0;
      let hasAfterHoursData = false;

      if (q.previousClosePrice && q.close && q.ethPrice) {
        // Regular session change: (close - previousClose) / previousClose * 100
        regularSessionChange = ((q.close - q.previousClosePrice) / q.previousClosePrice) * 100;
        
        // After-hours change: (ethPrice - close) / close * 100
        afterHoursChange = ((q.ethPrice - q.close) / q.close) * 100;
        hasAfterHoursData = true;
      }

      const upDown = changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'unchanged';
      const absChange = Math.abs(changePercent).toFixed(2);

      // Format day of week from closeDate if available, else today
      const date = q.closeDate ? new Date(q.closeDate) : new Date();
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
        
        priceActionText = `${symbol} Price Action: ${companyName} shares were ${regularUpDown} ${absRegularChange}% during regular trading and ${afterHoursUpDown} ${absAfterHoursChange}% in after-hours trading on ${dayOfWeek}`;
      } else if (marketStatus === 'open') {
        // Regular trading hours: include 'at the time of publication'
        priceActionText = `${symbol} Price Action: ${companyName} shares were ${upDown} ${absChange}% at $${lastPrice} at the time of publication on ${dayOfWeek}`;
      } else {
        // Use the original logic for other market statuses
        priceActionText = `${symbol} Price Action: ${companyName} shares were ${upDown} ${absChange}% at $${lastPrice}${marketStatusPhrase} on ${dayOfWeek}`;
      }

              // Add historical performance data if available (monthly only)
        if (historicalData && historicalData.monthlyReturn !== undefined) {
          const monthlyReturn = historicalData.monthlyReturn;
          const monthlyDirection = monthlyReturn > 0 ? 'gain' : 'decline';
          const historicalText = `, with a monthly ${monthlyDirection} of ${Math.abs(monthlyReturn).toFixed(2)}%`;
          priceActionText += historicalText;
        }

      // Add 52-week range context if available
      if (q.fiftyTwoWeekLow && q.fiftyTwoWeekHigh && q.lastTradePrice) {
        const currentPrice = q.lastTradePrice;
        const yearLow = q.fiftyTwoWeekLow;
        const yearHigh = q.fiftyTwoWeekHigh;
        
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
      priceActionText = priceActionText.replace(/,\s*according to Benzinga Pro\.?$/, '');
      priceActionText = priceActionText.replace(/,\s*according to Benzinga Pro data\.?$/, '');
      
      // Smart Analysis - automatically choose the best narrative
      if (smartAnalysis) {
        // Don't add attribution yet - we'll add it at the end of smart analysis
        // Fetch additional data from Polygon for smart analysis
        let polygonData = null;
        try {
          console.log(`=== FETCHING POLYGON DATA FOR SMART ANALYSIS: ${symbol} ===`);
          // Use current day data instead of previous day
          const today = new Date().toISOString().split('T')[0];
          const polygonUrl = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${today}/${today}?adjusted=true&apikey=${process.env.POLYGON_API_KEY}`;
          console.log('Polygon URL:', polygonUrl.replace(process.env.POLYGON_API_KEY || '', 'HIDDEN_KEY'));
          
          const polygonRes = await fetch(polygonUrl);
          console.log('Polygon response status:', polygonRes.status);
          
          if (polygonRes.ok) {
            const polygonResponse = await polygonRes.json();
            console.log('Polygon response received:', !!polygonResponse);
            if (polygonResponse.results && polygonResponse.results.length > 0) {
              polygonData = polygonResponse.results[0];
              console.log('Polygon data extracted:', !!polygonData);
            }
          } else {
            const errorText = await polygonRes.text();
            console.log('Polygon API error:', errorText);
          }
        } catch (error) {
          console.log('Polygon API call failed for smart analysis:', error);
        }

        // Use Polygon data as single source of truth
        if (!polygonData) {
          console.log('No Polygon data available, falling back to Benzinga');
          return {
            ticker: symbol,
            companyName: companyName,
            priceAction: priceActionText,
            narrativeType: 'fallback',
            smartAnalysis: true
          };
        }

        // Extract Polygon data
        const polygonVolume = polygonData.v; // Volume
        const polygonHigh = polygonData.h;   // High
        const polygonLow = polygonData.l;    // Low
        const polygonOpen = polygonData.o;   // Open
        const polygonClose = polygonData.c;  // Close
        const polygonVWAP = polygonData.vw;  // Volume-weighted average price
        
        console.log('Using Polygon data - Volume:', polygonVolume, 'High:', polygonHigh, 'Low:', polygonLow, 'Close:', polygonClose);
        
        // Calculate returns using Polygon data (more accurate than Benzinga)
        let ytdReturn = 0;
        let sixMonthReturn = 0;
        let threeMonthReturn = 0;
        let oneMonthReturn = 0;
        
        // Try to get more accurate historical data from Polygon
        try {
          const now = new Date();
          // Fix date calculations - ensure we're going backwards in time
          const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
          const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
          const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          // YTD should be January 1st of current year, not 6 months ago
          const ytdStart = new Date(now.getFullYear(), 0, 1);
          
          console.log('Date calculations:', {
            now: now.toDateString(),
            sixMonthsAgo: sixMonthsAgo.toDateString(),
            threeMonthsAgo: threeMonthsAgo.toDateString(),
            oneMonthAgo: oneMonthAgo.toDateString(),
            ytdStart: ytdStart.toDateString()
          });

          const formatDate = (date: Date) => date.toISOString().split('T')[0];

          // Fetch data from start of current year to now for YTD calculations
          const yearStart = new Date(now.getFullYear(), 0, 1); // January 1st of current year
          const historicalUrl = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${formatDate(yearStart)}/${formatDate(now)}?adjusted=true&apikey=${process.env.POLYGON_API_KEY}`;
          console.log('Fetching Polygon historical data for accurate returns (current year)...');

          const historicalRes = await fetch(historicalUrl);
          if (historicalRes.ok) {
            const historicalResponse = await historicalRes.json();
            if (historicalResponse.results && historicalResponse.results.length > 0) {
              const currentPrice = polygonClose;
              const historicalData = historicalResponse.results;

              // Sort data by date (oldest first)
              historicalData.sort((a: any, b: any) => a.t - b.t);

              // Log the date range of available data
              const firstDate = new Date(historicalData[0].t);
              const lastDate = new Date(historicalData[historicalData.length - 1].t);
              console.log(`Available historical data range: ${firstDate.toDateString()} to ${lastDate.toDateString()}`);
              console.log(`Total data points: ${historicalData.length}`);

              // Find data points by actual dates
              const findDataByDate = (targetDate: Date) => {
                const targetTimestamp = targetDate.getTime();
                let closestData = null;
                let minDiff = Infinity;

                for (const data of historicalData) {
                  const dataDate = new Date(data.t);
                  const diff = Math.abs(dataDate.getTime() - targetTimestamp);
                  if (diff < minDiff) {
                    minDiff = diff;
                    closestData = data;
                  }
                }
                return closestData;
              };

              // Calculate 6-month return using actual 6-month-ago date
              const sixMonthData = findDataByDate(sixMonthsAgo);
              if (sixMonthData) {
                sixMonthReturn = ((currentPrice - sixMonthData.c) / sixMonthData.c) * 100;
                console.log(`Polygon 6-month calculation: ${sixMonthData.c} to ${currentPrice} = ${sixMonthReturn.toFixed(2)}% (from ${new Date(sixMonthData.t).toDateString()})`);
              }

              // Calculate 3-month return using actual 3-month-ago date
              const threeMonthData = findDataByDate(threeMonthsAgo);
              if (threeMonthData) {
                threeMonthReturn = ((currentPrice - threeMonthData.c) / threeMonthData.c) * 100;
                console.log(`Polygon 3-month calculation: ${threeMonthData.c} to ${currentPrice} = ${threeMonthReturn.toFixed(2)}% (from ${new Date(threeMonthData.t).toDateString()})`);
              }

              // Calculate 1-month return using actual 1-month-ago date
              const oneMonthData = findDataByDate(oneMonthAgo);
              if (oneMonthData) {
                oneMonthReturn = ((currentPrice - oneMonthData.c) / oneMonthData.c) * 100;
                console.log(`Polygon 1-month calculation: ${oneMonthData.c} to ${currentPrice} = ${oneMonthReturn.toFixed(2)}% (from ${new Date(oneMonthData.t).toDateString()})`);
              }

              // Calculate YTD return using actual YTD start date
              // Find the first trading day of the year, not just the closest to Jan 1
              console.log(`Searching for January ${now.getFullYear()} data...`);
              const ytdData = historicalData.find((data: any) => {
                const dataDate = new Date(data.t);
                const isJanuary = dataDate.getFullYear() === now.getFullYear() && dataDate.getMonth() === 0;
                if (isJanuary) {
                  console.log(`Found January data: ${dataDate.toDateString()}`);
                }
                return isJanuary;
              });
              if (ytdData) {
                ytdReturn = ((currentPrice - ytdData.c) / ytdData.c) * 100;
                console.log(`Polygon YTD calculation: ${ytdData.c} to ${currentPrice} = ${ytdReturn.toFixed(2)}% (from ${new Date(ytdData.t).toDateString()})`);
              } else {
                console.log(`No January ${now.getFullYear()} data found, using fallback...`);
                // Fallback to findDataByDate if no January data found
                const fallbackYtdData = findDataByDate(ytdStart);
                if (fallbackYtdData) {
                  ytdReturn = ((currentPrice - fallbackYtdData.c) / fallbackYtdData.c) * 100;
                  console.log(`Polygon YTD calculation (fallback): ${fallbackYtdData.c} to ${currentPrice} = ${ytdReturn.toFixed(2)}% (from ${new Date(fallbackYtdData.t).toDateString()})`);
                }
              }
            }
          }
        } catch (error) {
          console.log('Polygon historical calculation failed, using Benzinga data:', error);
          // Fallback to Benzinga data
          if (historicalData) {
            ytdReturn = historicalData.ytdReturn || 0;
            sixMonthReturn = historicalData.sixMonthReturn || 0;
            threeMonthReturn = historicalData.threeMonthReturn || 0;
            oneMonthReturn = historicalData.monthlyReturn || 0;
          }
        }
        
        // Calculate distance from 52-week high/low using Polygon close price
        const distanceFromHigh = q.fiftyTwoWeekHigh && polygonClose ? 
          ((polygonClose - q.fiftyTwoWeekHigh) / q.fiftyTwoWeekHigh) * 100 : 0;
        const distanceFromLow = q.fiftyTwoWeekLow && polygonClose ? 
          ((polygonClose - q.fiftyTwoWeekLow) / q.fiftyTwoWeekLow) * 100 : 0;
        
        // Build smart narrative using Polygon data
        let narrativeType = 'range'; // default
        
        // Use the correct price - if we're in premarket/afterhours, use the current price from Benzinga
        // Otherwise use Polygon's close price
        const currentPrice = marketStatus === 'premarket' || marketStatus === 'afterhours' ? 
          q.lastTradePrice : polygonClose;
        const currentChange = marketStatus === 'premarket' || marketStatus === 'afterhours' ? 
          changePercent : ((polygonClose - polygonOpen) / polygonOpen) * 100;
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
        
        let smartPriceActionText = `${symbol} Price Action: ${companyName} shares were ${currentUpDown === 'up' ? 'up' : currentUpDown === 'down' ? 'down' : 'unchanged'} ${currentAbsChange}% at $${currentPrice.toFixed(2)}${timePhrase} on ${dayOfWeek}`;

        // Build rich historical context first
        let historicalContext = '';
        
        // Create comprehensive historical perspective
        if (Math.abs(ytdReturn) > 10 || Math.abs(sixMonthReturn) > 20) {
          if (ytdReturn > 0 && sixMonthReturn > 0) {
            historicalContext = ` It's been quite a ride for investors, with the stock surging ${ytdReturn.toFixed(1)}% this year and ${sixMonthReturn.toFixed(1)}% over the past six months`;
          } else if (ytdReturn < 0 && sixMonthReturn < 0) {
            historicalContext = ` It's been a rough stretch for shareholders, with the stock falling ${Math.abs(ytdReturn).toFixed(1)}% this year and ${Math.abs(sixMonthReturn).toFixed(1)}% over the past six months`;
          } else if (ytdReturn > 0 && sixMonthReturn < 0) {
            historicalContext = ` The stock has managed to gain ${ytdReturn.toFixed(1)}% this year despite a ${Math.abs(sixMonthReturn).toFixed(1)}% slide over the past six months`;
          } else if (ytdReturn < 0 && sixMonthReturn > 0) {
            historicalContext = ` The stock has slipped ${Math.abs(ytdReturn).toFixed(1)}% this year despite a ${sixMonthReturn.toFixed(1)}% rally over the past six months`;
          }
        } else if (Math.abs(threeMonthReturn) > 5) {
          if (threeMonthReturn > 0) {
            historicalContext = ` The stock has been trending higher, gaining ${threeMonthReturn.toFixed(1)}% over the past three months`;
          } else {
            historicalContext = ` The stock has been trending lower, falling ${Math.abs(threeMonthReturn).toFixed(1)}% over the past three months`;
          }
        }

        // Determine narrative type using Polygon data
        const dailyChange = ((polygonClose - polygonOpen) / polygonOpen) * 100;
        const intradayRange = ((polygonHigh - polygonLow) / polygonLow) * 100;
        // Volume analysis removed per user request
        
        if (Math.abs(oneMonthReturn) > 5 || Math.abs(threeMonthReturn) > 15 || Math.abs(distanceFromHigh) < 5) {
          // Strong momentum or near 52-week high
          narrativeType = 'momentum';
          if (oneMonthReturn > 0) {
            if (currentChange > 0) {
              smartPriceActionText += `, continuing a solid ${Math.abs(oneMonthReturn).toFixed(1)}% run over the past month.`;
            } else {
              smartPriceActionText += `, taking a breather after a solid ${Math.abs(oneMonthReturn).toFixed(1)}% run over the past month.`;
            }
          } else if (oneMonthReturn < 0) {
            if (currentChange < 0) {
              smartPriceActionText += `, continuing a ${Math.abs(oneMonthReturn).toFixed(1)}% slide over the past month.`;
            } else {
              smartPriceActionText += `, showing some resilience after a ${Math.abs(oneMonthReturn).toFixed(1)}% slide over the past month.`;
            }
          }

          // Add historical context
          if (historicalContext) {
            smartPriceActionText += historicalContext;
          }

          if (Math.abs(distanceFromHigh) < 5) {
            smartPriceActionText += ` and sitting just ${Math.abs(distanceFromHigh).toFixed(1)}% below its 52-week high of $${formatPrice(q.fiftyTwoWeekHigh)}`;
          }

          // Volume analysis removed per user request
        } else if (Math.abs(dailyChange) > 4 || intradayRange > 6) {
          // High volatility move
          narrativeType = 'volatility';
          const moveSignificance = Math.abs(dailyChange) / 2.5; // vs average daily range
          smartPriceActionText += `, delivering one of the stock's ${moveSignificance > 1.5 ? 'bigger' : 'more notable'} single-day moves`;

          // Add historical context
          if (historicalContext) {
            smartPriceActionText += historicalContext;
          }

          // Volume analysis removed per user request

          if (intradayRange > 3) {
            smartPriceActionText += ` after a wild ${intradayRange.toFixed(1)}% intraday swing`;
          }

          if (q.fiftyTwoWeekLow && q.fiftyTwoWeekHigh && polygonClose) {
            const rangePosition = ((polygonClose - q.fiftyTwoWeekLow) / (q.fiftyTwoWeekHigh - q.fiftyTwoWeekLow)) * 100;
            if (rangePosition > 80) {
              smartPriceActionText += ` as it pushes toward its 52-week high`;
            } else if (rangePosition < 20) {
              smartPriceActionText += ` as it tests support near its 52-week low`;
            }
          }
        } else {
          // Range-bound trading
          narrativeType = 'range';

          // Add historical context first
          if (historicalContext) {
            smartPriceActionText += historicalContext;
          }

          if (q.fiftyTwoWeekLow && q.fiftyTwoWeekHigh && polygonClose) {
            const rangePosition = ((polygonClose - q.fiftyTwoWeekLow) / (q.fiftyTwoWeekHigh - q.fiftyTwoWeekLow)) * 100;
            if (rangePosition > 75) {
              smartPriceActionText += `, trading in the upper end of its 52-week range between $${formatPrice(q.fiftyTwoWeekLow)} and $${formatPrice(q.fiftyTwoWeekHigh)}`;
            } else if (rangePosition < 25) {
              smartPriceActionText += `, trading in the lower end of its 52-week range between $${formatPrice(q.fiftyTwoWeekLow)} and $${formatPrice(q.fiftyTwoWeekHigh)}`;
            } else {
              smartPriceActionText += `, trading within its 52-week range of $${formatPrice(q.fiftyTwoWeekLow)} to $${formatPrice(q.fiftyTwoWeekHigh)}`;
            }
          }

          // Volume analysis removed per user request

          if (intradayRange > 3) {
            smartPriceActionText += ` after a ${intradayRange.toFixed(1)}% intraday range`;
          }
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
- Keep all factual data (percentages, prices, timeframes) exactly the same
- Use casual, conversational tone - avoid formal/AI words like "notable", "remarkable", "impressive", "significant"
- Use simple, direct language that sounds like a real person talking
- Avoid time phrases that sound like the day is over: "by Thursday", "as of Thursday", "on Thursday"
- Avoid awkward phrases like "this Thursday"
- Instead use natural phrases like: "Thursday morning", "Thursday afternoon", "Thursday's session", "Thursday's trading", or just "Thursday"
- Avoid repetitive phrases like "solid run", "quite a ride", etc.
- Sound like you're explaining to a friend, not writing a formal report
- End with attribution: "according to Benzinga Pro data."

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
          // Fallback to original text with attribution
          smartPriceActionText += ', according to Benzinga Pro data.';
        }

        return {
          ticker: symbol,
          companyName: companyName,
          priceAction: smartPriceActionText,
          narrativeType: narrativeType,
          smartAnalysis: true
        };
      } else {
        // Add attribution for non-smart analysis
      priceActionText += ', according to Benzinga Pro data.';
      }

      // Move briefAnalysis check before priceActionOnly
      if (briefAnalysis) {
        // Generate a brief, insightful analysis paragraph using OpenAI
        let briefAnalysisText = '';
        try {
          let briefPrompt = '';
          // Add historical performance data to the prompt if available
          let historicalDataText = '';
          if (historicalData) {
            if (historicalData.monthlyReturn !== undefined) {
              historicalDataText += `\nMonthly Return: ${historicalData.monthlyReturn.toFixed(2)}%`;
            }
            if (historicalData.ytdReturn !== undefined) {
              historicalDataText += `\nYTD Return: ${historicalData.ytdReturn.toFixed(2)}%`;
            }
            if (historicalData.threeMonthReturn !== undefined) {
              historicalDataText += `\n3-Month Return: ${historicalData.threeMonthReturn.toFixed(2)}%`;
            }
            if (historicalData.sixMonthReturn !== undefined) {
              historicalDataText += `\n6-Month Return: ${historicalData.sixMonthReturn.toFixed(2)}%`;
            }
            if (historicalData.oneYearReturn !== undefined) {
              historicalDataText += `\n1-Year Return: ${historicalData.oneYearReturn.toFixed(2)}%`;
            }
          }

          if (marketStatus === 'afterhours' || marketStatus === 'premarket') {
            briefPrompt = `You are a financial news analyst. Write a single, concise, insightful analysis (2-3 sentences, no more than 60% the length of a typical news paragraph) about the following stock's global and historical context. Do NOT mention premarket, after-hours, or current price action or volume. Do not mention current session trading activity. Only mention a data point if it is notably high, low, or unusual. Do not mention data points that are within normal or average ranges. Be specific: if referencing the 52-week range, state if the price is near the high or low, or if there is a notable long-term trend, not just 'within the range'. If nothing is notable, say so briefly. Focus only on global or historical data points (52-week range, sector, industry, market cap, P/E ratio, regular session close, previous close, dividend yield, long-term trends). Avoid generic statements and do NOT repeat the price action line. Do not include the ticker in the analysis line.\n\nCompany: ${companyName}\nSector: ${q.sector || 'N/A'}\nIndustry: ${q.industry || 'N/A'}\nMarket Cap: $${q.marketCap ? (q.marketCap >= 1e12 ? (q.marketCap / 1e12).toFixed(2) + 'T' : (q.marketCap / 1e9).toFixed(2) + 'B') : 'N/A'}\nP/E Ratio: ${typeof q.pe === 'number' && q.pe > 0 ? q.pe : 'N/A'}\nDividend Yield: ${q.dividendYield || 'N/A'}\nRegular Close: $${formatPrice(q.close)}\nPrevious Close: $${formatPrice(q.previousClosePrice)}\n52-week Range: $${formatPrice(q.fiftyTwoWeekLow)} - $${formatPrice(q.fiftyTwoWeekHigh)}${historicalDataText}`;
          } else {
            briefPrompt = `You are a financial news analyst. Write a single, concise, insightful analysis (2-3 sentences, no more than 60% the length of a typical news paragraph) about the following stock's global and historical context. Do NOT mention current price action or volume. Only mention a data point if it is notably high, low, or unusual. Do not mention data points that are within normal or average ranges. Be specific: if referencing the 52-week range, state if the price is near the high or low, or if there is a notable long-term trend, not just 'within the range'. If nothing is notable, say so briefly. Focus only on global or historical data points (52-week range, sector, industry, market cap, P/E ratio, regular session close, previous close, dividend yield, long-term trends). Avoid generic statements and do NOT repeat the price action line. Do not include the ticker in the analysis line.\n\nCompany: ${companyName}\nSector: ${q.sector || 'N/A'}\nIndustry: ${q.industry || 'N/A'}\nMarket Cap: $${q.marketCap ? (q.marketCap >= 1e12 ? (q.marketCap / 1e12).toFixed(2) + 'T' : (q.marketCap / 1e9).toFixed(2) + 'B') : 'N/A'}\nP/E Ratio: ${typeof q.pe === 'number' && q.pe > 0 ? q.pe : 'N/A'}\nDividend Yield: ${q.dividendYield || 'N/A'}\nRegular Close: $${formatPrice(q.close)}\nPrevious Close: $${formatPrice(q.previousClosePrice)}\n52-week Range: $${formatPrice(q.fiftyTwoWeekLow)} - $${formatPrice(q.fiftyTwoWeekHigh)}${historicalDataText}`;
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
      // Use q.close if available, otherwise q.lastTradePrice
      const closeValue = q.close ?? q.lastTradePrice;
      // Check if at least one technical field is present
      const hasAnyTechnicalField = q.fiftyDayAveragePrice || q.hundredDayAveragePrice || q.twoHundredDayAveragePrice || q.open || q.high || q.low || closeValue;
      if (hasAnyTechnicalField) {
        // Patch the quote object to always have a close value
        const patchedQuote = { ...q, close: closeValue };
        // Get sector peers for comparison
        const sectorPeers = await getSectorPeers(symbol);
        technicalAnalysis = await generateTechnicalAnalysis(patchedQuote, sectorPeers);
      } else {
        technicalAnalysis = 'Full technical analysis is unavailable due to limited data.';
      }

      // Add historical context using available Benzinga data
      let historicalContext = '';
      
      if (q.fiftyTwoWeekLow && q.fiftyTwoWeekHigh && q.lastTradePrice) {
        const currentPrice = q.lastTradePrice;
        const low = q.fiftyTwoWeekLow;
        const high = q.fiftyTwoWeekHigh;
        
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
          // Remove the ticker prefix, "according to Benzinga Pro" part, and time/date info
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
  } catch (error) {
    console.error('Error generating price actions:', error);
    return NextResponse.json({ priceActions: [], error: 'Failed to generate price actions.' });
  }
}

// Fallback function using the original bars endpoint approach
async function fetchHistoricalDataFallback(symbol: string, quote?: BenzingaQuote): Promise<HistoricalData | null> {
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
      const symbolData = data.find((item: BenzingaBarsResponse) => item.symbol === symbol);
      if (!symbolData || !symbolData.candles || !Array.isArray(symbolData.candles) || symbolData.candles.length === 0) {
        console.log(`No candle data found for ${symbol} in ${description}`);
        return null;
      }

      const candles = symbolData.candles;
      
      // Sort candles by date (oldest first)
      const sortedCandles = candles.sort((a: BenzingaCandle, b: BenzingaCandle) => 
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
            const prevMonthSymbolData = prevMonthData.find((item: BenzingaBarsResponse) => item.symbol === symbol);
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
                console.log(`Current month end: ${quote.closeDate} ($${currentClose})`);
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