import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { DocumentInfo } from "./document-classifier-agent";

// Schema for revenue data
const RevenueSchema = z.object({
  therapyName: z.string(),
  period: z.string(),
  region: z.string(),
  revenueMillionsUsd: z.number(),
  sources: z.array(z.string()),
});

// Schema for source references
const SourceReferenceSchema = z.object({
  page: z.number(),
  section: z.string(),
  quote: z.string(),
});

const RevenueAnalysisResultSchema = z.object({
  revenue: z.array(RevenueSchema),
  confidence: z.number().min(0).max(100),
  sourceReferences: z.array(SourceReferenceSchema),
  calculations: z
    .array(
      z.object({
        description: z.string(),
        formula: z.string(),
        result: z.number(),
        confidence: z.number(),
      })
    )
    .optional(),
});

export interface RevenueAnalysisResult {
  revenue: any[];
  confidence: number;
  sources: any[];
}

export class RevenueAgent {
  private llm: ChatOpenAI;
  private analysisPrompt: PromptTemplate;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.1,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    this.analysisPrompt = PromptTemplate.fromTemplate(`
You are a Revenue Analysis Agent specialized in extracting and calculating financial data from pharmaceutical company reports.

DOCUMENT CONTEXT:
- Company: {companyName}
- Report Type: {reportType}  
- Period: {reportingPeriod}
- Target Therapy: {therapyName}

DOCUMENT TEXT:
{documentText}

CRITICAL INSTRUCTION: Focus EXCLUSIVELY on revenue data for "{therapyName}". Ignore all revenue data for other therapies/products.

EXTRACTION AND CALCULATION TASKS:

1. REVENUE EXTRACTION FOR {therapyName} ONLY:
   Extract revenue data ONLY for "{therapyName}" including:
   - Therapy name must match "{therapyName}" exactly (case-insensitive)
   - Revenue amounts (convert ALL amounts to millions USD)
   - Time periods (Q1 2024, Q2 2024, 2024, etc.)
   - Geographic regions (US, Europe, Rest of World, Global, etc.)
   - Source citations with exact page numbers

2. REVENUE CALCULATIONS:
   Perform calculations where needed:
   - Convert currencies to USD using standard rates
   - Convert units (billions to millions, thousands to millions)
   - Calculate totals, growth rates, or segment breakdowns
   - Show your work with formulas

3. VALIDATION RULES FOR {therapyName} REVENUE:
   - ONLY extract revenue for "{therapyName}" - ignore all other therapy revenues
   - Revenue amounts must be in millions USD (e.g., $1.5B = 1500, $430M = 430)
   - Periods must follow standard formats (Q1 2024, 2024)
   - Region names should be standardized (United States, Europe, Japan, etc.)
   - Each revenue record must have clear source attribution
   - If "{therapyName}" has no revenue data in the document, return empty array

CONVERSION EXAMPLES:
- "$1.86 billion" → 1860 (millions USD)
- "$430 million" → 430 (millions USD)
- "€500 million" → 540 (assuming 1.08 EUR/USD rate, millions USD)
- "$50,000" → 0.05 (millions USD)

OUTPUT FORMAT:
Return your analysis in this exact JSON structure:
{{
  "revenue": [
    {{
      "therapyName": "Exact therapy/product name",
      "period": "Q3 2024",
      "region": "United States",
      "revenueMillionsUsd": 1860,
      "sources": ["Page 15: Revenue by geography", "Page 8: Product revenue"]
    }}
  ],
  "confidence": 90,
  "sourceReferences": [
    {{
      "page": 15,
      "section": "Revenue by Geography",
      "quote": "US revenue for Q3 2024 was $1.86 billion"
    }}
  ],
  "calculations": [
    {{
      "description": "Converted Q3 2024 US revenue from billions to millions",
      "formula": "$1.86B × 1000 = 1860M USD",
      "result": 1860,
      "confidence": 95
    }}
  ]
}}

CONFIDENCE SCORING:
- 90-100: Explicit revenue figures with clear attribution
- 70-89: Clear figures but some unit conversion required
- 50-69: Calculated or estimated figures with reasonable basis
- 0-49: Uncertain or highly speculative figures

FOCUS AREAS:
- Look for revenue tables, financial summaries, geographic breakdowns
- Pay attention to product-specific revenue mentions
- Include both total revenue and segment/geographic breakdowns
- Capture year-over-year or quarter-over-quarter comparisons
`);
  }

  async analyze(
    pdfText: string,
    documentInfo: DocumentInfo,
    therapyName?: string
  ): Promise<RevenueAnalysisResult> {
    console.log(
      `💰 Revenue Agent: Starting revenue analysis${
        therapyName ? ` for ${therapyName}` : ""
      }...`
    );

    try {
      // Prepare the prompt with document context
      const prompt = await this.analysisPrompt.format({
        companyName: documentInfo.companyName || "Unknown Company",
        reportType: documentInfo.reportType || "Unknown",
        reportingPeriod: documentInfo.reportingPeriod || "Unknown",
        therapyName: therapyName || "all therapies",
        documentText: this.prepareDocumentText(pdfText, therapyName),
      });

      // Execute the analysis
      const response = await this.llm.invoke(prompt);
      const result = this.parseAnalysisResult(response.content as string);

      // Post-process and validate the results
      const processedResult = this.postProcessResults(result, documentInfo);

      console.log(
        `✅ Revenue Agent: Analysis completed - ${processedResult.revenue.length} revenue records found`
      );

      return {
        revenue: processedResult.revenue,
        confidence: processedResult.confidence,
        sources: processedResult.sourceReferences,
      };
    } catch (error) {
      console.error("❌ Revenue Agent: Analysis failed:", error);
      throw new Error(`Revenue analysis failed: ${error}`);
    }
  }

  private prepareDocumentText(pdfText: string, therapyName?: string): string {
    // For therapy-specific analysis, use much more text to preserve context
    const maxLength = 25000;

    console.log(
      `💰 Revenue Agent: Preparing text (${
        pdfText.length
      } chars, limit: ${maxLength}${therapyName ? ` for ${therapyName}` : ""})`
    );

    // For therapy-specific analysis, prioritize preserving therapy context
    if (therapyName) {
      const therapyRelevantText = this.extractTherapyRelevantSections(
        pdfText,
        therapyName
      );
      console.log(
        `💰 Revenue Agent: Extracted ${therapyRelevantText.length} chars of therapy-relevant text`
      );

      return therapyRelevantText.length > maxLength
        ? therapyRelevantText.substring(0, maxLength) + "..."
        : therapyRelevantText;
    }

    // For general analysis, use basic length limiting
    return pdfText.length > maxLength
      ? pdfText.substring(0, maxLength) + "..."
      : pdfText;
  }

  private extractTherapyRelevantSections(
    text: string,
    therapyName: string
  ): string {
    // Split text into paragraphs to preserve structure
    const paragraphs = text.split(/\n\s*\n/);
    const therapyLower = therapyName.toLowerCase();

    const relevantParagraphs: string[] = [];

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      const paragraphLower = paragraph.toLowerCase();

      // Include paragraphs that mention the therapy
      if (paragraphLower.includes(therapyLower)) {
        // Include the paragraph and some context around it
        const contextStart = Math.max(0, i - 1);
        const contextEnd = Math.min(paragraphs.length - 1, i + 1);

        for (let j = contextStart; j <= contextEnd; j++) {
          if (!relevantParagraphs.includes(paragraphs[j])) {
            relevantParagraphs.push(paragraphs[j]);
          }
        }
      }

      // Also include paragraphs with financial data that might be relevant
      else if (this.hasFinancialData(paragraph)) {
        relevantParagraphs.push(paragraph);
      }
    }

    return relevantParagraphs.join("\n\n");
  }

  private hasFinancialData(text: string): boolean {
    // Check for currency symbols, large numbers, or financial keywords
    const financialPatterns = [
      /[\$€£¥]\s*[\d,]+(?:\.\d+)?(?:\s*(?:million|billion|M|B))?/i,
      /\b\d+(?:\.\d+)?\s*(?:million|billion|M|B)\b/i,
      /\b(?:revenue|sales|income|earnings)\b/i,
      /\b(?:Q[1-4]|quarter|annual|year)\s+\d{4}\b/i,
    ];

    return financialPatterns.some((pattern) => pattern.test(text));
  }

  private parseAnalysisResult(
    content: string
  ): z.infer<typeof RevenueAnalysisResultSchema> {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in revenue analysis response");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return RevenueAnalysisResultSchema.parse(parsed);
    } catch (error) {
      console.error("Failed to parse revenue analysis response:", content);
      throw new Error(`Invalid revenue analysis response: ${error}`);
    }
  }

  private postProcessResults(
    result: z.infer<typeof RevenueAnalysisResultSchema>,
    documentInfo: DocumentInfo
  ): z.infer<typeof RevenueAnalysisResultSchema> {
    // Validate and standardize revenue data
    const processedRevenue = result.revenue.map((revenue) => {
      // Standardize period format
      let standardizedPeriod = this.standardizePeriod(
        revenue.period,
        documentInfo.reportingPeriod
      );

      // Standardize region names
      let standardizedRegion = this.standardizeRegion(revenue.region);

      // Validate revenue amount
      let validatedRevenue = this.validateRevenue(revenue.revenueMillionsUsd);

      return {
        ...revenue,
        period: standardizedPeriod,
        region: standardizedRegion,
        revenueMillionsUsd: validatedRevenue,
      };
    });

    return {
      ...result,
      revenue: processedRevenue,
    };
  }

  private standardizePeriod(period: string, contextPeriod?: string): string {
    // If period is already standardized, return as-is
    if (/^(Q[1-4]\s\d{4}|\d{4})$/.test(period)) {
      return period;
    }

    // Try to extract quarter and year
    const quarterMatch = period.match(/q?([1-4])/i);
    const yearMatch = period.match(/(\d{4})/);

    if (quarterMatch && yearMatch) {
      return `Q${quarterMatch[1]} ${yearMatch[1]}`;
    }

    if (yearMatch) {
      return yearMatch[1];
    }

    // Fall back to context period if available
    return contextPeriod || period;
  }

  private standardizeRegion(region: string): string {
    const regionMappings: { [key: string]: string } = {
      us: "United States",
      usa: "United States",
      "united states": "United States",
      "north america": "United States",
      eu: "Europe",
      europe: "Europe",
      "european union": "Europe",
      japan: "Japan",
      china: "China",
      "rest of world": "Rest of World",
      row: "Rest of World",
      international: "International",
      global: "Global",
      worldwide: "Global",
    };

    const lowerRegion = region.toLowerCase().trim();
    return regionMappings[lowerRegion] || region;
  }

  private validateRevenue(revenue: number): number {
    // Ensure revenue is positive and reasonable
    if (revenue < 0) {
      console.warn(
        `Negative revenue detected: ${revenue}, converting to positive`
      );
      return Math.abs(revenue);
    }

    // Check for unreasonably large numbers (might be an error in conversion)
    if (revenue > 1000000) {
      // > 1 trillion USD
      console.warn(
        `Extremely large revenue detected: ${revenue}, might be conversion error`
      );
    }

    return revenue;
  }
}
