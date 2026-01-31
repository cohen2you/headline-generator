import { NextRequest, NextResponse } from 'next/server';

interface HistoricalBar {
  t: number; // timestamp
  c: number; // close price
  h?: number;
  l?: number;
  o?: number;
  v?: number;
}

// Fetch historical bars
async function fetchHistoricalBars(symbol: string, fromDate: string, toDate: string): Promise<HistoricalBar[]> {
  try {
    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${fromDate}/${toDate}?adjusted=true&apikey=${process.env.POLYGON_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return (data.results || []).sort((a: HistoricalBar, b: HistoricalBar) => a.t - b.t);
  } catch (error) {
    console.error(`Error fetching historical bars for ${symbol}:`, error);
    return [];
  }
}

// Fetch historical RSI
async function fetchHistoricalRSI(symbol: string, fromDate: string, toDate: string): Promise<Array<{ value: number; timestamp: number }>> {
  try {
    const url = `https://api.polygon.io/v1/indicators/rsi/${symbol}?timestamp.gte=${fromDate}&timestamp.lte=${toDate}&timespan=day&adjusted=true&window=14&series_type=close&order=desc&limit=500&apikey=${process.env.POLYGON_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    if (data.results?.values && data.results.values.length > 0) {
      return data.results.values.map((v: { value: number; timestamp: number }) => ({
        value: v.value,
        timestamp: v.timestamp
      })).sort((a: { timestamp: number }, b: { timestamp: number }) => a.timestamp - b.timestamp);
    }
    return [];
  } catch (error) {
    console.error(`Error fetching historical RSI for ${symbol}:`, error);
    return [];
  }
}

// Fetch historical SMA
async function fetchHistoricalSMA(symbol: string, window: number, fromDate: string, toDate: string): Promise<Array<{ value: number; timestamp: number }>> {
  try {
    const url = `https://api.polygon.io/v1/indicators/sma/${symbol}?timestamp.gte=${fromDate}&timestamp.lte=${toDate}&timespan=day&adjusted=true&window=${window}&series_type=close&order=desc&limit=500&apikey=${process.env.POLYGON_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    if (data.results?.values && data.results.values.length > 0) {
      return data.results.values.map((v: { value: number; timestamp: number }) => ({
        value: v.value,
        timestamp: v.timestamp
      })).sort((a: { timestamp: number }, b: { timestamp: number }) => a.timestamp - b.timestamp);
    }
    return [];
  } catch (error) {
    console.error(`Error fetching historical SMA-${window} for ${symbol}:`, error);
    return [];
  }
}

