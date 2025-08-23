import { db } from "@/lib/db";
import { Document, therapy } from "@/lib/db/schema";
import { Send, StateGraph, Annotation } from "@langchain/langgraph";
import { eq } from "drizzle-orm";
import { PDFPageExtractor } from "../utils/pdf-page-extractor";

// Token usage type for proper typing
interface TokenUsage {
  classification: number;
  extraction: number;
  total: number;
}
import { AgentLogger } from "./agent-logger";
import { DocumentClassifierAgent } from "./document-classifier-agent";
import { RevenueVerifierAgent } from "./revenue-verifier-agent";
import {
  EnhancedExtractionState,
  ExtractedData,
  ExtractionResults,
  TextSection,
} from "./enhanced-orchestrator-types";
import { ResultsReconciler } from "./results-reconciler";
import { RevenueAgent } from "./revenue-agent";

// Define state using modern Annotation.Root approach for concurrent updates
const EnhancedExtractionStateAnnotation = Annotation.Root({
  // Initial inputs
  document: Annotation<Document>(),
  pdfText: Annotation<string>(),
  pdfMetadata: Annotation<{
    totalPages: number;
    pageTexts: Map<number, string>;
  }>(),
  
  // Analysis outputs (optional until populated)
  documentInfo: Annotation<{
    companyName?: string;
    reportType?: "annual" | "quarterly";
    reportingPeriod?: string;
  } | undefined>(),
  therapyList: Annotation<Array<{
    id: string;
    name: string;
    manufacturer: string;
  }> | undefined>(),
  
  // Revenue extraction results (optional until populated)
  revenueResults: Annotation<ExtractionResults[] | undefined>(),
  
  // Final reconciled result (optional until populated)
  finalResult: Annotation<ExtractedData | undefined>(),
  
  // Error handling (optional)
  error: Annotation<string | undefined>(),
  
  // Token usage with reducer for concurrent updates
  tokensUsed: Annotation<TokenUsage>({
    reducer: (existing: TokenUsage | undefined, update: TokenUsage | undefined): TokenUsage => {
      if (!existing) return update || { classification: 0, extraction: 0, total: 0 };
      if (!update) return existing;
      
      // Merge token counts: take max for one-time costs, add for cumulative costs
      const mergedTokens = {
        classification: Math.max(existing.classification || 0, update.classification || 0),
        extraction: (existing.extraction || 0) + (update.extraction || 0),
        total: 0 // Will be calculated below
      };
      
      // Calculate total from merged components
      mergedTokens.total = mergedTokens.classification + mergedTokens.extraction;
      
      return mergedTokens;
    },
    default: () => ({ classification: 0, extraction: 0, total: 0 })
  })
});

// Infer the state type from the annotation
type EnhancedExtractionStateType = typeof EnhancedExtractionStateAnnotation.State;

export class EnhancedOrchestratorAgent {
  private pdfExtractor: PDFPageExtractor;
  private documentClassifier: DocumentClassifierAgent;
  private revenueAgent: RevenueAgent;
  private revenueVerifier: RevenueVerifierAgent;
  private reconciler: ResultsReconciler;
  private logger: AgentLogger;

  constructor() {
    this.pdfExtractor = new PDFPageExtractor();
    this.documentClassifier = new DocumentClassifierAgent();
    this.revenueAgent = new RevenueAgent();
    this.revenueVerifier = new RevenueVerifierAgent();
    this.reconciler = new ResultsReconciler();
    this.logger = AgentLogger.getInstance();
  }

  async processDocument(
    document: Document,
    pdfBuffer: Buffer
  ): Promise<ExtractedData | null> {
    console.log(
      `🚀 Enhanced Orchestrator: Starting revenue extraction for ${document.fileName}`
    );

    // Start logging session
    const sessionId = this.logger.startSession(document.fileName, {
      company: document.companyName || undefined,
      reportType: document.reportType || undefined,  
      period: document.reportingPeriod || undefined,
    });

    try {
      const graph = this.createProcessingGraph();

      // Extract page-level information
      const pdfMetadata = await this.pdfExtractor.extractFromBuffer(pdfBuffer, {
        extractPageText: true,
        splitPages: true,
      });

      // Log initial document metadata
      await this.logger.logMetadata("EnhancedOrchestratorAgent", {
        operation: "document_processing_start",
        documentId: document.id,
        fileName: document.fileName,
        companyName: document.companyName,
        reportType: document.reportType,
        reportingPeriod: document.reportingPeriod,
        totalPages: pdfMetadata.totalPages,
        textLength: pdfMetadata.fullText.length,
        sessionId,
      });

      const initialState: EnhancedExtractionStateType = {
        document,
        pdfText: pdfMetadata.fullText,
        pdfMetadata: {
          totalPages: pdfMetadata.totalPages || 0,
          pageTexts: pdfMetadata.pageTexts || new Map(),
        },
        tokensUsed: {
          classification: 0,
          extraction: 0,
          total: 0,
        },
      };

      const result = await graph.invoke(initialState);

      // Log final processing results
      await this.logger.logMetadata("EnhancedOrchestratorAgent", {
        operation: "document_processing_complete",
        sessionId,
        hasResult: !!result.finalResult,
        revenueCount: result.finalResult?.revenue?.length || 0,
        totalTokensUsed: result.tokensUsed?.total || 0,
        confidence: result.finalResult?.confidence,
      });

      return result.finalResult || {
        revenue: [],
        confidence: 0,
        sources: []
      };

    } catch (error) {
      console.error("❌ Enhanced Orchestrator: Processing failed", error);
      
      // Log processing failure
      await this.logger.logError("EnhancedOrchestratorAgent", error as Error, {
        sessionId,
        documentId: document.id,
        fileName: document.fileName,
        operation: "document_processing",
      });

      throw error;
    } finally {
      // Always end the logging session
      this.logger.endSession();
    }
  }

