import { Document } from "@/lib/db/schema";

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
  therapyList?: Array<{
    id: string;
    name: string;
    manufacturer: string;
  }>;
  
  // Revenue extraction results
  revenueResults?: ExtractionResults[];
  
  // Final reconciled result
  finalResult?: ExtractedData;
  
  // Error handling
  error?: string;
  
  // Processing metadata
  tokensUsed?: {
    classification: number;
    extraction: number;
    total: number;
  };
}

// Results from revenue extraction
export interface ExtractionResults {
  revenue: Array<{
    therapyName: string;
    period: string;
    region: string;
    revenueMillionsUsd: number;
    sources: string[];
    calculation?: string;
  }>;
  confidence: number;
}

// Final extracted data format (matches existing schema)
export interface ExtractedData {
  revenue: Array<{
    therapyId?: string;
    therapyName: string;
    period: string;
    region: string;
    revenueMillionsUsd: number;
    sources: string[];
  }>;
  confidence: number;
  sources: Array<{
    page: number;
    section: string;
    quote: string;
  }>;
}

// Text section interface for revenue processing
export interface TextSection {
  text: string;
  pageNumbers: number[];
  sectionTitle?: string;
  searchTerm?: string;
}