// Fetch historical MACD
async function fetchHistoricalMACD(symbol: string, fromDate: string, toDate: string): Promise<Array<{ macd: number; signal: number; histogram: number; timestamp: number }>> {
  try {
    const url = `https://api.polygon.io/v1/indicators/macd/${symbol}?timestamp.gte=${fromDate}&timestamp.lte=${toDate}&timespan=day&adjusted=true&short_window=12&long_window=26&signal_window=9&series_type=close&order=desc&limit=500&apikey=${process.env.POLYGON_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    if (data.results?.values && data.results.values.length > 0) {
      return data.results.values
        .filter((v: { value?: number; signal?: number; histogram?: number; timestamp: number }) => 
          v.value !== undefined && v.signal !== undefined && v.histogram !== undefined
        )
        .map((v: { value: number; signal: number; histogram: number; timestamp: number }) => ({
          macd: v.value,
          signal: v.signal,
          histogram: v.histogram,
          timestamp: v.timestamp
        }))
        .sort((a: { timestamp: number }, b: { timestamp: number }) => a.timestamp - b.timestamp);
    }
    return [];
  } catch (error) {
    console.error(`Error fetching historical MACD for ${symbol}:`, error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const { symbol, chartType } = await request.json();

    if (!symbol || !chartType) {
      return NextResponse.json(
        { error: 'Symbol and chartType are required' },
        { status: 400 }
      );
    }

    const upperSymbol = symbol.toUpperCase();

    // Get company name
    const overviewUrl = `https://api.polygon.io/v3/reference/tickers/${upperSymbol}?apikey=${process.env.POLYGON_API_KEY}`;
    const overviewRes = await fetch(overviewUrl);
    const overview = overviewRes.ok ? await overviewRes.json() : null;
    const companyName = overview?.results?.name || upperSymbol;

    // Set date range (2 years for most charts, can be extended)
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const today = new Date();
    const fromDate = twoYearsAgo.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];

    // Fetch historical bars for all chart types
    const bars = await fetchHistoricalBars(upperSymbol, fromDate, toDate);

    if (bars.length === 0) {
      return NextResponse.json(
        { error: 'No historical data available' },
        { status: 400 }
      );
    }

    // Handle different chart types
    switch (chartType) {
      case 'price-moving-averages': {
        // Fetch SMA 20, 50, 200
        const [sma20, sma50, sma200] = await Promise.all([
          fetchHistoricalSMA(upperSymbol, 20, fromDate, toDate),
          fetchHistoricalSMA(upperSymbol, 50, fromDate, toDate),
          fetchHistoricalSMA(upperSymbol, 200, fromDate, toDate)
        ]);

        // Create a map of timestamps to prices and MAs
        const priceMap = new Map<number, { price: number; sma20?: number; sma50?: number; sma200?: number }>();
        
        bars.forEach(bar => {
          priceMap.set(bar.t, { price: bar.c });
        });

        sma20.forEach(sma => {
          const entry = priceMap.get(sma.timestamp);
          if (entry) entry.sma20 = sma.value;
        });

        sma50.forEach(sma => {
          const entry = priceMap.get(sma.timestamp);
          if (entry) entry.sma50 = sma.value;
        });

        sma200.forEach(sma => {
          const entry = priceMap.get(sma.timestamp);
          if (entry) entry.sma200 = sma.value;
        });

        const dataPoints = Array.from(priceMap.entries())
          .map(([timestamp, data]) => ({
            date: new Date(timestamp).toISOString().split('T')[0],
            price: data.price,
            sma20: data.sma20 || null,
            sma50: data.sma50 || null,
            sma200: data.sma200 || null
          }))
          .filter(d => d.sma20 !== null || d.sma50 !== null || d.sma200 !== null)
          .sort((a, b) => a.date.localeCompare(b.date));

        return NextResponse.json({
          chartType: 'price-moving-averages',
          companyName,
          symbol: upperSymbol,
          dataPoints
        });
      }

      case 'rsi-heatmap': {
        const rsiData = await fetchHistoricalRSI(upperSymbol, fromDate, toDate);
        
        const dataPoints = rsiData.map(rsi => ({
          date: new Date(rsi.timestamp).toISOString().split('T')[0],
          rsi: rsi.value,
          // Color coding: 0-30 oversold (green), 30-70 neutral (yellow), 70-100 overbought (red)
          color: rsi.value <= 30 ? 'oversold' : rsi.value >= 70 ? 'overbought' : 'neutral'
        }));

        return NextResponse.json({
          chartType: 'rsi-heatmap',
          companyName,
          symbol: upperSymbol,
          dataPoints
        });
      }

      case 'macd-multi-panel': {
        const macdData = await fetchHistoricalMACD(upperSymbol, fromDate, toDate);
        
        // Also get price data for the same timestamps
        const priceMap = new Map<number, number>();
        bars.forEach(bar => {
          priceMap.set(bar.t, bar.c);
        });

        const dataPoints = macdData
          .map(macd => ({
            date: new Date(macd.timestamp).toISOString().split('T')[0],
            price: priceMap.get(macd.timestamp) || null,
            macd: macd.macd,
            signal: macd.signal,
            histogram: macd.histogram
          }))
          .filter(d => d.price !== null)
          .sort((a, b) => a.date.localeCompare(b.date));

        return NextResponse.json({
          chartType: 'macd-multi-panel',
          companyName,
          symbol: upperSymbol,
          dataPoints
        });
      }

      case 'volume-profile': {
        // Volume profile shows volume at different price levels
        const dataPoints = bars.map(bar => ({
          date: new Date(bar.t).toISOString().split('T')[0],
          price: bar.c,
          volume: bar.v || 0,
          high: bar.h || bar.c,
          low: bar.l || bar.c,
          open: bar.o || bar.c
        })).sort((a, b) => a.date.localeCompare(b.date));

        return NextResponse.json({
          chartType: 'volume-profile',
          companyName,
          symbol: upperSymbol,
          dataPoints
        });
      }

      case 'edge-rankings': {
        // Fetch Edge Rankings from Benzinga Edge API
        if (!process.env.BENZINGA_EDGE_API_KEY) {
          return NextResponse.json(
            { error: 'Edge API key not configured' },
            { status: 500 }
          );
        }

        const url = `https://data-api-next.benzinga.com/rest/v3/tickerDetail?apikey=${process.env.BENZINGA_EDGE_API_KEY}&symbols=${upperSymbol}`;
        const edgeRes = await fetch(url);

        if (!edgeRes.ok) {
          return NextResponse.json(
            { error: `Failed to fetch edge rankings. Status: ${edgeRes.status}` },
            { status: 500 }
          );
        }

        const edgeData = await edgeRes.json();
        const result = edgeData.result && edgeData.result[0];
        const rankings = result && result.rankings;

        if (!rankings || !rankings.exists) {
          return NextResponse.json(
            { error: 'No edge rankings data found for ticker' },
            { status: 404 }
          );
        }

        // Extract metrics (only include non-null values)
        const metrics = [];
        if (rankings.momentum !== null && rankings.momentum !== undefined) {
          metrics.push({ name: 'Momentum', value: rankings.momentum });
        }
        if (rankings.growth !== null && rankings.growth !== undefined) {
          metrics.push({ name: 'Growth', value: rankings.growth });
        }
        if (rankings.quality !== null && rankings.quality !== undefined) {
          metrics.push({ name: 'Quality', value: rankings.quality });
        }
        if (rankings.value !== null && rankings.value !== undefined) {
          metrics.push({ name: 'Value', value: rankings.value });
        }

        if (metrics.length === 0) {
          return NextResponse.json(
            { error: 'No edge rankings metrics available for ticker' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          chartType: 'edge-rankings',
          companyName,
          symbol: upperSymbol,
          metrics
        });
      }

      default:
        return NextResponse.json(
          { error: `Unsupported chart type: ${chartType}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error generating chart:', error);
    return NextResponse.json(
      { error: 'Failed to generate chart data' },
      { status: 500 }
    );
  }
}