  private createProcessingGraph() {
    const graph = new StateGraph(EnhancedExtractionStateAnnotation);

    // Node definitions - simplified workflow
    graph.addNode("classify_document", this.classifyDocument.bind(this));
    graph.addNode("lookup_therapies", this.lookupTherapies.bind(this));
    graph.addNode("extract_revenue", this.extractRevenue.bind(this));
    graph.addNode("finalize_results", this.finalizeResults.bind(this));

    // Edge definitions - linear workflow
    graph.addEdge("__start__", "classify_document");
    graph.addEdge("classify_document", "lookup_therapies");
    graph.addEdge("lookup_therapies", "extract_revenue");
    graph.addEdge("extract_revenue", "finalize_results");

    return graph.compile();
  }

  private async classifyDocument(
    state: EnhancedExtractionStateType
  ): Promise<Partial<EnhancedExtractionStateType>> {
    console.log("📋 Phase 1: Classifying document...");

    // Extract first few pages for classification
    const firstPages = Array.from(state.pdfMetadata!.pageTexts.entries())
      .slice(0, 3)
      .map(([, text]) => text)
      .join("\n");

    const classification = await this.documentClassifier.classify(firstPages);

    return {
      documentInfo: {
        companyName: classification.companyName,
        reportType: classification.reportType as
          | "annual"
          | "quarterly"
          | undefined,
        reportingPeriod: classification.reportingPeriod,
      },
      tokensUsed: {
        ...state.tokensUsed!,
        classification: 500, // Estimate
        total: state.tokensUsed!.total + 500,
      },
    };
  }

  private async lookupTherapies(
    state: EnhancedExtractionStateType
  ): Promise<Partial<EnhancedExtractionStateType>> {
    console.log(
      `🔍 Phase 2: Looking up therapies for ${state.documentInfo?.companyName}...`
    );

    if (!state.documentInfo?.companyName) {
      console.warn("No company name found, skipping therapy lookup");
      return { therapyList: [] };
    }

    const therapies = await db
      .select({
        id: therapy.id,
        name: therapy.name,
        manufacturer: therapy.manufacturer,
      })
      .from(therapy)
      .where(eq(therapy.manufacturer, state.documentInfo.companyName));

    console.log(`Found ${therapies.length} known therapies`);

    // If no therapies found, terminate processing with error
    if (therapies.length === 0) {
      const errorMessage = `No registered therapies found for company: ${state.documentInfo.companyName}. Please register therapies for this company before processing documents.`;
      console.error(`❌ ${errorMessage}`);
      throw new Error(errorMessage);
    }

    return { therapyList: therapies };
  }

