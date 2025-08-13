import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { DocumentInfo } from "./document-classifier-agent";
import { AgentLoggerHelper } from "./with-logging";

// Schema for market analysis insights
const MarketInsightSchema = z.object({
  type: z.enum(['competitive_position', 'market_opportunity', 'commercial_milestone', 'partnership', 'development_update', 'market_access', 'strategy']),
  therapyName: z.string(),
  description: z.string(),
  impact: z.enum(['high', 'medium', 'low']),
  sources: z.array(z.string()),
});

// Schema for therapy information (market-focused)
const TherapyMarketSchema = z.object({
  name: z.string(),
  manufacturer: z.string(),
  mechanism: z.string().optional(),
  marketInsights: z.array(MarketInsightSchema),
  sources: z.array(z.string()),
});

// Schema for regulatory approvals (market-relevant)
const ApprovalSchema = z.object({
  therapyName: z.string(),
  diseaseName: z.string(),
  region: z.string(),
  approvalDate: z.string(),
  approvalType: z.string(),
  regulatoryBody: z.string(),
  marketImpact: z.string().optional(),
  sources: z.array(z.string()),
});

// Schema for source references
const SourceReferenceSchema = z.object({
  page: z.number(),
  section: z.string(),
  quote: z.string(),
});

const MarketAnalysisResultSchema = z.object({
  therapies: z.array(TherapyMarketSchema),
  approvals: z.array(ApprovalSchema),
  marketInsights: z.array(MarketInsightSchema),
  confidence: z.number().min(0).max(100),
  sourceReferences: z.array(SourceReferenceSchema),
});

export interface MarketAnalysisResult {
  therapy?: Array<{
    name: string;
    manufacturer: string;
    mechanism: string;
    pricePerTreatmentUsd: number;
    sources: string[];
  }>;
  approvals?: Array<{
    therapyName: string;
    diseaseName: string;
    region: string;
    approvalDate: string;
    approvalType: string;
    regulatoryBody: string;
    sources: string[];
  }>;
  confidence: {
    therapy: number;
    approvals: number;
  };
}

export class MarketAnalysisAgent {
  private llm: ChatOpenAI;
  private analysisPrompt: PromptTemplate;
  private loggerHelper: AgentLoggerHelper;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.1,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    this.loggerHelper = new AgentLoggerHelper("MarketAnalysisAgent");

