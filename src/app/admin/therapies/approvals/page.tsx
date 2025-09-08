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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Filter, Upload } from "lucide-react";
import { toast } from "react-toastify";
import ApprovalFormDialog from "./ApprovalFormDialog";
import DeleteApprovalDialog from "./DeleteApprovalDialog";
import BulkAddDialog, { BulkAddColumn } from "@/components/admin/BulkAddDialog";
import CopyTemplate from "@/components/admin/CopyTemplate";
import { parseDDMMYYYY, formatDate } from "@/lib/utils/date";

type SortBy = "therapyName" | "diseaseName" | "region" | "approvalDate" | "regulatoryBody";
type SortOrder = "asc" | "desc";

type ApprovalInput = {
  therapyName: string;
  diseaseIndication: string;
  region: string;
  approvalDate: Date;
  approvalType: string;
  regulatoryBody: string;
  sources: string[];
};

export default function ApprovalsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [therapyFilter, setTherapyFilter] = useState("__all__");
  const [regionFilter, setRegionFilter] = useState("__all__");
  const [regulatoryBodyFilter, setRegulatoryBodyFilter] = useState("__all__");
  const [sortBy, setSortBy] = useState<SortBy>("approvalDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [editingApproval, setEditingApproval] = useState<string | null>(null);
  const [deletingApproval, setDeletingApproval] = useState<{
    id: string;
    therapyName: string;
    diseaseName: string;
  } | null>(null);

  const { data, isLoading, refetch } = api.admin.approval.list.useQuery({
    page,
    pageSize,
    search,
    therapyId: therapyFilter && therapyFilter !== "__all__" ? therapyFilter : undefined,
    region: regionFilter && regionFilter !== "__all__" ? regionFilter : undefined,
    regulatoryBody: regulatoryBodyFilter && regulatoryBodyFilter !== "__all__" ? regulatoryBodyFilter : undefined,
    sortBy,
    sortOrder,
  });

  const { data: therapyOptions } = api.admin.approval.getOptions.useQuery();
  const { data: filterOptions } = api.admin.approval.getFilterOptions.useQuery();
  const bulkCreateMutation = api.admin.approval.bulkCreate.useMutation();

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
    setTherapyFilter("__all__");
    setRegionFilter("__all__");
    setRegulatoryBodyFilter("__all__");
    setPage(1);
  };

  // Bulk add configuration
  const bulkAddColumns: BulkAddColumn[] = [
    { key: "therapyName", label: "Therapy Name", required: true, type: "string" },
    { key: "diseaseIndication", label: "Disease Indication", required: true, type: "string" },
    { key: "region", label: "Region", required: true, type: "string" },
    { key: "approvalDate", label: "Approval Date (DD/MM/YYYY)", required: true, type: "string" },
    { key: "approvalType", label: "Approval Type", required: true, type: "string" },
    { key: "regulatoryBody", label: "Regulatory Body", required: true, type: "string" },
    { key: "sources", label: "Sources", required: true, type: "array" },
  ];

  const bulkAddExampleData = [
    {
      therapyName: "Kymriah",
      diseaseIndication: "ALL",
      region: "United States",
      approvalDate: "30/08/2017",
      approvalType: "Full Approval",
      regulatoryBody: "FDA",
      sources: ["https://www.fda.gov/<exact-route-to-source-data>", "https://www.novartis.com/<exact-route-to-source-data>"]
    },
    {
      therapyName: "Yescarta",
      diseaseIndication: "DLBCL",
      region: "European Union",
      approvalDate: "23/08/2018",
      approvalType: "Conditional Approval",
      regulatoryBody: "EMA",
      sources: ["https://www.ema.europa.eu/<exact-route-to-source-data>", "https://www.gilead.com/<exact-route-to-source-data>"]
    }
  ];

  const handleBulkAdd = async (data: Record<string, unknown>[]) => {
    try {
      // Transform date strings to Date objects (DD/MM/YYYY format)
      const processedData: ApprovalInput[] = data.map(item => ({
        therapyName: item.therapyName as string,
        diseaseIndication: item.diseaseIndication as string,
        region: item.region as string,
        approvalDate: parseDDMMYYYY(item.approvalDate as string),
        approvalType: item.approvalType as string,
        regulatoryBody: item.regulatoryBody as string,
        sources: item.sources as string[],
      }));
      
      await bulkCreateMutation.mutateAsync({ approvals: processedData });
      toast.success(`Successfully added ${data.length} approvals`);
      refetch();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add approvals";
      toast.error(errorMessage);
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Therapy Approvals</h1>
          <p className="text-muted-foreground">
            Manage regulatory approvals for therapies
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Approval
          </Button>
          <Button variant="outline" onClick={() => setIsBulkAddOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Add
          </Button>
          <CopyTemplate 
            columns={bulkAddColumns}
            exampleData={bulkAddExampleData}
            name="Approval"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Approvals</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search approvals..."
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
            <Select value={therapyFilter} onValueChange={setTherapyFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by therapy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All therapies</SelectItem>
                {therapyOptions?.therapies.map((therapy) => (
                  <SelectItem key={therapy.name} value={therapy.name}>
                    {therapy.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All regions</SelectItem>
                {filterOptions?.regions.map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={regulatoryBodyFilter} onValueChange={setRegulatoryBodyFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by body" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All bodies</SelectItem>
                {filterOptions?.regulatoryBodies.map((body) => (
                  <SelectItem key={body} value={body}>
                    {body}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {(search || (therapyFilter && therapyFilter !== "__all__") || (regionFilter && regionFilter !== "__all__") || (regulatoryBodyFilter && regulatoryBodyFilter !== "__all__")) && (
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
                      onClick={() => handleSort("therapyName")}
                    >
                      Therapy
                      {getSortIcon("therapyName")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort("diseaseName")}
                    >
                      Disease
                      {getSortIcon("diseaseName")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort("region")}
                    >
                      Region
                      {getSortIcon("region")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort("approvalDate")}
                    >
                      Approval Date
                      {getSortIcon("approvalDate")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort("regulatoryBody")}
                    >
                      Regulatory Body
                      {getSortIcon("regulatoryBody")}
                    </Button>
                  </TableHead>
                  <TableHead>Approval Type</TableHead>
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
                ) : data?.approvals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No approvals found
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.approvals.map((approval) => (
                    <TableRow key={approval.id}>
                      <TableCell className="font-medium">
                        {approval.therapyName}
                      </TableCell>
                      <TableCell>{approval.diseaseName}</TableCell>
                      <TableCell>{approval.region}</TableCell>
                      <TableCell>
                        {formatDate(approval.approvalDate)}
                      </TableCell>
                      <TableCell>{approval.regulatoryBody}</TableCell>
                      <TableCell>{approval.approvalType}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingApproval(approval.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setDeletingApproval({
                                id: approval.id,
                                therapyName: approval.therapyName,
                                diseaseName: approval.diseaseName,
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {data && data.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1} to{" "}
                {Math.min(page * pageSize, data.totalCount)} of{" "}
                {data.totalCount} approvals
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {page} of {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === data.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ApprovalFormDialog
        open={isCreateOpen || !!editingApproval}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingApproval(null);
          }
        }}
        approvalId={editingApproval}
        onSuccess={() => {
          refetch();
          setIsCreateOpen(false);
          setEditingApproval(null);
        }}
      />

      <DeleteApprovalDialog
        open={!!deletingApproval}
        onOpenChange={(open) => {
          if (!open) setDeletingApproval(null);
        }}
        approvalId={deletingApproval?.id}
        therapyName={deletingApproval?.therapyName}
        diseaseName={deletingApproval?.diseaseName}
        onSuccess={() => {
          refetch();
          setDeletingApproval(null);
        }}
      />

      <BulkAddDialog
        open={isBulkAddOpen}
        onOpenChange={setIsBulkAddOpen}
        title="Bulk Add Therapy Approvals"
        description="Add multiple therapy approvals at once by providing JSON data. Each approval should include therapy ID, disease ID, region, approval date, type, regulatory body, and sources."
        columns={bulkAddColumns}
        exampleData={bulkAddExampleData}
        onSubmit={handleBulkAdd}
        isLoading={bulkCreateMutation.isPending}
      />
    </div>
  );
}