'use client';

import React, { useState, forwardRef, useImperativeHandle } from 'react';

export interface EarningsFinancialsGeneratorRef {
  clearData: () => void;
}

interface IncomeStatement {
  revenue?: number;
  earnings_per_share?: number;
  revenue_estimate?: number;
  eps_estimate?: number;
  revenue_surprise_percent?: number;
  eps_surprise_percent?: number;
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

interface EarningsFinancialsData {
  ticker: string;
  financials: FinancialStatement[];
  earningsEvents: EarningsEvent[];
  corporateEvents: EarningsEvent[];
  earningsCalendarAvailable?: boolean;
  corporateEventsAvailable?: boolean;
}

const EarningsFinancialsGenerator = forwardRef<EarningsFinancialsGeneratorRef>((props, ref) => {
  const [ticker, setTicker] = useState('');
  const [data, setData] = useState<EarningsFinancialsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const clearData = () => {
    setTicker('');
    setData(null);
    setLoading(false);
    setError('');
  };

  useImperativeHandle(ref, () => ({
    clearData
  }));

  async function fetchData() {
    if (!ticker.trim()) {
      setError('Please enter a ticker symbol.');
      return;
    }

    setData(null);
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/generate/earnings-financials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: ticker.trim().toUpperCase() }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch earnings/financials data');
      }

      const responseData = await res.json();
      setData(responseData);
    } catch (error: unknown) {
      console.error('Error fetching earnings/financials:', error);
      if (error instanceof Error) setError(error.message);
      else setError(String(error));
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) return 'N/A';
    
    // Convert to number, handling strings that might have commas or other formatting
    let numValue: number;
    if (typeof value === 'number') {
      numValue = value;
    } else {
      // Remove commas and other non-numeric characters (except decimal point and minus sign)
      const cleaned = String(value).replace(/[^0-9.-]/g, '');
      numValue = parseFloat(cleaned);
    }
    
    if (isNaN(numValue) || !isFinite(numValue)) return 'N/A';
    
