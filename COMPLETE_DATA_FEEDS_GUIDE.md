# Complete Data Feeds Guide - All API Routes & Data Sources

This comprehensive guide lists ALL key data files in the headline-generator app, organized by data source/API provider.

## Overview

The app uses **3 main API providers**:
1. **Polygon.io** (Market data, technical indicators, financials, market status)
2. **Benzinga API** (Stock quotes, news, analyst ratings, earnings, ETF holders, Edge rankings)
3. **OpenAI/Gemini** (AI text generation - not data feeds)

---

## 📁 Files by Data Source

### 🔵 POLYGON.IO API Routes

#### 1. Technical Analysis Generator
**File:** `app/api/generate/technical-analysis/route.ts`

**Data Feeds:**
- **Ticker Snapshot** (`/v2/snapshot/locale/us/markets/stocks/tickers/{symbol}`)
  - Current price, daily change, volume
- **Ticker Details** (`/v3/reference/tickers/{symbol}`)
  - Company name, description, market cap, exchange
- **Historical Bars** (`/v2/aggs/ticker/{symbol}/range/{multiplier}/{timespan}/{from}/{to}`)
  - OHLCV data for multiple timeframes (daily, weekly, monthly)
- **RSI Indicator** (`/v1/indicators/rsi/{symbol}`)
  - Relative Strength Index (current and historical)
- **SMA Indicator** (`/v1/indicators/sma/{symbol}`)
  - Simple Moving Averages (20, 50, 100, 200 day)
- **EMA Indicator** (`/v1/indicators/ema/{symbol}`)
  - Exponential Moving Averages (20, 50, 100, 200 day)
- **MACD Indicator** (`/v1/indicators/macd/{symbol}`)
  - MACD, signal line, histogram
- **Financial Ratios** (`/stocks/financials/v1/ratios`)
  - P/E ratio, P/B ratio, etc.
- **Market Status** (via time-based logic, not API)

**Also Uses Benzinga:**
- Stock quote (`/api/v2/quoteDelayed`) for current price fallback

**Component:** `app/components/TechnicalAnalysisGenerator.tsx`

**Env Vars:** `POLYGON_API_KEY`, `BENZINGA_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` (optional)

---

#### 2. Market Report (Stock Market Report)
**File:** `app/api/generate/market-report/route.ts`

**Data Feeds:**
- **Major Indices Snapshot** (`/v2/snapshot/locale/us/markets/stocks/tickers?tickers=SPY,QQQ,DIA,IWM`)
  - S&P 500, Nasdaq, Dow Jones, Russell 2000
- **Sector ETFs Snapshot** (`/v2/snapshot/locale/us/markets/stocks/tickers?tickers=XLK,XLF,XLE,XLV,XLI,XLP,XLY,XLU,XLRE,XLC,XLB`)
  - 11 sector ETFs (Technology, Financial, Energy, Healthcare, Industrial, Consumer Staples, Consumer Discretionary, Utilities, Real Estate, Communication, Materials)
- **Top Gainers** (`/v2/snapshot/locale/us/markets/stocks/gainers`)
  - Top performing stocks today
- **Top Losers** (`/v2/snapshot/locale/us/markets/stocks/losers`)
  - Worst performing stocks today
- **Ticker Details** (`/v3/reference/tickers`)
  - Company names for gainers/losers

**Component:** `app/components/StockMarketReport.tsx`

**Env Vars:** `POLYGON_API_KEY`, `OPENAI_API_KEY`

---

#### 3. Price Action Generator (Smart Price Action Mode)
**File:** `app/api/generate/price-action/route.ts`

**When mode is "smart":**
- **Ticker Snapshot** (`/v2/snapshot/locale/us/markets/stocks/tickers/{symbol}`)
  - Current price, daily change
- **Ticker Details** (`/v3/reference/tickers/{symbol}`)
  - Company name, description
- **Historical Bars** (`/v2/aggs/ticker/{symbol}/range/1/day/{from}/{to}`)
  - 1 year of daily OHLCV data