    this.analysisPrompt = PromptTemplate.fromTemplate(`
You are a Market Analysis Agent specialized in extracting therapy-specific market intelligence from pharmaceutical company reports.

DOCUMENT CONTEXT:
- Company: {companyName}
- Report Type: {reportType}
- Period: {reportingPeriod}

DOCUMENT TEXT (Pre-filtered for therapy mentions):
{documentText}

EXTRACTION FOCUS:
This document text has already been filtered to include sections that mention specific therapies. Your task is to extract market-relevant information about these therapies.

EXTRACTION TASKS:

1. THERAPY MARKET ANALYSIS:
   For each therapy mentioned, extract:
   - Therapy/drug names (exact names as mentioned)
   - Manufacturer (usually the company publishing this report)
   - Mechanism of action (if mentioned)
   - Market positioning information
   - Competitive advantages mentioned
   - Market opportunities or challenges

2. MARKET INSIGHTS EXTRACTION:
   Look for therapy-specific insights about:
   - Competitive positioning ("leading treatment", "first-in-class", etc.)
   - Market opportunities ("expanding patient population", "new indication")
   - Commercial milestones ("launched in", "commercialization began")
   - Partnerships ("collaboration with", "licensing agreement")
   - Development updates ("trial results", "regulatory submission")
   - Market access ("reimbursement", "pricing approval")
   - Strategic updates ("focus on", "priority therapy")

3. REGULATORY/APPROVAL UPDATES:
   Extract approval information that has market implications:
   - New approvals or approvals in new regions
   - Regulatory milestones that affect market position
   - Approval types (Full, Accelerated, Breakthrough, etc.)

QUALITY REQUIREMENTS:
- Focus only on therapies from the reporting company (not competitors)
- Extract specific, actionable market intelligence
- If no market-relevant information is found, return empty arrays
- Include page references for all extracted information
- Rate confidence based on specificity and clarity of information

CONFIDENCE SCORING:
- 90-100: Explicit market statements with clear implications
- 70-89: Clear market-relevant information with some interpretation
- 50-69: Partial information or requires significant interpretation
- 0-49: Uncertain, speculative, or very limited information

OUTPUT FORMAT:
Return your analysis in this exact JSON structure:
{{
  "therapies": [
    {{
      "name": "Exact therapy name",
      "manufacturer": "Company name",
      "mechanism": "Mechanism of action (if mentioned)",
      "marketInsights": [
        {{
          "type": "competitive_position",
          "therapyName": "Therapy name",
          "description": "Specific market insight or positioning statement",
          "impact": "high",
          "sources": ["Page 5: Market position section"]
        }}
      ],
      "sources": ["Page 5: Product overview", "Page 12: Market section"]
    }}
  ],
  "approvals": [
    {{
      "therapyName": "Exact therapy name",
      "diseaseName": "Specific disease/condition",
      "region": "United States",
      "approvalDate": "2024-03-15T00:00:00.000Z",
      "approvalType": "Full Approval",
      "regulatoryBody": "FDA",
      "marketImpact": "Expected to expand addressable market by 40%",
      "sources": ["Page 8: Regulatory milestones"]
    }}
  ],
  "marketInsights": [
    {{
      "type": "market_opportunity",
      "therapyName": "Therapy name",
      "description": "Detailed description of market opportunity or insight",
      "impact": "high",
      "sources": ["Page 10: Market analysis"]
    }}
  ],
  "confidence": 85,
  "sourceReferences": [
    {{
      "page": 5,
      "section": "Market Analysis",
      "quote": "Exact quote from the document supporting the extraction"
    }}
  ]
}}

IMPORTANT NOTES:
- If no market-relevant information is found about any therapies, return empty arrays for therapies, approvals, and marketInsights
- This is normal and expected for some document sections
- Set confidence to 0 if no relevant information is extracted
- Focus on actionable market intelligence, not general corporate information
`);
  }

  async analyze(
    pdfText: string,
    documentInfo: DocumentInfo
  ): Promise<MarketAnalysisResult> {
    console.log(
      "📊 Market Analysis Agent: Starting therapy-specific market analysis..."
    );

    return await this.loggerHelper.timeAndLog(
      'analyze',
      async () => {
        // Log analysis start
        await this.loggerHelper.getLogger().logInput("MarketAnalysisAgent", {
          text: pdfText,
          context: documentInfo,
          parameters: { 
            textLength: pdfText.length,
            company: documentInfo.companyName,
            reportType: documentInfo.reportType,
            period: documentInfo.reportingPeriod
          },
        });

        try {
          // Prepare the prompt with document context
          const preparedText = this.prepareDocumentText(pdfText);
          const prompt = await this.loggerHelper.timeAndLog(
            'prepare_prompt',
            async () => {
              return await this.analysisPrompt.format({
                companyName: documentInfo.companyName || "Unknown Company",
                reportType: documentInfo.reportType || "Unknown",
                reportingPeriod: documentInfo.reportingPeriod || "Unknown",
                documentText: preparedText,
              });
            },
            { 
              originalTextLength: pdfText.length,
              preparedTextLength: preparedText.length 
            }
          );

          // Execute the analysis with LLM logging
          const response = await this.loggerHelper.logLLMCall(
            prompt,
            async () => this.llm.invoke(prompt),
            "gpt-4o-mini"
          );

          // Parse the results with logging
          const result = await this.loggerHelper.timeAndLog(
            'parse_results',
            async () => {
              const parsed = this.parseAnalysisResult(response.content as string);
              
              // Log successful parsing
              await this.loggerHelper.logSuccessfulParsing(
                response.content as string,
                parsed,
                "MarketAnalysisResultSchema"
              );
              
              return parsed;
            },
            { responseLength: (response.content as string).length }
          );

          // Post-process the results
          const processedResult = await this.loggerHelper.timeAndLog(
            'post_process',
            async () => this.postProcessResults(result, documentInfo),
            {
              therapyCount: result.therapies.length,
              approvalCount: result.approvals.length,
              insightCount: result.marketInsights.length
            }
          );

          console.log(
            `✅ Market Analysis Agent: Analysis completed - ${processedResult.therapies.length} therapies, ${processedResult.approvals.length} approvals, ${processedResult.marketInsights.length} insights`
          );

          const finalResult = {
            therapy: processedResult.therapies.map(t => ({
              name: t.name,
              manufacturer: t.manufacturer,
              mechanism: t.mechanism || "Not specified",
              pricePerTreatmentUsd: 0, // Market analysis doesn't extract pricing
              sources: t.sources,
            })),
            approvals: processedResult.approvals,
            confidence: {
              therapy: processedResult.confidence,
              approvals: processedResult.confidence,
            },
          };

          // Log final output
          await this.loggerHelper.getLogger().logOutput("MarketAnalysisAgent", {
            parsedResult: finalResult,
            confidence: finalResult.confidence,
          });

          return finalResult;

        } catch (error) {
          console.error("❌ Market Analysis Agent: Analysis failed:", error);
          console.log("Returning empty results due to error");
          
          // Log the error
          await this.loggerHelper.getLogger().logError(
            "MarketAnalysisAgent", 
            error as Error,
            {
              documentInfo,
              textLength: pdfText.length,
            }
          );
          
          const emptyResult = {
            therapy: [],
            approvals: [],
            confidence: {
              therapy: 0,
              approvals: 0,
            },
          };

          // Log empty result output
          await this.loggerHelper.getLogger().logOutput("MarketAnalysisAgent", {
            parsedResult: emptyResult,
            confidence: { therapy: 0, approvals: 0 },
            errors: [(error as Error).message],
          });

          return emptyResult;
        }
      },
      {
        documentInfo,
        inputLength: pdfText.length,
      }
    );
  }

  private prepareDocumentText(pdfText: string): string {
    // The text is already pre-filtered by the keyword extraction to contain therapy mentions
    // Limit to reasonable size for LLM processing
    const maxLength = 8000;
    return pdfText.length > maxLength
      ? pdfText.substring(0, maxLength) + "..."
      : pdfText;
  }

  private parseAnalysisResult(
    content: string
  ): z.infer<typeof MarketAnalysisResultSchema> {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log("No JSON found in market analysis response, returning empty results");
        
        // Log failed parsing
        this.loggerHelper.logFailedParsing(
          content,
          "No JSON found in response",
          {
            therapies: [],
            approvals: [],
            marketInsights: [],
            confidence: 0,
            sourceReferences: [],
          }
        );

        return {
          therapies: [],
          approvals: [],
          marketInsights: [],
          confidence: 0,
          sourceReferences: [],
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const validated = MarketAnalysisResultSchema.parse(parsed);
      
      // Log successful validation
      this.loggerHelper.getLogger().logValidation("MarketAnalysisAgent", {
        success: true,
        originalData: parsed,
        validatedData: validated,
      });

      return validated;
    } catch (error) {
      console.log("Failed to parse market analysis response, returning empty results:", error);
      
      const fallbackResult = {
        therapies: [],
        approvals: [],
        marketInsights: [],
        confidence: 0,
        sourceReferences: [],
      };

      // Log failed parsing
      this.loggerHelper.logFailedParsing(content, error, fallbackResult);

      return fallbackResult;
    }
  }

  private postProcessResults(
    result: z.infer<typeof MarketAnalysisResultSchema>,
    documentInfo: DocumentInfo
  ): z.infer<typeof MarketAnalysisResultSchema> {
    // Ensure manufacturer is set to the document company if missing
    const processedTherapies = result.therapies.map((therapy) => ({
      ...therapy,
      manufacturer:
        therapy.manufacturer || documentInfo.companyName || "Unknown",
    }));

    return {
      ...result,
      therapies: processedTherapies,
    };
  }
}