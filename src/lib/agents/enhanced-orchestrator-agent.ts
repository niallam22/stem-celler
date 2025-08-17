import { db } from "@/lib/db";
import { Document, therapy } from "@/lib/db/schema";
import { Send, StateGraph, Annotation } from "@langchain/langgraph";
import { eq } from "drizzle-orm";
import { PDFPageExtractor } from "../utils/pdf-page-extractor";

// Token usage type for proper typing
interface TokenUsage {
  classification: number;
  structure: number;
  extraction: number;
  total: number;
}
import { AgentLogger } from "./agent-logger";
import { BusinessAnalysisAgent } from "./business-analysis-agent";
import { DocumentClassifierAgent } from "./document-classifier-agent";
import { DocumentStructureAnalyzer } from "./document-structure-analyzer";
import { RevenueVerifierAgent } from "./revenue-verifier-agent";
import {
  EnhancedExtractionState,
  ExtractedData,
  ExtractionResults,
  ProcessingStrategy,
} from "./enhanced-orchestrator-types";
import { ResultsReconciler } from "./results-reconciler";
import { RevenueAgent } from "./revenue-agent";
import { SectionExtractor } from "./section-extractor";

// Define state using modern Annotation.Root approach for concurrent updates
const EnhancedExtractionStateAnnotation = Annotation.Root({
  // Initial inputs
  document: Annotation<Document>(),
  pdfText: Annotation<string>(),
  pdfMetadata: Annotation<{
    totalPages: number;
    pageTexts: Map<number, string>;
  }>(),
  
  // Phase 1 outputs - Initial analysis (optional until populated)
  documentInfo: Annotation<{
    companyName?: string;
    reportType?: "annual" | "quarterly";
    reportingPeriod?: string;
  } | undefined>(),
  documentStructure: Annotation<any>(), // DocumentStructure type
  therapyList: Annotation<Array<{
    id: string;
    name: string;
    manufacturer: string;
  }> | undefined>(),
  
  // Parallel processing tracks sections (optional until populated)
  structureBasedSections: Annotation<any>(), // StructureBasedSections type
  keywordBasedSections: Annotation<any>(), // KeywordBasedSections type
  
  // Individual track results (optional until populated)
  structureTrackResults: Annotation<any>(), // ExtractionResults type
  keywordTrackResults: Annotation<any>(), // ExtractionResults type
  
  // Final reconciled result (optional until populated)
  finalResult: Annotation<any>(), // ExtractedData type
  
  // Error handling (optional)
  error: Annotation<string | undefined>(),
  
  // Processing metadata (optional until determined)
  processingStrategy: Annotation<string | undefined>(),
  
  // Token usage with reducer for concurrent updates
  tokensUsed: Annotation<TokenUsage>({
    reducer: (existing: TokenUsage | undefined, update: TokenUsage | undefined): TokenUsage => {
      if (!existing) return update || { classification: 0, structure: 0, extraction: 0, total: 0 };
      if (!update) return existing;
      
      // Merge token counts: take max for one-time costs, add for cumulative costs
      const mergedTokens = {
        classification: Math.max(existing.classification || 0, update.classification || 0),
        structure: Math.max(existing.structure || 0, update.structure || 0),
        extraction: (existing.extraction || 0) + (update.extraction || 0),
        total: 0 // Will be calculated below
      };
      
      // Calculate total from merged components
      mergedTokens.total = mergedTokens.classification + mergedTokens.structure + mergedTokens.extraction;
      
      return mergedTokens;
    },
    default: () => ({ classification: 0, structure: 0, extraction: 0, total: 0 })
  })
});

// Infer the state type from the annotation
type EnhancedExtractionStateType = typeof EnhancedExtractionStateAnnotation.State;

export class EnhancedOrchestratorAgent {
  private structureAnalyzer: DocumentStructureAnalyzer;
  private sectionExtractor: SectionExtractor;
  private pdfExtractor: PDFPageExtractor;
  private documentClassifier: DocumentClassifierAgent;
  private revenueAgent: RevenueAgent;
  private businessAnalysisAgent: BusinessAnalysisAgent;
  private revenueVerifier: RevenueVerifierAgent;
  private reconciler: ResultsReconciler;
  private logger: AgentLogger;