- **RSI Indicator** (`/v1/indicators/rsi/{symbol}`)
  - RSI for technical analysis
- **SMA Indicator** (`/v1/indicators/sma/{symbol}`)
  - 20, 50, 200 day moving averages
- **EMA Indicator** (`/v1/indicators/ema/{symbol}`)
  - 20, 50, 200 day moving averages
- **Financial Ratios** (`/stocks/financials/v1/ratios`)
  - P/E ratio, etc.
- **Market Status** (`/v1/marketstatus/now`)
  - Current market open/closed status
- **Related Companies** (`/v1/related-companies/{symbol}`)
  - Peer companies for comparison

**Component:** `app/components/PriceActionGenerator.tsx`

**Env Vars:** `POLYGON_API_KEY`, `BENZINGA_API_KEY`, `OPENAI_API_KEY`

---

### 🟢 BENZINGA API Routes

#### 4. Earnings & Financials
**File:** `app/api/generate/earnings-financials/route.ts`

**Data Feeds:**
- **Earnings Calendar** (`/api/v2/calendar/earnings`)
  - Earnings dates, revenue, EPS, estimates, surprises, fiscal periods
- **Guidance/Corporate Events** (`/api/v2/calendar/guidance`)
  - Corporate guidance and events (currently returns 404)

**Component:** `app/components/EarningsFinancialsGenerator.tsx`

**Env Vars:** `BENZINGA_API_KEY`

---

#### 5. Analyst Ratings
**File:** `app/api/generate/analyst-ratings/route.ts`

**Data Feeds:**
- **Analyst Ratings Calendar** (`/api/v2.1/calendar/ratings`)
  - Analyst upgrades/downgrades, price targets, ratings (last 6 months)

**Component:** `app/components/AnalystRatingsGenerator.tsx`

**Env Vars:** `BENZINGA_API_KEY`, `OPENAI_API_KEY`

---

#### 6. Edge Rankings
**File:** `app/api/generate/edge-rankings/route.ts`

**Data Feeds:**
- **Edge Rankings** (`data-api-next.benzinga.com/rest/v3/tickerDetail`)
  - Momentum, Growth, Quality, Value rankings (0-100 scale)

**Component:** `app/components/EdgeRankingsGenerator.tsx`

**Env Vars:** `BENZINGA_EDGE_API_KEY`

---

#### 7. Keyword Search (News Search)
**File:** `app/api/generate/keyword-search/route.ts`

**Data Feeds:**
- **Benzinga News API** (`/api/v2/news`)
  - Search articles by ticker, keywords, date range
  - Article metadata: title, URL, date, author, tickers, tags

**Component:** `app/components/KeywordSearchGenerator.tsx`

**Env Vars:** `BENZINGA_API_KEY`, `OPENAI_API_KEY`

---

#### 8. Price Action Generator (Regular Modes)
**File:** `app/api/generate/price-action/route.ts`

**For "Price Action Only", "Price Action w/ ETFs", "Brief Analysis", "Grouped Price Action" modes:**
- **Stock Quote** (`/api/v2/quoteDelayed`)
  - Current price, change %, volume, 52-week high/low, company name
- **ETF Holders** (`/api/v2/etf-holdings`)
  - ETFs that hold the stock, with AUM (Assets Under Management)
- **Market Status** (time-based logic, not API)

**Component:** `app/components/PriceActionGenerator.tsx`

**Env Vars:** `BENZINGA_API_KEY`, `OPENAI_API_KEY`

---

#### 9. CTA Line Generator
**File:** `app/api/generate/cta-line/route.ts`

**Data Feeds:**
- **Stock Quote** (`/api/v2/quoteDelayed`)
  - Current price, change %, 52-week high/low, company name

**Component:** `app/components/CTALineGenerator.tsx`

**Env Vars:** `BENZINGA_API_KEY`

---

#### 10. Technical Analysis (Market Context)
**File:** `app/api/generate/technical-analysis/route.ts`

