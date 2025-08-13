import { Document } from "@/lib/db/schema";
import { DocumentStructure } from "./document-structure-analyzer";
import { TextSection, StructureBasedSections, KeywordBasedSections } from "./section-extractor";

// Enhanced state for the new orchestrator
export interface EnhancedExtractionState {
  // Initial inputs
  document: Document;
  pdfText: string;
  pdfMetadata?: {
    totalPages: number;
    pageTexts: Map<number, string>;
  };
  
  // Phase 1 outputs - Initial analysis
  documentInfo?: {
    companyName?: string;
    reportType?: "annual" | "quarterly";
    reportingPeriod?: string;
  };
  documentStructure?: DocumentStructure;
  therapyList?: Array<{
    id: string;
    name: string;
    manufacturer: string;
  }>;
  
  // Parallel processing tracks sections
  structureBasedSections?: StructureBasedSections;
  keywordBasedSections?: KeywordBasedSections;
  
  // Individual track results
  structureTrackResults?: ExtractionResults;
  keywordTrackResults?: ExtractionResults;
  
  // Final reconciled result
  finalResult?: ExtractedData;
  
  // Error handling
  error?: string;
  
  // Processing metadata
  processingStrategy?: 'full-parallel' | 'structure-only' | 'smart-complete' | 'hybrid';
  tokensUsed?: {
    classification: number;
    structure: number;
    extraction: number;
    total: number;
  };
}

// Results from individual extraction tracks
export interface ExtractionResults {
  therapy?: Array<{
    name: string;
    manufacturer: string;
    mechanism: string;
    pricePerTreatmentUsd: number;
    sources: string[];
  }>;
  revenue?: Array<{
    therapyName: string;
    period: string;
    region: string;
    revenueMillionsUsd: number;
    sources: string[];
    calculation?: string;
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
  business?: Array<{
    type: 'partnership' | 'licensing' | 'market_position' | 'strategy';
    description: string;
    parties?: string[];
    value?: number;
    date?: string;
    sources: string[];
  }>;
  confidence: {
    therapy: number;
    revenue: number;
    approvals: number;
    business: number;
  };
  sourceTrack: 'structure' | 'keyword' | 'both';
}

// Final extracted data format (matches existing schema)
export interface ExtractedData {
  therapy?: Array<{
    name: string;
    manufacturer: string;
    mechanism: string;
    pricePerTreatmentUsd: number;
    sources: string[];
  }>;
  revenue?: Array<{
    therapyId?: string;
    therapyName: string;
    period: string;
    region: string;
    revenueMillionsUsd: number;
    sources: string[];
  }>;
  approvals?: Array<{
    therapyId?: string;
    therapyName: string;
    diseaseId?: string;
    diseaseName: string;
    region: string;
    approvalDate: Date;
    approvalType: string;
    regulatoryBody: string;
    sources: string[];
  }>;
  confidence: {
    therapy: number;
    revenue: number;
    approvals: number;
  };
  sources: Array<{
    page: number;
    section: string;
    quote: string;
  }>;
}

// Agent routing plan
export interface AgentRoutingPlan {
  revenueAgent: TextSection[];
  businessAnalysisAgent?: TextSection[];
}

// Processing strategy types
export type ProcessingStrategy = 'full-parallel' | 'structure-only' | 'smart-complete' | 'hybrid';

// Token management
export interface TokenEstimate {
  canProcessInSingleCall: boolean;
  estimatedTokens: number;
  recommendedStrategy: ProcessingStrategy;
}