# Headline Generator

A Next.js application that generates compelling financial headlines using AI, with the ability to incorporate external market context and recent news.

## Features

- **AI-Powered Headline Generation**: Uses OpenAI GPT-4 to create engaging financial headlines
- **External Context Integration**: Incorporates recent market news and industry trends for stronger headlines
- **Multiple Enhancement Options**: Various headline improvement techniques (urgency, specificity, quotes, etc.)
- **Quote Integration**: Seamlessly incorporate quotes into headlines
- **Analyst Name Filtering**: Automatically replaces specific analyst names with "Analyst" to avoid conflicts

## External Context Features

The headline generator now includes external context from recent news to create more timely and relevant headlines:

- **Market Context**: Recent market news, Fed updates, earnings season information
- **Competitive Context**: Recent news about companies mentioned in the article
- **Industry Trends**: Industry-specific news and developments
- **Real-time Relevance**: Headlines that connect to current market conditions

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Required: OpenAI API Key for headline generation
OPENAI_API_KEY=your_openai_api_key_here

# Optional: News API Key for external context
# Get a free key from https://newsapi.org/
NEWS_API_KEY=your_news_api_key_here
```

### 3. News API Setup (Optional)

The external context feature uses NewsAPI.org to fetch recent market news and industry trends:

1. Visit [https://newsapi.org/](https://newsapi.org/)
2. Sign up for a free account
3. Get your API key
4. Add it to your `.env.local` file as `NEWS_API_KEY`

**Note**: The free tier allows 1,000 requests per day. The application is designed to be efficient and will gracefully handle rate limits.

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## How External Context Works

When you generate headlines, the system will:

1. **Extract Key Entities**: Identify companies, people, industries, and stock tickers from your article
2. **Fetch Recent News**: Search for recent news about those entities and market conditions
3. **Generate Context**: Create summaries of market context, competitive landscape, and industry trends
4. **Enhance Headlines**: Use this context to create more timely and relevant headlines

The external context is automatically included in all headline generation processes, making your headlines more connected to current market conditions and recent developments.

## Getting Started

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
