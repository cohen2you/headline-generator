import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const BENZINGA_API_KEY = process.env.BENZINGA_API_KEY!;
const BZ_NEWS_URL = 'https://api.benzinga.com/api/v2/news';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: Request) {
  try {
    const { keywords } = await request.json();
    
    if (!keywords || keywords.trim() === '') {
      return NextResponse.json({ error: 'Keywords are required' }, { status: 400 });
    }

    console.log('🔍 Searching for:', keywords);

    // STEP 1: Get targeted articles from Benzinga using multiple search strategies
    const candidateArticles = await fetchTargetedArticles(keywords);
    console.log(`📥 Fetched ${candidateArticles.length} candidate articles`);
    
    // Log date range of candidates
    if (candidateArticles.length > 0) {
      const dates = candidateArticles.map(a => new Date(a.created).getTime()).filter(d => !isNaN(d));
      if (dates.length > 0) {
        const newest = new Date(Math.max(...dates)).toISOString().slice(0, 10);
        const oldest = new Date(Math.min(...dates)).toISOString().slice(0, 10);
        console.log(`  Candidate date range: ${oldest} to ${newest}`);
      }
    }

    if (candidateArticles.length === 0) {
      return NextResponse.json({
        articles: [],
        totalFound: 0,
        message: 'No articles found for the given keywords'
      });
    }

    // STEP 2: Use AI to select the 20 most relevant articles
    console.log('🤖 Using AI to select most relevant articles...');
    const selectedArticles = await selectMostRelevantWithAI(candidateArticles as FormattedArticle[], keywords);
    console.log(`✅ Selected ${selectedArticles.length} most relevant articles`);
    
    // Log date range of selected articles
    if (selectedArticles.length > 0) {
      const dates = selectedArticles.map(a => new Date(a.created).getTime()).filter(d => !isNaN(d));
      if (dates.length > 0) {
        const newest = new Date(Math.max(...dates)).toISOString().slice(0, 10);
        const oldest = new Date(Math.min(...dates)).toISOString().slice(0, 10);
        console.log(`  Selected date range: ${oldest} to ${newest}`);
      }
    }

    return NextResponse.json({
      articles: selectedArticles,
      totalFound: selectedArticles.length,
      searchTerm: keywords
    });

  } catch (error: any) {
    console.error('Error in keyword search:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to search articles.' 
    }, { status: 500 });
  }
}

interface BenzingaArticle {
  id: string;
  title?: string;
  headline?: string;
  url: string;
  created: string;
  teaser?: string;
  body?: string;
  author?: string;
  channels?: Array<{ name?: string }>;
  stocks?: Array<{ name?: string } | string>;
  tags?: Array<{ name?: string } | string>;
}

// STEP 1: Fetch targeted articles using multiple Benzinga search strategies
async function fetchTargetedArticles(keywords: string): Promise<BenzingaArticle[]> {
  const allArticles: BenzingaArticle[] = [];
  const seenUrls = new Set<string>();
  
  // Get date range (last 30 days)
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 30);
  const dateFromStr = dateFrom.toISOString().slice(0, 10);

  // Helper to add articles without duplicates
  const addArticles = (articles: BenzingaArticle[]) => {
    if (!Array.isArray(articles)) return;
    articles.forEach((article: BenzingaArticle) => {
      if (article.url && !seenUrls.has(article.url)) {
        seenUrls.add(article.url);
        allArticles.push(article);
      }
    });
  };

  // Strategy 1: Try ticker search (for companies)
  const possibleTickers = getTickerForSearch(keywords);
  console.log(`  Identified tickers:`, possibleTickers);
  
  for (const ticker of possibleTickers) {
    try {
      // Try WITHOUT date restrictions first to get the most recent articles
      const url = `${BZ_NEWS_URL}?token=${BENZINGA_API_KEY}&tickers=${ticker}&pageSize=100&displayOutput=full`;
      console.log(`  Fetching ticker: ${ticker} (no date restriction)`);
      
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          console.log(`  ✓ Ticker ${ticker}: ${data.length} articles`);
          
          // Log date range of returned articles
          const dates = data.map((a: any) => new Date(a.created).toISOString().slice(0, 10)).filter(Boolean);
          if (dates.length > 0) {
            const sortedDates = [...dates].sort();
            const newest = sortedDates[sortedDates.length - 1];
            const oldest = sortedDates[0];
            console.log(`    Date range: ${oldest} to ${newest}`);
          }
          
          // Filter articles by date range ourselves
          const filteredData = data.filter((article: any) => {
            if (!article.created) return false;
            const articleDate = new Date(article.created);
            const fromDate = new Date(dateFromStr);
            return articleDate >= fromDate;
          });
          
          console.log(`    After date filter: ${filteredData.length} articles`);
          addArticles(filteredData);
        } else {
          console.log(`  ✗ Ticker ${ticker}: No articles returned`);
        }
      } else {
        console.log(`  ✗ Ticker ${ticker}: HTTP ${res.status}`);
      }
    } catch (error) {
      console.log(`  ✗ Ticker ${ticker} error:`, error);
    }
  }

  // Strategy 2: Fetch recent articles and filter by keyword
  if (allArticles.length < 50) {
    console.log('  Fetching recent articles as fallback...');
    const maxPages = 10; // Increased from 5 to get better coverage
    
    for (let page = 0; page < maxPages; page++) {
      try {
        const url = `${BZ_NEWS_URL}?token=${BENZINGA_API_KEY}&pageSize=100&page=${page}&displayOutput=full`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            // Filter for keyword matches AND date range
            const matching = data.filter((article: BenzingaArticle) => {
              // Check date first
              if (article.created) {
                const articleDate = new Date(article.created);
                const fromDate = new Date(dateFromStr);
                if (articleDate < fromDate) return false;
              }
              
              const title = (article.title || article.headline || '').toLowerCase();
              const teaser = (article.teaser || '').toLowerCase();
              const body = (article.body || '').toLowerCase();
              const searchLower = keywords.toLowerCase();
              
              return title.includes(searchLower) || teaser.includes(searchLower) || body.includes(searchLower);
            });
            
            if (matching.length > 0) {
              console.log(`  Page ${page + 1}: ${matching.length} matching articles`);
              addArticles(matching);
            }
            
            // Stop if we got less than 100 articles (end of results)
            if (data.length < 100) break;
          } else {
            break;
          }
        } else {
          break;
        }
      } catch (error) {
        console.log(`  Page ${page + 1} error:`, error);
        break;
      }
    }
  }

  // Clean and format articles
  return allArticles
    .filter(article => {
      // Exclude press releases and insights
      if (article.url && article.url.includes('/insights/')) return false;
      if (Array.isArray(article.channels) && 
          article.channels.some(ch => 
            ['press-releases', 'insights'].includes(ch.name?.toLowerCase() || ''))) {
        return false;
      }
      return article.title && article.url && article.created;
    })
    .map(article => ({
      id: article.id,
      title: article.title || article.headline || '',
      url: article.url,
      created: article.created,
      teaser: article.teaser || '',
      author: article.author || 'Benzinga',
      stocks: article.stocks || [],
      tags: article.tags || []
    }))
    .filter((article): article is FormattedArticle => article.title !== '')
    .slice(0, 100); // Keep top 100 for AI ranking
}

