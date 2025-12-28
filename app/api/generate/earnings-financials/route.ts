import { NextResponse } from 'next/server';

const BENZINGA_API_KEY = process.env.BENZINGA_API_KEY!;

interface IncomeStatement {
  revenue?: number;
  earnings_per_share?: number;
  revenue_estimate?: number;
  eps_estimate?: number;
  revenue_surprise?: number;
  revenue_surprise_percent?: number;
  eps_surprise?: number;
  eps_surprise_percent?: number;
  revenue_prior?: number;
  eps_prior?: number;
}

interface FinancialStatement {
  financials?: {
    balance_sheet?: unknown;
    income_statement?: IncomeStatement;
    cash_flow_statement?: unknown;
  };
  start_date?: string;
  end_date?: string;
  fiscal_period?: string;
  fiscal_year?: string | number;
  filing_date?: string;
  timeframe?: string;
}

interface EarningsEvent {
  date?: string;
  ticker?: string;
  event_type?: string;
  name?: string;
  description?: string;
  status?: string;
  exchange?: string;
}

export async function POST(request: Request) {
  try {
    const { ticker } = await request.json();
    
    if (!ticker || !ticker.trim()) {
      return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }
    
    const symbol = ticker.trim().toUpperCase();
    console.log(`=== FETCHING EARNINGS/FINANCIALS FOR ${symbol} ===`);
    
    // Extract financial data from earnings calendar responses since Benzinga earnings include revenue, EPS data
    // No separate financial statements endpoint needed - earnings data provides key metrics
    
    // Fetch earnings calendar from Benzinga API (direct)
    let earningsRes: Response | null = null;
    try {
      // Benzinga earnings calendar endpoint (v2 according to documentation)
      const url = 'https://api.benzinga.com/api/v2/calendar/earnings' +
        `?token=${BENZINGA_API_KEY}` +
        `&parameters[tickers]=${encodeURIComponent(symbol)}` +
        `&parameters[date_from]=${new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}` + // Last 90 days
        `&parameters[date_to]=${new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}` + // Next 180 days
        `&pagesize=20`; // Limit results
      
      earningsRes = await fetch(url, { headers: { accept: 'application/json' } });
    } catch (error) {
      console.log('Earnings calendar endpoint fetch failed:', error);
    }
    
    // Fetch guidance data from Benzinga API (corporate guidance/events)
    let eventsRes: Response | null = null;
    try {
      // Use guidance endpoint for corporate events/guidance data
      const url = 'https://api.benzinga.com/api/v2/calendar/guidance' +
        `?token=${BENZINGA_API_KEY}` +
        `&parameters[tickers]=${encodeURIComponent(symbol)}` +
        `&parameters[date_from]=${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}` + // Last 30 days
        `&parameters[date_to]=${new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}` + // Next 180 days
        `&pagesize=20`; // Limit results
      
      eventsRes = await fetch(url, { headers: { accept: 'application/json' } });
    } catch (error) {
      console.log('Guidance/events endpoint fetch failed:', error);
    }
    
    // Extract financial data from earnings calendar (which includes revenue, EPS, etc.)
    // Benzinga earnings data includes key financial metrics from recent quarters
    const financialStatements: FinancialStatement[] = [];
    
    // We'll populate this from earnings data after parsing it below
    
    // Parse earnings calendar (Benzinga API) - this includes financial data
    const earningsEvents: EarningsEvent[] = [];
    if (earningsRes) {
      console.log('Earnings calendar response status:', earningsRes.status);
      if (earningsRes.ok) {
        const raw = await earningsRes.text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw.trim());
        } catch {
          console.log('Earnings calendar: Invalid JSON response');
        }
        
        // Benzinga API may return array directly or wrapped in object
        interface EarningsResponse {
          earnings?: unknown[];
          results?: unknown[];
          data?: unknown[];
        }
        const results: unknown[] = Array.isArray(parsed)
          ? parsed
          : ((parsed as EarningsResponse).earnings 
            || (parsed as EarningsResponse).results 
            || (parsed as EarningsResponse).data 
            || []);
        
        earningsEvents.push(...(results as EarningsEvent[]));
        console.log(`Earnings events received: ${earningsEvents.length} records`);
        if (earningsEvents.length > 0) {
          console.log('Sample earnings event keys:', Object.keys(earningsEvents[0]));
          
          // Convert earnings data to financial statements format
          // Benzinga earnings include revenue, EPS, and period info
          interface EarningsData {
            revenue?: number;
            revenue_prior?: number;
            eps?: number;
            eps_prior?: number;
            period?: number;
            period_year?: number;
            date?: string;
            revenue_est?: number;
            eps_est?: number;
            revenue_surprise?: number;
            revenue_surprise_percent?: number;
            eps_surprise?: number;
            eps_surprise_percent?: number;
            [key: string]: unknown;
          }
          
          results.forEach((earning) => {
            const earningData = earning as EarningsData;
            // Use actual revenue/eps values, with fallback to prior if current not available
            const revenue = earningData.revenue || earningData.revenue_prior;
            const eps = earningData.eps || earningData.eps_prior;
            
            if (revenue || eps) {
              financialStatements.push({
                fiscal_period: earningData.period ? `Q${earningData.period}` : undefined,
                fiscal_year: earningData.period_year,
                filing_date: earningData.date,
                end_date: earningData.date,
                financials: {
                  income_statement: {
                    revenue: revenue,
                    earnings_per_share: eps,
                    revenue_estimate: earningData.revenue_est,
                    eps_estimate: earningData.eps_est,
                    revenue_surprise: earningData.revenue_surprise,
                    revenue_surprise_percent: earningData.revenue_surprise_percent,
                    eps_surprise: earningData.eps_surprise,
                    eps_surprise_percent: earningData.eps_surprise_percent,
                    revenue_prior: earningData.revenue_prior,
                    eps_prior: earningData.eps_prior
                  }
                }
              });
            }
          });
          
          // Sort by date descending (most recent first)
          financialStatements.sort((a, b) => {
            const dateA = a.filing_date ? new Date(a.filing_date).getTime() : 0;
            const dateB = b.filing_date ? new Date(b.filing_date).getTime() : 0;
            return dateB - dateA;
          });
        }
      } else {
        const errorText = await earningsRes.text().catch(() => '');
        console.log('Earnings calendar error:', errorText.substring(0, 300));
      }
    }
    
    // Parse corporate events (Benzinga API)
    const allEvents: EarningsEvent[] = [];
    if (eventsRes) {
      console.log('Corporate events response status:', eventsRes.status);
      if (eventsRes.ok) {
        const raw = await eventsRes.text();
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw.trim());
        } catch {
          console.log('Corporate events: Invalid JSON response');
        }
        
        // Benzinga API may return array directly or wrapped in object
        interface EventsResponse {
          events?: unknown[];
          results?: unknown[];
          data?: unknown[];
        }
        const results: unknown[] = Array.isArray(parsed)
          ? parsed
          : ((parsed as EventsResponse).events 
            || (parsed as EventsResponse).results 
            || (parsed as EventsResponse).data 
            || []);
        
        allEvents.push(...(results as EarningsEvent[]));
        console.log(`Corporate events received: ${allEvents.length} records`);
        if (allEvents.length > 0) {
          console.log('Sample corporate event keys:', Object.keys(allEvents[0]));
        }
      } else {
        const errorText = await eventsRes.text().catch(() => '');
        console.log('Corporate events error:', errorText.substring(0, 300));
      }
    }
    
    return NextResponse.json({
      ticker: symbol,
      financials: financialStatements,
      earningsEvents,
      corporateEvents: allEvents,
      // Include availability flags for UI handling (now using Benzinga API)
      earningsCalendarAvailable: earningsRes?.status === 200,
      corporateEventsAvailable: eventsRes?.status === 200
    });
    
  } catch (error) {
    console.error('Error fetching earnings/financials:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch earnings/financials data' },
      { status: 500 }
    );
  }
}

