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
import { Plus, Search, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Upload } from "lucide-react";
import { toast } from "react-toastify";
import RegulatoryBodyFormDialog from "./RegulatoryBodyFormDialog";
import DeleteRegulatoryBodyDialog from "./DeleteRegulatoryBodyDialog";
import BulkAddDialog, { BulkAddColumn } from "@/components/admin/BulkAddDialog";
import CopyTemplate from "@/components/admin/CopyTemplate";

type SortBy = "name" | "region" | "lastUpdated";
type SortOrder = "asc" | "desc";

export default function RegulatoryBodiesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("__all__");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [editingBody, setEditingBody] = useState<string | null>(null);
  const [deletingBody, setDeletingBody] = useState<{
    id: string;
    name: string;
    region: string;
  } | null>(null);

  const { data, isLoading, refetch } = api.admin.regulatoryBody.list.useQuery({
    page,
    pageSize,
    search,
    region: regionFilter && regionFilter !== "__all__" ? regionFilter : undefined,
    sortBy,
    sortOrder,
  });

  const { data: regions } = api.admin.regulatoryBody.getRegions.useQuery();
  const bulkCreateMutation = api.admin.regulatoryBody.bulkCreate.useMutation();

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
    setRegionFilter("__all__");
    setPage(1);
  };

  // Bulk add configuration
  const bulkAddColumns: BulkAddColumn[] = [
    { key: "name", label: "Name/Abbreviation", required: true, type: "string" },
    { key: "fullName", label: "Full Name", required: true, type: "string" },
    { key: "region", label: "Region", required: true, type: "string" },
    { key: "country", label: "Country", required: false, type: "string" },
  ];

  const bulkAddExampleData = [
    {
      name: "AEMPS",
      fullName: "Agencia Española de Medicamentos y Productos Sanitarios",
      region: "Spain",
      country: "Spain"
    },
    {
      name: "ANSM",
      fullName: "Agence nationale de sécurité du médicament",
      region: "France",
      country: "France"
    }
  ];

  const handleBulkAdd = async (data: Record<string, unknown>[]) => {
    try {
      await bulkCreateMutation.mutateAsync({ 
        bodies: data as Array<{
          name: string;
          fullName: string;
          region: string;
          country?: string | null;
        }>
      });
      toast.success(`Successfully added ${data.length} regulatory bodies`);
      refetch();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add regulatory bodies";
      toast.error(errorMessage);
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Regulatory Bodies</h1>
          <p className="text-muted-foreground">
            Manage regulatory bodies and their regions
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Body
          </Button>
          <Button variant="outline" onClick={() => setIsBulkAddOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Add
          </Button>
          <CopyTemplate 
            columns={bulkAddColumns}
            exampleData={bulkAddExampleData}
            name="Regulatory Body"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Regulatory Bodies</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search bodies..."
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
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All regions</SelectItem>
                {regions?.map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {(search || (regionFilter && regionFilter !== "__all__")) && (
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
                      onClick={() => handleSort("name")}
                    >
                      Name
                      {getSortIcon("name")}
                    </Button>
                  </TableHead>
                  <TableHead>Full Name</TableHead>
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
                  <TableHead>Country</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort("lastUpdated")}
                    >
                      Last Updated
                      {getSortIcon("lastUpdated")}
                    </Button>
                  </TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : data?.bodies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No regulatory bodies found
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.bodies.map((body) => (
                    <TableRow key={body.id}>
                      <TableCell className="font-medium">
                        {body.name}
                      </TableCell>
                      <TableCell>{body.fullName}</TableCell>
                      <TableCell>{body.region}</TableCell>
                      <TableCell>{body.country || "-"}</TableCell>
                      <TableCell>
                        {new Date(body.lastUpdated).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingBody(body.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setDeletingBody({
                                id: body.id,
                                name: body.name,
                                region: body.region,
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
                {data.totalCount} regulatory bodies
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

      <RegulatoryBodyFormDialog
        open={isCreateOpen || !!editingBody}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingBody(null);
          }
        }}
        bodyId={editingBody}
        onSuccess={() => {
          refetch();
          setIsCreateOpen(false);
          setEditingBody(null);
        }}
      />

      <DeleteRegulatoryBodyDialog
        open={!!deletingBody}
        onOpenChange={(open) => {
          if (!open) setDeletingBody(null);
        }}
        bodyId={deletingBody?.id}
        bodyName={deletingBody?.name}
        bodyRegion={deletingBody?.region}
        onSuccess={() => {
          refetch();
          setDeletingBody(null);
        }}
      />

      <BulkAddDialog
        open={isBulkAddOpen}
        onOpenChange={setIsBulkAddOpen}
        title="Bulk Add Regulatory Bodies"
        description="Add multiple regulatory bodies at once by providing JSON data. Each body should include name, full name, region, and optionally country."
        columns={bulkAddColumns}
        exampleData={bulkAddExampleData}
        onSubmit={handleBulkAdd}
        isLoading={bulkCreateMutation.isPending}
      />
    </div>
  );
}