// Get ticker symbols for a search term
function getTickerForSearch(searchTerm: string): string[] {
  const tickerMap: { [key: string]: string } = {
    'palantir': 'PLTR',
    'tesla': 'TSLA',
    'apple': 'AAPL',
    'microsoft': 'MSFT',
    'amazon': 'AMZN',
    'nvidia': 'NVDA',
    'google': 'GOOGL',
    'meta': 'META',
    'netflix': 'NFLX'
  };
  
  const searchLower = searchTerm.toLowerCase();
  const tickers: string[] = [];
  
  // Check if it's already a ticker (all caps)
  if (searchTerm === searchTerm.toUpperCase() && searchTerm.length <= 5) {
    tickers.push(searchTerm);
  }
  
  // Check mapping
  if (tickerMap[searchLower]) {
    tickers.push(tickerMap[searchLower]);
  }
  
  // Check partial matches
  for (const [key, ticker] of Object.entries(tickerMap)) {
    if (searchLower.includes(key)) {
      tickers.push(ticker);
    }
  }
  
  return [...new Set(tickers)];
}

interface FormattedArticle {
  id: string;
  title: string;
  url: string;
  created: string;
  teaser: string;
  author: string;
  stocks: Array<{ name?: string } | string>;
  tags: Array<{ name?: string } | string>;
}

// STEP 2: Use AI to rank and select the most relevant articles
async function selectMostRelevantWithAI(articles: FormattedArticle[], searchQuery: string): Promise<FormattedArticle[]> {
  try {
    if (articles.length === 0) return [];
    
    // If we have 20 or fewer, just return them all
    if (articles.length <= 20) {
      console.log('  ✓ Returning all articles (≤20)');
      return articles;
    }
    
    console.log(`  Ranking ${articles.length} articles...`);
    
    // Create article list for AI
    const articleList = articles.map((article, idx) => 
      `${idx + 1}. "${article.title}"`
    ).join('\n');
    
    const prompt = `You are ranking financial news articles by relevance to a search query.

Search Query: "${searchQuery}"

Articles (${articles.length} total):
${articleList}

Task: Select the 20 MOST RELEVANT articles about "${searchQuery}".

Rules:
- Prioritize articles where "${searchQuery}" is the main topic
- EXCLUDE false word matches (e.g., "advance" is not "Vance")
- Include articles with substantive content about "${searchQuery}"
- Prefer recent, newsworthy articles

Return a JSON array of the 20 most relevant article numbers (1-based).
Example: [5, 12, 3, 45, 7, ...]
Return up to 20 numbers.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: 'You are a news relevance ranker. Return only the JSON array of article numbers.'
      }, {
        role: 'user',
        content: prompt
      }],
      temperature: 0,
      max_tokens: 300
    });

    const response = completion.choices[0]?.message?.content?.trim() || '[]';
    console.log(`  AI selected:`, response);
    
    try {
      // Remove markdown code blocks if present
      const cleanedResponse = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const selectedIndices = JSON.parse(cleanedResponse);
      if (Array.isArray(selectedIndices)) {
        const selectedArticles = selectedIndices
          .map((idx: number) => articles[idx - 1]) // Convert to 0-based
          .filter(Boolean); // Remove any undefined
        
        // Sort by date (newest first)
        selectedArticles.sort((a, b) => {
          const dateA = new Date(a.created || 0);
          const dateB = new Date(b.created || 0);
          return dateB.getTime() - dateA.getTime();
        });
        
        return selectedArticles.slice(0, 20);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', response);
      // Fallback: return first 20 articles
      return articles.slice(0, 20);
    }
    
    return articles.slice(0, 20);
  } catch (error) {
    console.error('AI ranking failed:', error);
    // Fallback: return first 20 articles
    return articles.slice(0, 20);
  }
}
