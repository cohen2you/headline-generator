import { NextResponse } from 'next/server';

type EdgeRankingsData = {
  momentum?: number;
  growth?: number;
  quality?: number;
  value?: number;
  ticker?: string;
};

export async function POST(request: Request) {
  try {
    const { ticker } = await request.json();
    
    if (!ticker || typeof ticker !== 'string') {
      return NextResponse.json({ error: 'Ticker is required.' }, { status: 400 });
    }

    if (!process.env.BENZINGA_EDGE_API_KEY) {
      return NextResponse.json({ error: 'Edge API key not configured.' }, { status: 500 });
    }

    // Fetch edge rankings data from Benzinga API
    const url = `https://data-api-next.benzinga.com/rest/v3/tickerDetail?apikey=${process.env.BENZINGA_EDGE_API_KEY}&symbols=${ticker.toUpperCase()}`;
    console.log('Fetching edge rankings from:', url);
    
    const res = await fetch(url);
    
    if (!res.ok) {
      console.error('Edge API response not ok:', res.status, res.statusText);
      return NextResponse.json({ 
        error: `Failed to fetch edge rankings data. Status: ${res.status}` 
      }, { status: 500 });
    }

    const data = await res.json();
    console.log('Edge API response data:', JSON.stringify(data, null, 2));
    
    // Extract rankings from the nested structure
    const result = data.result && data.result[0];
    const edgeData = result && result.rankings;

    if (!edgeData || !edgeData.exists) {
      console.log('No edge data found for ticker:', ticker.toUpperCase());
      console.log('Available data keys:', Object.keys(data || {}));
      return NextResponse.json({ error: 'No edge rankings data found for ticker.' }, { status: 404 });
    }

    // Extract the four quality metrics
    console.log('Edge data for ticker:', edgeData);
    console.log('Available edge data keys:', Object.keys(edgeData));
    
    const rankings: EdgeRankingsData = {
      ticker: ticker.toUpperCase(),
      momentum: edgeData.momentum || null,
      growth: edgeData.growth || null,
      quality: edgeData.quality || null,
      value: edgeData.value || null
    };
    
    console.log('Extracted rankings:', rankings);

    // Generate a paragraph describing the rankings
    const generateRankingsParagraph = (rankings: EdgeRankingsData) => {
      const { ticker, momentum, growth, quality, value } = rankings;
      
      // Check if we have all four metrics
      if (momentum !== null && momentum !== undefined &&
          growth !== null && growth !== undefined &&
          quality !== null && quality !== undefined &&
          value !== null && value !== undefined) {
        
        // Determine overall assessment
        const avgScore = (momentum + growth + quality + value) / 4;
        let overallAssessment = '';
        
        if (avgScore >= 80) overallAssessment = 'strong';
        else if (avgScore >= 60) overallAssessment = 'moderate to strong';
        else if (avgScore >= 40) overallAssessment = 'moderate';
        else if (avgScore >= 20) overallAssessment = 'weak to moderate';
        else overallAssessment = 'weak';
        
        return `Benzinga Edge rankings show ${overallAssessment} fundamentals, with Value ranking ${value.toFixed(2)}/100, Growth ranking ${growth.toFixed(2)}/100, Quality ranking ${quality.toFixed(2)}/100, and Momentum ranking ${momentum.toFixed(2)}/100.`;
      }
      
      // Fallback for incomplete data
      const validMetrics = [
        { name: 'Momentum', value: momentum },
        { name: 'Growth', value: growth },
        { name: 'Quality', value: quality },
        { name: 'Value', value: value }
      ].filter(metric => metric.value !== null && metric.value !== undefined);

      if (validMetrics.length === 0) {
        return `${ticker} edge rankings data is currently unavailable.`;
      }

      const metricDescriptions = validMetrics.map(metric => {
        const score = metric.value as number;
        let description = '';
        
        if (score >= 80) description = 'excellent';
        else if (score >= 60) description = 'strong';
        else if (score >= 40) description = 'moderate';
        else if (score >= 20) description = 'weak';
        else description = 'poor';
        
        return `${metric.name} (${score}/100 - ${description})`;
      });

      if (metricDescriptions.length === 1) {
        return `${ticker} shows ${metricDescriptions[0]} in edge rankings.`;
      } else if (metricDescriptions.length === 2) {
        return `${ticker} edge rankings: ${metricDescriptions[0]} and ${metricDescriptions[1]}.`;
      } else {
        const lastMetric = metricDescriptions.pop();
        return `${ticker} edge rankings: ${metricDescriptions.join(', ')}, and ${lastMetric}.`;
      }
    };

    const rankingsParagraph = generateRankingsParagraph(rankings);

    return NextResponse.json({ 
      rankings,
      rankingsParagraph 
    });

  } catch (error) {
    console.error('Error fetching edge rankings:', error);
    return NextResponse.json({ error: 'Failed to generate edge rankings.' }, { status: 500 });
  }
}