  constructor() {
    this.structureAnalyzer = new DocumentStructureAnalyzer();
    this.sectionExtractor = new SectionExtractor();
    this.pdfExtractor = new PDFPageExtractor();
    this.documentClassifier = new DocumentClassifierAgent();
    this.revenueAgent = new RevenueAgent();
    this.businessAnalysisAgent = new BusinessAnalysisAgent();
    this.revenueVerifier = new RevenueVerifierAgent();
    this.reconciler = new ResultsReconciler();
    this.logger = AgentLogger.getInstance();
  }

  async processDocument(
    document: Document,
    pdfBuffer: Buffer
  ): Promise<ExtractedData | null> {
    console.log(
      `🚀 Enhanced Orchestrator: Starting adaptive processing for ${document.fileName}`
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
          structure: 0,
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
        therapyCount: result.finalResult?.therapy?.length || 0,
        revenueCount: result.finalResult?.revenue?.length || 0,
        approvalCount: result.finalResult?.approvals?.length || 0,
        totalTokensUsed: result.tokensUsed?.total || 0,
        confidence: result.finalResult?.confidence,
      });

      return result.finalResult || null;

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

    // Node definitions
    graph.addNode("classify_document", this.classifyDocument.bind(this));
    graph.addNode("lookup_therapies", this.lookupTherapies.bind(this));
    graph.addNode("analyze_structure", this.analyzeStructure.bind(this));
    graph.addNode("determine_strategy", this.determineStrategy.bind(this));
    graph.addNode("extract_sections", this.extractSections.bind(this));
    graph.addNode(
      "process_structure_track",
      this.processStructureTrack.bind(this)
    );
    graph.addNode("process_keyword_track", this.processKeywordTrack.bind(this));
    graph.addNode("reconcile_results", this.reconcileResults.bind(this));

    // Edge definitions
    graph.addEdge("__start__", "classify_document");
    graph.addEdge("classify_document", "lookup_therapies");
    graph.addEdge("lookup_therapies", "analyze_structure");
    graph.addEdge("analyze_structure", "determine_strategy");
    graph.addEdge("determine_strategy", "extract_sections");

    // Parallel processing branches using Send API
    graph.addConditionalEdges(
      "extract_sections",
      this.generateParallelProcessing.bind(this),
      ["process_structure_track", "process_keyword_track"]
    );

    graph.addEdge("process_structure_track", "reconcile_results");
    graph.addEdge("process_keyword_track", "reconcile_results");

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

  private async analyzeStructure(
    state: EnhancedExtractionStateType
  ): Promise<Partial<EnhancedExtractionStateType>> {
    console.log("📊 Phase 3: Analyzing document structure...");

    const structure = await this.structureAnalyzer.analyze(
      state.pdfText,
      state.pdfMetadata!.pageTexts
    );
    console.log(
      `Document structure analysis complete: ${
        structure.hasExplicitStructure
          ? "Explicit structure found"
          : "No explicit structure"
      }`
    );

    return {
      documentStructure: structure,
      tokensUsed: {
        ...state.tokensUsed!,
        structure: 1000, // Estimate
        total: state.tokensUsed!.total + 1000,
      },
    };
  }

  private async determineStrategy(
    state: EnhancedExtractionStateType
  ): Promise<Partial<EnhancedExtractionStateType>> {
    console.log("🎯 Phase 4: Determining processing strategy...");

    const hasStructure = state.documentStructure?.hasExplicitStructure;
    const hasTherapies = (state.therapyList?.length || 0) > 0;
    const pageCount = state.pdfMetadata?.totalPages || 0;

    let strategy: ProcessingStrategy;

    if (pageCount < 15) {
      strategy = "smart-complete"; // Small enough to process completely
    } else if (hasStructure && hasTherapies) {
      strategy = "full-parallel"; // Both tracks viable
    } else if (hasStructure) {
      strategy = "structure-only"; // Only structure-based
    } else {
      strategy = "hybrid"; // Fallback strategy
    }

    console.log(`Selected strategy: ${strategy}`);

    return { processingStrategy: strategy };
  }

