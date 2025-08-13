import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

// Schema for document sections
const SectionSchema = z.object({
  title: z.string(),
  pageStart: z.number(),
  pageEnd: z.number(),
  type: z.enum([
    "financial",
    "clinical",
    "regulatory",
    "pipeline",
    "business",
    "other",
  ]),
  confidence: z.number().min(0).max(100),
});

const DocumentStructureSchema = z.object({
  hasExplicitStructure: z.boolean(),
  documentLength: z.enum(["short", "medium", "long"]),
  sections: z.array(SectionSchema),
  tableOfContents: z
    .array(
      z.object({
        title: z.string(),
        page: z.number(),
      })
    )
    .optional(),
});

export type DocumentStructure = z.infer<typeof DocumentStructureSchema>;
export type Section = z.infer<typeof SectionSchema>;

interface TextSection {
  text: string;
  pageNumbers: number[];
  sectionTitle?: string;
}

export class DocumentStructureAnalyzer {
  private llm: ChatOpenAI;
  private structurePrompt: PromptTemplate;
  private tocPrompt: PromptTemplate;

  constructor() {
    // Create a single LLM instance with increased max listeners
    this.llm = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.1,
      openAIApiKey: process.env.OPENAI_API_KEY,
      maxRetries: 2,
    });

    // Increase max listeners to handle parallel requests
    const client = (this.llm as any).client;
    if (client && typeof client.setMaxListeners === "function") {
      client.setMaxListeners(50);
      console.log("🔧 Set max listeners to 50 for parallel processing");
    }

    this.tocPrompt = PromptTemplate.fromTemplate(`
Analyze the beginning of this document and look for a Table of Contents or similar structure.
Look for patterns like:
- "Table of Contents" header
- Section titles followed by page numbers
- Dot leaders (....) connecting titles to page numbers
- Numbered sections with page references

Document text:
{documentText}

If you find a table of contents, return it as a JSON array with ALL sections found:
[
  {{"title": "Section Title", "page": 1}},
  ...
]

Be thorough - include all sections you find, not just major headings.
If no table of contents is found, return an empty array: []
`);

    this.structurePrompt = PromptTemplate.fromTemplate(`
Analyze this {documentType} document and identify its logical sections.

Document length: {pageCount} pages
Full text available: {fullTextAvailable}

Identify sections that fall into these categories:
- Financial: Revenue, earnings, costs, financial statements, financial results
- Clinical: Trial results, efficacy data, safety data, patient outcomes
- Regulatory: FDA/EMA approvals, regulatory milestones, compliance
- Pipeline: Drug development pipeline, R&D, future products, ongoing trials
- Business: Market analysis, partnerships, licensing, competitive landscape, strategy
- Other: Any sections that don't fit above categories

{additionalInstructions}

Document text:
{documentText}

Return a JSON object with this structure:
{{
  "hasExplicitStructure": true/false,
  "documentLength": "{documentLength}",
  "sections": [
    {{
      "title": "Section name as it appears in document",
      "pageStart": 1,
      "pageEnd": 5,
      "type": "financial|clinical|regulatory|pipeline|business|other",
      "confidence": 85
    }}
  ]
}}

Be specific about page ranges and ensure no gaps between sections.
`);
  }

  async analyze(
    pdfText: string,
    pageTexts: Map<number, string>
  ): Promise<DocumentStructure> {
    const pageCount = pageTexts.size;
    const documentLength = this.classifyLength(pageCount);

    console.log(
      `📊 Document Structure Analyzer: Analyzing ${pageCount} page document (${documentLength})`
    );

    // Step 1: Look for explicit structure (TOC, clear headers)
    const explicitStructure = await this.findExplicitStructure(pdfText);

    if (explicitStructure.found && explicitStructure.sections.length > 0) {
      console.log(
        `✅ Found explicit structure with ${explicitStructure.sections.length} sections`
      );
      return {
        hasExplicitStructure: true,
        documentLength,
        sections: explicitStructure.sections,
        tableOfContents: explicitStructure.toc,
      };
    }

    // Step 2: Fallback - AI-driven structure analysis
    console.log(`🔍 No explicit structure found, using AI inference...`);
    return await this.inferStructure(pdfText, pageTexts, documentLength);
  }

  private classifyLength(pageCount: number): "short" | "medium" | "long" {
    if (pageCount <= 15) return "short";
    if (pageCount <= 50) return "medium";
    return "long";
  }

  private async findExplicitStructure(pdfText: string): Promise<{
    found: boolean;
    sections: Section[];
    toc?: Array<{ title: string; page: number }>;
  }> {
    try {
      // Look for table of contents in first 10000 characters (more comprehensive)
      // Also check common TOC keywords
      const tocSearchLength = Math.min(10000, pdfText.length);
      const textToSearch = pdfText.substring(0, tocSearchLength);

      // Quick check for TOC indicators
      const hasTocIndicators =
        textToSearch.toLowerCase().includes("table of contents") ||
        textToSearch.toLowerCase().includes("contents") ||
        textToSearch.match(/\d+\.{2,}/); // Look for page number patterns like "...."

      if (!hasTocIndicators) {
        console.log("📚 No TOC indicators found in document start");
        return { found: false, sections: [] };
      }

      const tocPrompt = await this.tocPrompt.format({
        documentText: textToSearch,
      });

      const tocResponse = await this.llm.invoke(tocPrompt);
      const tocContent = tocResponse.content as string;

      // Parse TOC response
      const tocMatch = tocContent.match(/\[[\s\S]*\]/);
      if (!tocMatch) {
        return { found: false, sections: [] };
      }

      const toc = JSON.parse(tocMatch[0]) as Array<{
        title: string;
        page: number;
      }>;

      if (toc.length === 0) {
        return { found: false, sections: [] };
      }

      // Convert TOC to sections with type inference
      const sections = await this.tocToSections(toc, pdfText);

      return {
        found: true,
        sections,
        toc,
      };
    } catch (error) {
      console.error("Error finding explicit structure:", error);
      return { found: false, sections: [] };
    }
  }

  private async tocToSections(
    toc: Array<{ title: string; page: number }>,
    pdfText: string
  ): Promise<Section[]> {
    const sections: Section[] = [];

    for (let i = 0; i < toc.length; i++) {
      const current = toc[i];
      const next = toc[i + 1];

      const section: Section = {
        title: current.title,
        pageStart: current.page,
        pageEnd: next ? next.page - 1 : -1, // -1 means end of document
        type: this.inferSectionType(current.title),
        confidence: 90, // High confidence for TOC-based sections
      };

      sections.push(section);
    }

    return sections;
  }

  private inferSectionType(title: string): Section["type"] {
    const lowerTitle = title.toLowerCase();

    // Financial keywords
    if (
      lowerTitle.match(
        /financial|revenue|earnings|income|cash flow|balance sheet|profit|loss/
      )
    ) {
      return "financial";
    }

    // Clinical keywords
    if (
      lowerTitle.match(
        /clinical|trial|patient|efficacy|safety|adverse|endpoint|study/
      )
    ) {
      return "clinical";
    }

    // Regulatory keywords
    if (lowerTitle.match(/regulatory|fda|ema|approval|compliance|filing/)) {
      return "regulatory";
    }

    // Pipeline keywords
    if (
      lowerTitle.match(
        /pipeline|development|r&d|research|candidate|phase|discovery/
      )
    ) {
      return "pipeline";
    }

    // Business keywords
    if (
      lowerTitle.match(
        /business|market|competition|strategy|partnership|licensing|commercial/
      )
    ) {
      return "business";
    }

    return "other";
  }

  private async inferStructure(
    pdfText: string,
    pageTexts: Map<number, string>,
    length: "short" | "medium" | "long"
  ): Promise<DocumentStructure> {
    console.log(
      `🔍 Inferring structure for ${length} document with ${pageTexts.size} pages...`
    );
    if (length === "short") {
      // For short documents, analyze entire document in one go
      return await this.inferStructureComplete(pdfText, pageTexts, length);
    } else {
      // For longer documents, use sliding window approach
      return await this.inferStructureWindowed(pageTexts, length);
    }
  }

  private async inferStructureComplete(
    pdfText: string,
    pageTexts: Map<number, string>,
    documentLength: "short" | "medium" | "long"
  ): Promise<DocumentStructure> {
    try {
      const prompt = await this.structurePrompt.format({
        documentType: "pharmaceutical/biotech financial",
        pageCount: pageTexts.size,
        fullTextAvailable: "yes",
        documentLength,
        additionalInstructions:
          "Since this is a short document, analyze the complete text and identify all sections precisely.",
        documentText: pdfText,
      });

      const response = await this.llm.invoke(prompt);
      const content = response.content as string;

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON structure found in response");
      }

      const structure = JSON.parse(jsonMatch[0]);
      const validated = DocumentStructureSchema.parse(structure);

      return validated;
    } catch (error) {
      console.error("Error inferring document structure:", error);

      // Return a basic structure as fallback
      return {
        hasExplicitStructure: false,
        documentLength,
        sections: [
          {
            title: "Complete Document",
            pageStart: 1,
            pageEnd: pageTexts.size,
            type: "other",
            confidence: 50,
          },
        ],
      };
    }
  }

  private async inferStructureWindowed(
    pageTexts: Map<number, string>,
    documentLength: "short" | "medium" | "long"
  ): Promise<DocumentStructure> {
    const windowSize = 20;
    const overlap = 2;
    const sections: Section[] = [];
    const processedRanges = new Set<string>();

    // Prepare all windows
    const windowParams: Array<{ text: string; start: number; end: number }> =
      [];

    for (
      let startPage = 1;
      startPage <= pageTexts.size;
      startPage += windowSize - overlap
    ) {
      const endPage = Math.min(startPage + windowSize - 1, pageTexts.size);
      const rangeKey = `${startPage}-${endPage}`;

      if (processedRanges.has(rangeKey)) continue;
      processedRanges.add(rangeKey);

      const windowText = this.extractWindow(pageTexts, startPage, endPage);
      windowParams.push({ text: windowText, start: startPage, end: endPage });
    }

    console.log(
      `📑 Preparing to analyze ${windowParams.length} windows of ${windowSize} pages each...`
    );
    console.log(
      `  Window ranges: ${windowParams
        .map((w) => `${w.start}-${w.end}`)
        .join(", ")}`
    );

    // Track timing
    const startTime = Date.now();
    let completedCount = 0;

    // Process all windows in parallel with detailed logging
    const allPromises = windowParams.map((w, index) => {
      console.log(
        `  🚀 [${new Date().toISOString()}] Starting window ${index + 1}/${
          windowParams.length
        }: pages ${w.start}-${w.end}`
      );

      return this.analyzeWindow(w.text, w.start, w.end)
        .then((result) => {
          completedCount++;
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(
            `  ✅ [${new Date().toISOString()}] Completed window ${index + 1}/${
              windowParams.length
            } (${completedCount}/${
              windowParams.length
            } done, ${elapsed}s elapsed)`
          );

          // Log first two sections of response if any
          if (result && result.length > 0) {
            const preview = JSON.stringify(result[0]).substring(0, 200);
            console.log(`     Preview: ${preview}...`);
          }

          return result;
        })
        .catch((error) => {
          completedCount++;
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(
            `  ❌ [${new Date().toISOString()}] Failed window ${index + 1}/${
              windowParams.length
            } (${completedCount}/${
              windowParams.length
            } done, ${elapsed}s elapsed)`
          );
          console.error(`     Error: ${error.message}`);
          return [];
        });
    });

    console.log(
      `⏳ Waiting for all ${windowParams.length} parallel requests to complete...`
    );
    const allResults = await Promise.all(allPromises);
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ All windows completed in ${totalTime} seconds`);

    allResults.forEach((result) => sections.push(...result));

    // Merge overlapping sections
    const mergedSections = this.mergeOverlappingSections(sections);

    return {
      hasExplicitStructure: false,
      documentLength,
      sections: mergedSections,
    };
  }

  private extractWindow(
    pageTexts: Map<number, string>,
    startPage: number,
    endPage: number
  ): string {
    const windowTexts: string[] = [];

    for (let page = startPage; page <= endPage; page++) {
      const pageText = pageTexts.get(page);
      if (pageText) {
        windowTexts.push(`[Page ${page}]\n${pageText}`);
      }
    }

    return windowTexts.join("\n\n");
  }

  private async analyzeWindow(
    windowText: string,
    startPage: number,
    endPage: number
  ): Promise<Section[]> {
    const windowStart = Date.now();
    try {
      const prompt = await this.structurePrompt.format({
        documentType: "pharmaceutical/biotech financial",
        pageCount: endPage - startPage + 1,
        fullTextAvailable: "partial",
        documentLength: "window",
        additionalInstructions: `This is pages ${startPage} to ${endPage} of a larger document. Identify sections within this range.`,
        documentText: windowText,
      });

      console.log(
        `    📤 [${new Date().toISOString()}] Sending ${
          windowText.length
        } chars for pages ${startPage}-${endPage}`
      );
      const response = await this.llm.invoke(prompt);
      const responseTime = ((Date.now() - windowStart) / 1000).toFixed(1);
      console.log(
        `    📥 [${new Date().toISOString()}] Received response for pages ${startPage}-${endPage} in ${responseTime}s`
      );

      const content = response.content as string;
      // Log first 200 chars of response
      console.log(
        `    Response preview: ${content
          .substring(0, 200)
          .replace(/\n/g, " ")}...`
      );

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return [];
      }

      const structure = JSON.parse(jsonMatch[0]);
      const sections = structure.sections || [];
      console.log(
        `    Found ${sections.length} sections in pages ${startPage}-${endPage}`
      );
      return sections;
    } catch (error) {
      const errorTime = ((Date.now() - windowStart) / 1000).toFixed(1);
      console.error(
        `    ❌ Error analyzing window ${startPage}-${endPage} after ${errorTime}s:`,
        error.message
      );
      return [];
    }
  }

  private mergeOverlappingSections(sections: Section[]): Section[] {
    if (sections.length === 0) return [];

    // Sort sections by start page
    const sorted = sections.sort((a, b) => a.pageStart - b.pageStart);
    const merged: Section[] = [];
    let current = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];

      // Check if sections overlap or are adjacent
      if (current.pageEnd >= next.pageStart - 1 && current.type === next.type) {
        // Merge sections
        current = {
          title: `${current.title} / ${next.title}`,
          pageStart: current.pageStart,
          pageEnd: Math.max(current.pageEnd, next.pageEnd),
          type: current.type,
          confidence: Math.min(current.confidence, next.confidence),
        };
      } else {
        // No overlap, add current and move to next
        merged.push(current);
        current = next;
      }
    }

    merged.push(current);
    return merged;
  }

  /**
   * Extract sections based on the identified structure
   */
  extractSections(
    structure: DocumentStructure,
    pageTexts: Map<number, string>
  ): Map<Section["type"], TextSection[]> {
    const sectionsByType = new Map<Section["type"], TextSection[]>();

    structure.sections.forEach((section) => {
      const textSection: TextSection = {
        text: "",
        pageNumbers: [],
        sectionTitle: section.title,
      };

      // Extract text for this section
      for (
        let page = section.pageStart;
        page <= (section.pageEnd === -1 ? pageTexts.size : section.pageEnd);
        page++
      ) {
        const pageText = pageTexts.get(page);
        if (pageText) {
          textSection.text += `\n[Page ${page}]\n${pageText}\n`;
          textSection.pageNumbers.push(page);
        }
      }

      // Add to appropriate type bucket
      const existing = sectionsByType.get(section.type) || [];
      existing.push(textSection);
      sectionsByType.set(section.type, existing);
    });

    return sectionsByType;
  }
}
