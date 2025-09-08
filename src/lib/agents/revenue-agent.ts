import { parsePeriod, standardizeRegion } from "@/lib/utils/revenue-hierarchy";
import { PromptTemplate } from "@langchain/core/prompts";
import { ChatAnthropic } from "@langchain/anthropic";
import { z } from "zod";
import { DocumentInfo } from "./document-classifier-agent";
import { AgentLogger } from "./agent-logger";

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
  revenue: Record<string, unknown>[];
  confidence: number;
  sources: Record<string, unknown>[];
}

export class RevenueAgent {
  private llm: ChatAnthropic;
  private analysisPrompt: PromptTemplate;
  private logger = AgentLogger.getInstance();

  constructor() {
    this.llm = new ChatAnthropic({
      model: "claude-sonnet-4-20250514",
      temperature: 0.1,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    });

    this.analysisPrompt = PromptTemplate.fromTemplate(`
You are a Revenue Analysis Agent specialized in extracting and calculating financial data from pharmaceutical company documents.

TARGET THERAPY: {therapyName}

DOCUMENT TEXT:
{documentText}

CRITICAL INSTRUCTION: Focus EXCLUSIVELY on revenue data for "{therapyName}". Ignore all revenue data for other therapies/products.

EXTRACTION AND CALCULATION TASKS:

1. REVENUE EXTRACTION FOR {therapyName} ONLY:
   Extract revenue data ONLY for "{therapyName}" including:
   - Therapy name must match "{therapyName}" exactly (case-insensitive)
   - Revenue amounts (convert ALL amounts to millions USD)
   - Time periods as they appear in the document (quarters, years, etc.)
   - Geographic regions as mentioned (US, Europe, Rest of World, Global, etc.)
   - Source citations with exact page numbers

2. REVENUE CALCULATIONS:
   Perform calculations where needed:
   - Convert currencies to USD using standard rates
   - Convert units (billions to millions, thousands to millions)
   - Do not calculate totals, growth rates, or segment breakdowns
   - Show your work with formulas

3. VALIDATION RULES FOR {therapyName} REVENUE:
   - ONLY extract revenue for "{therapyName}" - ignore all other therapy revenues
   - Revenue amounts must be in millions USD (e.g., $1.5B = 1500, $430M = 430)
   - Periods should use standard formats (e.g., Q1 YYYY, YYYY for years)
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
      "period": "Q3 YYYY",
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
      "quote": "US revenue for Q3 YYYY was $1.86 billion"
    }}
  ],
  "calculations": [
    {{
      "description": "Converted Q3 YYYY US revenue from billions to millions",
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
- PRIORITIZE REVENUE/SALES TABLES OVER EVERYTHING ELSE
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
    const startTime = Date.now();
    console.log(
      `💰 Revenue Agent: Starting revenue analysis${
        therapyName ? ` for ${therapyName}` : ""
      }...`
    );

    // Log input data
    await this.logger.logInput("RevenueAgent", {
      context: {
        companyName: documentInfo.companyName,
        reportType: documentInfo.reportType,
        reportingPeriod: documentInfo.reportingPeriod,
        therapyName: therapyName || "all therapies",
      },
      parameters: {
        pdfTextLength: pdfText.length,
        hasTherapyName: !!therapyName,
      }
    });

    try {
      // Prepare the document text and log it
      const preparedText = this.prepareDocumentText(pdfText, therapyName);
      
      await this.logger.logMetadata("RevenueAgent", {
        operation: "text_preparation",
        originalLength: pdfText.length,
        preparedLength: preparedText.length,
        therapyName: therapyName || "all therapies",
        preparationMethod: therapyName ? "therapy-specific" : "general",
      });

      // Prepare the prompt
      const prompt = await this.analysisPrompt.format({
        therapyName: therapyName || "all therapies",
        documentText: preparedText,
      });

      // Log LLM call details (before the call)
      const llmCallStart = Date.now();
      await this.logger.logLLMCall("RevenueAgent", {
        model: "claude-sonnet-4-20250514",
        prompt: prompt,
        tokenEstimate: Math.ceil(prompt.length / 4), // Rough estimate
      });

      // Execute the analysis
      const response = await this.llm.invoke(prompt);
      const llmCallDuration = Date.now() - llmCallStart;

      // Log LLM response
      await this.logger.logLLMCall("RevenueAgent", {
        model: "claude-sonnet-4-20250514",
        response: response.content as string,
        duration: llmCallDuration,
      });

      // Parse and validate results
      let result;
      try {
        result = this.parseAnalysisResult(response.content as string);
        
        // Log successful validation
        await this.logger.logValidation("RevenueAgent", {
          success: true,
          originalData: { content: response.content as string },
          validatedData: result,
        });
      } catch (parseError) {
        // Log validation failure
        await this.logger.logValidation("RevenueAgent", {
          success: false,
          errors: [parseError instanceof Error ? parseError.message : String(parseError)],
          originalData: { content: response.content as string },
        });
        throw parseError;
      }

      // Post-process and validate the results
      const processedResult = this.postProcessResults(result, documentInfo);

      const totalDuration = Date.now() - startTime;
      
      // Log final output
      await this.logger.logOutput("RevenueAgent", {
        parsedResult: processedResult,
        confidence: processedResult.confidence,
      });

      // Log timing
      await this.logger.logTiming("RevenueAgent", "complete_analysis", totalDuration, {
        therapyName: therapyName || "all therapies",
        revenueRecordsFound: processedResult.revenue.length,
        llmCallDuration,
      });

      console.log(
        `✅ Revenue Agent: Analysis completed - ${processedResult.revenue.length} revenue records found`
      );

      return {
        revenue: processedResult.revenue,
        confidence: processedResult.confidence,
        sources: processedResult.sourceReferences,
      };
    } catch (error) {
      const totalDuration = Date.now() - startTime;
      
      // Log the error
      await this.logger.logError("RevenueAgent", error as Error, {
        therapyName: therapyName || "all therapies",
        companyName: documentInfo.companyName,
        duration: totalDuration,
      });

      console.error("❌ Revenue Agent: Analysis failed:", error);
      throw new Error(`Revenue analysis failed: ${error}`);
    }
  }

  private prepareDocumentText(pdfText: string, therapyName?: string): string {
    // Apply character limit to preserve context while staying within token limits
    const maxLength = 25000;

    console.log(
      `💰 Revenue Agent: Preparing text (${
        pdfText.length
      } chars, limit: ${maxLength}${therapyName ? ` for ${therapyName}` : ""})`
    );

    // Since we now receive full pages from extractTherapyPages(), 
    // just apply the character limit without additional extraction
    const preparedText = pdfText.length > maxLength
      ? pdfText.substring(0, maxLength) + "..."
      : pdfText;

    console.log(
      `💰 Revenue Agent: Prepared ${preparedText.length} chars (${preparedText.length === pdfText.length ? 'no truncation' : 'truncated'})`
    );

    return preparedText;
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
      
      // Preprocess calculations array to convert string numbers to actual numbers
      // Claude Sonnet 4 tends to return string values for numeric fields
      if (parsed.calculations && Array.isArray(parsed.calculations)) {
        parsed.calculations = parsed.calculations.map((calc: Record<string, unknown>) => {
          const processedCalc = { ...calc };
          
          // Convert result from string to number if needed
          if (typeof calc.result === 'string') {
            const numResult = parseFloat(calc.result);
            if (!isNaN(numResult)) {
              processedCalc.result = numResult;
            } else {
              console.warn(`Invalid result value in calculations: "${calc.result}"`);
              processedCalc.result = 0; // Default fallback
            }
          }
          
          // Convert confidence from string to number if needed
          if (typeof calc.confidence === 'string') {
            const numConfidence = parseFloat(calc.confidence);
            if (!isNaN(numConfidence)) {
              processedCalc.confidence = numConfidence;
            } else {
              console.warn(`Invalid confidence value in calculations: "${calc.confidence}"`);
              processedCalc.confidence = 0; // Default fallback
            }
          }
          
          return processedCalc;
        });
      }
      
      // Also handle main confidence field if it's a string
      if (typeof parsed.confidence === 'string') {
        const numConfidence = parseFloat(parsed.confidence);
        if (!isNaN(numConfidence)) {
          parsed.confidence = numConfidence;
        } else {
          console.warn(`Invalid main confidence value: "${parsed.confidence}"`);
          parsed.confidence = 0; // Default fallback
        }
      }
      
      // Handle revenue amounts if they're strings
      if (parsed.revenue && Array.isArray(parsed.revenue)) {
        parsed.revenue = parsed.revenue.map((rev: Record<string, unknown>) => {
          const processedRev = { ...rev };
          
          if (typeof rev.revenueMillionsUsd === 'string') {
            const numRevenue = parseFloat(rev.revenueMillionsUsd);
            if (!isNaN(numRevenue)) {
              processedRev.revenueMillionsUsd = numRevenue;
            } else {
              console.warn(`Invalid revenue amount: "${rev.revenueMillionsUsd}"`);
              processedRev.revenueMillionsUsd = 0; // Default fallback
            }
          }
          
          return processedRev;
        });
      }
      
      // Handle sourceReferences page numbers if they're strings
      if (parsed.sourceReferences && Array.isArray(parsed.sourceReferences)) {
        parsed.sourceReferences = parsed.sourceReferences.map((ref: Record<string, unknown>) => {
          const processedRef = { ...ref };
          
          if (typeof ref.page === 'string') {
            const numPage = parseInt(ref.page, 10);
            if (!isNaN(numPage)) {
              processedRef.page = numPage;
            } else {
              console.warn(`Invalid page number in sourceReferences: "${ref.page}"`);
              processedRef.page = 0; // Default fallback to page 0
            }
          }
          
          return processedRef;
        });
      }

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
      const standardizedPeriod = this.standardizePeriod(
        revenue.period,
        documentInfo.reportingPeriod
      );

      // Standardize region names
      const standardizedRegion = this.standardizeRegion(revenue.region);

      // Validate revenue amount
      const validatedRevenue = this.validateRevenue(revenue.revenueMillionsUsd);

      // Enhance sources with company and report type context
      const enhancedSources = revenue.sources.map(source => {
        const companyPrefix = documentInfo.companyName ? `${documentInfo.companyName}` : '';
        const reportTypePrefix = documentInfo.reportType ? ` ${documentInfo.reportType} report` : '';
        return `${companyPrefix}${reportTypePrefix} - ${source}`;
      });

      return {
        ...revenue,
        period: standardizedPeriod,
        region: standardizedRegion,
        revenueMillionsUsd: validatedRevenue,
        sources: enhancedSources,
        // Add document metadata for full traceability
        documentCompany: documentInfo.companyName,
        documentReportType: documentInfo.reportType,
        documentPeriod: documentInfo.reportingPeriod,
      };
    });

    return {
      ...result,
      revenue: processedRevenue,
    };
  }

  private standardizePeriod(period: string, contextPeriod?: string): string {
    try {
      // Use the hierarchy utility for consistent parsing
      const parsed = parsePeriod(period);
      return parsed.standardized;
    } catch (error) {
      console.warn(
        `Failed to parse period "${period}", falling back to context:`,
        error
      );
      // Fall back to context period if available
      return contextPeriod || period;
    }
  }

  private standardizeRegion(region: string): string {
    // Use the hierarchy utility for consistent region standardization
    return standardizeRegion(region);
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