**Also uses Benzinga for:**
- **Stock Quote** (`/api/v2/quoteDelayed`)
  - Current price fallback if Polygon snapshot unavailable

**Component:** `app/components/TechnicalAnalysisGenerator.tsx`

**Env Vars:** `POLYGON_API_KEY`, `BENZINGA_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` (optional)

---

### ⚪ Shared Utilities

#### AI Provider Service
**File:** `lib/aiProvider.ts`

**Purpose:** Abstraction layer for OpenAI and Gemini API calls with fallback logic

**Used By:**
- Technical Analysis Generator
- (Other routes use OpenAI directly)

**Env Vars:** `OPENAI_API_KEY`, `GEMINI_API_KEY` (optional)

---

## 📊 Complete File List by Category

### Backend API Routes (Data Fetching)

| File | Data Source(s) | Primary Purpose |
|------|---------------|-----------------|
| `app/api/generate/technical-analysis/route.ts` | Polygon + Benzinga | Technical indicators, support/resistance, moving averages |
| `app/api/generate/market-report/route.ts` | Polygon | Market indices, sectors, gainers/losers |
| `app/api/generate/price-action/route.ts` | Polygon + Benzinga | Price action analysis, ETF holders, smart analysis |
| `app/api/generate/earnings-financials/route.ts` | Benzinga | Earnings calendar, financial statements (derived) |
| `app/api/generate/analyst-ratings/route.ts` | Benzinga | Analyst upgrades/downgrades, price targets |
| `app/api/generate/edge-rankings/route.ts` | Benzinga Edge | Momentum, Growth, Quality, Value rankings |
| `app/api/generate/keyword-search/route.ts` | Benzinga | News article search by keywords/tickers |
| `app/api/generate/cta-line/route.ts` | Benzinga | Call-to-action line generation |

### Frontend Components (UI)

| File | Displays Data From |
|------|-------------------|
| `app/components/TechnicalAnalysisGenerator.tsx` | `/api/generate/technical-analysis` |
| `app/components/StockMarketReport.tsx` | `/api/generate/market-report` |
| `app/components/PriceActionGenerator.tsx` | `/api/generate/price-action` |
| `app/components/EarningsFinancialsGenerator.tsx` | `/api/generate/earnings-financials` |
| `app/components/AnalystRatingsGenerator.tsx` | `/api/generate/analyst-ratings` |
| `app/components/EdgeRankingsGenerator.tsx` | `/api/generate/edge-rankings` |
| `app/components/KeywordSearchGenerator.tsx` | `/api/generate/keyword-search` |
| `app/components/CTALineGenerator.tsx` | `/api/generate/cta-line` |

### Utility Files

| File | Purpose |
|------|---------|
| `lib/aiProvider.ts` | AI API abstraction (OpenAI/Gemini) |
| `lib/prompts.ts` | Shared prompt templates |
| `lib/rate-limit.ts` | Rate limiting utilities |

---

## 🔑 Environment Variables Summary

```bash
# Polygon.io (Market Data & Technical Indicators)
POLYGON_API_KEY=your_polygon_key

# Benzinga (Stock Quotes, News, Ratings, Earnings)
BENZINGA_API_KEY=your_benzinga_key

# Benzinga Edge (Rankings Data - separate subscription)
BENZINGA_EDGE_API_KEY=your_edge_key

# OpenAI (AI Text Generation)
OPENAI_API_KEY=your_openai_key

# Gemini (AI Text Generation - optional fallback)
GEMINI_API_KEY=your_gemini_key
```

---

## 📋 Data Extraction Guide by Feature

### To Extract: Technical Analysis
**Files Needed:**
1. `app/api/generate/technical-analysis/route.ts`
2. `app/components/TechnicalAnalysisGenerator.tsx`
3. `lib/aiProvider.ts` (if using AI generation)

**Env Vars:** `POLYGON_API_KEY`, `BENZINGA_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` (optional)

---

