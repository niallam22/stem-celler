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
import { Plus, Search, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Filter } from "lucide-react";
import { toast } from "react-toastify";
import ApprovalFormDialog from "./ApprovalFormDialog";
import DeleteApprovalDialog from "./DeleteApprovalDialog";

type SortBy = "therapyName" | "diseaseName" | "region" | "approvalDate" | "regulatoryBody";
type SortOrder = "asc" | "desc";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Therapy Approvals</h1>
          <p className="text-muted-foreground">
            Manage regulatory approvals for therapies
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Approval
        </Button>
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
                  <SelectItem key={therapy.id} value={therapy.id}>
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
                        {new Date(approval.approvalDate).toLocaleDateString()}
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
    </div>
  );
}