  private async extractSections(
    state: EnhancedExtractionStateType
  ): Promise<Partial<EnhancedExtractionStateType>> {
    console.log("📑 Phase 5: Extracting sections...");

    // Log extraction phase start
    await this.logger.logMetadata("EnhancedOrchestratorAgent", {
      operation: "extract_sections_start",
      processing_strategy: state.processingStrategy,
      has_document_structure: !!state.documentStructure,
      has_explicit_structure: state.documentStructure?.hasExplicitStructure,
      therapy_count: state.therapyList?.length || 0,
      therapies: state.therapyList?.map(t => t.name) || [],
      total_pages: state.pdfMetadata?.totalPages,
    });

    const updates: Partial<EnhancedExtractionState> = {};

    // Structure-based extraction
    if (
      state.documentStructure &&
      ["full-parallel", "structure-only", "hybrid"].includes(
        state.processingStrategy!
      )
    ) {
      console.log("🏗️ Running structure-based extraction...");
      
      await this.logger.logTiming("EnhancedOrchestratorAgent", "structure_extraction", Date.now());
      const startTime = Date.now();
      
      updates.structureBasedSections =
        await this.sectionExtractor.extractStructureSections(
          state.documentStructure,
          state.pdfMetadata!.pageTexts
        );

      const duration = Date.now() - startTime;
      await this.logger.logTiming("EnhancedOrchestratorAgent", "structure_extraction", duration, {
        sections_extracted: Object.values(updates.structureBasedSections).reduce((sum, sections) => sum + sections.length, 0),
        structure_sections_available: state.documentStructure.sections.length,
      });

      console.log(`🏗️ Structure-based extraction completed in ${duration}ms`);
    } else {
      console.log("🏗️ Skipping structure-based extraction (strategy or structure not suitable)");
      
      await this.logger.logMetadata("EnhancedOrchestratorAgent", {
        operation: "structure_extraction_skipped",
        reason: !state.documentStructure ? "no_document_structure" : "strategy_does_not_include_structure",
        strategy: state.processingStrategy,
        has_structure: !!state.documentStructure,
      });
    }

    // Keyword-based extraction
    if (
      state.therapyList &&
      state.therapyList.length > 0 &&
      ["full-parallel", "hybrid"].includes(state.processingStrategy!)
    ) {
      console.log("🔍 Running keyword-based extraction...");
      
      const startTime = Date.now();
      const therapyNames = state.therapyList.map((t) => t.name);
      
      updates.keywordBasedSections =
        await this.sectionExtractor.extractKeywordSections(
          therapyNames,
          state.pdfMetadata!.pageTexts,
          1 // Context pages - reduced for more focused sections
        );

      const duration = Date.now() - startTime;
      const sectionsFound = Object.keys(updates.keywordBasedSections).length;
      const totalSections = Object.values(updates.keywordBasedSections).reduce((sum, sections) => sum + sections.length, 0);

      await this.logger.logTiming("EnhancedOrchestratorAgent", "keyword_extraction", duration, {
        therapies_searched: therapyNames.length,
        therapies_with_mentions: sectionsFound,
        total_sections_extracted: totalSections,
        context_pages: 1,
        success_rate: `${sectionsFound}/${therapyNames.length}`,
      });

      console.log(`🔍 Keyword-based extraction completed in ${duration}ms - found ${sectionsFound}/${therapyNames.length} therapies`);
    } else {
      console.log("🔍 Skipping keyword-based extraction (no therapies or strategy doesn't include keywords)");
      
      await this.logger.logMetadata("EnhancedOrchestratorAgent", {
        operation: "keyword_extraction_skipped",
        reason: !state.therapyList?.length ? "no_therapies" : "strategy_does_not_include_keywords",
        strategy: state.processingStrategy,
        therapy_count: state.therapyList?.length || 0,
      });
    }

    // Log extraction phase completion
    const structureSections = updates.structureBasedSections ? 
      Object.values(updates.structureBasedSections).reduce((sum, sections) => sum + sections.length, 0) : 0;
    const keywordSections = updates.keywordBasedSections ? 
      Object.values(updates.keywordBasedSections).reduce((sum, sections) => sum + sections.length, 0) : 0;

    await this.logger.logMetadata("EnhancedOrchestratorAgent", {
      operation: "extract_sections_complete",
      processing_strategy: state.processingStrategy,
      structure_sections_extracted: structureSections,
      keyword_sections_extracted: keywordSections,
      total_sections: structureSections + keywordSections,
      has_structure_sections: !!updates.structureBasedSections,
      has_keyword_sections: !!updates.keywordBasedSections,
      therapies_with_mentions: updates.keywordBasedSections ? Object.keys(updates.keywordBasedSections) : [],
    });

    return updates;
  }

