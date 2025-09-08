import { NextResponse } from "next/server";
import { uploadFile } from "@/lib/storage";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createId } from "@paralleldrive/cuid2";
import crypto from "crypto";
import { db } from "@/lib/db";
import { document } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const BATCH_SIZE = 5;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const DOWNLOAD_TIMEOUT = 30000; // 30 seconds
const MAX_URLS = 100;

interface ProcessResult {
  url: string;
  status: "success" | "error";
  documentId?: string;
  fileName?: string;
  error?: string;
}

async function downloadWithTimeout(url: string, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PDFImporter/1.0)'
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      throw new Error('Download timeout exceeded');
    }
    throw error;
  }
}

async function processPdfUrl(url: string, userId: string): Promise<ProcessResult> {
  try {
    // Validate URL format
    let validUrl: URL;
    try {
      validUrl = new URL(url);
      if (!['http:', 'https:'].includes(validUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return { url, status: "error", error: "Invalid URL format" };
    }

    // Download PDF
    const response = await downloadWithTimeout(url, DOWNLOAD_TIMEOUT);
    
    if (!response.ok) {
      return { 
        url, 
        status: "error", 
        error: `HTTP ${response.status}: ${response.statusText}` 
      };
    }

    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('pdf')) {
      return { 
        url, 
        status: "error", 
        error: "Not a PDF file (invalid content-type)" 
      };
    }

    // Check file size from headers
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
      return { 
        url, 
        status: "error", 
        error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` 
      };
    }

    // Download file content
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Verify file size after download
    if (buffer.length > MAX_FILE_SIZE) {
      return { 
        url, 
        status: "error", 
        error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` 
      };
    }

    // Verify PDF magic bytes
    const pdfMagicBytes = buffer.slice(0, 4).toString();
    if (!pdfMagicBytes.startsWith('%PDF')) {
      return { 
        url, 
        status: "error", 
        error: "Invalid PDF file format" 
      };
    }

    // Generate file hash for duplicate detection
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");
    
    // Check for duplicate
    const existingDoc = await db
      .select()
      .from(document)
      .where(eq(document.fileHash, hash))
      .limit(1);
    
    if (existingDoc.length > 0) {
      return { 
        url, 
        status: "error", 
        error: "Duplicate file (already exists in database)" 
      };
    }

    // Extract filename from URL or use default
    const urlPath = validUrl.pathname;
    const urlFilename = urlPath.split('/').pop() || 'document.pdf';
    const fileName = urlFilename.endsWith('.pdf') ? urlFilename : `${urlFilename}.pdf`;
    
    // Generate unique filename for S3
    const timestamp = new Date().toISOString().split('T')[0];
    const uniqueId = createId();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `documents/${timestamp}/${uniqueId}-${sanitizedName}`;

    // Upload to S3
    const filePath = await uploadFile(key, buffer, 'application/pdf');
    
    // Create document record
    const [newDoc] = await db
      .insert(document)
      .values({
        s3Url: filePath,
        fileName: fileName,
        fileHash: hash,
        uploadedBy: userId,
      })
      .returning();

    return { 
      url, 
      status: "success", 
      documentId: newDoc.id,
      fileName: newDoc.fileName 
    };

  } catch (error) {
    console.error(`Error processing ${url}:`, error);
    return { 
      url, 
      status: "error", 
      error: (error as Error).message || "Unknown error occurred" 
    };
  }
}

export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { urls } = await req.json();
    
    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json({ 
        error: "Invalid request: 'urls' must be an array" 
      }, { status: 400 });
    }

    if (urls.length === 0) {
      return NextResponse.json({ 
        error: "No URLs provided" 
      }, { status: 400 });
    }

    if (urls.length > MAX_URLS) {
      return NextResponse.json({ 
        error: `Too many URLs (max ${MAX_URLS})` 
      }, { status: 400 });
    }

    // Filter out empty strings and trim URLs
    const cleanedUrls = urls
      .map(url => typeof url === 'string' ? url.trim() : '')
      .filter(url => url.length > 0);

    const results: ProcessResult[] = [];
    
    // Process URLs in batches
    for (let i = 0; i < cleanedUrls.length; i += BATCH_SIZE) {
      const batch = cleanedUrls.slice(i, i + BATCH_SIZE);
      
      // Process batch with Promise.allSettled
      const batchPromises = batch.map(url => 
        processPdfUrl(url, session.user.id)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Extract results
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // This shouldn't happen since processPdfUrl catches all errors
          // but handle it just in case
          const url = batch[batchResults.indexOf(result)];
          results.push({
            url,
            status: "error",
            error: "Unexpected error during processing"
          });
        }
      }
    }

    // Calculate summary
    const summary = {
      total: results.length,
      successful: results.filter(r => r.status === "success").length,
      failed: results.filter(r => r.status === "error").length
    };

    return NextResponse.json({ 
      results,
      summary
    });

  } catch (error) {
    console.error("Bulk import error:", error);
    return NextResponse.json({ 
      error: "Bulk import failed", 
      details: (error as Error).message 
    }, { status: 500 });
  }
}