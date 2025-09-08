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
import DiseaseFormDialog from "./DiseaseFormDialog";
import DeleteDiseaseDialog from "./DeleteDiseaseDialog";
import BulkAddDialog, { BulkAddColumn } from "@/components/admin/BulkAddDialog";
import CopyTemplate from "@/components/admin/CopyTemplate";
import { formatDate } from "@/lib/utils/date";

type SortBy = "name" | "category" | "subcategory" | "icd10Code" | "annualIncidenceUs" | "lastUpdated";
type SortOrder = "asc" | "desc";

type DiseaseInput = {
  name: string;
  indication?: string;
  category: string;
  subcategory?: string;
  icd10Code?: string;
  annualIncidenceUs?: number;
  sources: string[];
};

export default function DiseasesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("__all__");
  const [subcategoryFilter, setSubcategoryFilter] = useState("__all__");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [editingDisease, setEditingDisease] = useState<string | null>(null);
  const [deletingDisease, setDeletingDisease] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { data, isLoading, refetch } = api.admin.disease.list.useQuery({
    page,
    pageSize,
    search,
    category: categoryFilter && categoryFilter !== "__all__" ? categoryFilter : undefined,
    subcategory: subcategoryFilter && subcategoryFilter !== "__all__" ? subcategoryFilter : undefined,
    sortBy,
    sortOrder,
  });

  const { data: filterOptions } = api.admin.disease.getFilterOptions.useQuery();
  const bulkCreateMutation = api.admin.disease.bulkCreate.useMutation();

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

  const formatIncidence = (incidence: number | null) => {
    if (!incidence) return "N/A";
    return new Intl.NumberFormat("en-US").format(incidence);
  };

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("__all__");
    setSubcategoryFilter("__all__");
    setPage(1);
  };

  // Bulk add configuration
  const bulkAddColumns: BulkAddColumn[] = [
    { key: "name", label: "Name", required: true, type: "string" },
    { key: "indication", label: "Indication", required: false, type: "string" },
    { key: "category", label: "Category", required: true, type: "string" },
    { key: "subcategory", label: "Subcategory", required: false, type: "string" },
    { key: "icd10Code", label: "ICD-10 Code", required: false, type: "string" },
    { key: "annualIncidenceUs", label: "Annual Incidence (US)", required: false, type: "number" },
    { key: "sources", label: "Sources", required: true, type: "array" },
  ];

  const bulkAddExampleData = [
    {
      name: "Acute Lymphoblastic Leukemia",
      indication: "ALL",
      category: "Hematologic Malignancy",
      subcategory: "Acute Leukemia",
      icd10Code: "C91.0",
      annualIncidenceUs: 6000,
      sources: ["https://www.cancer.gov/<exact-route-to-source-data>", "https://www.cdc.gov/<exact-route-to-source-data>"]
    },
    {
      name: "Diffuse Large B-Cell Lymphoma",
      indication: "DLBCL",
      category: "Hematologic Malignancy",
      subcategory: "B-Cell Lymphoma",
      icd10Code: "C83.3",
      annualIncidenceUs: 27000,
      sources: ["https://seer.cancer.gov/<exact-route-to-source-data>", "https://www.cancer.org/<exact-route-to-source-data>"]
    }
  ];

  const handleBulkAdd = async (data: Record<string, unknown>[]) => {
    try {
      const diseases = data as DiseaseInput[];
      await bulkCreateMutation.mutateAsync({ diseases });
      toast.success(`Successfully added ${diseases.length} diseases`);
      refetch();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add diseases";
      toast.error(errorMessage);
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Diseases</h1>
          <p className="text-muted-foreground">
            Manage disease records and categories
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Disease
          </Button>
          <Button variant="outline" onClick={() => setIsBulkAddOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Add
          </Button>
          <CopyTemplate 
            columns={bulkAddColumns}
            exampleData={bulkAddExampleData}
            name="Disease"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Diseases</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search diseases..."
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
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All categories</SelectItem>
                {filterOptions?.categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={subcategoryFilter} onValueChange={setSubcategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by subcategory" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All subcategories</SelectItem>
                {filterOptions?.subcategories.map((subcategory) => (
                  <SelectItem key={subcategory} value={subcategory || ""}>
                    {subcategory}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {(search || (categoryFilter && categoryFilter !== "__all__") || (subcategoryFilter && subcategoryFilter !== "__all__")) && (
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
                  <TableHead>Indication</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort("category")}
                    >
                      Category
                      {getSortIcon("category")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort("subcategory")}
                    >
                      Subcategory
                      {getSortIcon("subcategory")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort("icd10Code")}
                    >
                      ICD-10 Code
                      {getSortIcon("icd10Code")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort("annualIncidenceUs")}
                    >
                      Annual Incidence (US)
                      {getSortIcon("annualIncidenceUs")}
                    </Button>
                  </TableHead>
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
                    <TableCell colSpan={9} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : data?.diseases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">
                      No diseases found
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.diseases.map((disease) => (
                    <TableRow key={disease.id}>
                      <TableCell className="font-medium">
                        {disease.name}
                      </TableCell>
                      <TableCell>{disease.indication || "-"}</TableCell>
                      <TableCell>{disease.category}</TableCell>
                      <TableCell>{disease.subcategory || "-"}</TableCell>
                      <TableCell>{disease.icd10Code || "-"}</TableCell>
                      <TableCell>
                        {formatIncidence(disease.annualIncidenceUs)}
                      </TableCell>
                      <TableCell>
                        {formatDate(disease.lastUpdated)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingDisease(disease.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setDeletingDisease({
                                id: disease.id,
                                name: disease.name,
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

      <DiseaseFormDialog
        open={isCreateOpen || !!editingDisease}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingDisease(null);
          }
        }}
        diseaseId={editingDisease}
        onSuccess={() => {
          refetch();
          setIsCreateOpen(false);
          setEditingDisease(null);
        }}
      />

      <DeleteDiseaseDialog
        open={!!deletingDisease}
        onOpenChange={(open) => {
          if (!open) setDeletingDisease(null);
        }}
        diseaseId={deletingDisease?.id}
        diseaseName={deletingDisease?.name}
        onSuccess={() => {
          refetch();
          setDeletingDisease(null);
        }}
      />

      <BulkAddDialog
        open={isBulkAddOpen}
        onOpenChange={setIsBulkAddOpen}
        title="Bulk Add Diseases"
        description="Add multiple diseases at once by providing JSON data. Each disease should include an ID, name, category, and sources."
        columns={bulkAddColumns}
        exampleData={bulkAddExampleData}
        onSubmit={handleBulkAdd}
        isLoading={bulkCreateMutation.isPending}
      />
    </div>
  );
}