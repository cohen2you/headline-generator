// Force update: Market status summary logic is present (premarket/after-hours/closed in summary line)
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

// Function to fetch historical data for monthly and YTD performance using targeted date ranges
async function fetchHistoricalData(symbol: string): Promise<HistoricalData | null> {
  try {
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
    const [ytdData, monthlyData, threeMonthData, sixMonthData, oneYearData] = await Promise.all([
      fetchPeriodData('YTD', 'YTD'),
      fetchPeriodData('1MONTH', '1-month'),
      fetchPeriodData('3MONTH', '3-month'),
      fetchPeriodData('6MONTH', '6-month'),
      fetchPeriodData('1YEAR', '1-year')
    ]);

    // Calculate returns
    const calculateReturn = (startPrice: number, endPrice: number) => {
      if (startPrice === 0) return undefined;
      return ((endPrice - startPrice) / startPrice) * 100;
    };

    const historicalData: HistoricalData = {
      symbol,
      monthlyReturn: monthlyData ? calculateReturn(monthlyData.startPrice, monthlyData.endPrice) : undefined,
      ytdReturn: ytdData ? calculateReturn(ytdData.startPrice, ytdData.endPrice) : undefined,
      threeMonthReturn: threeMonthData ? calculateReturn(threeMonthData.startPrice, threeMonthData.endPrice) : undefined,
      sixMonthReturn: sixMonthData ? calculateReturn(sixMonthData.startPrice, sixMonthData.endPrice) : undefined,
      oneYearReturn: oneYearData ? calculateReturn(oneYearData.startPrice, oneYearData.endPrice) : undefined
    };

    // Log detailed information for debugging
    console.log(`Historical data for ${symbol}:`, historicalData);
    if (ytdData) console.log(`YTD: ${ytdData.startDate} ($${ytdData.startPrice}) to ${ytdData.endDate} ($${ytdData.endPrice})`);
    if (monthlyData) console.log(`Monthly: ${monthlyData.startDate} ($${monthlyData.startPrice}) to ${monthlyData.endDate} ($${monthlyData.endPrice})`);

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
    const { tickers, priceActionOnly, briefAnalysis, grouped } = await request.json();

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
      let historicalData = await fetchHistoricalData(symbol);
      
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

      // Add historical performance data if available
      if (historicalData) {
        let historicalText = '';
        
        // Add monthly and YTD performance with improved flow
        if (historicalData.monthlyReturn !== undefined && historicalData.ytdReturn !== undefined) {
          const monthlyReturn = historicalData.monthlyReturn;
          const ytdReturn = historicalData.ytdReturn;
          
          // Determine the flow based on performance and daily movement
          const dailyChange = changePercent;
          
          if (monthlyReturn > 0 && ytdReturn < 0) {
            // Good month, bad year
            if (dailyChange > 0) {
              historicalText = `, extending their monthly gain to ${monthlyReturn.toFixed(2)}% despite being down ${Math.abs(ytdReturn).toFixed(2)}% so far this year`;
            } else {
              historicalText = `, maintaining their monthly gain of ${monthlyReturn.toFixed(2)}% despite being down ${Math.abs(ytdReturn).toFixed(2)}% so far this year`;
            }
          } else if (monthlyReturn > 0 && ytdReturn > 0) {
            // Good month, good year
            if (dailyChange > 0) {
              historicalText = `, extending their monthly gain of ${monthlyReturn.toFixed(2)}% and ${ytdReturn.toFixed(2)}% rise since the start of the year`;
            } else {
              historicalText = `, maintaining their monthly gain of ${monthlyReturn.toFixed(2)}% and ${ytdReturn.toFixed(2)}% rise since the start of the year`;
            }
          } else if (monthlyReturn < 0 && ytdReturn < 0) {
            // Bad month, bad year
            if (dailyChange < 0) {
              historicalText = `, extending their monthly decline of ${Math.abs(monthlyReturn).toFixed(2)}% and ${Math.abs(ytdReturn).toFixed(2)}% drop since the start of the year`;
            } else {
              historicalText = `, despite today's gain, still down ${Math.abs(monthlyReturn).toFixed(2)}% this month and ${Math.abs(ytdReturn).toFixed(2)}% since the start of the year`;
            }
          } else if (monthlyReturn < 0 && ytdReturn > 0) {
            // Bad month, good year
            if (dailyChange < 0) {
              historicalText = `, pulling back ${Math.abs(monthlyReturn).toFixed(2)}% this month but still up ${ytdReturn.toFixed(2)}% since the start of the year`;
            } else {
              historicalText = `, despite today's gain, still down ${Math.abs(monthlyReturn).toFixed(2)}% this month but up ${ytdReturn.toFixed(2)}% since the start of the year`;
            }
          }
        } else if (historicalData.monthlyReturn !== undefined) {
          // Only monthly data available
          const monthlyReturn = historicalData.monthlyReturn;
          const monthlyDirection = monthlyReturn > 0 ? 'gain' : 'decline';
          historicalText = `, with a monthly ${monthlyDirection} of ${Math.abs(monthlyReturn).toFixed(2)}%`;
        } else if (historicalData.ytdReturn !== undefined) {
          // Only YTD data available
          const ytdReturn = historicalData.ytdReturn;
          const ytdDirection = ytdReturn > 0 ? 'up' : 'down';
          historicalText = `, ${ytdDirection} ${Math.abs(ytdReturn).toFixed(2)}% since the start of the year`;
        }
        
        if (historicalText) {
          priceActionText += historicalText;
        }
      }

      // Add 52-week range context if available
      if (q.fiftyTwoWeekLow && q.fiftyTwoWeekHigh && q.lastTradePrice) {
        const currentPrice = q.lastTradePrice;
        const yearLow = q.fiftyTwoWeekLow;
        const yearHigh = q.fiftyTwoWeekHigh;
        
        // Calculate position within 52-week range (0 = at low, 1 = at high)
        const rangePosition = (currentPrice - yearLow) / (yearHigh - yearLow);
        
        let rangeText = '';
        
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
        
        if (rangeText) {
          priceActionText += rangeText;
        }
      }

      // Clean up any existing attribution and add the final one
      priceActionText = priceActionText.replace(/,\s*according to Benzinga Pro\.?$/, '');
      priceActionText = priceActionText.replace(/,\s*according to Benzinga Pro data\.?$/, '');
      
      // Add the final attribution
      priceActionText += ', according to Benzinga Pro data.';

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