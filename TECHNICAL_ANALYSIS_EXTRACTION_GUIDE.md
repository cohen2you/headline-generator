# Technical Analysis Generator + Price Action Only + Stock Market Report - Extraction Guide

This guide explains how to extract the Technical Analysis Generator, Price Action Only, and Stock Market Report functionality into another app.

## Files to Copy

### 1. Technical Analysis Generator

#### Frontend Component
**File:** `app/components/TechnicalAnalysisGenerator.tsx`
- React component with UI for ticker input, provider selection, and analysis display
- Self-contained with all UI logic

#### API Route
**File:** `app/api/generate/technical-analysis/route.ts`
- Next.js API route that handles technical analysis generation
- Contains all data fetching logic (Polygon, Benzinga APIs)
- Contains all technical indicator calculations
- Contains AI prompt generation

### 2. Price Action Only Generator

#### Frontend Component
**File:** `app/components/PriceActionGenerator.tsx`
- React component with UI for ticker input and price action display
- Contains `generatePriceActionOnly()` function (lines 77-104)
- Contains rendering logic for price action results
- **Note:** You can simplify this to only include the "Price Action Only" button and related UI

#### API Route
**File:** `app/api/generate/price-action/route.ts`
- Next.js API route that handles price action generation
- **Large file (~3000 lines)** - handles multiple modes but includes "Price Action Only"
- For "Price Action Only" mode, uses Benzinga API (not Polygon)
- Key section: Lines 2646-2856 (Benzinga API path with `priceActionOnly` check)
- **Note:** The file is large because it handles many modes. You can either:
  - Copy the entire file (simplest)
  - Extract just the "Price Action Only" logic (more complex, requires extracting helper functions)

### 3. Stock Market Report

#### Frontend Component
**File:** `app/components/StockMarketReport.tsx`
- React component with UI for generating comprehensive market reports
- Simple button-triggered generation
- Displays formatted market report with markdown bold support

#### API Route
**File:** `app/api/generate/market-report/route.ts`
- Next.js API route that generates comprehensive daily market reports
- Fetches data from Polygon API:
  - Major indices (SPY, QQQ, DIA, IWM)
  - 11 Sector ETFs (XLK, XLF, XLE, XLV, XLI, XLP, XLY, XLU, XLRE, XLC, XLB)
  - Top gainers and losers
  - Major stocks within each sector
- Uses OpenAI GPT-4o to generate narrative market report
- **Note:** Uses OpenAI directly (not through `aiProvider.ts`)

### 4. Shared Dependencies

#### AI Provider Service
**File:** `lib/aiProvider.ts`
- Abstraction layer for OpenAI and Gemini APIs
- Required by Technical Analysis API route
- **Note:** Not required for "Price Action Only" or "Stock Market Report" (they use OpenAI directly)

## Dependencies

### NPM Packages (from `package.json`)
```json
{
  "dependencies": {
    "@google/generative-ai": "^0.24.1",
    "next": "15.3.4",
    "openai": "^5.8.2",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "typescript": "^5"
  }
}
```

### Environment Variables Required
Create a `.env.local` file (or add to your existing env file) with:
```
# Required for Technical Analysis Generator
POLYGON_API_KEY=your_polygon_api_key
BENZINGA_API_KEY=your_benzinga_api_key
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key (optional)

# Required for Price Action Only
BENZINGA_API_KEY=your_benzinga_api_key
# Note: Price Action Only does NOT require OpenAI/Gemini (no AI generation)

# Required for Stock Market Report
POLYGON_API_KEY=your_polygon_api_key
OPENAI_API_KEY=your_openai_api_key
# Note: Stock Market Report uses OpenAI GPT-4o directly (not through aiProvider)
```

## Step-by-Step Extraction

### Option 1: Next.js App (Simplest)

