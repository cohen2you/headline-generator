'use client';

import React, { useState, useImperativeHandle, forwardRef, useRef, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import html2canvas from 'html2canvas';

export interface ChartGeneratorRef {
  clearData: () => void;
}

type ChartType = 
  | 'deviation'
  | 'enhanced-deviation'
  | 'price-moving-averages'
  | 'rsi-heatmap'
  | 'macd-multi-panel'
  | 'volume-profile'
  | 'edge-rankings'
  | 'price-comparison'
  | 'sector-performance'
  | 'relative-strength';

interface ChartTypeOption {
  value: ChartType;
  label: string;
  requiresMultipleTickers: boolean;
  description: string;
}

const CHART_TYPES: ChartTypeOption[] = [
  { value: 'deviation', label: 'Deviation Chart', requiresMultipleTickers: false, description: '% Deviation from Moving Average' },
  { value: 'enhanced-deviation', label: 'Enhanced Deviation Chart', requiresMultipleTickers: false, description: 'Deviation with gradient effects' },
  { value: 'price-moving-averages', label: 'Price with Moving Averages', requiresMultipleTickers: false, description: 'Price chart with MA overlays' },
  { value: 'rsi-heatmap', label: 'RSI Heatmap Timeline', requiresMultipleTickers: false, description: 'RSI values as color gradient' },
  { value: 'macd-multi-panel', label: 'MACD Multi-Panel Chart', requiresMultipleTickers: false, description: 'Price, MACD lines, and histogram' },
  { value: 'volume-profile', label: 'Volume Profile Chart', requiresMultipleTickers: false, description: '3D volume bars with depth' },
  { value: 'edge-rankings', label: 'Benzinga Edge Rankings', requiresMultipleTickers: false, description: '3D bar chart with gradient fills' },
  { value: 'price-comparison', label: 'Price Comparison Chart', requiresMultipleTickers: true, description: 'Compare multiple tickers' },
  { value: 'sector-performance', label: 'Sector Performance Comparison', requiresMultipleTickers: true, description: 'Compare sector ETFs' },
  { value: 'relative-strength', label: 'Relative Strength Comparison', requiresMultipleTickers: true, description: 'Compare relative performance' },
];

// Deviation Chart interfaces (keeping existing structure)
interface DeviationDataPoint {
  date: string;
  price: number;
  movingAverage: number;
  deviation: number;
}

interface DeviationChartData {
  dataPoints: DeviationDataPoint[];
  stdDev: number;
  meanDeviation: number;
  companyName: string;
  symbol: string;
  maPeriod: number;
}

const ChartGenerator = forwardRef<ChartGeneratorRef>((props, ref) => {
  const [chartType, setChartType] = useState<ChartType>('deviation');
  const [tickerInput, setTickerInput] = useState('');
  const [maPeriod, setMaPeriod] = useState<50 | 200>(200);
  const [chartData, setChartData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartOnlyRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    clearData: () => {
      setTickerInput('');
      setChartData(null);
      setError(null);
    }
  }));

  // Parse tickers from input
  const parseTickers = (input: string): string[] => {
    return input
      .split(',')
      .map(t => t.trim().toUpperCase())
      .filter(t => t.length > 0);
  };

  // Get available chart types based on ticker input
  const getAvailableChartTypes = (): ChartTypeOption[] => {
    const tickers = parseTickers(tickerInput);
    const isMultiple = tickers.length > 1;
    
    if (isMultiple) {
      // Show only comparison charts
      return CHART_TYPES.filter(ct => ct.requiresMultipleTickers);
    } else {
      // Show only single-ticker charts
      return CHART_TYPES.filter(ct => !ct.requiresMultipleTickers);
    }
  };

  // Auto-update chart type if current selection becomes invalid
  useEffect(() => {
    const tickers = parseTickers(tickerInput);
    const isMultiple = tickers.length > 1;
    const availableTypes = isMultiple 
      ? CHART_TYPES.filter(ct => ct.requiresMultipleTickers)
      : CHART_TYPES.filter(ct => !ct.requiresMultipleTickers);
    const currentTypeValid = availableTypes.some(ct => ct.value === chartType);
    
    if (!currentTypeValid && availableTypes.length > 0) {
      setChartType(availableTypes[0].value);
    }
  }, [tickerInput, chartType]);

  // Auto-regenerate chart when MA period changes (for deviation charts)
  useEffect(() => {
    if (chartData && tickerInput.trim() && !loading && (chartType === 'deviation' || chartType === 'enhanced-deviation')) {
      generateChart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maPeriod]);

  const generateChart = async () => {
    const tickers = parseTickers(tickerInput);
    
    if (tickers.length === 0) {
      setError('Please enter at least one ticker symbol');
      return;
    }

    const selectedChartType = CHART_TYPES.find(ct => ct.value === chartType);
    if (!selectedChartType) {
      setError('Invalid chart type selected');
      return;
    }

    // Validate ticker count matches chart requirements
    if (selectedChartType.requiresMultipleTickers && tickers.length === 1) {
      setError('This chart type requires multiple tickers. Please enter tickers separated by commas (e.g., AAPL,MSFT,GOOGL)');
      return;
    }

    if (!selectedChartType.requiresMultipleTickers && tickers.length > 1) {
      setError('This chart type only supports a single ticker. Please enter only one ticker.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Deviation chart uses the existing route
      if (chartType === 'deviation' || chartType === 'enhanced-deviation') {
        const response = await fetch('/api/generate/deviation-chart', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symbol: tickers[0],
            maPeriod
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate chart');
        }

        const data = await response.json();
        setChartData(data);
      } else if (['price-moving-averages', 'rsi-heatmap', 'macd-multi-panel', 'volume-profile', 'edge-rankings'].includes(chartType)) {
        // New chart types use the unified chart route
        const response = await fetch('/api/generate/chart', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symbol: tickers[0],
            chartType
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate chart');
        }

        const data = await response.json();
        setChartData(data);
      } else {
        // Placeholder for other chart types
        setError(`Chart type "${selectedChartType.label}" is coming soon!`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate chart');
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string, dataLength?: number) => {
    const date = new Date(dateStr);
    if (dataLength && dataLength > 500) {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    }
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTooltipDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Render chart based on type
  const renderChart = () => {
    if (!chartData) return null;

    // Deviation Chart rendering (standard)
    if (chartType === 'deviation') {
      const deviationData = chartData as DeviationChartData;
      const chartDataFormatted = deviationData.dataPoints.map((point, index, array) => ({
        ...point,
        dateFormatted: formatDate(point.date, array.length),
        dateFull: formatTooltipDate(point.date)
      })) || [];

      const upperBand = deviationData.stdDev;
      const lowerBand = -deviationData.stdDev;

      return (
        <div ref={chartContainerRef} className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">
              {deviationData.companyName} ({deviationData.symbol}) - % Deviation from {deviationData.maPeriod}-Day Moving Average
            </h3>
            <button
              onClick={copyChartToClipboard}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
            >
              {copySuccess ? '✓ Saved!' : 'Save Chart'}
            </button>
          </div>
          
          <div className="mb-4 text-sm text-gray-600">
            <p>Standard Deviation: ±{deviationData.stdDev.toFixed(2)}%</p>
            <p>Mean Deviation: {deviationData.meanDeviation.toFixed(2)}%</p>
          </div>

          <div className="w-full" style={{ height: '500px', padding: 0, margin: 0, border: 'none', overflow: 'hidden' }}>
            <div ref={chartOnlyRef} style={{ width: '100%', height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartDataFormatted} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis
                    dataKey="dateFormatted"
                    stroke="#666"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 11 }}
                    interval={chartDataFormatted.length > 500 ? Math.floor(chartDataFormatted.length / 15) : 0}
                  />
                  <YAxis
                    stroke="#666"
                    label={{ value: '% Deviation', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    formatter={(value: unknown) => {
                      if (typeof value === 'number') {
                        return `${value.toFixed(2)}%`;
                      }
                      if (value === null || value === undefined) {
                        return '';
                      }
                      return String(value);
                    }}
                    labelFormatter={(label) => {
                      const point = chartDataFormatted.find(p => p.dateFormatted === label);
                      return point?.dateFull || label;
                    }}
                  />
                  <Legend />
                  <ReferenceLine y={0} stroke="#999" strokeDasharray="2 2" />
                  <ReferenceLine y={upperBand} stroke="#ff6b6b" strokeDasharray="3 3" label={{ value: '+1 Std Dev', position: 'top' }} />
                  <ReferenceLine y={lowerBand} stroke="#ff6b6b" strokeDasharray="3 3" label={{ value: '-1 Std Dev', position: 'bottom' }} />
                  <Line
                    type="monotone"
                    dataKey="deviation"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                    name="% Deviation"
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      );
    }

    // Enhanced Deviation Chart rendering (with gradients and area fill)
    if (chartType === 'enhanced-deviation') {
      const deviationData = chartData as DeviationChartData;
      const chartDataFormatted = deviationData.dataPoints.map((point, index, array) => ({
        ...point,
        dateFormatted: formatDate(point.date, array.length),
        dateFull: formatTooltipDate(point.date),
        positiveDeviation: point.deviation > 0 ? point.deviation : 0,
        negativeDeviation: point.deviation < 0 ? point.deviation : 0
      })) || [];

      const upperBand = deviationData.stdDev;
      const lowerBand = -deviationData.stdDev;

      return (
        <div ref={chartContainerRef} className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">
              {deviationData.companyName} ({deviationData.symbol}) - Enhanced % Deviation from {deviationData.maPeriod}-Day Moving Average
            </h3>
            <button
              onClick={copyChartToClipboard}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
            >
              {copySuccess ? '✓ Saved!' : 'Save Chart'}
            </button>
          </div>
          
          <div className="mb-4 text-sm text-gray-600">
            <p>Standard Deviation: ±{deviationData.stdDev.toFixed(2)}%</p>
            <p>Mean Deviation: {deviationData.meanDeviation.toFixed(2)}%</p>
          </div>

          <div className="w-full" style={{ height: '500px', padding: 0, margin: 0, border: 'none', overflow: 'hidden' }}>
            <div ref={chartOnlyRef} style={{ width: '100%', height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartDataFormatted} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.2} />
                    </linearGradient>
                    <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.2} />
                    </linearGradient>
                    <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="50%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis
                    dataKey="dateFormatted"
                    stroke="#666"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 11 }}
                    interval={chartDataFormatted.length > 500 ? Math.floor(chartDataFormatted.length / 15) : 0}
                  />
                  <YAxis
                    stroke="#666"
                    label={{ value: '% Deviation', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    formatter={(value: unknown) => {
                      if (typeof value === 'number') {
                        return `${value.toFixed(2)}%`;
                      }
                      if (value === null || value === undefined) {
                        return '';
                      }
                      return String(value);
                    }}
                    labelFormatter={(label) => {
                      const point = chartDataFormatted.find(p => p.dateFormatted === label);
                      return point?.dateFull || label;
                    }}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend />
                  <ReferenceLine y={0} stroke="#666" strokeWidth={2} strokeDasharray="2 2" />
                  <ReferenceLine y={upperBand} stroke="#10b981" strokeWidth={2} strokeDasharray="3 3" label={{ value: '+1 Std Dev', position: 'top' }} />
                  <ReferenceLine y={lowerBand} stroke="#ef4444" strokeWidth={2} strokeDasharray="3 3" label={{ value: '-1 Std Dev', position: 'bottom' }} />
                  <Area
                    type="monotone"
                    dataKey="positiveDeviation"
                    stroke="none"
                    fill="url(#positiveGradient)"
                    name="Positive Deviation"
                    connectNulls
                  />
                  <Area
                    type="monotone"
                    dataKey="negativeDeviation"
                    stroke="none"
                    fill="url(#negativeGradient)"
                    name="Negative Deviation"
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="deviation"
                    stroke="url(#lineGradient)"
                    strokeWidth={3}
                    dot={false}
                    name="% Deviation"
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      );
    }

    // Price with Moving Averages
    if (chartType === 'price-moving-averages') {
      const priceData = chartData as { companyName: string; symbol: string; dataPoints: Array<{ date: string; price: number; sma20: number | null; sma50: number | null; sma200: number | null }> };
      const chartDataFormatted = priceData.dataPoints.map((point, index, array) => ({
        ...point,
        dateFormatted: formatDate(point.date, array.length),
        dateFull: formatTooltipDate(point.date)
      }));
      
      // Calculate X-axis date ticks with regular time-based intervals
      const dateTicks: string[] = [];
      const dateTickLabels: string[] = []; // Formatted labels for display
      
      if (chartDataFormatted.length > 0) {
        const firstDate = new Date(chartDataFormatted[0].date);
        const lastDate = new Date(chartDataFormatted[chartDataFormatted.length - 1].date);
        const dateRange = lastDate.getTime() - firstDate.getTime();
        const daysRange = dateRange / (1000 * 60 * 60 * 24);
        
        // Determine interval based on date range
        let intervalMonths: number;
        if (daysRange < 90) {
          // Less than 3 months: show monthly
          intervalMonths = 1;
        } else if (daysRange < 365) {
          // Less than 1 year: show quarterly (3 months)
          intervalMonths = 3;
        } else if (daysRange < 730) {
          // Less than 2 years: show every 6 months
          intervalMonths = 6;
        } else {
          // 2+ years: show yearly
          intervalMonths = 12;
        }
        
        // Calculate evenly spaced intervals across the full date range
        // Aim for 4-5 ticks total
        const totalMonths = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + 
                          (lastDate.getMonth() - firstDate.getMonth()) + 1;
        
        // Determine final interval to get 4-5 ticks
        let finalIntervalMonths = intervalMonths;
        const numIntervals = Math.ceil(totalMonths / intervalMonths);
        
        if (numIntervals > 5) {
          // Need fewer ticks - increase interval
          finalIntervalMonths = Math.ceil(totalMonths / 5);
          // Round to nice intervals (1, 3, 6, or 12 months)
          if (finalIntervalMonths <= 1) finalIntervalMonths = 1;
          else if (finalIntervalMonths <= 3) finalIntervalMonths = 3;
          else if (finalIntervalMonths <= 6) finalIntervalMonths = 6;
          else finalIntervalMonths = 12;
        }
        
        // Generate evenly spaced interval dates
        const startDate = new Date(firstDate);
        startDate.setDate(1); // Start at first of month
        
        const intervalDates: Date[] = [];
        const currentDate = new Date(startDate);
        
        // Generate all interval dates
        while (currentDate <= lastDate) {
          intervalDates.push(new Date(currentDate));
          const nextDate = new Date(currentDate);
          nextDate.setMonth(nextDate.getMonth() + finalIntervalMonths);
          currentDate.setTime(nextDate.getTime());
        }
        
        // Always ensure we include a date near the end
        if (intervalDates.length === 0 || 
            intervalDates[intervalDates.length - 1].getTime() < lastDate.getTime() - (45 * 24 * 60 * 60 * 1000)) {
          intervalDates.push(new Date(lastDate));
        }
        
        // For each interval date, find closest data point and create label
        intervalDates.forEach(intervalDate => {
          // Find the closest data point to this interval date
          const closestPoint = chartDataFormatted.reduce((closest, point) => {
            const pointDate = new Date(point.date);
            const closestDate = new Date(closest.date);
            return Math.abs(pointDate.getTime() - intervalDate.getTime()) < 
                   Math.abs(closestDate.getTime() - intervalDate.getTime()) ? point : closest;
          });
          
          // Format label using the interval date (for regular spacing display)
          const monthYear = intervalDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          
          // Only add if we don't already have this month/year
          if (!dateTickLabels.includes(monthYear)) {
            dateTicks.push(closestPoint.dateFormatted);
            dateTickLabels.push(monthYear);
          }
        });
        
        // Ensure first and last dates are included
        const firstMonthYear = firstDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const lastMonthYear = lastDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        if (dateTickLabels[0] !== firstMonthYear) {
          dateTicks[0] = chartDataFormatted[0].dateFormatted;
          dateTickLabels[0] = firstMonthYear;
        }
        
        if (dateTickLabels[dateTickLabels.length - 1] !== lastMonthYear) {
          dateTicks[dateTicks.length - 1] = chartDataFormatted[chartDataFormatted.length - 1].dateFormatted;
          dateTickLabels[dateTickLabels.length - 1] = lastMonthYear;
        }
      }

      // Calculate min and max values for Y-axis domain
      const allValues: number[] = [];
      chartDataFormatted.forEach(point => {
        if (point.price) allValues.push(point.price);
        if (point.sma20) allValues.push(point.sma20);
        if (point.sma50) allValues.push(point.sma50);
        if (point.sma200) allValues.push(point.sma200);
      });
      
      // Find actual high and low prices from the data
      const prices = chartDataFormatted.map(p => p.price).filter(p => p !== null && p !== undefined) as number[];
      const chartHigh = Math.max(...prices);
      const chartLow = Math.min(...prices);
      
      // Calculate Y-axis ticks: bottom (below low), 2 middle ticks, top (above high)
      // Option 3: Fixed Step Sizes Based on Price Range
      const priceRange = chartHigh - chartLow;
      
      // Determine step size based on price range (calculate first)
      let step: number;
      if (priceRange < 50) {
        step = 10;
      } else if (priceRange < 200) {
        // Use $25 for smaller ranges, $50 for larger ones within this bracket
        step = priceRange < 100 ? 25 : 50;
      } else if (priceRange < 500) {
        // Use $50 for smaller ranges, $100 for larger ones within this bracket
        step = priceRange < 300 ? 50 : 100;
      } else {
        // Use $100 for smaller ranges, $250 for larger ones
        step = priceRange < 1000 ? 100 : 250;
      }
      
      // Use smaller padding - 5% below low, minimal above high (to minimize top white space)
      // Ensure top padding is at least one step above high to guarantee a tick above
      const bottomPadding = priceRange * 0.05;
      const topPadding = Math.max(priceRange * 0.02, step); // At least one step above high
      const minTick = chartLow - bottomPadding;
      const maxTick = chartHigh + topPadding;
      
      // Calculate bottom tick (round down to nearest step)
      const bottomTick = Math.floor(minTick / step) * step;
      
      // Calculate the range we need to cover
      const rangeToCover = maxTick - bottomTick;
      
      // Calculate ideal step for 4 ticks (3 intervals)
      let idealTickStep = rangeToCover / 3;
      
      // Round to a nice number
      const stepMagnitude = Math.pow(10, Math.floor(Math.log10(idealTickStep)));
      const normalized = idealTickStep / stepMagnitude;
      
      let finalTickStep: number;
      if (normalized <= 1.5) {
        finalTickStep = stepMagnitude;
      } else if (normalized <= 3) {
        finalTickStep = 2 * stepMagnitude;
      } else if (normalized <= 7) {
        finalTickStep = 5 * stepMagnitude;
      } else {
        finalTickStep = 10 * stepMagnitude;
      }
      
      // Calculate top tick using the final step (exactly 3 steps for 4 ticks)
      let topTick = bottomTick + (3 * finalTickStep);
      
      // If top tick doesn't cover maxTick, increase step and recalculate
      if (topTick < maxTick) {
        // Need a larger step - recalculate
        idealTickStep = (maxTick - bottomTick) / 3;
        const newStepMag = Math.pow(10, Math.floor(Math.log10(idealTickStep)));
        const newNormalized = idealTickStep / newStepMag;
        
        if (newNormalized <= 1.5) {
          finalTickStep = newStepMag;
        } else if (newNormalized <= 3) {
          finalTickStep = 2 * newStepMag;
        } else if (newNormalized <= 7) {
          finalTickStep = 5 * newStepMag;
        } else {
          finalTickStep = 10 * newStepMag;
        }
        
        topTick = bottomTick + (3 * finalTickStep);
      }
      
      // CRITICAL: Ensure top tick is always above the high price
      // Round up to next step if needed
      if (topTick <= chartHigh) {
        const stepsNeeded = Math.ceil((chartHigh - bottomTick) / finalTickStep);
        topTick = bottomTick + (stepsNeeded * finalTickStep);
        // Recalculate finalTickStep to maintain 4 ticks
        finalTickStep = (topTick - bottomTick) / 3;
      }
      
      // Generate 4 evenly spaced ticks using the final step consistently
      const yAxisTicks: number[] = [];
      for (let i = 0; i < 4; i++) {
        const tick = bottomTick + (i * finalTickStep);
        yAxisTicks.push(Math.round(tick));
      }
      
      // Final safety check: ensure the top tick is above chartHigh
      if (yAxisTicks[yAxisTicks.length - 1] <= chartHigh) {
        yAxisTicks[yAxisTicks.length - 1] = Math.ceil((chartHigh + finalTickStep * 0.1) / finalTickStep) * finalTickStep;
      }
      
      // Update domain to match the actual range
      const yAxisDomain = [bottomTick, topTick];

      return (
        <div ref={chartContainerRef} className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">
              {priceData.companyName} ({priceData.symbol}) - Price with Moving Averages
            </h3>
            <button
              onClick={copyChartToClipboard}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
            >
              {copySuccess ? '✓ Saved!' : 'Save Chart'}
            </button>
          </div>

          <div className="w-full" style={{ padding: 0, margin: 0, border: 'none', overflow: 'hidden', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
            <div ref={chartOnlyRef} style={{ width: '100%', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', borderRadius: '8px', padding: '10px' }}>
              <div style={{ height: '500px', background: 'rgba(255, 255, 255, 0.95)', borderRadius: '6px', padding: '10px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartDataFormatted} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="50%" stopColor="#2563eb" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#1e40af" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="sma20Gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="sma50Gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="sma200Gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" opacity={0.5} />
                    <XAxis
                      dataKey="dateFormatted"
                      stroke="#4b5563"
                      ticks={dateTicks.length > 0 ? dateTicks : undefined}
                      tickFormatter={(value) => {
                        // Use the formatted month-year labels
                        const index = dateTicks.indexOf(value);
                        return index >= 0 && index < dateTickLabels.length ? dateTickLabels[index] : value;
                      }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 11 }}
                      interval={0}
                    />
                    <YAxis 
                      yAxisId="left" 
                      stroke="#4b5563" 
                      domain={yAxisDomain}
                      ticks={yAxisTicks}
                      tickFormatter={(value) => {
                        // Always show whole numbers
                        return Math.round(value).toString();
                      }}
                      label={{ value: 'Price ($)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#374151', fontWeight: 'bold' } }} 
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '2px solid #3b82f6',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        padding: '10px'
                      }}
                      formatter={(value: unknown) => {
                        if (typeof value === 'number') {
                          return `$${value.toFixed(2)}`;
                        }
                        return String(value);
                      }}
                      labelFormatter={(label) => {
                        const point = chartDataFormatted.find(p => p.dateFormatted === label);
                        return point?.dateFull || label;
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '10px' }}
                      iconType="line"
                    />
                    <ReferenceLine 
                      yAxisId="left"
                      y={chartHigh} 
                      stroke="#10b981" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      label={{ value: `High: $${chartHigh.toFixed(2)}`, position: 'top', fill: '#10b981', fontWeight: 'bold', fontSize: 12 }}
                    />
                    <ReferenceLine 
                      yAxisId="left"
                      y={chartLow} 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      label={{ value: `Low: $${chartLow.toFixed(2)}`, position: 'bottom', fill: '#ef4444', fontWeight: 'bold', fontSize: 12 }}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="price"
                      fill="url(#priceGradient)"
                      stroke="none"
                      name="Price Area"
                      connectNulls
                      opacity={0.3}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="sma20"
                      fill="url(#sma20Gradient)"
                      stroke="none"
                      name="SMA 20 Area"
                      connectNulls
                      opacity={0.2}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="sma50"
                      fill="url(#sma50Gradient)"
                      stroke="none"
                      name="SMA 50 Area"
                      connectNulls
                      opacity={0.2}
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="sma200"
                      fill="url(#sma200Gradient)"
                      stroke="none"
                      name="SMA 200 Area"
                      connectNulls
                      opacity={0.2}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="price"
                      stroke="#1e40af"
                      strokeWidth={4}
                      dot={false}
                      name="Price"
                      connectNulls
                      strokeLinecap="round"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="sma20"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={false}
                      name="SMA 20"
                      strokeDasharray="8 4"
                      connectNulls
                      strokeLinecap="round"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="sma50"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={false}
                      name="SMA 50"
                      strokeDasharray="8 4"
                      connectNulls
                      strokeLinecap="round"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="sma200"
                      stroke="#ef4444"
                      strokeWidth={3}
                      dot={false}
                      name="SMA 200"
                      strokeDasharray="8 4"
                      connectNulls
                      strokeLinecap="round"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              {chartDataFormatted.length > 0 && (
                <div className="mt-2 text-sm text-gray-700 text-center font-semibold" style={{ padding: '8px 0', color: '#1f2937' }}>
                  <p><strong>Date Range:</strong> {formatTooltipDate(chartDataFormatted[0].date)} - {formatTooltipDate(chartDataFormatted[chartDataFormatted.length - 1].date)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // RSI Heatmap Timeline
    if (chartType === 'rsi-heatmap') {
      const rsiData = chartData as { companyName: string; symbol: string; dataPoints: Array<{ date: string; rsi: number; color: string }> };
      const chartDataFormatted = rsiData.dataPoints.map((point, index, array) => ({
        ...point,
        dateFormatted: formatDate(point.date, array.length),
        dateFull: formatTooltipDate(point.date)
      }));


      return (
        <div ref={chartContainerRef} className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">
              {rsiData.companyName} ({rsiData.symbol}) - RSI Heatmap Timeline
            </h3>
            <button
              onClick={copyChartToClipboard}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
            >
              {copySuccess ? '✓ Saved!' : 'Save Chart'}
            </button>
          </div>

          <div className="mb-4 text-sm text-gray-600">
            <p><span className="inline-block w-3 h-3 bg-green-500 mr-1"></span> Oversold (RSI ≤ 30)</p>
            <p><span className="inline-block w-3 h-3 bg-yellow-500 mr-1"></span> Neutral (30 &lt; RSI &lt; 70)</p>
            <p><span className="inline-block w-3 h-3 bg-red-500 mr-1"></span> Overbought (RSI ≥ 70)</p>
          </div>

          <div className="w-full" style={{ padding: 0, margin: 0, border: 'none', overflow: 'hidden' }}>
            <div ref={chartOnlyRef} style={{ width: '100%' }}>
              <div style={{ height: '500px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartDataFormatted} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="rsiGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.8} />
                        <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis
                      dataKey="dateFormatted"
                      stroke="#666"
                      hide
                    />
                    <YAxis stroke="#666" label={{ value: 'RSI', angle: -90, position: 'insideLeft' }} domain={[0, 100]} />
                    <Tooltip
                      formatter={(value: unknown) => {
                        if (typeof value === 'number') {
                          return `${value.toFixed(2)}`;
                        }
                        return String(value);
                      }}
                      labelFormatter={(label) => {
                        const point = chartDataFormatted.find(p => p.dateFormatted === label);
                        return point?.dateFull || label;
                      }}
                    />
                    <Legend />
                    <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Overbought (70)', position: 'top' }} />
                    <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Oversold (30)', position: 'bottom' }} />
                    <Area
                      type="monotone"
                      dataKey="rsi"
                      stroke="#2563eb"
                      strokeWidth={2}
                      fill="url(#rsiGradient)"
                      fillOpacity={0.6}
                      name="RSI"
                      connectNulls
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {chartDataFormatted.length > 0 && (
                <div className="mt-2 text-xs text-gray-600 text-center" style={{ padding: '8px 0' }}>
                  <p><strong>Date Range:</strong> {formatTooltipDate(chartDataFormatted[0].date)} - {formatTooltipDate(chartDataFormatted[chartDataFormatted.length - 1].date)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // MACD Multi-Panel Chart
    if (chartType === 'macd-multi-panel') {
      const macdData = chartData as { companyName: string; symbol: string; dataPoints: Array<{ date: string; price: number | null; macd: number; signal: number; histogram: number }> };
      const chartDataFormatted = macdData.dataPoints.map((point, index, array) => ({
        ...point,
        dateFormatted: formatDate(point.date, array.length),
        dateFull: formatTooltipDate(point.date)
      }));

      return (
        <div ref={chartContainerRef} className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">
              {macdData.companyName} ({macdData.symbol}) - MACD Multi-Panel Chart
            </h3>
            <button
              onClick={copyChartToClipboard}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
            >
              {copySuccess ? '✓ Saved!' : 'Save Chart'}
            </button>
          </div>

          <div className="w-full" style={{ height: '600px', padding: 0, margin: 0, border: 'none', overflow: 'hidden' }}>
            <div ref={chartOnlyRef} style={{ width: '100%', height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartDataFormatted} margin={{ top: 5, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis
                    dataKey="dateFormatted"
                    stroke="#666"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 11 }}
                    interval={chartDataFormatted.length > 500 ? Math.floor(chartDataFormatted.length / 15) : 0}
                  />
                  <YAxis yAxisId="price" stroke="#666" label={{ value: 'Price ($)', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="macd" orientation="right" stroke="#666" label={{ value: 'MACD', angle: 90, position: 'insideRight' }} />
                  <Tooltip
                    formatter={(value: unknown, name?: string) => {
                      const nameStr = name || '';
                      if (nameStr === 'price') {
                        return typeof value === 'number' ? [`$${value.toFixed(2)}`, 'Price'] : ['', 'Price'];
                      }
                      if (typeof value === 'number') {
                        return [value.toFixed(4), nameStr];
                      }
                      return [String(value), nameStr];
                    }}
                    labelFormatter={(label) => {
                      const point = chartDataFormatted.find(p => p.dateFormatted === label);
                      return point?.dateFull || label;
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="price"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                    name="Price"
                    connectNulls
                  />
                  <Line
                    yAxisId="macd"
                    type="monotone"
                    dataKey="macd"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    name="MACD Line"
                    connectNulls
                  />
                  <Line
                    yAxisId="macd"
                    type="monotone"
                    dataKey="signal"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    name="Signal Line"
                    strokeDasharray="5 5"
                    connectNulls
                  />
                  <Bar
                    yAxisId="macd"
                    dataKey="histogram"
                    fill="#8b5cf6"
                    name="Histogram"
                  >
                    {chartDataFormatted.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.histogram >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                  <ReferenceLine yAxisId="macd" y={0} stroke="#999" strokeDasharray="2 2" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      );
    }

    // Volume Profile Chart
    if (chartType === 'volume-profile') {
      const volumeData = chartData as { companyName: string; symbol: string; dataPoints: Array<{ date: string; price: number; volume: number; high: number; low: number; open: number }> };
      const chartDataFormatted = volumeData.dataPoints.map((point, index, array) => ({
        ...point,
        dateFormatted: formatDate(point.date, array.length),
        dateFull: formatTooltipDate(point.date)
      }));

      return (
        <div ref={chartContainerRef} className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">
              {volumeData.companyName} ({volumeData.symbol}) - Volume Profile Chart
            </h3>
            <button
              onClick={copyChartToClipboard}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
            >
              {copySuccess ? '✓ Saved!' : 'Save Chart'}
            </button>
          </div>

          <div className="w-full" style={{ height: '500px', padding: 0, margin: 0, border: 'none', overflow: 'hidden' }}>
            <div ref={chartOnlyRef} style={{ width: '100%', height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartDataFormatted} margin={{ top: 5, right: 30, left: 20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis
                    dataKey="dateFormatted"
                    stroke="#666"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 11 }}
                    interval={chartDataFormatted.length > 500 ? Math.floor(chartDataFormatted.length / 15) : 0}
                  />
                  <YAxis yAxisId="price" stroke="#666" label={{ value: 'Price ($)', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="volume" orientation="right" stroke="#666" label={{ value: 'Volume', angle: 90, position: 'insideRight' }} />
                  <Tooltip
                    formatter={(value: unknown, name?: string) => {
                      const nameStr = name || '';
                      if (nameStr === 'volume') {
                        return typeof value === 'number' ? [value.toLocaleString(), 'Volume'] : ['', 'Volume'];
                      }
                      if (typeof value === 'number') {
                        return [`$${value.toFixed(2)}`, nameStr];
                      }
                      return [String(value), nameStr];
                    }}
                    labelFormatter={(label) => {
                      const point = chartDataFormatted.find(p => p.dateFormatted === label);
                      return point?.dateFull || label;
                    }}
                  />
                  <Legend />
                  <Bar
                    yAxisId="volume"
                    dataKey="volume"
                    fill="#8b5cf6"
                    fillOpacity={0.6}
                    name="Volume"
                  />
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="price"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                    name="Price"
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      );
    }

    // Edge Rankings 3D Bar Chart
    if (chartType === 'edge-rankings') {
      const edgeData = chartData as { companyName: string; symbol: string; metrics: Array<{ name: string; value: number }> };
      
      if (!edgeData.metrics || edgeData.metrics.length === 0) {
        return (
          <div className="mt-6 p-4 bg-gray-100 rounded">
            <p className="text-gray-600">No edge rankings data available for {edgeData.symbol}</p>
          </div>
        );
      }

      // Prepare data for Recharts BarChart
      const barData = edgeData.metrics.map(metric => ({
        name: metric.name,
        value: metric.value,
        // Color based on score
        color: metric.value >= 80 ? '#10b981' : // Green
               metric.value >= 60 ? '#3b82f6' : // Blue
               metric.value >= 40 ? '#f59e0b' : // Yellow
               metric.value >= 20 ? '#f97316' : // Orange
               '#ef4444' // Red
      }));

      // Get gradient color based on score
      const getGradientColor = (score: number) => {
        if (score >= 80) return { start: '#10b981', end: '#059669' }; // Green gradient
        if (score >= 60) return { start: '#3b82f6', end: '#2563eb' }; // Blue gradient
        if (score >= 40) return { start: '#f59e0b', end: '#d97706' }; // Yellow gradient
        if (score >= 20) return { start: '#f97316', end: '#ea580c' }; // Orange gradient
        return { start: '#ef4444', end: '#dc2626' }; // Red gradient
      };

      // Get description based on score
      const getScoreDescription = (score: number) => {
        if (score >= 80) return 'Excellent';
        if (score >= 60) return 'Strong';
        if (score >= 40) return 'Moderate';
        if (score >= 20) return 'Weak';
        return 'Poor';
      };

      return (
        <div ref={chartContainerRef} className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">
              {edgeData.companyName} ({edgeData.symbol}) - Benzinga Edge Rankings
            </h3>
            <button
              onClick={copyChartToClipboard}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
            >
              {copySuccess ? '✓ Saved!' : 'Save Chart'}
            </button>
          </div>
          <div
            ref={chartOnlyRef}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ height: '500px', background: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', padding: '20px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  margin={{ top: 30, right: 30, left: 20, bottom: 60 }}
                >
                  <defs>
                    {barData.map((item, index) => {
                      const gradient = getGradientColor(item.value);
                      return (
                        <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={gradient.start} stopOpacity={1} />
                          <stop offset="100%" stopColor={gradient.end} stopOpacity={0.8} />
                        </linearGradient>
                      );
                    })}
                    {/* 3D shadow gradients */}
                    {barData.map((item, index) => (
                      <linearGradient key={`shadow-${index}`} id={`shadow-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(0,0,0,0.3)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="rgba(0,0,0,0.1)" stopOpacity={0.2} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#666"
                    tick={{ fontSize: 14, fontWeight: 'bold' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="#666"
                    domain={[0, 100]}
                    label={{ value: 'Score (0-100)', angle: -90, position: 'insideLeft', style: { fontSize: 14 } }}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: unknown) => {
                      if (typeof value === 'number') {
                        return [`${value.toFixed(2)}/100`, 'Score'];
                      }
                      return [String(value), ''];
                    }}
                    labelFormatter={(label) => {
                      const item = barData.find(d => d.name === label);
                      if (item) {
                        return `${label} - ${getScoreDescription(item.value)}`;
                      }
                      return label;
                    }}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #ccc',
                      borderRadius: '8px',
                      padding: '10px',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="value"
                    radius={[8, 8, 0, 0]}
                    name="Edge Score"
                  >
                    {barData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`url(#gradient-${index})`}
                        stroke={entry.color}
                        strokeWidth={2}
                        style={{
                          filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.3))',
                          transform: 'perspective(500px) rotateX(-5deg)',
                        }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* Score descriptions below chart */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                {barData.map((item, index) => (
                  <div key={index} className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-sm font-semibold text-gray-700 mb-1">{item.name}</div>
                    <div className="text-2xl font-bold" style={{ color: item.color }}>
                      {item.value.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{getScoreDescription(item.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Placeholder for other chart types
    return (
      <div className="mt-6 p-4 bg-gray-100 rounded">
        <p className="text-gray-600">Chart type &quot;{CHART_TYPES.find(ct => ct.value === chartType)?.label}&quot; is coming soon!</p>
      </div>
    );
  };

  const copyChartToClipboard = async () => {
    if (!chartOnlyRef.current || typeof window === 'undefined') {
      console.error('Chart element not found or not in browser');
      setError('Chart element not available');
      return;
    }

    try {
      setCopySuccess(false);
      setError(null);
      
      const element = chartOnlyRef.current;
      
      // Wait for chart to be fully rendered
      let attempts = 0;
      while (attempts < 10 && (!element.offsetWidth || !element.offsetHeight || element.offsetWidth < 100 || element.offsetHeight < 100)) {
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
      }
      
      if (!element.offsetWidth || !element.offsetHeight || element.offsetWidth < 100 || element.offsetHeight < 100) {
        console.error('Element still has invalid dimensions after waiting:', { 
          width: element.offsetWidth, 
          height: element.offsetHeight 
        });
        setError('Chart is not fully loaded. Please wait a moment and try again.');
        return;
      }
      
      const containerWidth = element.offsetWidth;
      const containerHeight = element.offsetHeight;
      
      let blob: Blob | null = null;
      
      try {
        const canvas = await html2canvas(element, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
          useCORS: true,
          allowTaint: true,
          width: containerWidth,
          height: containerHeight,
          onclone: (clonedDoc, clonedElement) => {
            const el = clonedElement as HTMLElement;
            el.style.width = containerWidth + 'px';
            el.style.height = containerHeight + 'px';
            el.style.position = 'relative';
            const smallSvgs = el.querySelectorAll('svg');
            smallSvgs.forEach(svg => {
              const rect = svg.getBoundingClientRect();
              if (rect.width < 100 || rect.height < 100) {
                svg.style.display = 'none';
              }
            });
          }
        });
        
        // Detect and remove bottom white space
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          let bottomRow = 0;
          for (let y = canvas.height - 1; y >= 0; y--) {
            let hasNonWhite = false;
            for (let x = 0; x < canvas.width; x++) {
              const idx = (y * canvas.width + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              if (r < 245 || g < 245 || b < 245) {
                hasNonWhite = true;
                break;
              }
            }
            if (hasNonWhite) {
              bottomRow = y;
              break;
            }
          }
          
          const cropHeight = Math.max(100, bottomRow + 10);
          const croppedCanvas = document.createElement('canvas');
          croppedCanvas.width = canvas.width;
          croppedCanvas.height = cropHeight;
          const croppedCtx = croppedCanvas.getContext('2d');
          if (croppedCtx) {
            croppedCtx.drawImage(canvas, 0, 0, canvas.width, cropHeight, 0, 0, canvas.width, cropHeight);
            blob = await new Promise<Blob | null>((resolve) => {
              croppedCanvas.toBlob((b) => resolve(b), 'image/png');
            });
          } else {
            blob = await new Promise<Blob | null>((resolve) => {
              canvas.toBlob((b) => resolve(b), 'image/png');
            });
          }
        } else {
          blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((b) => resolve(b), 'image/png');
          });
        }
        
        console.log('Chart captured successfully');
      } catch (html2canvasError) {
        console.error('html2canvas failed:', html2canvasError);
        const errorMessage = html2canvasError instanceof Error ? html2canvasError.message : String(html2canvasError);
        setError(`Failed to capture chart: ${errorMessage}. Please use your browser's screenshot tool (Windows: Win+Shift+S, Mac: Cmd+Shift+4).`);
        return;
      }
      
      if (!blob) {
        setError('Failed to generate image');
        return;
      }

      // Download the image file
      try {
        const tickers = parseTickers(tickerInput);
        const fileName = `${tickers.join('-')}-${chartType}-chart.png`;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (downloadErr) {
        console.error('Failed to download image:', downloadErr);
        setError('Failed to download image. Please try again.');
      }
    } catch (err) {
      console.error('Failed to capture chart:', err);
      setError('Failed to capture chart image');
    }
  };

  const availableChartTypes = getAvailableChartTypes();
  const selectedChartTypeInfo = CHART_TYPES.find(ct => ct.value === chartType);

  return (
    <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Chart Generator</h2>
      
      <div className="mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div className="flex-1">
          <label htmlFor="chartType" className="block text-sm font-medium text-gray-700 mb-1">
            Chart Type
          </label>
          <select
            id="chartType"
            value={chartType}
            onChange={(e) => setChartType(e.target.value as ChartType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availableChartTypes.map(ct => (
              <option key={ct.value} value={ct.value}>
                {ct.label} - {ct.description}
              </option>
            ))}
          </select>
          {selectedChartTypeInfo && (
            <p className="mt-1 text-xs text-gray-500">{selectedChartTypeInfo.description}</p>
          )}
        </div>

        <div className="flex-1">
          <label htmlFor="ticker" className="block text-sm font-medium text-gray-700 mb-1">
            Ticker Symbol{selectedChartTypeInfo?.requiresMultipleTickers ? 's' : ''}
          </label>
          <input
            id="ticker"
            type="text"
            value={tickerInput}
            onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
            placeholder={selectedChartTypeInfo?.requiresMultipleTickers 
              ? "Enter tickers (e.g., AAPL,MSFT,GOOGL)" 
              : "Enter ticker (e.g., AAPL)"}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading && tickerInput.trim()) {
                generateChart();
              }
            }}
          />
          <p className="mt-1 text-xs text-gray-500">
            {selectedChartTypeInfo?.requiresMultipleTickers 
              ? 'Enter multiple tickers separated by commas for comparison'
              : 'Enter a single ticker symbol'}
          </p>
        </div>
        
        {(chartType === 'deviation' || chartType === 'enhanced-deviation') && (
          <div className="w-full sm:w-auto">
            <label htmlFor="maPeriod" className="block text-sm font-medium text-gray-700 mb-1">
              Moving Average Period
            </label>
            <select
              id="maPeriod"
              value={maPeriod}
              onChange={(e) => setMaPeriod(Number(e.target.value) as 50 | 200)}
              className="w-full sm:w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={50}>50-day</option>
              <option value={200}>200-day</option>
            </select>
          </div>
        )}
        
        <button
          onClick={generateChart}
          disabled={loading || tickerInput.trim().length === 0}
          className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Generating...' : 'Generate Chart'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {renderChart()}
    </div>
  );
});

ChartGenerator.displayName = 'ChartGenerator';

export default ChartGenerator;
