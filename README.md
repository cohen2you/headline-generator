# Headline Generator

A Next.js application that generates compelling financial headlines using AI.

## Features

- **AI-Powered Headline Generation**: Uses OpenAI GPT-4 to create engaging financial headlines
- **Multiple Enhancement Options**: Various headline improvement techniques (urgency, specificity, quotes, etc.)
- **Quote Integration**: Seamlessly incorporate quotes into headlines
- **Analyst Name Filtering**: Automatically replaces specific analyst names with "Analyst" to avoid conflicts
- **Alt-Text Generator**: Generate sophisticated alt text for images using OpenAI GPT-4 Vision (similar to AltText.ai quality)

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

# Required: Google Cloud Vision API service account key file
# Place your vision-api-service.json file in the root directory
```

### 3. Alt-Text Generator Setup

The Alt-Text Generator uses OpenAI GPT-4 Vision for sophisticated image analysis:

- Uses the same OpenAI API key as the headline generator
- Provides AltText.ai-quality descriptions
- Analyzes images directly for context, relationships, and meaning
- Generates natural, conversational alt text descriptions

### 4. Install Dependencies

```bash
npm install
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

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
