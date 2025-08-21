import axios from 'axios';

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: {
    name: string;
  };
}

interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsArticle[];
}

export interface ExternalContext {
  recentNews: NewsArticle[];
  marketContext: string;
  competitiveContext: string;
  industryTrends: string;
  hasExternalData: boolean;
}

export class NewsApiService {
  private apiKey: string;
  private baseUrl = 'https://newsapi.org/v2';
  private isAvailable: boolean = true;

  constructor() {
    this.apiKey = process.env.NEWS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('NEWS_API_KEY not found in environment variables - external context will be disabled');
      this.isAvailable = false;
    }
  }

  private async makeRequest(endpoint: string, params: Record<string, string> = {}): Promise<any> {
    if (!this.isAvailable || !this.apiKey) {
      return null;
    }

    try {
      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        params: {
          ...params,
          apiKey: this.apiKey,
        },
        timeout: 8000, // 8 second timeout
      });
      return response.data;
    } catch (error: any) {
      console.error('News API request failed:', error.message);
      // If we get rate limited or other errors, disable the service temporarily
      if (error.response?.status === 429 || error.response?.status === 403) {
        console.warn('News API rate limited or unauthorized - disabling external context');
        this.isAvailable = false;
      }
      return null;
    }
  }

  async getRecentNews(query: string, days: number = 7): Promise<NewsArticle[]> {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const fromDate = date.toISOString().split('T')[0];

    const response = await this.makeRequest('/everything', {
      q: query,
      from: fromDate,
      sortBy: 'relevancy',
      language: 'en',
      pageSize: '8', // Reduced to avoid rate limits
    });

    if (response && response.status === 'ok') {
      return response.articles || [];
    }
    return [];
  }

  async getCompanyNews(companyName: string): Promise<NewsArticle[]> {
    return this.getRecentNews(companyName, 7);
  }

  async getMarketNews(): Promise<NewsArticle[]> {
    const marketQueries = [
      'stock market',
      'S&P 500',
      'NASDAQ',
      'Federal Reserve',
      'interest rates',
      'inflation',
      'earnings season',
    ];

    const allArticles: NewsArticle[] = [];
    
    // Limit to 2 queries to avoid rate limits
    for (const query of marketQueries.slice(0, 2)) {
      const articles = await this.getRecentNews(query, 3);
      allArticles.push(...articles);
    }

    // Remove duplicates based on URL
    const uniqueArticles = allArticles.filter((article, index, self) => 
      index === self.findIndex(a => a.url === article.url)
    );

    return uniqueArticles.slice(0, 8);
  }

  async getIndustryNews(industryKeywords: string[]): Promise<NewsArticle[]> {
    if (industryKeywords.length === 0) return [];

    const query = industryKeywords.slice(0, 2).join(' OR '); // Limit to 2 keywords
    return this.getRecentNews(query, 5);
  }

  async generateExternalContext(articleText: string): Promise<ExternalContext> {
    // Extract key entities from the article
    const entities = this.extractKeyEntities(articleText);
    
    const context: ExternalContext = {
      recentNews: [],
      marketContext: '',
      competitiveContext: '',
      industryTrends: '',
      hasExternalData: false,
    };

    // If News API is not available, return empty context
    if (!this.isAvailable) {
      return context;
    }

    try {
      // Get company-specific news
      if (entities.companies.length > 0) {
        const companyNews = await this.getCompanyNews(entities.companies[0]);
        context.recentNews.push(...companyNews);
      }

      // Get market context
      const marketNews = await this.getMarketNews();
      context.recentNews.push(...marketNews);

      // Get industry-specific news
      if (entities.industries.length > 0) {
        const industryNews = await this.getIndustryNews(entities.industries);
        context.recentNews.push(...industryNews);
      }

      // Remove duplicates and limit results
      context.recentNews = context.recentNews
        .filter((article, index, self) => 
          index === self.findIndex(a => a.url === article.url)
        )
        .slice(0, 12);

      // Generate context summaries
      context.marketContext = this.generateMarketContext(context.recentNews);
      context.competitiveContext = this.generateCompetitiveContext(context.recentNews, entities);
      context.industryTrends = this.generateIndustryTrends(context.recentNews, entities);

      // Mark as having external data if we found any news
      context.hasExternalData = context.recentNews.length > 0;

    } catch (error) {
      console.error('Error generating external context:', error);
    }

    return context;
  }

  private extractKeyEntities(articleText: string): {
    companies: string[];
    people: string[];
    industries: string[];
    tickers: string[];
  } {
    const entities = {
      companies: [] as string[],
      people: [] as string[],
      industries: [] as string[],
      tickers: [] as string[],
    };

    // Extract stock tickers
    const tickerPattern = /\b[A-Z]{2,5}\b/g;
    const tickers = articleText.match(tickerPattern) || [];
    entities.tickers = [...new Set(tickers)];

    // Extract company names (simplified pattern)
    const companyPattern = /\b([A-Z][a-z]+ [A-Z][a-z]+)\s+(Inc|Corp|Company|Ltd|LLC|Group|Holdings|Technologies|Systems|Solutions)\b/g;
    let match;
    while ((match = companyPattern.exec(articleText)) !== null) {
      entities.companies.push(match[1]);
    }

    // Extract person names
    const personPattern = /\b([A-Z][a-z]+ [A-Z][a-z]+)\s+(said|announced|reported|stated|confirmed|expressed)\b/g;
    while ((match = personPattern.exec(articleText)) !== null) {
      entities.people.push(match[1]);
    }

    // Common industry keywords
    const industryKeywords = [
      'technology', 'tech', 'software', 'hardware', 'AI', 'artificial intelligence',
      'finance', 'banking', 'investment', 'trading', 'cryptocurrency', 'crypto',
      'healthcare', 'pharmaceutical', 'biotech', 'medical',
      'energy', 'oil', 'gas', 'renewable', 'solar', 'wind',
      'automotive', 'electric vehicles', 'EV', 'transportation',
      'retail', 'e-commerce', 'consumer', 'manufacturing',
    ];

    entities.industries = industryKeywords.filter(keyword => 
      articleText.toLowerCase().includes(keyword.toLowerCase())
    );

    return entities;
  }

  private generateMarketContext(news: NewsArticle[]): string {
    const marketArticles = news.filter(article => 
      article.title.toLowerCase().includes('market') ||
      article.title.toLowerCase().includes('stock') ||
      article.title.toLowerCase().includes('fed') ||
      article.title.toLowerCase().includes('earnings')
    );

    if (marketArticles.length === 0) return '';

    const recentMarketNews = marketArticles
      .slice(0, 3)
      .map(article => article.title)
      .join('; ');

    return `Recent market context: ${recentMarketNews}`;
  }

  private generateCompetitiveContext(news: NewsArticle[], entities: {
    companies: string[];
    people: string[];
    industries: string[];
    tickers: string[];
  }): string {
    const competitiveArticles = news.filter(article => 
      entities.companies.some((company: string) => 
        article.title.toLowerCase().includes(company.toLowerCase())
      )
    );

    if (competitiveArticles.length === 0) return '';

    const competitiveNews = competitiveArticles
      .slice(0, 2)
      .map(article => article.title)
      .join('; ');

    return `Competitive context: ${competitiveNews}`;
  }

  private generateIndustryTrends(news: NewsArticle[], entities: {
    companies: string[];
    people: string[];
    industries: string[];
    tickers: string[];
  }): string {
    const industryArticles = news.filter(article => 
      entities.industries.some((industry: string) => 
        article.title.toLowerCase().includes(industry.toLowerCase())
      )
    );

    if (industryArticles.length === 0) return '';

    const industryNews = industryArticles
      .slice(0, 2)
      .map(article => article.title)
      .join('; ');

    return `Industry trends: ${industryNews}`;
  }
} 