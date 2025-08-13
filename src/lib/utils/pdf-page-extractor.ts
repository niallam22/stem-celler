import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document } from "langchain/document";

export interface PDFMetadata {
  totalPages: number;
  pageTexts: Map<number, string>;
  fullText: string;
  info?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
}

export interface PDFExtractionOptions {
  extractPageText?: boolean;
  maxPages?: number; // Limit extraction for performance
  splitPages?: boolean; // Whether to split by pages
}

export class PDFPageExtractor {
  /**
   * Extract text and metadata from a PDF buffer
   */
  async extractFromBuffer(
    pdfBuffer: Buffer, 
    options: PDFExtractionOptions = { extractPageText: true, splitPages: true }
  ): Promise<PDFMetadata> {
    try {
      // Create a temporary file path or use buffer directly
      // PDFLoader requires a file path, so we'll need to write buffer to temp file
      const { writeFileSync, unlinkSync } = await import('fs');
      const { tmpdir } = await import('os');
      const { join } = await import('path');
      
      const tempFilePath = join(tmpdir(), `temp-${Date.now()}.pdf`);
      writeFileSync(tempFilePath, pdfBuffer);
      
      try {
        // Use LangChain's PDFLoader for Node environments
        const loader = new PDFLoader(tempFilePath, {
          splitPages: options.splitPages !== false,
          parsedItemSeparator: " "
        });
        
        const docs = await loader.load();
        
        // Clean up temp file
        unlinkSync(tempFilePath);
      
      // Extract page texts if requested
      const pageTexts = new Map<number, string>();
      let fullText = "";
      
      if (docs.length > 0) {
        docs.forEach((doc, index) => {
          const pageNumber = index + 1;
          if (options.extractPageText) {
            pageTexts.set(pageNumber, doc.pageContent);
          }
          fullText += doc.pageContent + "\n\n";
        });
      }

      // Extract metadata from the first document
      const firstDoc = docs[0];
      const metadata = firstDoc?.metadata || {};
      
        return {
          totalPages: docs.length,
          pageTexts,
          fullText: fullText.trim(),
          info: metadata.pdf ? {
            title: metadata.pdf.info?.Title,
            author: metadata.pdf.info?.Author,
            subject: metadata.pdf.info?.Subject,
            keywords: metadata.pdf.info?.Keywords,
            creationDate: metadata.pdf.info?.CreationDate ? new Date(metadata.pdf.info.CreationDate) : undefined,
            modificationDate: metadata.pdf.info?.ModificationDate ? new Date(metadata.pdf.info.ModificationDate) : undefined,
          } : undefined,
        };
      } catch (innerError) {
        // Ensure temp file is cleaned up even on error
        try {
          unlinkSync(tempFilePath);
        } catch {}
        throw innerError;
      }
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error(`Failed to extract PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from specific pages
   */
  async extractPageRange(
    pdfBuffer: Buffer,
    startPage: number,
    endPage: number
  ): Promise<Map<number, string>> {
    try {
      const { writeFileSync, unlinkSync } = await import('fs');
      const { tmpdir } = await import('os');
      const { join } = await import('path');
      
      const tempFilePath = join(tmpdir(), `temp-${Date.now()}.pdf`);
      writeFileSync(tempFilePath, pdfBuffer);
      
      try {
        // Use LangChain's PDFLoader for Node environments
        const loader = new PDFLoader(tempFilePath, {
          splitPages: true,
          parsedItemSeparator: " "
        });
        
        const docs = await loader.load();
      const pageTexts = new Map<number, string>();
      
      // Extract only the requested page range
      for (let pageNum = startPage; pageNum <= Math.min(endPage, docs.length); pageNum++) {
        if (docs[pageNum - 1]) {
          pageTexts.set(pageNum, docs[pageNum - 1].pageContent);
        }
      }
        
        // Clean up temp file
        unlinkSync(tempFilePath);
        
        return pageTexts;
      } catch (innerError) {
        // Ensure temp file is cleaned up even on error
        try {
          unlinkSync(tempFilePath);
        } catch {}
        throw innerError;
      }
    } catch (error) {
      console.error(`Error extracting page range ${startPage}-${endPage}:`, error);
      return new Map();
    }
  }

  /**
   * Extract text from a single page
   */
  private async extractPageText(pdfBuffer: Buffer, pageNumber: number): Promise<string> {
    try {
      const { writeFileSync, unlinkSync } = await import('fs');
      const { tmpdir } = await import('os');
      const { join } = await import('path');
      
      const tempFilePath = join(tmpdir(), `temp-${Date.now()}.pdf`);
      writeFileSync(tempFilePath, pdfBuffer);
      
      try {
        // Use LangChain's PDFLoader to get all pages
        const loader = new PDFLoader(tempFilePath, {
          splitPages: true,
          parsedItemSeparator: " "
        });
        
        const docs = await loader.load();
        
        // Clean up temp file
        unlinkSync(tempFilePath);
        
        // Get the specific page (pageNumber is 1-indexed)
        if (pageNumber > 0 && pageNumber <= docs.length) {
          return docs[pageNumber - 1].pageContent;
        }
        
        return '';
      } catch (innerError) {
        // Ensure temp file is cleaned up even on error
        try {
          unlinkSync(tempFilePath);
        } catch {}
        throw innerError;
      }
    } catch (error) {
      console.error(`Error extracting page ${pageNumber}:`, error);
      return '';
    }
  }


  /**
   * Search for text within the PDF and return page numbers
   */
  async searchInPDF(
    pdfBuffer: Buffer,
    searchTerms: string[],
    options: { caseSensitive?: boolean } = {}
  ): Promise<Map<string, number[]>> {
    const metadata = await this.extractFromBuffer(pdfBuffer, { extractPageText: true });
    const results = new Map<string, number[]>();

    searchTerms.forEach(term => {
      const pageNumbers: number[] = [];
      
      metadata.pageTexts.forEach((pageText, pageNumber) => {
        const searchText = options.caseSensitive ? pageText : pageText.toLowerCase();
        const searchTerm = options.caseSensitive ? term : term.toLowerCase();
        
        if (searchText.includes(searchTerm)) {
          pageNumbers.push(pageNumber);
        }
      });
      
      if (pageNumbers.length > 0) {
        results.set(term, pageNumbers);
      }
    });

    return results;
  }

  /**
   * Extract text around search matches with context
   */
  async extractContextAroundMatches(
    pdfBuffer: Buffer,
    searchTerm: string,
    contextPages: number = 1
  ): Promise<Array<{ pageNumber: number; text: string; matchCount: number }>> {
    const searchResults = await this.searchInPDF(pdfBuffer, [searchTerm]);
    const matchPages = searchResults.get(searchTerm) || [];
    
    if (matchPages.length === 0) {
      return [];
    }

    // Get unique page numbers including context pages
    const pagesToExtract = new Set<number>();
    matchPages.forEach(pageNum => {
      for (let i = Math.max(1, pageNum - contextPages); i <= pageNum + contextPages; i++) {
        pagesToExtract.add(i);
      }
    });

    // Extract text from relevant pages
    const results: Array<{ pageNumber: number; text: string; matchCount: number }> = [];
    const sortedPages = Array.from(pagesToExtract).sort((a, b) => a - b);
    
    for (const pageNum of sortedPages) {
      const pageText = await this.extractPageText(pdfBuffer, pageNum);
      if (pageText) {
        const matchCount = (pageText.toLowerCase().match(new RegExp(searchTerm.toLowerCase(), 'g')) || []).length;
        results.push({
          pageNumber: pageNum,
          text: pageText,
          matchCount,
        });
      }
    }

    return results;
  }

  /**
   * Estimate token count for text (rough approximation)
   */
  estimateTokenCount(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if PDF can be processed in a single LLM call
   */
  canProcessInSingleCall(
    text: string,
    maxTokens: number = 128000,
    bufferPercentage: number = 0.8
  ): boolean {
    const estimatedTokens = this.estimateTokenCount(text);
    const effectiveLimit = maxTokens * bufferPercentage;
    return estimatedTokens < effectiveLimit;
  }
}