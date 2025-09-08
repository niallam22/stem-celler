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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Upload, MoreHorizontal, FileText, Eye, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown, Link as LinkIcon, Download, Edit, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import DocumentUploadDialog from "./DocumentUploadDialog";
import DocumentFormDialog from "./DocumentFormDialog";
import DeleteDocumentDialog from "./DeleteDocumentDialog";
import BulkImportDialog from "./BulkImportDialog";
import { formatDate } from "@/lib/utils/date";
import Link from "next/link";

type SortBy = "fileName" | "companyName" | "reportType" | "reportingPeriod" | "uploadedAt";
type SortOrder = "asc" | "desc";

const statusColors = {
  not_queued: "secondary",
  pending: "warning",
  processing: "default",
  completed: "success",
  failed: "destructive",
} as const;

// Priority labels removed - not currently used

export default function DocumentsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("__all__");
  const [reportTypeFilter, setReportTypeFilter] = useState("__all__");
  const [sortBy, setSortBy] = useState<SortBy>("uploadedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [editDocumentId, setEditDocumentId] = useState<string | null>(null);
  const [deleteDocument, setDeleteDocument] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading, refetch } = api.admin.document.list.useQuery({
    page,
    pageSize,
    search,
    companyName: companyFilter && companyFilter !== "__all__" ? companyFilter : undefined,
    reportType: reportTypeFilter && reportTypeFilter !== "__all__" ? reportTypeFilter : undefined,
    sortBy,
    sortOrder,
  });

  const { data: companyOptions } = api.admin.document.getCompanyOptions.useQuery();

  const queueExtraction = api.admin.document.queueExtraction.useMutation({
    onSuccess: () => {
      toast.success("Document queued for extraction");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updatePriority = api.admin.document.updatePriority.useMutation({
    onSuccess: () => {
      toast.success("Priority updated");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const utils = api.useUtils();
  
  const downloadDocument = async (documentId: string) => {
    try {
      const result = await utils.admin.document.getDownloadUrl.fetch({ id: documentId });
      window.open(result.url, "_blank");
    } catch (error) {
      toast.error("Failed to generate download URL");
    }
  };

  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
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

  const clearFilters = () => {
    setSearch("");
    setCompanyFilter("__all__");
    setReportTypeFilter("__all__");
    setPage(1);
  };

  const getStatusBadge = (status: string) => {
    const variantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      secondary: "secondary",
      warning: "outline",
      default: "default",
      success: "default",
      destructive: "destructive",
    };
    const colorVariant = statusColors[status as keyof typeof statusColors] || "secondary";
    const variant = variantMap[colorVariant] || "secondary";
    const label = status.replace("_", " ").charAt(0).toUpperCase() + status.slice(1).replace("_", " ");
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            Upload and manage documents for data extraction
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
          <Button variant="outline" onClick={() => setIsBulkImportOpen(true)}>
            <LinkIcon className="mr-2 h-4 w-4" />
            Bulk Import URLs
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Documents</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 w-[300px]"
                />
              </div>
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
          
          {/* Filters */}
          <div className="flex items-center gap-4 mt-4">
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All companies</SelectItem>
                {companyOptions?.map((company) => (
                  <SelectItem key={company} value={company || ""}>
                    {company}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={reportTypeFilter} onValueChange={setReportTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All types</SelectItem>
                <SelectItem value="annual">Annual Report</SelectItem>
                <SelectItem value="quarterly">Quarterly Report</SelectItem>
              </SelectContent>
            </Select>
            
            {(search || (companyFilter && companyFilter !== "__all__") || (reportTypeFilter && reportTypeFilter !== "__all__")) && (
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort("fileName")}
                    >
                      File Name
                      {getSortIcon("fileName")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort("companyName")}
                    >
                      Company
                      {getSortIcon("companyName")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort("reportType")}
                    >
                      Report Type
                      {getSortIcon("reportType")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort("reportingPeriod")}
                    >
                      Period
                      {getSortIcon("reportingPeriod")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort("uploadedAt")}
                    >
                      Upload Date
                      {getSortIcon("uploadedAt")}
                    </Button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : data?.documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No documents found
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium max-w-[300px] truncate">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span title={doc.fileName}>{doc.fileName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{doc.companyName || "-"}</TableCell>
                      <TableCell>
                        {doc.reportType ? (
                          <Badge variant="outline">
                            {doc.reportType === "annual" ? "Annual" : "Quarterly"}
                          </Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell>{doc.reportingPeriod || "-"}</TableCell>
                      <TableCell>
                        {formatDate(doc.uploadedAt)}
                      </TableCell>
                      <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => downloadDocument(doc.id)}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem
                              onClick={() => setEditDocumentId(doc.id)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            {doc.status === "not_queued" && (
                              <DropdownMenuItem
                                onClick={() => queueExtraction.mutate({
                                  documentId: doc.id,
                                  priority: "low",
                                })}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Queue Extraction
                              </DropdownMenuItem>
                            )}
                            
                            {doc.status === "pending" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => updatePriority.mutate({
                                    documentId: doc.id,
                                    priority: "high",
                                  })}
                                >
                                  <Badge variant="destructive" className="mr-2 h-4">H</Badge>
                                  Set High Priority
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => updatePriority.mutate({
                                    documentId: doc.id,
                                    priority: "medium",
                                  })}
                                >
                                  <Badge variant="secondary" className="mr-2 h-4">M</Badge>
                                  Set Medium Priority
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => updatePriority.mutate({
                                    documentId: doc.id,
                                    priority: "low",
                                  })}
                                >
                                  <Badge variant="secondary" className="mr-2 h-4">L</Badge>
                                  Set Low Priority
                                </DropdownMenuItem>
                              </>
                            )}
                            
                            {doc.status === "failed" && (
                              <DropdownMenuItem
                                onClick={() => queueExtraction.mutate({
                                  documentId: doc.id,
                                  priority: "low",
                                })}
                              >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Requeue
                              </DropdownMenuItem>
                            )}
                            
                            {doc.status === "completed" && (
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/extractions?documentId=${doc.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Extraction
                                </Link>
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteDocument({ id: doc.id, name: doc.fileName })}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
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

      <DocumentUploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        onSuccess={() => {
          refetch();
          setIsUploadOpen(false);
        }}
      />

      <BulkImportDialog
        open={isBulkImportOpen}
        onOpenChange={setIsBulkImportOpen}
        onSuccess={() => {
          refetch();
        }}
      />

      <DocumentFormDialog
        open={!!editDocumentId}
        onOpenChange={(open) => {
          if (!open) setEditDocumentId(null);
        }}
        documentId={editDocumentId}
        onSuccess={() => {
          refetch();
          setEditDocumentId(null);
        }}
      />

      <DeleteDocumentDialog
        open={!!deleteDocument}
        onOpenChange={(open) => {
          if (!open) setDeleteDocument(null);
        }}
        documentId={deleteDocument?.id || null}
        documentName={deleteDocument?.name || null}
        onSuccess={() => {
          refetch();
          setDeleteDocument(null);
        }}
      />
    </div>
  );
}