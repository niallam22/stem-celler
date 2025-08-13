import { Document } from "@/lib/db/schema";
import { EnhancedOrchestratorAgent } from "../agents/enhanced-orchestrator-agent";
import type { ExtractedData } from "../agents/enhanced-orchestrator-types";

export type { ExtractedData };

export class DocumentProcessor {
  private orchestrator: EnhancedOrchestratorAgent;

  constructor() {
    this.orchestrator = new EnhancedOrchestratorAgent();
  }

  async extractFromDocument(document: Document): Promise<ExtractedData> {
    console.log(`🚀 Document Processor: Starting extraction for ${document.fileName}`);

    try {
      // Download PDF from S3
      const pdfBuffer = await this.downloadPdf(document.s3Url);
      
      // Process document through the enhanced orchestrator with adaptive processing
      const result = await this.orchestrator.processDocument(document, pdfBuffer);

      console.log(`✅ Document Processor: Extraction completed for ${document.fileName}`);
      if (result) {
        console.log(`📊 Results: ${result.therapy?.length || 0} therapies, ${result.revenue?.length || 0} revenue records, ${result.approvals?.length || 0} approvals`);
      }

      return result || {
        therapy: [],
        revenue: [],
        approvals: [],
        confidence: { therapy: 0, revenue: 0, approvals: 0 },
        sources: []
      };
    } catch (error) {
      console.error(`❌ Document Processor: Extraction failed for ${document.fileName}:`, error);
      throw error;
    }
  }

  async reprocessDocument(document: Document): Promise<ExtractedData> {
    // Reprocessing is the same as initial extraction
    return this.extractFromDocument(document);
  }

  private async downloadPdf(filePath: string): Promise<Buffer> {
    try {
      console.log(`📥 Downloading PDF from path: ${filePath}`);
      
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (error) {
        console.error(`❌ Supabase download error:`, error);
        throw new Error(`Failed to download from Supabase: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data received from Supabase');
      }

      const arrayBuffer = await data.arrayBuffer();
      console.log(`✅ Downloaded PDF successfully: ${arrayBuffer.byteLength} bytes`);
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      throw error;
    }
  }

  private async extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
    try {
      const { PDFLoader } = await import('@langchain/community/document_loaders/fs/pdf');
      const { writeFileSync, unlinkSync } = await import('fs');
      const { tmpdir } = await import('os');
      const { join } = await import('path');
      
      // PDFLoader requires a file path, so write buffer to temp file
      const tempFilePath = join(tmpdir(), `temp-${Date.now()}.pdf`);
      writeFileSync(tempFilePath, pdfBuffer);
      
      try {
        // Use LangChain's PDFLoader for Node environments
        const loader = new PDFLoader(tempFilePath, {
          splitPages: false, // Get as single document
          parsedItemSeparator: " "
        });
        
        const docs = await loader.load();
        const text = docs.map(doc => doc.pageContent).join('\n\n');
        
        console.log(`📄 PDF parsed: ${docs.length} documents, ${text.length} characters`);
        
        // Clean up temp file
        unlinkSync(tempFilePath);
        
        return text;
      } catch (innerError) {
        // Ensure temp file is cleaned up even on error
        try {
          unlinkSync(tempFilePath);
        } catch {}
        throw innerError;
      }
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}