  private async extractRevenue(
    state: EnhancedExtractionStateType
  ): Promise<Partial<EnhancedExtractionStateType>> {
    console.log("💰 Phase 3: Extracting revenue data...");

    if (!state.therapyList || state.therapyList.length === 0) {
      console.warn("No therapies found, skipping revenue extraction");
      return {
        revenueResults: {
          revenue: [],
          confidence: 0,
        },
      };
    }

    const allSnippetResults: Array<{
      revenue: ExtractionResults['revenue'];
      confidence: number;
      snippetIndex: number;
    }> = [];
    let totalConfidence = 0;
    let processedTherapies = 0;

    // Process each therapy for revenue extraction
    for (const therapy of state.therapyList) {
      console.log(`💰 Processing revenue for ${therapy.name}...`);

      // Extract therapy-relevant pages
      const therapySnippets = this.extractTherapyPages(
        state.pdfMetadata!.pageTexts,
        therapy.name
      );

      if (therapySnippets.length === 0) {
        console.log(`⚠️ No text snippets found for ${therapy.name}`);
        continue;
      }

      // Verify sections contain revenue data
      const verifiedSnippets: TextSection[] = [];
      for (const snippet of therapySnippets) {
        const verification = await this.revenueVerifier.verify(
          snippet.text,
          therapy.name
        );

        if (verification.containsRevenueData && verification.confidence >= 50) {
          verifiedSnippets.push(snippet);
        }
      }

      console.log(
        `✅ ${verifiedSnippets.length} of ${therapySnippets.length} snippets verified for ${therapy.name}`
      );

      // Process verified snippets with revenue agent in parallel
      if (verifiedSnippets.length > 0) {
        console.log(`💰 Processing ${verifiedSnippets.length} snippets in parallel for ${therapy.name}...`);
        
        // Process each snippet independently in parallel
        const snippetResults = await Promise.all(
          verifiedSnippets.map(async (snippet, index) => {
            console.log(`💰 Processing snippet ${index + 1}/${verifiedSnippets.length} for ${therapy.name}...`);
            
            const results = await this.revenueAgent.analyze(
              snippet.text,
              state.documentInfo!,
              therapy.name
            );
            
            console.log(`💰 Snippet ${index + 1} extracted ${results.revenue?.length || 0} revenue records with ${results.confidence}% confidence`);
            
            return {
              revenue: results.revenue || [],
              confidence: results.confidence,
              snippetIndex: index + 1,
            };
          })
        );

        // Store individual snippet results for overlap detection later
        const validResults = snippetResults.filter(result => result.revenue.length > 0);
        
        if (validResults.length > 0) {
          // Store separate results for each snippet to enable overlap detection
          validResults.forEach(result => {
            allSnippetResults.push({
              revenue: result.revenue,
              confidence: result.confidence,
              snippetIndex: result.snippetIndex,
            });
            console.log(`💰 Stored ${result.revenue.length} records from snippet ${result.snippetIndex} (${result.confidence}% confidence)`);
          });
          
          // Calculate average confidence from valid results
          const snippetConfidence = validResults.reduce((sum, result) => sum + result.confidence, 0) / validResults.length;
          totalConfidence += snippetConfidence;
          processedTherapies++;
          
          const totalRecords = validResults.reduce((sum, result) => sum + result.revenue.length, 0);
          console.log(`💰 Collected ${validResults.length} snippets: ${totalRecords} total records, ${snippetConfidence.toFixed(1)}% avg confidence`);
        } else {
          console.log(`⚠️ No revenue records extracted from any snippet for ${therapy.name}`);
        }
      }
    }

    const averageConfidence =
      processedTherapies > 0 ? totalConfidence / processedTherapies : 0;

    const totalRecords = allSnippetResults.reduce((sum, result) => sum + result.revenue.length, 0);
    console.log(
      `💰 Revenue extraction complete: ${totalRecords} records from ${allSnippetResults.length} snippets, ${averageConfidence.toFixed(1)}% confidence`
    );

    // Convert snippet results to ExtractionResults array for overlap detection
    const extractionResultsArray: ExtractionResults[] = allSnippetResults.map(snippetResult => ({
      revenue: snippetResult.revenue,
      confidence: snippetResult.confidence,
    }));

    console.log(`💰 Created ${extractionResultsArray.length} extraction result sets for overlap detection`);

    return {
      revenueResults: extractionResultsArray,
      tokensUsed: {
        ...state.tokensUsed!,
        extraction: state.tokensUsed!.extraction + 3000 * state.therapyList.length,
        total: state.tokensUsed!.total + 3000 * state.therapyList.length,
      },
    };
  }

  private async finalizeResults(
    state: EnhancedExtractionStateType
  ): Promise<Partial<EnhancedExtractionStateType>> {
    console.log("🔗 Phase 4: Finalizing results...");

    if (!state.revenueResults || state.revenueResults.length === 0) {
      throw new Error("No revenue results to finalize");
    }

    // Use reconciler to handle overlap detection and merging
    const finalResult = await this.reconciler.reconcile(state.revenueResults);

    console.log(
      `✅ Final results: ${finalResult.revenue.length} revenue records, ${finalResult.confidence}% confidence`
    );
    console.log(`📊 Total tokens used: ${state.tokensUsed!.total}`);

    return { finalResult };
  }

  // Helper method to extract therapy-relevant pages
  private extractTherapyPages(pageTexts: Map<number, string>, therapyName: string): TextSection[] {
    const snippets: TextSection[] = [];
    const therapyLower = therapyName.toLowerCase();

    // Iterate through all pages to find therapy mentions
    for (const [pageNumber, pageText] of pageTexts.entries()) {
      const pageTextLower = pageText.toLowerCase();

      // Check if this page mentions the therapy
      if (pageTextLower.includes(therapyLower)) {
        snippets.push({
          text: pageText,
          pageNumbers: [pageNumber],
          searchTerm: therapyName,
        });
      }
    }

    console.log(
      `💰 Extracted ${snippets.length} pages containing ${therapyName}`
    );

    return snippets;
  }
}