1. **Copy the files:**
   ```bash
   # In your new Next.js app directory
   mkdir -p app/components app/api/generate/technical-analysis app/api/generate/price-action lib
   
   # Technical Analysis Generator
   cp app/components/TechnicalAnalysisGenerator.tsx [new-app]/app/components/
   cp app/api/generate/technical-analysis/route.ts [new-app]/app/api/generate/technical-analysis/
   
   # Price Action Only Generator
   cp app/components/PriceActionGenerator.tsx [new-app]/app/components/
   cp app/api/generate/price-action/route.ts [new-app]/app/api/generate/price-action/
   
   # Stock Market Report
   cp app/components/StockMarketReport.tsx [new-app]/app/components/
   cp app/api/generate/market-report/route.ts [new-app]/app/api/generate/market-report/
   
   # Shared dependencies
   cp lib/aiProvider.ts [new-app]/lib/
   ```

2. **Install dependencies:**
   ```bash
   npm install @google/generative-ai openai
   ```

3. **Add environment variables** to `.env.local`

4. **Update import paths** if needed:
   - Components use: `'/api/generate/technical-analysis'` and `'/api/generate/price-action'` (relative to app root)
   - API routes use: `'@/lib/aiProvider'` (requires `@/` alias in `tsconfig.json`)

5. **Add the components to a page:**
   ```tsx
   import TechnicalAnalysisGenerator from '@/app/components/TechnicalAnalysisGenerator';
   import PriceActionGenerator from '@/app/components/PriceActionGenerator';
   import StockMarketReport from '@/app/components/StockMarketReport';
   
   export default function Page() {
     return (
       <div>
         <TechnicalAnalysisGenerator />
         <PriceActionGenerator />
         <StockMarketReport />
       </div>
     );
   }
   ```

### Option 1b: Simplified Price Action Only Component

If you only want "Price Action Only" (not the full Price Action Generator with all buttons):

1. **Create a simplified component** based on `PriceActionGenerator.tsx`:
   ```tsx
   // app/components/PriceActionOnly.tsx
   'use client';
   import React, { useState } from 'react';
   
   export default function PriceActionOnly() {
     const [tickers, setTickers] = useState('');
     const [priceActions, setPriceActions] = useState<string[]>([]);
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState('');
     
     async function generatePriceActionOnly() {
       if (!tickers.trim()) {
         setError('Please enter ticker(s) first.');
         return;
       }
       setPriceActions([]);
       setError('');
       setLoading(true);
       try {
         const res = await fetch('/api/generate/price-action', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ tickers, priceActionOnly: true }),
         });
         if (!res.ok) throw new Error('Failed to generate price action');
         const data = await res.json();
         setPriceActions(data.priceActions.map((pa: { priceAction: string }) => pa.priceAction));
       } catch (error: unknown) {
         if (error instanceof Error) setError(error.message);
         else setError(String(error));
       } finally {
         setLoading(false);
       }
     }
     
     return (
       <section className="p-4 border border-yellow-600 rounded-md max-w-4xl mx-auto">
         <h2 className="text-lg font-semibold mb-4 text-yellow-700">Price Action Only</h2>
         <input
           type="text"
           placeholder="Enter ticker(s), comma separated (e.g., AAPL, MSFT)"
           value={tickers}
           onChange={(e) => setTickers(e.target.value.toUpperCase())}
           className="w-full p-2 border border-yellow-400 rounded mb-4"
         />
         <button
           onClick={generatePriceActionOnly}
           disabled={loading || !tickers.trim()}
           className="bg-yellow-500 text-white px-4 py-2 rounded disabled:bg-yellow-300"
         >
           {loading ? 'Generating...' : 'Price Action Only'}
         </button>
         {error && <p className="text-red-600 mt-4">{error}</p>}
         {priceActions.length > 0 && (
           <ul className="mt-4 space-y-2">
             {priceActions.map((action, i) => (
               <li key={i} className="text-gray-900">{action}</li>
             ))}
           </ul>
         )}
       </section>
     );
   }
   ```

2. **Copy the API route** (same as above - `app/api/generate/price-action/route.ts`)

### Option 2: Standalone API + Separate Frontend

If you want to separate the API from the frontend:

