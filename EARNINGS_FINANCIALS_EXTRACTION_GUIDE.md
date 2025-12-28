# Earnings & Financials Data Extraction Guide

This guide explains how to extract the Earnings & Financials functionality into another app.

## Files to Copy

### 1. Backend API Route

**File:** `app/api/generate/earnings-financials/route.ts`

**Data Feeds Used:**
- **Benzinga Earnings Calendar API** (`/api/v2/calendar/earnings`)
  - Provides: Earnings dates, revenue, EPS, revenue estimates, EPS estimates, revenue/EPS surprises
  - This is the PRIMARY data source for financial statements (revenue, EPS data)
  
- **Benzinga Guidance API** (`/api/v2/calendar/guidance`)
  - Provides: Corporate guidance/events data
  - Note: Currently returns 404 (may require specific subscription tier)

**What This File Does:**
- Fetches earnings calendar data from Benzinga
- Transforms earnings data into financial statements format (extracts revenue, EPS, estimates, surprises)
- Fetches guidance/corporate events (if available)
- Returns structured JSON with:
  - `financials`: Array of financial statements (derived from earnings data)
  - `earningsEvents`: Array of earnings calendar events
  - `corporateEvents`: Array of corporate events/guidance
  - `earningsCalendarAvailable`: Boolean flag
  - `corporateEventsAvailable`: Boolean flag

**Key Functions:**
- No external helper functions needed - all logic is self-contained in the route
- Uses `NextResponse` from Next.js (standard API route pattern)

### 2. Frontend Component

**File:** `app/components/EarningsFinancialsGenerator.tsx`

**What This File Does:**
- React component with UI for ticker input
- Displays financial statements (revenue, EPS, estimates, surprises)
- Displays earnings calendar events with detailed information
- Displays corporate events (if available)
- Includes utility functions:
  - `formatCurrency()`: Formats numbers as currency ($1.5B, $50M, etc.)
  - `formatDate()`: Formats date strings

**Dependencies:**
- React hooks: `useState`, `forwardRef`, `useImperativeHandle`
- No external UI libraries required (uses Tailwind CSS classes)

## Data Feed Breakdown

### Earnings Calendar Data (Primary Source)

**API Endpoint:** `https://api.benzinga.com/api/v2/calendar/earnings`

**Query Parameters:**
- `token`: Benzinga API key
- `parameters[tickers]`: Comma-separated ticker symbols (max 50)
- `parameters[date_from]`: Start date (YYYY-MM-DD)
- `parameters[date_to]`: End date (YYYY-MM-DD)
- `pagesize`: Number of results (max 1000)

**Data Fields Returned:**
- `date`: Earnings announcement date
- `revenue`: Actual revenue
- `revenue_est`: Revenue estimate
- `revenue_prior`: Prior period revenue
- `revenue_surprise`: Revenue surprise amount
- `revenue_surprise_percent`: Revenue surprise percentage
- `eps`: Earnings per share
- `eps_est`: EPS estimate
- `eps_prior`: Prior period EPS
- `eps_surprise`: EPS surprise amount
- `eps_surprise_percent`: EPS surprise percentage
- `period`: Fiscal quarter (1-4)
- `period_year`: Fiscal year
- `name`: Company name
- `time`: Earnings call time
- `currency`: Currency code
- `exchange`: Exchange code
- Plus other metadata fields

**Usage:**
- This data is used to create "Financial Statements" by extracting revenue, EPS, estimates, and surprises
- Also displayed directly as "Earnings Calendar" events

### Guidance/Corporate Events Data

**API Endpoint:** `https://api.benzinga.com/api/v2/calendar/guidance`

**Query Parameters:**
- `token`: Benzinga API key
- `parameters[tickers]`: Comma-separated ticker symbols
- `parameters[date_from]`: Start date (YYYY-MM-DD)
- `parameters[date_to]`: End date (YYYY-MM-DD)
- `pagesize`: Number of results
- `parameters[is_primary]`: Filter for primary guidance (Y/N/All)

**Note:** Currently returns 404 - may require specific subscription tier or different endpoint

## Dependencies

### NPM Packages
No additional packages required beyond standard Next.js setup. The route uses:
- `next/server` (built-in Next.js)
- Native `fetch` API (built-in)
- No AI/LLM dependencies (pure data fetching)

