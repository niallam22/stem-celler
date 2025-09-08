import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { Document, therapy } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

const DocumentInfoSchema = z.object({
  companyName: z.string().optional(),
  reportType: z.enum(["annual", "quarterly"]).optional(),
  reportingPeriod: z.string().optional(),
});

export interface DocumentInfo {
  companyName?: string;
  reportType?: "annual" | "quarterly";
  reportingPeriod?: string;
}

export class DocumentClassifierAgent {
  private llm: ChatOpenAI;
  private classificationPrompt: PromptTemplate;

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.1,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    this.classificationPrompt = PromptTemplate.fromTemplate(`
You are a document classification agent specialized in analyzing financial reports from pharmaceutical and biotech companies.

Your task is to extract key metadata from the document text below:

DOCUMENT TEXT (first 2000 characters):
{documentText}

REGISTERED COMPANIES IN DATABASE (includes both manufacturers and parent companies):
{manufacturerList}

CLASSIFICATION REQUIREMENTS:
1. Company Name: Identify the company that published this report
   - You MUST ONLY output one of the EXACT registered company names from the list above
   - IMPORTANT: Some therapies are manufactured by subsidiaries but owned by parent companies
   - When a parent company exists, prefer mapping to the parent company name
   - If the company name cannot be mapped to any registered company, output "Not Registered"
   - DO NOT output any company name that is not in the registered list
2. Report Type: Determine if this is an "annual" or "quarterly" report
3. Reporting Period: Extract the specific period (e.g., "Q3 2024", "2024", "Q1 2023")

IMPORTANT: For company name mapping (prioritize parent companies when they exist):
- "Bristol Myers Squibb", "BMS", "Bristol-Myers Squibb" → "Bristol Myers Squibb"
- "Gilead Sciences", "Gilead", "Kite Pharma" → "Gilead" (Kite is a subsidiary of Gilead)
- "Fosun Kite", "Fosun Kairos" → "Gilead" (joint venture with Gilead as parent)
- "JW Therapeutics", "JW (Cayman) Therapeutics Co. Ltd.", "JW Cayman" → "JW Therapeutics"
- "Novartis AG", "Novartis" → "Novartis"
- "IASO Bio", "IASO Biotherapeutics" → "IASO Bio"
- "Janssen", "Janssen Pharmaceuticals", "J&J", "Johnson & Johnson" → If "Johnson & Johnson" is in list, use that as parent, else "Janssen"
- "Autolus", "Autolus Therapeutics" → "Autolus"
- ONLY output the exact name from the registered list or "Not Registered"

Return your analysis in this JSON format:
{{
  "companyName": "Exact registered name from the list OR 'Not Registered'",
  "reportType": "annual" or "quarterly",
  "reportingPeriod": "Q3 2024" or "2024"
}}

If any field cannot be determined with confidence, omit it from the response.
Focus on accuracy over completeness.
`);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async classify(pdfText: string, _document: Document): Promise<DocumentInfo> {
    console.log("🔍 Document Classifier: Starting classification process...");

    try {
      // Step 1: Fetch all distinct manufacturers and parent companies from the database
      const therapyCompanies = await db
        .select({ 
          manufacturer: therapy.manufacturer,
          parentCompany: therapy.parentCompany 
        })
        .from(therapy);
      
      // Create a unique set of companies (both manufacturers and parent companies)
      const companySet = new Set<string>();
      therapyCompanies.forEach(t => {
        if (t.manufacturer) companySet.add(t.manufacturer);
        if (t.parentCompany) companySet.add(t.parentCompany);
      });
      
      const companyList = Array.from(companySet).sort().join(", ");
      
      console.log("📋 Document Classifier: Registered companies (manufacturers & parent companies):", companyList);

      // Step 2: Extract metadata using LLM with company list
      const prompt = await this.classificationPrompt.format({
        documentText: pdfText.substring(0, 2000),
        manufacturerList: companyList || "No companies registered",
      });

      const response = await this.llm.invoke(prompt);
      const rawResult = this.parseJsonResponse(response.content as string);
      
      // Step 3: Validate company name against therapy database
      const validatedCompany = await this.validateCompanyName(rawResult.companyName);
      
      const result: DocumentInfo = {
        companyName: validatedCompany,
        reportType: rawResult.reportType,
        reportingPeriod: rawResult.reportingPeriod,
      };

      console.log("✅ Document Classifier: Classification results:", result);
      return result;

    } catch (error) {
      console.error("❌ Document Classifier: Classification failed:", error);
      throw new Error(`Document classification failed: ${error}`);
    }
  }

  private parseJsonResponse(content: string): z.infer<typeof DocumentInfoSchema> {
    try {
      // Clean up the response to extract JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return DocumentInfoSchema.parse(parsed);
    } catch (error) {
      console.error("Failed to parse LLM response:", content);
      throw new Error(`Invalid JSON response: ${error}`);
    }
  }

  private async validateCompanyName(companyName?: string): Promise<string | undefined> {
    if (!companyName) return undefined;

    try {
      // Check if company exists as either manufacturer or parent company in our therapy database
      const existingTherapies = await db
        .select({ 
          manufacturer: therapy.manufacturer,
          parentCompany: therapy.parentCompany 
        })
        .from(therapy)
        .where(
          sql`${therapy.manufacturer} = ${companyName} OR ${therapy.parentCompany} = ${companyName}`
        )
        .limit(1);

      if (existingTherapies.length > 0) {
        console.log(`✅ Company "${companyName}" validated against therapy database`);
        return companyName;
      }

      console.log(`⚠️ Company "${companyName}" not found in therapy database - proceeding with extracted name`);
      return companyName;

    } catch (error) {
      console.error("Error validating company name:", error);
      return companyName; // Return original if validation fails
    }
  }

  private parseDate(dateString: string): Date | undefined {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date format: ${dateString}`);
        return undefined;
      }
      return date;
    } catch (error) {
      console.warn(`Failed to parse date: ${dateString}`);
      return undefined;
    }
  }
}