  private generateParallelProcessing(state: EnhancedExtractionStateType): Send[] {
    const sends: Send[] = [];

    const hasStructureSections =
      state.structureBasedSections &&
      Object.values(state.structureBasedSections).some(
        (sections) => sections.length > 0
      );
    const hasKeywordSections =
      state.keywordBasedSections &&
      Object.keys(state.keywordBasedSections).length > 0;

    // Always send to both tracks - they will handle empty data internally
    // This ensures both nodes are reachable in the graph
    if (hasStructureSections || hasKeywordSections) {
      sends.push(new Send("process_structure_track", state));
      sends.push(new Send("process_keyword_track", state));
    } else {
      throw new Error("No sections extracted for processing");
    }

    return sends;
  }

  private async processStructureTrack(
    state: EnhancedExtractionStateType
  ): Promise<Partial<EnhancedExtractionStateType>> {
    console.log("🔄 Processing structure track...");
    console.log("🔍 Debug - documentInfo in structure track:", state.documentInfo);
    console.log("🔍 Debug - structure sections count:", state.structureBasedSections?.size || 0);

    if (!state.structureBasedSections) {
      return {};
    }

    const results: ExtractionResults = {
      therapy: [],
      revenue: [],
      approvals: [],
      business: [],
      confidence: { therapy: 0, revenue: 0, approvals: 0, business: 0 },
      sourceTrack: "structure",
    };

    // Route sections to appropriate agents
    const { merged, overlaps } = this.sectionExtractor.mergeSections(
      state.structureBasedSections,
      state.keywordBasedSections || {}
    );

    const routing = await this.sectionExtractor.routeSectionsToAgents(
      merged,
      overlaps
    );

    // Market analysis removed - focusing on revenue extraction only

    // Process revenue sections
    if (routing.revenue.length > 0) {
      console.log(`📊 Structure Track: Processing ${routing.revenue.length} revenue sections`);
      const revenueResults = await this.revenueAgent.analyze(
        routing.revenue.map((s) => s.text).join("\n\n"),
        state.documentInfo!,
        undefined // No specific therapy for structure-based revenue analysis
      );

      if (revenueResults.revenue)
        results.revenue.push(...revenueResults.revenue);
      results.confidence.revenue = revenueResults.confidence.revenue;
    }

    // Process business sections
    if (routing.business.length > 0) {
      const businessResults = await this.businessAnalysisAgent.analyze(
        routing.business.map((s) => s.text).join("\n\n")
      );

      if (businessResults.business)
        results.business.push(...businessResults.business);
      results.confidence.business = businessResults.confidence.business;
    }

    return {
      structureTrackResults: results,
      tokensUsed: {
        ...state.tokensUsed!,
        extraction: state.tokensUsed!.extraction + 5000, // Estimate
        total: state.tokensUsed!.total + 5000,
      },
    };
  }