### To Extract: Market Report
**Files Needed:**
1. `app/api/generate/market-report/route.ts`
2. `app/components/StockMarketReport.tsx`

**Env Vars:** `POLYGON_API_KEY`, `OPENAI_API_KEY`

---

### To Extract: Price Action Only
**Files Needed:**
1. `app/api/generate/price-action/route.ts` (use regular modes, not "smart")
2. `app/components/PriceActionGenerator.tsx`

**Env Vars:** `BENZINGA_API_KEY`, `OPENAI_API_KEY`

---

### To Extract: Smart Price Action
**Files Needed:**
1. `app/api/generate/price-action/route.ts` (use "smart" mode)
2. `app/components/PriceActionGenerator.tsx`

**Env Vars:** `POLYGON_API_KEY`, `BENZINGA_API_KEY`, `OPENAI_API_KEY`

---

### To Extract: Earnings & Financials
**Files Needed:**
1. `app/api/generate/earnings-financials/route.ts`
2. `app/components/EarningsFinancialsGenerator.tsx`

**Env Vars:** `BENZINGA_API_KEY`

---

### To Extract: Analyst Ratings
**Files Needed:**
1. `app/api/generate/analyst-ratings/route.ts`
2. `app/components/AnalystRatingsGenerator.tsx`

**Env Vars:** `BENZINGA_API_KEY`, `OPENAI_API_KEY`

---

### To Extract: Edge Rankings
**Files Needed:**
1. `app/api/generate/edge-rankings/route.ts`
2. `app/components/EdgeRankingsGenerator.tsx`

**Env Vars:** `BENZINGA_EDGE_API_KEY`

---

### To Extract: News/Keyword Search
**Files Needed:**
1. `app/api/generate/keyword-search/route.ts`
2. `app/components/KeywordSearchGenerator.tsx`

**Env Vars:** `BENZINGA_API_KEY`, `OPENAI_API_KEY`

---

### To Extract: CTA Line
**Files Needed:**
1. `app/api/generate/cta-line/route.ts`
2. `app/components/CTALineGenerator.tsx`

**Env Vars:** `BENZINGA_API_KEY`

---

## 🎯 Quick Reference: Polygon Endpoints Used

```
/v2/snapshot/locale/us/markets/stocks/tickers/{symbol}
/v2/snapshot/locale/us/markets/stocks/tickers?tickers={symbols}
/v2/snapshot/locale/us/markets/stocks/gainers
/v2/snapshot/locale/us/markets/stocks/losers
/v3/reference/tickers/{symbol}
/v2/aggs/ticker/{symbol}/range/{multiplier}/{timespan}/{from}/{to}
/v1/indicators/rsi/{symbol}
/v1/indicators/sma/{symbol}
/v1/indicators/ema/{symbol}
/v1/indicators/macd/{symbol}
/stocks/financials/v1/ratios
/v1/marketstatus/now
/v1/related-companies/{symbol}
```

---

## 🎯 Quick Reference: Benzinga Endpoints Used

```
/api/v2/quoteDelayed
/api/v2/etf-holdings
/api/v2/calendar/earnings
/api/v2/calendar/guidance
/api/v2.1/calendar/ratings
/api/v2/news
data-api-next.benzinga.com/rest/v3/tickerDetail (Edge API)
```

---

## 📝 Notes

1. **Price Action Route** is complex - it has multiple modes:
   - "Price Action Only" / "Price Action w/ ETFs" / "Brief Analysis" / "Grouped Price Action" → Uses **Benzinga only**
   - "Smart Price Action" (Full Analysis) → Uses **Polygon + Benzinga**

2. **Technical Analysis** uses both Polygon (primary) and Benzinga (fallback for quotes)

3. **Market Report** is Polygon-only, no Benzinga dependencies

4. **Earnings/Financials** is Benzinga-only, no Polygon dependencies

5. Most routes that generate text use **OpenAI directly**, except Technical Analysis which uses `lib/aiProvider.ts` for OpenAI/Gemini fallback