1. **Create a standalone API server:**
   - Copy `app/api/generate/technical-analysis/route.ts`
   - Copy `lib/aiProvider.ts`
   - Convert Next.js route to Express/Fastify/etc.
   - Update fetch calls in component to point to your API URL

2. **Frontend can be any React app:**
   - Copy `app/components/TechnicalAnalysisGenerator.tsx`
   - Update the API endpoint in `generateTechnicalAnalysis()` function:
     ```tsx
     const res = await fetch('https://your-api.com/api/generate/technical-analysis', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ tickers, provider }),
     });
     ```

## Key Features Included

### Technical Analysis Generator
- ✅ Multi-ticker support (comma-separated)
- ✅ AI provider selection (OpenAI/Gemini)
- ✅ Comprehensive technical indicators:
  - RSI, MACD, Moving Averages (SMA/EMA)
  - Support/Resistance levels
  - 52-week range
  - Historical turning points (golden/death cross, etc.)
- ✅ Timestamp display
- ✅ Copy-to-clipboard functionality
- ✅ Error handling

### Price Action Only Generator
- ✅ Multi-ticker support (comma-separated)
- ✅ Simple price action line format: `{SYMBOL} Price Action: {Company} shares were {up/down/unchanged} {percent}% at ${price} {market status} on {day}, according to Benzinga Pro data.`
- ✅ Market status detection (premarket, after-hours, closed, open)
- ✅ 52-week range context (if near high/low)
- ✅ No AI required (faster, cheaper)
- ✅ Copy-to-clipboard functionality
- ✅ Error handling

### Stock Market Report Generator
- ✅ Comprehensive daily market analysis
- ✅ Major indices tracking (S&P 500, Nasdaq, Dow, Russell 2000)
- ✅ 11 sector ETFs analysis with major stock leaders
- ✅ Top gainers and losers with volume context
- ✅ Market breadth analysis (advance/decline ratio)
- ✅ AI-generated narrative report (OpenAI GPT-4o)
- ✅ Time-of-day context (premarket, early morning, midday, afternoon, after-hours)
- ✅ Copy-to-clipboard functionality
- ✅ Error handling

## Testing

After extraction, test with:

### Technical Analysis Generator
1. Single ticker: `AAPL`
2. Multiple tickers: `AAPL, MSFT, GOOGL`
3. Both AI providers (if keys are configured)

### Price Action Only Generator
1. Single ticker: `AAPL`
2. Multiple tickers: `AAPL, MSFT, GOOGL`
3. Test during different market hours (premarket, regular hours, after-hours, closed)

### Stock Market Report Generator
1. Generate report during market hours (best results)
2. Generate report during premarket/after-hours
3. Verify all sections are included (indices, sectors, gainers, losers)

## Notes

### Technical Analysis Generator
- The component is self-contained and uses React hooks
- The API route is a Next.js App Router route handler
- All external API calls are in the API route (Polygon, Benzinga)
- The AI provider service handles fallback logic automatically
- Requires OpenAI or Gemini API key for AI generation

### Price Action Only Generator
- The component is self-contained and uses React hooks
- The API route is a Next.js App Router route handler
- Uses Benzinga API only (no Polygon, no AI)
- **No AI required** - generates price action text directly from API data
- Much simpler and faster than Technical Analysis (no AI calls)
- The API route file is large (~3000 lines) because it handles many modes, but you only need the "Price Action Only" path (lines 2646-2856)

### Stock Market Report Generator
- The component is self-contained and uses React hooks
- The API route is a Next.js App Router route handler
- Uses Polygon API for all market data (indices, sectors, gainers, losers, sector stocks)
- Uses OpenAI GPT-4o directly (not through `aiProvider.ts`)
- Generates comprehensive narrative reports with market context
- Fetches major stocks within each sector for detailed analysis
- Filters gainers/losers for meaningful stocks (price > $5, volume > 1M, excludes warrants)

### Shared Notes
- No additional configuration files needed beyond environment variables
- All components can be used independently
- Price Action Only is much simpler and doesn't require AI provider setup
- Stock Market Report uses OpenAI directly (no need for `aiProvider.ts` unless you also use Technical Analysis)

