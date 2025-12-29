// Server-safe citation extraction functions
// These can be used in both client and server contexts

export function extractChatGPTCitations(text: string): { url: string; text: string; source?: string }[] {
  if (!text) return [];
  
  const citations: { url: string; text: string; source?: string }[] = [];
  const seen = new Set<string>();
  
  const normalizeUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.origin + urlObj.pathname;
    } catch {
      return url.trim();
    }
  };

  // Pattern 1: [text](url) format
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = linkPattern.exec(text)) !== null) {
    const url = match[2].trim();
    const text = match[1].trim();
    const normalized = normalizeUrl(url);
    
    if (url && !seen.has(normalized)) {
      seen.add(normalized);
      citations.push({ url, text, source: 'chatgpt' });
    }
  }

  // Pattern 2: *(source: url)* format
  const sourcePattern = /\*\(source:\s*([^)]+)\)\*/g;
  while ((match = sourcePattern.exec(text)) !== null) {
    const url = match[1].trim();
    const normalized = normalizeUrl(url);
    
    if (url && !seen.has(normalized)) {
      seen.add(normalized);
      citations.push({ url, text: url, source: 'chatgpt' });
    }
  }

  // Pattern 3: Numbered citations [1], [2] with URLs later in text
  const numberedPattern = /\[(\d+)\]/g;
  const urlMatches: { index: number; number: string }[] = [];
  while ((match = numberedPattern.exec(text)) !== null) {
    urlMatches.push({ index: match.index, number: match[1] });
  }

  // Try to find URLs after numbered citations
  if (urlMatches.length > 0) {
    const urlPattern = /(https?:\/\/[^\s\)]+)/g;
    const allUrls: { url: string; index: number }[] = [];
    while ((match = urlPattern.exec(text)) !== null) {
      allUrls.push({ url: match[1], index: match.index });
    }

    urlMatches.forEach(({ number }) => {
      const urlIndex = parseInt(number) - 1;
      if (allUrls[urlIndex]) {
        const url = allUrls[urlIndex].url;
        const normalized = normalizeUrl(url);
        if (!seen.has(normalized)) {
          seen.add(normalized);
          citations.push({ url, text: `[${number}]`, source: 'chatgpt' });
        }
      }
    });
  }

  return citations;
}

export function extractGoogleAIOverviewCitations(
  aiOverview: string,
  googleData?: any
): { url: string; text: string; source?: string }[] {
  const citations: { url: string; text: string; source?: string }[] = [];
  const seen = new Set<string>();

  if (!aiOverview && !googleData) return citations;

  // Extract from citations array if available
  if (googleData?.citations && Array.isArray(googleData.citations)) {
    googleData.citations.forEach((citation: any) => {
      if (citation.url) {
        const url = citation.url.trim();
        if (url && !seen.has(url)) {
          seen.add(url);
          citations.push({
            url,
            text: citation.title || citation.url,
            source: 'google'
          });
        }
      }
    });
  }

  // Extract from aiOverview text (links in markdown format)
  if (aiOverview) {
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = linkPattern.exec(aiOverview)) !== null) {
      const url = match[2].trim();
      const text = match[1].trim();
      
      if (url && !seen.has(url)) {
        seen.add(url);
        citations.push({ url, text, source: 'google' });
      }
    }
  }

  return citations;
}

export function extractPerplexityCitations(
  response: string,
  perplexityData?: any
): { url: string; text: string; source?: string }[] {
  const citations: { url: string; text: string; source?: string }[] = [];
  const seen = new Set<string>();

  if (!response && !perplexityData) return citations;

  // Extract from citations array if available
  if (perplexityData?.citations && Array.isArray(perplexityData.citations)) {
    perplexityData.citations.forEach((citation: any) => {
      if (citation.url) {
        const url = citation.url.trim();
        if (url && !seen.has(url)) {
          seen.add(url);
          citations.push({
            url,
            text: citation.title || citation.url,
            source: 'perplexity'
          });
        }
      }
    });
  }

  // Extract from response text (links in markdown format)
  if (response) {
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = linkPattern.exec(response)) !== null) {
      const url = match[2].trim();
      const text = match[1].trim();
      
      if (url && !seen.has(url)) {
        seen.add(url);
        citations.push({ url, text, source: 'perplexity' });
      }
    }

    // Also check for numbered citations [1], [2] with URLs
    const numberedPattern = /\[(\d+)\]/g;
    const urlPattern = /(https?:\/\/[^\s\)]+)/g;
    const urlMatches: string[] = [];
    let urlMatch;
    while ((urlMatch = urlPattern.exec(response)) !== null) {
      urlMatches.push(urlMatch[1]);
    }

    let numberedMatch;
    while ((numberedMatch = numberedPattern.exec(response)) !== null) {
      const index = parseInt(numberedMatch[1]) - 1;
      if (urlMatches[index]) {
        const url = urlMatches[index];
        if (!seen.has(url)) {
          seen.add(url);
          citations.push({ url, text: `[${numberedMatch[1]}]`, source: 'perplexity' });
        }
      }
    }
  }

  return citations;
}

