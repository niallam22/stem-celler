"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Search, 
  Eye, 
  Edit, 
  Check, 
  FileText, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Activity,
  DollarSign,
  CheckCircle2,
  X,
  Trash2
} from "lucide-react";
import { toast } from "react-toastify";
import Link from "next/link";
import ExtractionReviewDialog from "./ExtractionReviewDialog";

type SortBy = "createdAt" | "updatedAt" | "approvedAt";
type SortOrder = "asc" | "desc";

export default function ExtractionsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | "all">("all");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [reviewingExtraction, setReviewingExtraction] = useState<string | null>(null);
  const [rejectingExtraction, setRejectingExtraction] = useState<string | null>(null);
  const [deletingExtraction, setDeletingExtraction] = useState<string | null>(null);

  const { data, isLoading, refetch } = api.admin.extraction.list.useQuery({
    page,
    pageSize,
    search,
    status: statusFilter,
    sortBy,
    sortOrder,
  });

  const approveMutation = api.admin.extraction.approve.useMutation({
    onSuccess: () => {
      toast.success("Extraction approved and data imported successfully");
      refetch();
      setReviewingExtraction(null);
    },
    onError: (error) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
  });

  const rejectMutation = api.admin.extraction.reject.useMutation({
    onSuccess: () => {
      toast.success("Extraction rejected successfully");
      refetch();
      setRejectingExtraction(null);
    },
    onError: (error) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });

  const deleteMutation = api.admin.extraction.delete.useMutation({
    onSuccess: () => {
      toast.success("Extraction deleted successfully");
      refetch();
      setDeletingExtraction(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const getSortIcon = (column: SortBy) => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600";
    if (confidence >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceBadge = (confidence: number) => {
    const variant = confidence >= 80 ? "default" : confidence >= 60 ? "secondary" : "destructive";
    return <Badge variant={variant as any}>{confidence}%</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Extractions</h1>
          <p className="text-muted-foreground">
            Review and approve extracted data before importing to production
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Extraction Results</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by document or company..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 w-[300px]"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as any)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort("createdAt")}
                    >
                      Extracted Date
                      {getSortIcon("createdAt")}
                    </Button>
                  </TableHead>
                  <TableHead>Confidence Score</TableHead>
                  <TableHead>Review Status</TableHead>
                  <TableHead>Approved By</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : data?.extractions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      No extractions found
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.extractions.map((extraction) => {
                    const avgConfidence = Math.round(
                      (extraction.extractedData.confidence.therapy +
                        extraction.extractedData.confidence.revenue +
                        extraction.extractedData.confidence.approvals) / 3
                    );

                    return (
                      <TableRow key={extraction.id}>
                        <TableCell className="font-medium max-w-[250px] truncate">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span title={extraction.document.fileName}>
                              {extraction.document.fileName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{extraction.document.companyName || "-"}</TableCell>
                        <TableCell>{extraction.document.reportingPeriod || "-"}</TableCell>
                        <TableCell>
                          {new Date(extraction.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={avgConfidence} 
                              className={`h-2 w-16 ${getConfidenceColor(avgConfidence)}`}
                            />
                            {getConfidenceBadge(avgConfidence)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {extraction.requiresReview ? (
                            <Badge variant="secondary">Pending Review</Badge>
                          ) : extraction.approvedAt ? (
                            <Badge variant="default">Approved</Badge>
                          ) : (
                            <Badge variant="destructive">Rejected</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {extraction.approvedBy || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setReviewingExtraction(extraction.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {extraction.requiresReview && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => approveMutation.mutate({ id: extraction.id })}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setRejectingExtraction(extraction.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeletingExtraction(extraction.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {data && (data.hasNextPage || data.hasPreviousPage) && (
            <div className="mt-4 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={!data.hasPreviousPage}
                >
                  Previous
                </Button>
                <span className="text-sm">Page {page}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={!data.hasNextPage}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {reviewingExtraction && (
        <ExtractionReviewDialog
          extractionId={reviewingExtraction}
          open={!!reviewingExtraction}
          onOpenChange={(open) => {
            if (!open) setReviewingExtraction(null);
          }}
          onApprove={() => {
            approveMutation.mutate({ id: reviewingExtraction });
          }}
        />
      )}

      {/* Reject Confirmation Dialog */}
      <Dialog open={!!rejectingExtraction} onOpenChange={(open) => {
        if (!open) setRejectingExtraction(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Extraction</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this extraction? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingExtraction(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (rejectingExtraction) {
                  rejectMutation.mutate({ id: rejectingExtraction });
                }
              }}
              disabled={rejectMutation.isLoading}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingExtraction} onOpenChange={(open) => {
        if (!open) setDeletingExtraction(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Extraction</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this extraction? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingExtraction(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deletingExtraction) {
                  deleteMutation.mutate({ id: deletingExtraction });
                }
              }}
              disabled={deleteMutation.isLoading}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}