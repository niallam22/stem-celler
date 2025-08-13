import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { Document, therapy } from "@/lib/db/schema";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";

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

CLASSIFICATION REQUIREMENTS:
1. Company Name: Identify the company that published this report
2. Report Type: Determine if this is an "annual" or "quarterly" report
3. Reporting Period: Extract the specific period (e.g., "Q3 2024", "2024", "Q1 2023")

VALIDATION RULES:
- Company name must exist in our therapy database (verify against known manufacturers)
- Report type must be either "annual" or "quarterly"
- Reporting period should follow standard formats

Return your analysis in this JSON format:
{{
  "companyName": "Exact company name from document",
  "reportType": "annual" or "quarterly",
  "reportingPeriod": "Q3 2024" or "2024"
}}

If any field cannot be determined with confidence, omit it from the response.
Focus on accuracy over completeness.
`);
  }

  async classify(pdfText: string, document: Document): Promise<DocumentInfo> {
    console.log("🔍 Document Classifier: Starting classification process...");

    try {
      // Step 1: Extract metadata using LLM
      const prompt = await this.classificationPrompt.format({
        documentText: pdfText.substring(0, 2000),
      });

      const response = await this.llm.invoke(prompt);
      const rawResult = this.parseJsonResponse(response.content as string);
      
      // Step 2: Validate company name against therapy database
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
      // Check if company exists in our therapy database
      const existingTherapies = await db
        .select({ manufacturer: therapy.manufacturer })
        .from(therapy)
        .where(eq(therapy.manufacturer, companyName))
        .limit(1);

      if (existingTherapies.length > 0) {
        console.log(`✅ Company "${companyName}" validated against therapy database`);
        return companyName;
      }

      // Try fuzzy matching for common variations
      const allManufacturers = await db
        .selectDistinct({ manufacturer: therapy.manufacturer })
        .from(therapy);

      const fuzzyMatch = allManufacturers.find(m => 
        this.fuzzyMatch(companyName, m.manufacturer)
      );

      if (fuzzyMatch) {
        console.log(`✅ Company "${companyName}" matched to "${fuzzyMatch.manufacturer}" via fuzzy matching`);
        return fuzzyMatch.manufacturer;
      }

      console.log(`⚠️ Company "${companyName}" not found in therapy database - proceeding with extracted name`);
      return companyName;

    } catch (error) {
      console.error("Error validating company name:", error);
      return companyName; // Return original if validation fails
    }
  }

  private fuzzyMatch(str1: string, str2: string): boolean {
    // Simple fuzzy matching - check if one string contains the other (case insensitive)
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    return s1.includes(s2) || s2.includes(s1) || 
           this.levenshteinDistance(s1, s2) <= 2;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
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