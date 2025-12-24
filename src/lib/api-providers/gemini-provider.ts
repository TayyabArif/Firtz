import { BaseAPIProvider } from './base-provider';
import { APIResponse, ProviderConfig, GeminiRequest } from './types';

export class GeminiProvider extends BaseAPIProvider {
  private baseUrl: string;

  constructor(config: ProviderConfig) {
    super('google-gemini', 'ai', config);
    // Default to v1beta, but will try v1 if v1beta fails
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
  }
  
  /**
   * Try different API versions to find one that works
   */
  private async tryApiVersions(model: string, request: GeminiRequest): Promise<any> {
    const apiVersions = [
      { version: 'v1beta', baseUrl: 'https://generativelanguage.googleapis.com/v1beta' },
      { version: 'v1', baseUrl: 'https://generativelanguage.googleapis.com/v1' },
    ];
    
    // Also try different model name formats
    const modelVariants = [
      model,
      model.replace('gemini-', ''),
      `models/${model}`,
    ];
    
    for (const apiVersion of apiVersions) {
      for (const modelVariant of modelVariants) {
        try {
          const cleanModel = modelVariant.replace('models/', '');
          const url = `${apiVersion.baseUrl}/models/${cleanModel}:generateContent?key=${this.config.apiKey}`;
          
          console.log(`🔄 Trying Gemini API: ${apiVersion.version} with model: ${cleanModel}`);
          
          const response = await this.makeRequest(url, {
            method: 'POST',
            body: JSON.stringify({
              contents: request.contents,
              generationConfig: request.generationConfig,
            }),
          });
          
          // Update baseUrl to the working version
          this.baseUrl = apiVersion.baseUrl;
          console.log(`✅ Found working API version: ${apiVersion.version} with model: ${cleanModel}`);
          return response;
        } catch (error) {
          // Continue to next combination
          continue;
        }
      }
    }
    
    throw new Error('Could not find a working API version and model combination');
  }

  /**
   * List available models for the API key
   */
  private async listAvailableModels(): Promise<string[]> {
    try {
      const listUrl = `${this.baseUrl}/models?key=${this.config.apiKey}`;
      const response = await this.makeRequest(listUrl, {
        method: 'GET',
      });
      
      const models = response.models
        ?.filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        ?.map((m: any) => m.name?.replace('models/', '') || m.name)
        || [];
      
      console.log(`📋 Available Gemini models:`, models);
      return models;
    } catch (error) {
      console.warn('⚠️ Could not list available models:', (error as Error).message);
      return [];
    }
  }

  async execute(request: GeminiRequest & { model?: string }): Promise<APIResponse> {
    const startTime = Date.now();
    const requestId = `gemini-${Date.now()}`;

    try {
      if (!this.config.apiKey || this.config.apiKey.trim() === '') {
        throw new Error('Google AI API key is not configured');
      }

      if (!this.validateRequest(request)) {
        throw new Error('Invalid request format');
      }

      await this.checkRateLimit();

      // First, try to get available models
      let modelCandidates: string[] = [];
      
      if (request.model) {
        modelCandidates = [request.model];
      } else {
        // Try to list available models first
        const availableModels = await this.listAvailableModels();
        
        if (availableModels.length > 0) {
          // Use available models, prioritizing flash and pro models
          const preferred = availableModels.filter(m => 
            m.includes('flash') || m.includes('pro')
          );
          modelCandidates = preferred.length > 0 
            ? [...preferred, ...availableModels.filter(m => !preferred.includes(m))]
            : availableModels;
          console.log(`📋 Using available models:`, modelCandidates);
        } else {
          // Fallback to common model names if listing fails
          modelCandidates = [
            'gemini-pro',                // Most common and stable
            'gemini-1.5-flash',         // Fast model
            'gemini-1.5-pro',           // More capable
          ];
          console.log(`⚠️ Could not list models, using fallback:`, modelCandidates);
        }
      }
      
      let lastError: Error | null = null;
      let rawResponse: any = null;
      
      // Try each model with different API versions
      for (const model of modelCandidates) {
        try {
          console.log(`🚀 Trying Gemini model: ${model}`);
          
          rawResponse = await this.retryRequest(async () => {
            return await this.tryApiVersions(model, request);
          });
          
          // Success! Break out of loop
          console.log(`✅ Gemini model ${model} succeeded`);
          break;
        } catch (error) {
          lastError = error as Error;
          const errorMsg = (error as Error).message;
          console.warn(`⚠️ Gemini model ${model} failed, trying next...`, errorMsg);
          
          // If this is the last model, throw the error
          if (model === modelCandidates[modelCandidates.length - 1]) {
            throw lastError;
          }
        }
      }
      
      if (!rawResponse) {
        throw lastError || new Error('All Gemini models failed');
      }

      console.log(`✅ Gemini API Response received:`, {
        hasCandidates: !!rawResponse.candidates,
        candidatesLength: rawResponse.candidates?.length
      });

      const transformedData = this.transformResponse(rawResponse);
      const responseTime = Date.now() - startTime;
      const cost = this.calculateCost();

      return {
        providerId: this.name,
        requestId,
        status: 'success',
        data: transformedData,
        responseTime,
        cost,
        timestamp: new Date(),
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = (error as Error).message;
      
      console.error(`❌ Gemini API Error:`, {
        error: errorMessage,
        responseTime,
        apiKeyConfigured: !!this.config.apiKey && this.config.apiKey.trim() !== ''
      });
      
      return {
        providerId: this.name,
        requestId,
        status: 'error',
        error: errorMessage,
        responseTime,
        cost: 0,
        timestamp: new Date(),
      };
    }
  }

  validateRequest(request: GeminiRequest): boolean {
    return !!(
      request.contents &&
      Array.isArray(request.contents) &&
      request.contents.length > 0 &&
      request.contents[0].parts &&
      Array.isArray(request.contents[0].parts)
    );
  }

  transformResponse(rawResponse: any): any {
    const candidate = rawResponse.candidates?.[0];
    return {
      content: candidate?.content?.parts?.[0]?.text || '',
      finishReason: candidate?.finishReason,
      safetyRatings: candidate?.safetyRatings,
      citationMetadata: candidate?.citationMetadata,
    };
  }

  protected calculateCost(): number {
    // Gemini Pro pricing (example)
    return 0.0005; // $0.0005 per request (simplified)
  }

  async healthCheck(): Promise<boolean> {
    try {
      const testRequest: GeminiRequest = {
        contents: [{
          parts: [{ text: 'Hello' }]
        }]
      };
      
      const result = await this.execute(testRequest);
      return result.status === 'success';
    } catch {
      return false;
    }
  }
} 