    if (Math.abs(numValue) >= 1e9) return `$${(numValue / 1e9).toFixed(2)}B`;
    if (Math.abs(numValue) >= 1e6) return `$${(numValue / 1e6).toFixed(2)}M`;
    if (Math.abs(numValue) >= 1e3) return `$${(numValue / 1e3).toFixed(2)}K`;
    return `$${numValue.toFixed(2)}`;
  };

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <section className="p-4 border border-blue-600 rounded-md max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-blue-700">Earnings & Financials</h2>
        {data && (
          <button
            onClick={clearData}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
          >
            Clear Data
          </button>
        )}
      </div>

      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="Enter ticker symbol (e.g., NVDA)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !loading) {
              fetchData();
            }
          }}
        />
        <button
          onClick={fetchData}
          disabled={loading || !ticker.trim()}
          className="bg-blue-600 text-white px-6 py-2 rounded disabled:bg-blue-300 font-semibold"
        >
          {loading ? 'Loading...' : 'Fetch Data'}
        </button>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {data && (
        <div className="space-y-6">
          {/* Financial Statements Section */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Financial Statements
            </h3>
            {data.financials && data.financials.length > 0 ? (
              <div className="space-y-4">
                {data.financials.slice(0, 4).map((statement, idx) => (
                  <div key={idx} className="border-b border-gray-300 pb-4 last:border-b-0">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold">Period: </span>
                        {(() => {
                          const period = statement.fiscal_period;
                          const year = statement.fiscal_year;
                          return period && year ? `${period} ${year}` : year ? `FY ${year}` : 'N/A';
                        })()}
                      </div>
                      <div>
                        <span className="font-semibold">Filing Date: </span>
                        {formatDate(statement.filing_date)}
                      </div>
                      {statement.end_date && (
                        <div className="col-span-2 text-xs text-gray-500">
                          Period: {formatDate(statement.start_date)} to {formatDate(statement.end_date)}
                        </div>
                      )}
                    </div>
                    {statement.financials?.income_statement && (
                      <div className="mt-2 text-sm">
                        <h4 className="font-semibold mb-1">Income Statement</h4>
                        <div className="ml-4 space-y-1 text-xs">
                          {(() => {
                            const incomeStmt = statement.financials.income_statement;
                            
                            // Benzinga earnings data structure (from API logs)
                            const revenue = incomeStmt.revenue;
                            const eps = incomeStmt.earnings_per_share;
                            const revenueEst = incomeStmt.revenue_estimate;
                            const epsEst = incomeStmt.eps_estimate;
                            const revenueSurprise = incomeStmt.revenue_surprise_percent;
                            const epsSurprise = incomeStmt.eps_surprise_percent;
                            
                            // Convert surprise percentages to numbers if they're strings
                            const revenueSurpriseNum = revenueSurprise !== undefined && revenueSurprise !== null 
                              ? (typeof revenueSurprise === 'number' ? revenueSurprise : parseFloat(String(revenueSurprise)))
                              : null;
                            const epsSurpriseNum = epsSurprise !== undefined && epsSurprise !== null
                              ? (typeof epsSurprise === 'number' ? epsSurprise : parseFloat(String(epsSurprise)))
                              : null;
                            
                            return (
                              <>
                                {revenue !== undefined && revenue !== null && (
                                  <div>
                                    Revenue: {formatCurrency(revenue)}
                                    {revenueEst && (
                                      <span className="text-gray-500 ml-2">(est: {formatCurrency(revenueEst)})</span>
                                    )}
                                    {revenueSurpriseNum !== null && !isNaN(revenueSurpriseNum) && (
                                      <span className={`ml-2 ${revenueSurpriseNum >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        ({revenueSurpriseNum >= 0 ? '+' : ''}{revenueSurpriseNum.toFixed(1)}%)
                                      </span>
                                    )}
                                  </div>
                                )}
                                {eps !== undefined && eps !== null && (
                                  <div>
                                    EPS: ${typeof eps === 'number' ? eps.toFixed(2) : parseFloat(String(eps)).toFixed(2)}
                                    {epsEst && (
                                      <span className="text-gray-500 ml-2">(est: ${typeof epsEst === 'number' ? epsEst.toFixed(2) : parseFloat(String(epsEst)).toFixed(2)})</span>
                                    )}
                                    {epsSurpriseNum !== null && !isNaN(epsSurpriseNum) && (
                                      <span className={`ml-2 ${epsSurpriseNum >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        ({epsSurpriseNum >= 0 ? '+' : ''}{epsSurpriseNum.toFixed(1)}%)
                                      </span>
                                    )}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">No financial statements available.</p>
            )}
          </div>

          {/* Earnings Events Section */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Earnings Calendar
            </h3>
            {data.earningsCalendarAvailable === false ? (
              <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded border border-amber-200 dark:border-amber-800">
                <p className="font-semibold mb-1">Data Not Available</p>
                <p>Earnings calendar data could not be fetched from Benzinga API. This may require a specific subscription tier.</p>
              </div>
            ) : data.earningsEvents && data.earningsEvents.length > 0 ? (
              <div className="space-y-3">
                {data.earningsEvents.slice(0, 10).map((event, idx) => {
                  interface EarningsEventData {
                    date?: string;
                    period?: number;
                    period_year?: number;
                    name?: string;
                    eps?: number;
                    eps_est?: number;
                    eps_surprise_percent?: number;
                    revenue?: number;
                    revenue_est?: number;
                    revenue_surprise_percent?: number;
                    time?: string;
                    [key: string]: unknown;
                  }
                  const eventData = event as EarningsEventData;
                  return (
                  <div key={idx} className="border-b border-gray-300 pb-3 last:border-b-0">
                    <div className="text-sm">
                      <div className="font-semibold">
                        {formatDate(eventData.date)}
                        {eventData.period && eventData.period_year && (
                          <span className="text-gray-600 dark:text-gray-400 ml-2">Q{eventData.period} {eventData.period_year}</span>
                        )}
                      </div>
                      {eventData.name && (
                        <div className="text-gray-700 dark:text-gray-300 font-medium mt-1">{eventData.name}</div>
                      )}
                      {eventData.eps !== undefined && eventData.eps !== null && (
                        <div className="mt-1">
                          EPS: ${typeof eventData.eps === 'number' ? eventData.eps.toFixed(2) : String(eventData.eps)}
                          {eventData.eps_est && (
                            <span className="text-gray-500 ml-2">(est: ${typeof eventData.eps_est === 'number' ? eventData.eps_est.toFixed(2) : String(eventData.eps_est)})</span>
                          )}
                          {eventData.eps_surprise_percent !== undefined && eventData.eps_surprise_percent !== null && (() => {
                            const epsSurpriseNum = typeof eventData.eps_surprise_percent === 'number' 
                              ? eventData.eps_surprise_percent 
                              : parseFloat(String(eventData.eps_surprise_percent));
                            return !isNaN(epsSurpriseNum) && (
                              <span className={`ml-2 ${epsSurpriseNum >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ({epsSurpriseNum >= 0 ? '+' : ''}{epsSurpriseNum.toFixed(1)}%)
                              </span>
                            );
                          })()}
                        </div>
                      )}
                      {eventData.revenue !== undefined && eventData.revenue !== null && (
                        <div className="mt-1">
                          Revenue: {formatCurrency(eventData.revenue)}
                          {eventData.revenue_est && (
                            <span className="text-gray-500 ml-2">(est: {formatCurrency(eventData.revenue_est)})</span>
                          )}
                          {eventData.revenue_surprise_percent !== undefined && eventData.revenue_surprise_percent !== null && (() => {
                            const revenueSurpriseNum = typeof eventData.revenue_surprise_percent === 'number'
                              ? eventData.revenue_surprise_percent
                              : parseFloat(String(eventData.revenue_surprise_percent));
                            return !isNaN(revenueSurpriseNum) && (
                              <span className={`ml-2 ${revenueSurpriseNum >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ({revenueSurpriseNum >= 0 ? '+' : ''}{revenueSurpriseNum.toFixed(1)}%)
                              </span>
                            );
                          })()}
                        </div>
                      )}
                      {eventData.time && (
                        <div className="text-xs text-gray-500 mt-1">Time: {eventData.time}</div>
                      )}
                    </div>
                  </div>
                );
                })}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">No earnings events available.</p>
            )}
          </div>

          {/* Corporate Events Section - Hidden for now since endpoint returns 404 */}
          {data.corporateEventsAvailable === true && data.corporateEvents && data.corporateEvents.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded border border-gray-200">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Corporate Events Calendar
              </h3>
              <div className="space-y-3">
                {data.corporateEvents.slice(0, 20).map((event, idx) => (
                  <div key={idx} className="border-b border-gray-300 pb-3 last:border-b-0">
                    <div className="text-sm">
                      <div className="font-semibold">{formatDate(event.date)}</div>
                      {event.event_type && (
                        <div className="text-blue-600 dark:text-blue-400 font-medium mt-1">
                          {event.event_type}
                        </div>
                      )}
                      {event.description && (
                        <div className="text-gray-600 dark:text-gray-400 mt-1">{event.description}</div>
                      )}
                      {event.status && (
                        <div className="text-xs text-gray-500 mt-1">Status: {event.status}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
});

EarningsFinancialsGenerator.displayName = 'EarningsFinancialsGenerator';

export default EarningsFinancialsGenerator;