  private async processKeywordTrack(
    state: EnhancedExtractionStateType
  ): Promise<Partial<EnhancedExtractionStateType>> {
    console.log("🔍 Processing keyword track...");
    console.log("🔍 Debug - documentInfo in keyword track:", state.documentInfo);
    console.log("🔍 Debug - keyword sections count:", state.keywordBasedSections ? Object.keys(state.keywordBasedSections).length : 0);

    if (!state.keywordBasedSections) {
      return {};
    }

    const results: ExtractionResults = {
      therapy: [],
      revenue: [],
      approvals: [],
      business: [],
      confidence: { therapy: 0, revenue: 0, approvals: 0, business: 0 },
      sourceTrack: "keyword",
    };

    // Process each therapy's sections with verification
    for (const [therapyName, sections] of Object.entries(
      state.keywordBasedSections
    )) {
      console.log(`📊 Keyword Track: Processing therapy-specific revenue for ${therapyName}`);
      console.log(`🔍 Found ${sections.length} context windows for verification`);
      
      // Verify each section (context window) for revenue content
      const verifiedSections: Array<{ section: any; verification: any }> = [];
      const batchStartTime = Date.now();
      let totalConfidence = 0;
      
      for (const section of sections) {
        const verification = await this.revenueVerifier.verify(section.text, therapyName);
        console.log(`🔍 Section verification: ${verification.containsRevenueData} (confidence: ${verification.confidence}%)`);
        
        totalConfidence += verification.confidence;
        
        if (verification.containsRevenueData && verification.confidence >= 50) {
          verifiedSections.push({
            section,
            verification
          });
        }
      }
      
      const batchDuration = Date.now() - batchStartTime;
      const averageConfidence = sections.length > 0 ? totalConfidence / sections.length : 0;
      
      // Log batch summary
      await this.revenueVerifier.logBatchSummary(
        therapyName,
        sections.length,
        verifiedSections.length,
        averageConfidence,
        batchDuration
      );
      
      console.log(`✅ ${verifiedSections.length} of ${sections.length} context windows passed revenue verification`);

      // Only process if we have verified revenue sections
      if (verifiedSections.length > 0) {
        // Combine verified sections for revenue analysis
        const verifiedText = verifiedSections
          .map((vs, i) => `VERIFIED REVENUE CONTEXT ${i + 1} (confidence: ${vs.verification.confidence}%):\n${vs.section.text}`)
          .join("\n\n");

        // Revenue analysis - therapy-specific with verified context
        const revenueResults = await this.revenueAgent.analyze(
          verifiedText,
          state.documentInfo!,
          therapyName // Pass specific therapy name for focused analysis
        );
        
        const therapyRevenue = revenueResults.revenue;
        if (therapyRevenue) {
          results.revenue.push(...therapyRevenue);
        }
      } else {
        console.log(`⚠️ No verified revenue context windows found for ${therapyName}`);
      }
    }

    // Calculate average confidence
    results.confidence.therapy = results.therapy.length > 0 ? 80 : 0;
    results.confidence.revenue = results.revenue.length > 0 ? 80 : 0;

    return {
      keywordTrackResults: results,
      tokensUsed: {
        ...state.tokensUsed!,
        extraction: state.tokensUsed!.extraction + 3000, // Estimate
        total: state.tokensUsed!.total + 3000,
      },
    };
  }

  private async reconcileResults(
    state: EnhancedExtractionStateType
  ): Promise<Partial<EnhancedExtractionStateType>> {
    console.log("🔗 Phase 6: Reconciling results from all tracks...");

    const allResults: ExtractionResults[] = [];

    if (state.structureTrackResults) {
      allResults.push(state.structureTrackResults);
    }

    if (state.keywordTrackResults) {
      allResults.push(state.keywordTrackResults);
    }

    if (allResults.length === 0) {
      throw new Error("No results to reconcile");
    }

    const finalResult = await this.reconciler.reconcile(allResults);

    console.log(
      `✅ Final results: ${finalResult.therapy?.length || 0} therapies, ${
        finalResult.revenue?.length || 0
      } revenue records, ${finalResult.approvals?.length || 0} approvals`
    );
    console.log(`📊 Total tokens used: ${state.tokensUsed!.total}`);

    return { finalResult };
  }
}
