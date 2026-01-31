'use client';

import React, { useState, useImperativeHandle, forwardRef, useRef, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import html2canvas from 'html2canvas';

export interface DeviationChartGeneratorRef {
  clearData: () => void;
}

interface DeviationDataPoint {
  date: string;
  price: number;
  movingAverage: number;
  deviation: number;
}

interface ChartData {
  dataPoints: DeviationDataPoint[];
  stdDev: number;
  meanDeviation: number;
  companyName: string;
  symbol: string;
  maPeriod: number;
}

const DeviationChartGenerator = forwardRef<DeviationChartGeneratorRef>((props, ref) => {
  const [ticker, setTicker] = useState('');
  const [maPeriod, setMaPeriod] = useState<50 | 200>(200);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartOnlyRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    clearData: () => {
      setTicker('');
      setChartData(null);
      setError(null);
    }
  }));

  // Auto-regenerate chart when MA period changes (if chart already exists)
  useEffect(() => {
    if (chartData && ticker.trim() && !loading) {
      generateChart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maPeriod]);

  const generateChart = async () => {
    if (!ticker.trim()) {
      setError('Please enter a ticker symbol');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate/deviation-chart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: ticker.trim().toUpperCase(),
          maPeriod
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate chart');
      }

      const data = await response.json();
      setChartData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate chart');
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string, dataLength?: number) => {
    const date = new Date(dateStr);
    // For longer time periods, show year-month format
    // If data spans more than 2 years (~500 trading days), show just year-month
    if (dataLength && dataLength > 500) {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    }
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTooltipDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Prepare chart data with formatted dates
  const chartDataFormatted = chartData?.dataPoints.map((point, index, array) => ({
    ...point,
    dateFormatted: formatDate(point.date, array.length),
    dateFull: formatTooltipDate(point.date)
  })) || [];

  // Calculate bands
  const upperBand = chartData ? chartData.stdDev : 0;
  const lowerBand = chartData ? -chartData.stdDev : 0;

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
      
      // Wait for chart to be fully rendered - check dimensions multiple times
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
      
      // Find the SVG element inside ResponsiveContainer
      const svgElement = element.querySelector('svg');
      if (!svgElement) {
        console.error('SVG element not found in chart container');
        setError('Chart SVG not found. Please wait for chart to render.');
        return;
      }
      
      // Get the actual rendered dimensions from the container (not the SVG which may be tiny)
      const containerWidth = element.offsetWidth;
      const containerHeight = element.offsetHeight;
      
      // Get the viewBox from the original SVG to preserve aspect ratio
      const originalViewBox = svgElement.getAttribute('viewBox');
      
      console.log('Attempting to capture chart:', {
        containerWidth: containerWidth,
        containerHeight: containerHeight,
        svgWidth: svgElement.clientWidth,
        svgHeight: svgElement.clientHeight,
        viewBox: originalViewBox
      });
      
      let blob: Blob | null = null;
      
      // Try to get SVG as data URL first (most reliable for SVG)
      try {
        // Clone the SVG to avoid modifying the original
        const svgClone = svgElement.cloneNode(true) as SVGElement;
        
        // Set explicit width and height on the cloned SVG using container dimensions
        svgClone.setAttribute('width', containerWidth.toString());
        svgClone.setAttribute('height', containerHeight.toString());
        
        // Preserve the original viewBox if it exists, otherwise create one
        if (originalViewBox) {
          svgClone.setAttribute('viewBox', originalViewBox);
        } else {
          svgClone.setAttribute('viewBox', `0 0 ${containerWidth} ${containerHeight}`);
        }
        
        const svgData = new XMLSerializer().serializeToString(svgClone);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        
        // Convert SVG to PNG using canvas - properly await the conversion
        blob = await new Promise<Blob | null>((resolve, reject) => {
          const img = new Image();
          
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              // Use container dimensions (which are correct) scaled up for quality
              canvas.width = element.offsetWidth * 2;
              canvas.height = element.offsetHeight * 2;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                URL.revokeObjectURL(svgUrl);
                reject(new Error('Could not get canvas context'));
                return;
              }
              
              // Fill white background
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              // Draw the SVG image scaled to fill the canvas
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              
              // Crop bottom 20px
              const cropHeight = Math.max(100, canvas.height - 20);
              const croppedCanvas = document.createElement('canvas');
              croppedCanvas.width = canvas.width;
              croppedCanvas.height = cropHeight;
              const croppedCtx = croppedCanvas.getContext('2d');
              if (croppedCtx) {
                croppedCtx.drawImage(canvas, 0, 0, canvas.width, cropHeight, 0, 0, canvas.width, cropHeight);
                croppedCanvas.toBlob((b) => {
                  URL.revokeObjectURL(svgUrl);
                  resolve(b);
                }, 'image/png');
              } else {
                canvas.toBlob((b) => {
                  URL.revokeObjectURL(svgUrl);
                  resolve(b);
                }, 'image/png');
              }
            } catch (err) {
              URL.revokeObjectURL(svgUrl);
              reject(err);
            }
          };
          
          img.onerror = () => {
            URL.revokeObjectURL(svgUrl);
            reject(new Error('Failed to load SVG as image'));
          };
          
          img.src = svgUrl;
          
          // Timeout after 5 seconds
          setTimeout(() => {
            URL.revokeObjectURL(svgUrl);
            reject(new Error('SVG load timeout'));
          }, 5000);
        });
        
        console.log('SVG conversion succeeded');
      } catch (svgError) {
        console.log('SVG direct conversion failed, trying html2canvas:', svgError);
        
        // Fallback to html2canvas on the container
        try {
          const canvas = await html2canvas(element, {
            backgroundColor: '#ffffff',
            scale: 2,
            logging: false,
            useCORS: true,
            allowTaint: true,
            width: element.offsetWidth,
            height: element.offsetHeight,
            onclone: (clonedDoc, element) => {
              // Ensure the cloned element has proper dimensions
              const clonedElement = element as HTMLElement;
              clonedElement.style.width = element.offsetWidth + 'px';
              clonedElement.style.height = element.offsetHeight + 'px';
            }
          });
          
          // Simple crop: remove bottom 20px
          const cropHeight = Math.max(100, canvas.height - 20);
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
        } catch (html2canvasError) {
          console.error('html2canvas failed:', html2canvasError);
          const errorMessage = html2canvasError instanceof Error ? html2canvasError.message : String(html2canvasError);
          setError(`Failed to capture chart: ${errorMessage}. Please use your browser's screenshot tool (Windows: Win+Shift+S, Mac: Cmd+Shift+4).`);
          return;
        }
      }
      
      if (!blob) {
        setError('Failed to generate image');
        return;
      }

      // Always download the image file
      try {
        const fileName = `${chartData?.symbol || 'chart'}-${chartData?.maPeriod || 200}dma-deviation-chart.png`;
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

  return (
    <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Deviation Chart Generator</h2>
      
      <div className="mb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div className="flex-1">
          <label htmlFor="ticker" className="block text-sm font-medium text-gray-700 mb-1">
            Ticker Symbol
          </label>
          <input
            id="ticker"
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="Enter ticker (e.g., AAPL)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading && ticker.trim()) {
                generateChart();
              }
            }}
          />
        </div>
        
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
        
        <button
          onClick={generateChart}
          disabled={loading || ticker.trim().length === 0}
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

      {chartData && chartDataFormatted.length > 0 && (
        <div ref={chartContainerRef} className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">
              {chartData.companyName} ({chartData.symbol}) - % Deviation from {chartData.maPeriod}-Day Moving Average
            </h3>
            <button
              onClick={copyChartToClipboard}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
            >
              {copySuccess ? '✓ Saved!' : 'Save Chart'}
            </button>
          </div>
          
          <div className="mb-4 text-sm text-gray-600">
            <p>Standard Deviation: ±{chartData.stdDev.toFixed(2)}%</p>
            <p>Mean Deviation: {chartData.meanDeviation.toFixed(2)}%</p>
          </div>

          <div ref={chartOnlyRef} className="w-full" style={{ height: '500px', padding: 0, margin: 0, border: 'none', overflow: 'hidden' }}>
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
                  // For longer datasets, show fewer labels
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
      )}
    </div>
  );
});

DeviationChartGenerator.displayName = 'DeviationChartGenerator';

export default DeviationChartGenerator;
