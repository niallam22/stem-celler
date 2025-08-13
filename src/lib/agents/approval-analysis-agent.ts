import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { DocumentInfo } from "./document-classifier-agent";

// Schema for therapy data
const TherapySchema = z.object({
  name: z.string(),
  manufacturer: z.string(),
  mechanism: z.string(),
  pricePerTreatmentUsd: z.number(),
  sources: z.array(z.string()),
});

// Schema for approval data
const ApprovalSchema = z.object({
  therapyName: z.string(),
  diseaseName: z.string(),
  region: z.string(),
  approvalDate: z.string(),
  approvalType: z.string(),
  regulatoryBody: z.string(),
  sources: z.array(z.string()),
});

// Schema for source references
const SourceReferenceSchema = z.object({
  page: z.number(),
  section: z.string(),
  quote: z.string(),
});

const ApprovalAnalysisResultSchema = z.object({
  therapies: z.array(TherapySchema),
  approvals: z.array(ApprovalSchema),
  confidence: z.number().min(0).max(100),
  sourceReferences: z.array(SourceReferenceSchema),
});

export interface ApprovalAnalysisResult {
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
    revenue: number;
    approvals: number;
  };
}

export class ApprovalAnalysisAgent {
  private llm: ChatOpenAI;
  private analysisPrompt: PromptTemplate;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.1,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    this.analysisPrompt = PromptTemplate.fromTemplate(`
You are a Approval Analysis Agent specialized in extracting therapy and regulatory approval information from pharmaceutical company reports.

DOCUMENT CONTEXT:
- Company: {companyName}
- Report Type: {reportType}
- Period: {reportingPeriod}

DOCUMENT TEXT:
{documentText}

EXTRACTION TASKS:

1. THERAPY EXTRACTION:
   Extract information about therapies/drugs/treatments including:
   - Therapy/drug names (be specific, include brand names and generic names)
   - Manufacturer (usually the company publishing this report)
   - Mechanism of action (how the therapy works)
   - Price per treatment in USD (convert from other currencies if needed)
   - Source citations with page numbers

2. REGULATORY APPROVAL EXTRACTION:
   Extract regulatory approval information including:
   - Therapy/drug names
   - Diseases/conditions being treated
   - Geographic regions (US, EU, Japan, etc.)
   - Approval dates (be precise)
   - Approval types (Full Approval, Emergency Use, Breakthrough Therapy, etc.)
   - Regulatory bodies (FDA, EMA, PMDA, etc.)
   - Source citations with page numbers

QUALITY REQUIREMENTS:
- Be extremely precise with drug names and regulatory details
- Include specific page numbers and quotes for verification
- Confidence score should reflect your certainty about the extracted data
- If pricing is not explicitly stated, do not guess
- Focus on therapies from the reporting company, not competitors

OUTPUT FORMAT:
Return your analysis in this exact JSON structure:
{{
  "therapies": [
    {{
      "name": "Exact therapy name",
      "manufacturer": "Company name",
      "mechanism": "Detailed mechanism of action",
      "pricePerTreatmentUsd": 1000,
      "sources": ["Page 5: Product overview", "Page 12: Pricing section"]
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
      "sources": ["Page 8: Regulatory milestones"]
    }}
  ],
  "confidence": 85,
  "sourceReferences": [
    {{
      "page": 5,
      "section": "Product Overview",
      "quote": "Exact quote from the document supporting the extraction"
    }}
  ]
}}

CONFIDENCE SCORING:
- 90-100: Explicit statements with clear numbers and dates
- 70-89: Clear information but some interpretation required
- 50-69: Partial information or requires significant interpretation
- 0-49: Uncertain or speculative information
`);
  }

  async analyze(
    pdfText: string,
    documentInfo: DocumentInfo
  ): Promise<ApprovalAnalysisResult> {
    console.log(
      "🔬 Approval Analysis Agent: Starting therapy and approval analysis..."
    );

    try {
      // Prepare the prompt with document context
      const prompt = await this.analysisPrompt.format({
        companyName: documentInfo.companyName || "Unknown Company",
        reportType: documentInfo.reportType || "Unknown",
        reportingPeriod: documentInfo.reportingPeriod || "Unknown",
        documentText: this.prepareDocumentText(pdfText),
      });

      // Execute the analysis
      const response = await this.llm.invoke(prompt);
      const result = this.parseAnalysisResult(response.content as string);

      // Post-process the results
      const processedResult = this.postProcessResults(result, documentInfo);

      console.log(
        `✅ Approval Analysis Agent: Analysis completed - ${processedResult.therapies.length} therapies, ${processedResult.approvals.length} approvals`
      );

      return {
        therapy: processedResult.therapies,
        approvals: processedResult.approvals,
        confidence: {
          therapy: processedResult.confidence,
          revenue: 0, // Approval analysis doesn't handle revenue
          approvals: processedResult.confidence,
        },
      };
    } catch (error) {
      console.error("❌ Approval Analysis Agent: Analysis failed:", error);
      throw new Error(`Approval analysis failed: ${error}`);
    }
  }

  private prepareDocumentText(pdfText: string): string {
    // Focus on relevant sections for Approval analysis
    const relevantSections = this.extractRelevantSections(pdfText);

    // Limit to reasonable size for LLM processing
    const maxLength = 8000;
    return relevantSections.length > maxLength
      ? relevantSections.substring(0, maxLength) + "..."
      : relevantSections;
  }

  private extractRelevantSections(text: string): string {
    // Look for sections that typically contain therapy and approval information
    const sectionKeywords = [
      "product",
      "therapy",
      "drug",
      "treatment",
      "pipeline",
      "portfolio",
      "approval",
      "regulatory",
      "fda",
      "ema",
      "clinical",
      "trial",
      "revenue",
      "sales",
      "commercial",
      "launch",
      "market",
    ];

    const sentences = text.split(/[.!?]+/);
    const relevantSentences = sentences.filter((sentence) =>
      sectionKeywords.some((keyword) =>
        sentence.toLowerCase().includes(keyword)
      )
    );

    return relevantSentences.join(". ").trim();
  }

  private parseAnalysisResult(
    content: string
  ): z.infer<typeof ApprovalAnalysisResultSchema> {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in analysis response");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return ApprovalAnalysisResultSchema.parse(parsed);
    } catch (error) {
      console.error("Failed to parse Approval analysis response:", content);
      throw new Error(`Invalid analysis response: ${error}`);
    }
  }

  private postProcessResults(
    result: z.infer<typeof ApprovalAnalysisResultSchema>,
    documentInfo: DocumentInfo
  ): z.infer<typeof ApprovalAnalysisResultSchema> {
    // Ensure manufacturer is set to the document company if missing
    const processedTherapies = result.therapies.map((therapy) => ({
      ...therapy,
      manufacturer:
        therapy.manufacturer || documentInfo.companyName || "Unknown",
    }));

    // Validate approval dates are in correct format
    const processedApprovals = result.approvals.map((approval) => ({
      ...approval,
      approvalDate: approval.approvalDate, // Keep as string to match schema
    }));

    return {
      ...result,
      therapies: processedTherapies,
      approvals: processedApprovals,
    };
  }
}
