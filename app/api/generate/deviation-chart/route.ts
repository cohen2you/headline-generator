import { NextRequest, NextResponse } from 'next/server';

interface HistoricalBar {
  t: number; // timestamp
  c: number; // close price
  h?: number;
  l?: number;
  o?: number;
  v?: number;
}

interface DeviationDataPoint {
  date: string;
  price: number;
  movingAverage: number;
  deviation: number; // percentage deviation
}

interface ChartData {
  dataPoints: DeviationDataPoint[];
  stdDev: number;
  meanDeviation: number;
  companyName: string;
  symbol: string;
  maPeriod: number;
}

// Calculate moving average for a given period
function calculateMovingAverage(bars: HistoricalBar[], index: number, period: number): number {
  if (index < period - 1) {
    return 0; // Not enough data
  }
  
  const slice = bars.slice(index - period + 1, index + 1);
  const sum = slice.reduce((acc, bar) => acc + bar.c, 0);
  return sum / period;
}

// Calculate standard deviation
function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(variance);
}

export async function POST(request: NextRequest) {
  try {
    const { symbol, maPeriod } = await request.json();

    if (!symbol || !maPeriod) {
      return NextResponse.json(
        { error: 'Symbol and MA period are required' },
        { status: 400 }
      );
    }

    if (maPeriod !== 50 && maPeriod !== 200) {
      return NextResponse.json(
        { error: 'MA period must be 50 or 200' },
        { status: 400 }
      );
    }

    const upperSymbol = symbol.toUpperCase();

    // Get company name
    const overviewUrl = `https://api.polygon.io/v3/reference/tickers/${upperSymbol}?apikey=${process.env.POLYGON_API_KEY}`;
    const overviewRes = await fetch(overviewUrl);
    const overview = overviewRes.ok ? await overviewRes.json() : null;
    const companyName = overview?.results?.name || upperSymbol;

    // Fetch historical data - get as much as possible (up to 20 years)
    // Polygon API supports going back many years, so we'll request 20 years
    // which should cover decades for most stocks
    const twentyYearsAgo = new Date();
    twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - 20);
    const today = new Date();
    
    const fromDate = twentyYearsAgo.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];

    const historicalUrl = `https://api.polygon.io/v2/aggs/ticker/${upperSymbol}/range/1/day/${fromDate}/${toDate}?adjusted=true&apikey=${process.env.POLYGON_API_KEY}`;
    const historicalRes = await fetch(historicalUrl);

    if (!historicalRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch historical data: ${historicalRes.statusText}` },
        { status: historicalRes.status }
      );
    }

    const historicalData = await historicalRes.json();
    const bars: HistoricalBar[] = historicalData.results || [];

    if (bars.length < maPeriod) {
      return NextResponse.json(
        { error: `Not enough historical data. Need at least ${maPeriod} days, got ${bars.length}` },
        { status: 400 }
      );
    }

    // Sort bars by timestamp (oldest first)
    bars.sort((a, b) => a.t - b.t);

    // Calculate moving averages and deviations
    const dataPoints: DeviationDataPoint[] = [];
    const deviations: number[] = [];

    for (let i = maPeriod - 1; i < bars.length; i++) {
      const bar = bars[i];
      const ma = calculateMovingAverage(bars, i, maPeriod);
      
      if (ma > 0) {
        const deviation = ((bar.c - ma) / ma) * 100;
        const date = new Date(bar.t).toISOString().split('T')[0];
        
        dataPoints.push({
          date,
          price: bar.c,
          movingAverage: ma,
          deviation
        });
        
        deviations.push(deviation);
      }
    }

    if (dataPoints.length === 0) {
      return NextResponse.json(
        { error: 'No valid data points calculated' },
        { status: 400 }
      );
    }

    // Calculate standard deviation and mean
    const stdDev = calculateStandardDeviation(deviations);
    const meanDeviation = deviations.reduce((sum, val) => sum + val, 0) / deviations.length;

    const chartData: ChartData = {
      dataPoints,
      stdDev,
      meanDeviation,
      companyName,
      symbol: upperSymbol,
      maPeriod
    };

    return NextResponse.json(chartData);
  } catch (error) {
    console.error('Error generating deviation chart:', error);
    return NextResponse.json(
      { error: 'Failed to generate chart data' },
      { status: 500 }
    );
  }
}
