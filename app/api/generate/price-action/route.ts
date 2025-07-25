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
    const { tickers, priceActionOnly, briefAnalysis } = await request.json();

    if (!tickers?.trim()) {
      return NextResponse.json({ priceActions: [], error: 'Ticker(s) required.' });
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

    const url = `https://api.benzinga.com/api/v2/quoteDelayed?token=${process.env.BENZINGA_API_KEY}&symbols=${tickers}`;

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
      if (typeof quote !== 'object' || quote === null) return '';

      const q = quote as BenzingaQuote;

      // Log the parsed BenzingaQuote for debugging
      console.log('Parsed BenzingaQuote:', JSON.stringify(q, null, 2));

      const symbol = q.symbol ?? 'UNKNOWN';
      const companyName = q.name ?? symbol;
      const changePercent = typeof q.changePercent === 'number' ? q.changePercent : 0;
      const lastPrice = formatPrice(q.lastTradePrice);

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
        
        priceActionText = `${symbol} Price Action: ${companyName} shares were ${regularUpDown} ${absRegularChange}% during regular trading and ${afterHoursUpDown} ${absAfterHoursChange}% in after-hours trading on ${dayOfWeek}, according to Benzinga Pro`;
      } else if (marketStatus === 'open') {
        // Regular trading hours: include 'at the time of publication'
        priceActionText = `${symbol} Price Action: ${companyName} shares were ${upDown} ${absChange}% at $${lastPrice} at the time of publication on ${dayOfWeek}, according to Benzinga Pro`;
      } else {
        // Use the original logic for other market statuses
        priceActionText = `${symbol} Price Action: ${companyName} shares were ${upDown} ${absChange}% at $${lastPrice}${marketStatusPhrase} on ${dayOfWeek}, according to Benzinga Pro`;
      }

      // Ensure the summary line ends with a period
      if (!priceActionText.trim().endsWith('.')) {
        priceActionText += '.';
      }

      // Move briefAnalysis check before priceActionOnly
      if (briefAnalysis) {
        // Generate a brief, insightful analysis paragraph using OpenAI
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

    return NextResponse.json({ priceActions });
  } catch (error) {
    console.error('Error generating price actions:', error);
    return NextResponse.json({ priceActions: [], error: 'Failed to generate price actions.' });
  }
}