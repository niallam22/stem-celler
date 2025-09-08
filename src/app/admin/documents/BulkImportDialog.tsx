"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, XCircle, Link, Upload } from "lucide-react";
import { toast } from "react-toastify";

interface BulkImportResult {
  url: string;
  status: "success" | "error";
  documentId?: string;
  fileName?: string;
  error?: string;
}

interface BulkImportResponse {
  results: BulkImportResult[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function BulkImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: BulkImportDialogProps) {
  const [urls, setUrls] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<BulkImportResult[] | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);

  const resetState = () => {
    setUrls("");
    setResults(null);
    setProgress(0);
    setCurrentBatch(0);
    setTotalBatches(0);
  };

  const handleClose = () => {
    if (!isProcessing) {
      resetState();
      onOpenChange(false);
    }
  };

  const handleImport = async () => {
    // Parse URLs from textarea (one per line)
    const urlList = urls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    if (urlList.length === 0) {
      toast.error("Please enter at least one URL");
      return;
    }

    if (urlList.length > 100) {
      toast.error("Maximum 100 URLs allowed");
      return;
    }

    setIsProcessing(true);
    setResults(null);
    setProgress(0);
    
    // Calculate batches for progress display
    const BATCH_SIZE = 5;
    const totalBatches = Math.ceil(urlList.length / BATCH_SIZE);
    setTotalBatches(totalBatches);

    try {
      // Simulate batch progress (since the actual batching happens server-side)
      let progressInterval: NodeJS.Timeout | null = null;
      let batchCount = 0;
      
      progressInterval = setInterval(() => {
        batchCount++;
        if (batchCount <= totalBatches) {
          setCurrentBatch(batchCount);
          setProgress((batchCount / totalBatches) * 100);
        }
      }, 2000); // Update every 2 seconds

      const response = await fetch("/api/bulk-import-pdfs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ urls: urlList }),
      });

      if (progressInterval) {
        clearInterval(progressInterval);
      }
      setProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Import failed");
      }

      const data: BulkImportResponse = await response.json();
      setResults(data.results);

      // Show summary toast
      if (data.summary.failed === 0) {
        toast.success(`Successfully imported all ${data.summary.successful} documents`);
        onSuccess();
      } else if (data.summary.successful > 0) {
        toast.warning(
          `Imported ${data.summary.successful} documents, ${data.summary.failed} failed`
        );
        onSuccess();
      } else {
        toast.error("All imports failed. Check the results for details.");
      }
    } catch (error) {
      console.error("Bulk import error:", error);
      toast.error((error as Error).message || "Failed to import documents");
    } finally {
      setIsProcessing(false);
      setCurrentBatch(0);
      setTotalBatches(0);
    }
  };

  const getUrlDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url.substring(0, 30) + (url.length > 30 ? "..." : "");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Import PDFs from URLs</DialogTitle>
          <DialogDescription>
            Enter PDF URLs (one per line) to import multiple documents at once.
            Maximum 100 URLs per batch.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto">
          {!results && (
            <>
              <div>
                <label htmlFor="urls" className="text-sm font-medium">
                  PDF URLs
                </label>
                <Textarea
                  id="urls"
                  placeholder="https://example.com/document1.pdf&#10;https://example.com/document2.pdf&#10;https://example.com/document3.pdf"
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                  className="mt-2 min-h-[200px] font-mono text-sm"
                  disabled={isProcessing}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {urls.split('\n').filter(u => u.trim()).length} URL(s) entered
                </p>
              </div>

              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Processing URLs...</span>
                    {totalBatches > 0 && (
                      <span className="text-muted-foreground">
                        Batch {currentBatch} of {totalBatches}
                      </span>
                    )}
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>
              )}
            </>
          )}

          {results && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex gap-4">
                <Alert className="flex-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Successful: {results.filter(r => r.status === "success").length}
                  </AlertDescription>
                </Alert>
                {results.some(r => r.status === "error") && (
                  <Alert variant="destructive" className="flex-1">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      Failed: {results.filter(r => r.status === "error").length}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Results Table */}
              <div className="border rounded-lg">
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead>File Name / Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((result, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Badge
                              variant={result.status === "success" ? "default" : "destructive"}
                            >
                              {result.status === "success" ? (
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                              ) : (
                                <XCircle className="h-3 w-3 mr-1" />
                              )}
                              {result.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            <div className="flex items-center gap-1">
                              <Link className="h-3 w-3" />
                              <span className="truncate max-w-[300px]" title={result.url}>
                                {getUrlDomain(result.url)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {result.status === "success" ? (
                              <span className="text-green-600">
                                {result.fileName}
                              </span>
                            ) : (
                              <span className="text-red-600">
                                {result.error}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              {/* Retry failed URLs */}
              {results.some(r => r.status === "error") && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You can copy the failed URLs and try importing them again.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {!results ? (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={isProcessing || !urls.trim()}
              >
                {isProcessing ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import PDFs
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              {results.some(r => r.status === "error") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    // Copy failed URLs back to textarea
                    const failedUrls = results
                      .filter(r => r.status === "error")
                      .map(r => r.url)
                      .join('\n');
                    setUrls(failedUrls);
                    setResults(null);
                  }}
                >
                  Retry Failed
                </Button>
              )}
              <Button onClick={handleClose}>
                Close
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}