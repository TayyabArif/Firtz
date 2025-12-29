// Server-safe brand mention analysis functions
// Can be used in both client and server contexts

interface Citation {
  url: string;
  text: string;
  source?: string;
}

interface Competitor {
  name: string;
  domain?: string;
  aliases?: string[];
}

// Function to check if brand is mentioned in text
function isBrandMentioned(text: string, brandName: string): boolean {
  if (!text || !brandName) return false;
  const lowerText = text.toLowerCase();
  const lowerBrandName = brandName.toLowerCase();
  return lowerText.includes(lowerBrandName);
}

// Function to check if brand domain is cited in text
function isDomainCited(text: string, brandDomain: string): boolean {
  if (!text || !brandDomain) return false;
  const lowerText = text.toLowerCase();
  const lowerDomain = brandDomain.toLowerCase();
  // Check for "https://www." + domain first
  const httpsWwwDomain = `https://www.${lowerDomain}`;
  if (lowerText.includes(httpsWwwDomain)) return true;
  // If not found, check for "https://" + domain
  const httpsDomain = `https://${lowerDomain}`;
  if (lowerText.includes(httpsDomain)) return true;
  return false;
}

// Function to count brand mentions in text
function countBrandMentions(text: string, brandName: string): number {
  if (!text || !brandName) return 0;
  const lowerText = text.toLowerCase();
  const lowerBrandName = brandName.toLowerCase();
  const regex = new RegExp(lowerBrandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

// Function to count domain citations in citations array
function countDomainCitations(citations: Citation[], brandDomain: string): number {
  if (!brandDomain) return 0;
  const lowerDomain = brandDomain.toLowerCase();
  const httpsWwwDomain = `https://www.${lowerDomain}`;
  const httpsDomain = `https://${lowerDomain}`;
  return citations.filter(citation => {
    const lowerUrl = citation.url.toLowerCase();
    if (lowerUrl.includes(httpsWwwDomain)) return true;
    if (lowerUrl.includes(httpsDomain)) return true;
    return false;
  }).length;
}

// Simple competitor matching (server-safe version)
function matchCompetitorsInText(text: string, competitors: Competitor[]): string[] {
  if (!text || !competitors.length) return [];
  const lowerText = text.toLowerCase();
  const matches: string[] = [];
  
  competitors.forEach(competitor => {
    const lowerName = competitor.name.toLowerCase();
    if (lowerText.includes(lowerName)) {
      matches.push(competitor.name);
    }
    
    // Check aliases
    if (competitor.aliases) {
      competitor.aliases.forEach(alias => {
        if (lowerText.includes(alias.toLowerCase())) {
          matches.push(competitor.name);
        }
      });
    }
    
    // Check domain
    if (competitor.domain) {
      const lowerDomain = competitor.domain.toLowerCase();
      if (lowerText.includes(lowerDomain)) {
        matches.push(competitor.name);
      }
    }
  });
  
  return [...new Set(matches)]; // Remove duplicates
}

// Function to check if competitors are mentioned in text
function areCompetitorsMentioned(text: string, competitors: string[]): boolean {
  if (!text || !competitors.length) return false;
  const competitorObjects: Competitor[] = competitors.map(name => ({ name }));
  const matches = matchCompetitorsInText(text, competitorObjects);
  return matches.length > 0;
}

// Function to check if competitors are cited in citations
function areCompetitorsCited(citations: Citation[], competitors: string[]): boolean {
  if (!citations || !competitors.length) return false;
  return citations.some(citation => 
    competitors.some(competitor => 
      citation.url.toLowerCase().includes(competitor.toLowerCase()) ||
      citation.text.toLowerCase().includes(competitor.toLowerCase())
    )
  );
}

// Function to count competitor mentions in text
function countCompetitorMentions(text: string, competitors: string[]): number {
  if (!text || !competitors.length) return 0;
  const competitorObjects: Competitor[] = competitors.map(name => ({ name }));
  const matches = matchCompetitorsInText(text, competitorObjects);
  return matches.length;
}

// Function to count competitor citations
function countCompetitorCitations(citations: Citation[], competitors: string[]): number {
  if (!citations || !competitors.length) return 0;
  return citations.filter(citation => 
    competitors.some(competitor => 
      citation.url.toLowerCase().includes(competitor.toLowerCase()) ||
      citation.text.toLowerCase().includes(competitor.toLowerCase())
    )
  ).length;
}

// Brand analysis result interface
interface BrandAnalysisResult {
  provider: 'chatgpt' | 'google' | 'perplexity';
  brandMentioned: boolean;
  domainCited: boolean;
  citationCount: number;
  citations: Citation[];
  brandMentionCount: number;
  domainCitationCount: number;
  competitorMentioned: boolean;
  competitorCited: boolean;
  competitorMentionCount: number;
  competitorCitationCount: number;
}

export interface BrandMentionAnalysis {
  brandName: string;
  brandDomain: string;
  competitors: string[];
  results: {
    chatgpt?: BrandAnalysisResult;
    google?: BrandAnalysisResult;
    perplexity?: BrandAnalysisResult;
  };
  totals: {
    totalCitations: number;
    totalBrandMentions: number;
    totalDomainCitations: number;
    totalCompetitorMentions: number;
    totalCompetitorCitations: number;
    providersWithBrandMention: number;
    providersWithDomainCitation: number;
    providersWithCompetitorMention: number;
    providersWithCompetitorCitation: number;
  };
}

// Main function to analyze brand mentions and citations across all providers
export function analyzeBrandMentions(
  brandName: string,
  brandDomain: string,
  queryResults: {
    chatgpt?: { response: string; citations?: Citation[] };
    googleAI?: { aiOverview?: string; citations?: Citation[] };
    perplexity?: { response: string; citations?: Citation[] };
  },
  competitors: string[] = []
): BrandMentionAnalysis {
  const results: BrandMentionAnalysis['results'] = {};
  
  // Analyze ChatGPT
  if (queryResults.chatgpt?.response) {
    const citations = queryResults.chatgpt.citations || [];
    const brandMentioned = isBrandMentioned(queryResults.chatgpt.response, brandName);
    const domainCited = isDomainCited(queryResults.chatgpt.response, brandDomain);
    const brandMentionCount = countBrandMentions(queryResults.chatgpt.response, brandName);
    const domainCitationCount = countDomainCitations(citations, brandDomain);
    
    // Add competitor analysis
    const competitorMentioned = areCompetitorsMentioned(queryResults.chatgpt.response, competitors);
    const competitorCited = areCompetitorsCited(citations, competitors);
    const competitorMentionCount = countCompetitorMentions(queryResults.chatgpt.response, competitors);
    const competitorCitationCount = countCompetitorCitations(citations, competitors);
    
    results.chatgpt = {
      provider: 'chatgpt',
      brandMentioned,
      domainCited,
      citationCount: citations.length,
      citations,
      brandMentionCount,
      domainCitationCount,
      competitorMentioned,
      competitorCited,
      competitorMentionCount,
      competitorCitationCount
    };
  }
  
  // Analyze Google AI Overview
  if (queryResults.googleAI) {
    const aiOverviewText = queryResults.googleAI.aiOverview || '';
    const citations = queryResults.googleAI.citations || [];
    const brandMentioned = isBrandMentioned(aiOverviewText, brandName);
    const domainCited = isDomainCited(aiOverviewText, brandDomain);
    const brandMentionCount = countBrandMentions(aiOverviewText, brandName);
    const domainCitationCount = countDomainCitations(citations, brandDomain);
    
    // Add competitor analysis
    const competitorMentioned = areCompetitorsMentioned(aiOverviewText, competitors);
    const competitorCited = areCompetitorsCited(citations, competitors);
    const competitorMentionCount = countCompetitorMentions(aiOverviewText, competitors);
    const competitorCitationCount = countCompetitorCitations(citations, competitors);
    
    results.google = {
      provider: 'google',
      brandMentioned,
      domainCited,
      citationCount: citations.length,
      citations,
      brandMentionCount,
      domainCitationCount,
      competitorMentioned,
      competitorCited,
      competitorMentionCount,
      competitorCitationCount
    };
  }
  
  // Analyze Perplexity
  if (queryResults.perplexity?.response) {
    const citations = queryResults.perplexity.citations || [];
    const brandMentioned = isBrandMentioned(queryResults.perplexity.response, brandName);
    const domainCited = isDomainCited(queryResults.perplexity.response, brandDomain);
    const brandMentionCount = countBrandMentions(queryResults.perplexity.response, brandName);
    const domainCitationCount = countDomainCitations(citations, brandDomain);
    
    // Add competitor analysis
    const competitorMentioned = areCompetitorsMentioned(queryResults.perplexity.response, competitors);
    const competitorCited = areCompetitorsCited(citations, competitors);
    const competitorMentionCount = countCompetitorMentions(queryResults.perplexity.response, competitors);
    const competitorCitationCount = countCompetitorCitations(citations, competitors);
    
    results.perplexity = {
      provider: 'perplexity',
      brandMentioned,
      domainCited,
      citationCount: citations.length,
      citations,
      brandMentionCount,
      domainCitationCount,
      competitorMentioned,
      competitorCited,
      competitorMentionCount,
      competitorCitationCount
    };
  }
  
  // Calculate totals
  const totalCitations = Object.values(results).reduce((sum, result) => sum + result.citationCount, 0);
  const totalBrandMentions = Object.values(results).reduce((sum, result) => sum + result.brandMentionCount, 0);
  const totalDomainCitations = Object.values(results).reduce((sum, result) => sum + result.domainCitationCount, 0);
  const totalCompetitorMentions = Object.values(results).reduce((sum, result) => sum + result.competitorMentionCount, 0);
  const totalCompetitorCitations = Object.values(results).reduce((sum, result) => sum + result.competitorCitationCount, 0);
  const providersWithBrandMention = Object.values(results).filter(result => result.brandMentioned).length;
  const providersWithDomainCitation = Object.values(results).filter(result => result.domainCited).length;
  const providersWithCompetitorMention = Object.values(results).filter(result => result.competitorMentioned).length;
  const providersWithCompetitorCitation = Object.values(results).filter(result => result.competitorCited).length;
  
  return {
    brandName,
    brandDomain,
    competitors,
    results,
    totals: {
      totalCitations,
      totalBrandMentions,
      totalDomainCitations,
      totalCompetitorMentions,
      totalCompetitorCitations,
      providersWithBrandMention,
      providersWithDomainCitation,
      providersWithCompetitorMention,
      providersWithCompetitorCitation
    }
  };
}

