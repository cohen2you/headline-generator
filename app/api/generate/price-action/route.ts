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
}

async function generateTechnicalAnalysis(quote: BenzingaQuote, sectorComparison?: BenzingaQuote[]): Promise<string> {
  try {
    let sectorComparisonText = '';
    if (sectorComparison && sectorComparison.length > 0) {
      const comparisonData = sectorComparison.map(stock => {
        const marketCap = stock.marketCap ? (stock.marketCap >= 1000000000000 ? (stock.marketCap / 1000000000000).toFixed(2) + 'T' : (stock.marketCap / 1000000000).toFixed(2) + 'B') : 'N/A';
        const volume = stock.volume ? stock.volume.toLocaleString() : 'N/A';
        const changePercent = stock.changePercent ? `${stock.changePercent.toFixed(2)}%` : 'N/A';
        
        return `${stock.symbol}: Price $${stock.lastTradePrice || 'N/A'}, Change ${changePercent}, Volume ${volume}, Market Cap ${marketCap}`;
      }).join('\n');
      
      // Determine if we're comparing against sector peers or sector ETFs
      const isSectorETF = sectorComparison.some(stock => ['XLI', 'XLF', 'XLK', 'XLV', 'XLE', 'XLP', 'XLY'].includes(stock.symbol || ''));
      const comparisonType = isSectorETF ? 'Sector ETF Comparison' : 'Sector Comparison';
      sectorComparisonText = `\n\n${comparisonType}:\n${comparisonData}`;
    }

    const prompt = `You are a technical analyst providing concise market insights. Analyze this stock data and provide technical analysis broken into separate paragraphs.

Stock: ${quote.symbol} (${quote.name})
Current Price: $${quote.lastTradePrice}
Daily Change: ${quote.changePercent}%

Technical Indicators:
- 50-day Moving Average: $${quote.fiftyDayAveragePrice}
- 100-day Moving Average: $${quote.hundredDayAveragePrice}
- 200-day Moving Average: $${quote.twoHundredDayAveragePrice}
- 52-week Range: $${quote.fiftyTwoWeekLow} - $${quote.fiftyTwoWeekHigh}
- Volume: ${quote.volume?.toLocaleString()} (Avg: ${quote.averageVolume?.toLocaleString()})

Intraday Data:
- Open: $${quote.open}
- High: $${quote.high}
- Low: $${quote.low}
- Close: $${quote.close}

Valuation Metrics:
- Market Cap: $${quote.marketCap ? (quote.marketCap >= 1000000000000 ? (quote.marketCap / 1000000000000).toFixed(2) + 'T' : (quote.marketCap / 1000000000).toFixed(2) + 'B') : 'N/A'}
- P/E Ratio: ${quote.pe || 'N/A'}
- Forward P/E: ${quote.forwardPE || 'N/A'}${sectorComparisonText}

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

export async function POST(request: Request) {
  try {
    const { tickers } = await request.json();

    if (!tickers?.trim()) {
      return NextResponse.json({ priceActions: [], error: 'Ticker(s) required.' });
    }

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
      const lastPrice = q.lastTradePrice?.toFixed(2) ?? '0.00';

      const upDown = changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'unchanged';
      const absChange = Math.abs(changePercent).toFixed(2);

      // Format day of week from closeDate if available, else today
      const date = q.closeDate ? new Date(q.closeDate) : new Date();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayOfWeek = dayNames[date.getDay()];

      let priceActionText = `${symbol} Price Action: ${companyName} shares were ${upDown} ${absChange}% at $${lastPrice} at the time of publication ${dayOfWeek}, according to Benzinga Pro`;

      // Ensure the summary line ends with a period
      if (!priceActionText.trim().endsWith('.')) {
        priceActionText += '.';
      }

      // Generate technical analysis using OpenAI
      let technicalAnalysis = '';
      // Use q.close if available, otherwise q.lastTradePrice
      const closeValue = q.close ?? q.lastTradePrice;
      if (
        q.fiftyDayAveragePrice && q.hundredDayAveragePrice && q.twoHundredDayAveragePrice &&
        q.open && q.high && q.low && closeValue
      ) {
        // Patch the quote object to always have a close value
        const patchedQuote = { ...q, close: closeValue };
        // Get sector peers for comparison
        const sectorPeers = await getSectorPeers(symbol);
        technicalAnalysis = await generateTechnicalAnalysis(patchedQuote, sectorPeers);
      }

      // Add historical context using available Benzinga data
      let historicalContext = '';
      
      if (q.fiftyTwoWeekLow && q.fiftyTwoWeekHigh && q.lastTradePrice) {
        const currentPrice = q.lastTradePrice;
        const low = q.fiftyTwoWeekLow;
        const high = q.fiftyTwoWeekHigh;
        
        // Determine position within 52-week range
        const rangePosition = ((currentPrice - low) / (high - low)) * 100;
        
        if (rangePosition > 80) {
          historicalContext += `The stock is trading near its 52-week high of $${high.toFixed(2)}. `;
        } else if (rangePosition < 20) {
          historicalContext += `The stock is trading near its 52-week low of $${low.toFixed(2)}. `;
        } else {
          historicalContext += `The stock is trading within its 52-week range of $${low.toFixed(2)} to $${high.toFixed(2)}. `;
        }
      }
      
      if (q.fiftyDayAveragePrice && q.lastTradePrice) {
        const currentPrice = q.lastTradePrice;
        const avg50 = q.fiftyDayAveragePrice;
        
        if (currentPrice > avg50) {
          historicalContext += `Shares are above the 50-day moving average of $${avg50.toFixed(2)}. `;
        } else {
          historicalContext += `Shares are below the 50-day moving average of $${avg50.toFixed(2)}. `;
        }
      }
      
      if (q.volume && q.averageVolume) {
        const volumeRatio = q.volume / q.averageVolume;
        
        if (volumeRatio > 1.5) {
          historicalContext += `Trading volume is above average. `;
        } else if (volumeRatio < 0.7) {
          historicalContext += `Trading volume is below average. `;
        }
      }

      if (historicalContext) {
        priceActionText += '\n\n' + historicalContext;
      }
      
      if (technicalAnalysis) {
        // Clean up the analysis text and ensure proper formatting
        let formattedAnalysis = technicalAnalysis
          .replace(/\.\.+$/, '.') // Remove multiple periods at end
          .replace(/\s+\.$/, '.') // Remove extra spaces before final period
          .replace(/\.\.$/, '.') // Remove double period at end
          .replace(/\.\./g, '.') // Remove any double periods anywhere
          .trim();
        
        // Add proper spacing around headers (do this after other cleanup)
        formattedAnalysis = formattedAnalysis
          .replace(/(TECHNICAL MOMENTUM):/g, '\n$1:\n')
          .replace(/(VOLUME & INTRADAY):/g, '\n$1:\n')
          .replace(/(VALUATION CONTEXT):/g, '\n$1:\n')
          .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove extra line breaks
          .replace(/\n\s*\n/g, '\n\n'); // Ensure consistent double line breaks
        
        // Ensure we start with proper spacing
        if (!formattedAnalysis.startsWith('\n')) {
          formattedAnalysis = '\n' + formattedAnalysis;
        }
        
        // Final cleanup to remove any remaining double periods
        formattedAnalysis = formattedAnalysis.replace(/\.\./g, '.');
        
        priceActionText += '\n' + formattedAnalysis;
      }

      return priceActionText;
    }));

    return NextResponse.json({ priceActions });
  } catch (error) {
    console.error('Error fetching price action:', error);
    return NextResponse.json(
      { priceActions: [], error: 'Failed to fetch price action.' },
      { status: 500 }
    );
  }
}