The component uses:
- `react` (standard React hooks)

### Environment Variables

Add to your `.env.local` file:

```bash
# Required for Earnings & Financials
BENZINGA_API_KEY=your_benzinga_api_key
```

## Step-by-Step Extraction

### For Next.js App

1. **Copy the API route:**
   ```bash
   # In your new Next.js app directory
   mkdir -p app/api/generate/earnings-financials
   
   # Copy the route file
   cp app/api/generate/earnings-financials/route.ts [new-app]/app/api/generate/earnings-financials/
   ```

2. **Copy the component:**
   ```bash
   mkdir -p app/components
   cp app/components/EarningsFinancialsGenerator.tsx [new-app]/app/components/
   ```

3. **Add environment variable:**
   - Add `BENZINGA_API_KEY` to your `.env.local` file

4. **Use the component:**
   ```tsx
   import EarningsFinancialsGenerator, { EarningsFinancialsGeneratorRef } from './components/EarningsFinancialsGenerator';
   
   export default function Page() {
     const earningsRef = useRef<EarningsFinancialsGeneratorRef>(null);
     
     return (
       <div>
         <EarningsFinancialsGenerator ref={earningsRef} />
       </div>
     );
   }
   ```

### For Non-Next.js App

If you're using a different framework:

1. **Extract the data fetching logic:**
   - Copy the `POST` function body from `route.ts`
   - Replace `NextResponse.json()` with your framework's response format
   - Extract the Benzinga API calls (lines 56-85 and 186-230)
   - Extract the data transformation logic (lines 111-177)

2. **Key API Calls to Extract:**
   
   **Earnings Calendar:**
   ```typescript
   const url = `https://api.benzinga.com/api/v2/calendar/earnings?token=${BENZINGA_API_KEY}&parameters[tickers]=${symbol}&parameters[date_from]=${dateFrom}&parameters[date_to]=${dateTo}&pagesize=20`;
   const earningsRes = await fetch(url, { headers: { accept: 'application/json' } });
   ```
   
   **Guidance/Corporate Events:**
   ```typescript
   const url = `https://api.benzinga.com/api/v2/calendar/guidance?token=${BENZINGA_API_KEY}&parameters[tickers]=${symbol}&parameters[date_from]=${dateFrom}&parameters[date_to]=${dateTo}&pagesize=20`;
   const eventsRes = await fetch(url, { headers: { accept: 'application/json' } });
   ```

3. **Component Logic:**
   - Copy the React component logic
   - Adapt to your UI framework if needed
   - Keep the utility functions (`formatCurrency`, `formatDate`)

## Data Structure

### Financial Statements (derived from earnings data)
```typescript
interface FinancialStatement {
  fiscal_period?: string;        // e.g., "Q1"
  fiscal_year?: string | number; // e.g., 2024
  filing_date?: string;          // Date string
  end_date?: string;             // Date string
  financials?: {
    income_statement?: {
      revenue?: number;
      earnings_per_share?: number;
      revenue_estimate?: number;
      eps_estimate?: number;
      revenue_surprise_percent?: number;
      eps_surprise_percent?: number;
      // ... other fields
    };
  };
}
```

### Earnings Events (direct from API)
```typescript
interface EarningsEvent {
  date?: string;
  ticker?: string;
  name?: string;
  revenue?: number;
  revenue_est?: number;
  eps?: number;
  eps_est?: number;
  period?: number;
  period_year?: number;
  // ... other fields from Benzinga API
}
```

## Important Notes

1. **No Polygon API Required:** This feature uses ONLY Benzinga API (no Polygon dependencies)

2. **Financial Statements are Derived:** The "Financial Statements" section is created from earnings calendar data - there's no separate financial statements endpoint being called

3. **Guidance Endpoint:** The guidance/corporate events endpoint currently returns 404 - may need to verify subscription tier or use alternative endpoint

4. **Self-Contained:** The route file contains all the data fetching logic - no external utility files needed

5. **Type Safety:** All TypeScript interfaces are defined in the route file - you can extract them if needed for shared types

## Testing

After copying, test with:
- A ticker symbol (e.g., "NVDA", "AAPL")
- Verify earnings calendar data is returned
- Check that financial statements are properly formatted
- Verify corporate events (if endpoint works)

