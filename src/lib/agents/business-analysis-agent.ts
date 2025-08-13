import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";

const BusinessItemSchema = z.object({
  type: z.enum(['partnership', 'licensing', 'market_position', 'strategy']),
  description: z.string(),
  parties: z.array(z.string()).optional(),
  value: z.number().optional(),
  date: z.string().optional(),
  sources: z.array(z.string())
});

const BusinessAnalysisResultSchema = z.object({
  business: z.array(BusinessItemSchema).optional(),
  confidence: z.object({
    business: z.number().min(0).max(100)
  })
});

export type BusinessAnalysisResult = z.infer<typeof BusinessAnalysisResultSchema>;

export class BusinessAnalysisAgent {
  private llm: ChatOpenAI;
  private analysisPrompt: PromptTemplate;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.1,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    this.analysisPrompt = PromptTemplate.fromTemplate(`
You are analyzing business information from a pharmaceutical/biotech company report.

Extract the following types of business information:

1. **Partnerships**: Strategic partnerships, collaborations, joint ventures
   - Include partner names, deal terms, financial details if available
   
2. **Licensing**: In-licensing and out-licensing agreements
   - Include licensed products, territories, milestone payments, royalty rates
   
3. **Market Position**: Market share, competitive positioning, market analysis
   - Include specific market segments, geographic regions, competitive advantages
   
4. **Strategy**: Corporate strategy, business development, future plans
   - Include strategic initiatives, growth plans, R&D focus areas

Document section:
{documentSection}

Extract all business information and return as JSON:
{{
  "business": [
    {{
      "type": "partnership|licensing|market_position|strategy",
      "description": "Detailed description of the business item",
      "parties": ["Company A", "Company B"], // For partnerships/licensing
      "value": 100000000, // In USD if mentioned
      "date": "2024-Q3", // When the deal/event occurred
      "sources": ["Page X: specific quote or reference"]
    }}
  ],
  "confidence": {{
    "business": 85 // 0-100 confidence score
  }}
}}

Important:
- Extract specific financial values when mentioned
- Include all parties involved in partnerships/licensing
- Capture strategic initiatives and market positioning statements
- Provide page references for all extracted information
`);
  }

  async analyze(documentSection: string): Promise<BusinessAnalysisResult> {
    try {
      const prompt = await this.analysisPrompt.format({
        documentSection: documentSection.substring(0, 15000) // Limit context
      });

      const response = await this.llm.invoke(prompt);
      const content = response.content as string;

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn("No valid JSON found in business analysis response");
        return {
          business: [],
          confidence: { business: 0 }
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const validated = BusinessAnalysisResultSchema.parse(parsed);

      console.log(`💼 Business Analysis: Found ${validated.business?.length || 0} business items`);
      
      return validated;
    } catch (error) {
      console.error("Error in business analysis:", error);
      return {
        business: [],
        confidence: { business: 0 }
      };
    }
  }

  /**
   * Analyze multiple sections and merge results
   */
  async analyzeSections(sections: string[]): Promise<BusinessAnalysisResult> {
    const allResults: BusinessAnalysisResult[] = [];

    for (const section of sections) {
      const result = await this.analyze(section);
      allResults.push(result);
    }

    // Merge results
    const mergedBusiness: typeof BusinessItemSchema._type[] = [];
    let totalConfidence = 0;

    for (const result of allResults) {
      if (result.business) {
        mergedBusiness.push(...result.business);
      }
      totalConfidence += result.confidence.business;
    }

    // Remove duplicates based on description similarity
    const uniqueBusiness = this.deduplicateBusinessItems(mergedBusiness);

    return {
      business: uniqueBusiness,
      confidence: {
        business: allResults.length > 0 ? totalConfidence / allResults.length : 0
      }
    };
  }

  private deduplicateBusinessItems(items: typeof BusinessItemSchema._type[]): typeof BusinessItemSchema._type[] {
    const seen = new Set<string>();
    const unique: typeof BusinessItemSchema._type[] = [];

    for (const item of items) {
      // Create a simple key for deduplication
      const key = `${item.type}-${item.description.toLowerCase().substring(0, 50)}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    return unique;
  }
}