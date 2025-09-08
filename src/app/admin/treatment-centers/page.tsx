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
import { Plus, Search, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Upload, Globe, Phone } from "lucide-react";
import { toast } from "react-toastify";
import TreatmentCenterFormDialog from "./TreatmentCenterFormDialog";
import DeleteTreatmentCenterDialog from "./DeleteTreatmentCenterDialog";
import BulkAddDialog, { BulkAddColumn } from "@/components/admin/BulkAddDialog";
import CopyTemplate from "@/components/admin/CopyTemplate";
import { formatDate } from "@/lib/utils/date";
import { Badge } from "@/components/ui/badge";

type SortBy = "name" | "address" | "lastUpdated";
type SortOrder = "asc" | "desc";

export default function TreatmentCentersPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<string | null>(null);
  const [deletingCenter, setDeletingCenter] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { data, isLoading, refetch } = api.admin.treatmentCenter.list.useQuery({
    page,
    pageSize,
    search,
    sortBy,
    sortOrder,
  });

  const bulkCreateMutation = api.admin.treatmentCenter.bulkCreate.useMutation();

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

  // Bulk add configuration
  const bulkAddColumns: BulkAddColumn[] = [
    { key: "name", label: "Name", required: true, type: "string" },
    { key: "address", label: "Address", required: true, type: "string" },
    { key: "availableTherapies", label: "Available Therapies", required: true, type: "array" },
    { key: "phone", label: "Phone", required: false, type: "string" },
    { key: "website", label: "Website", required: false, type: "string" },
    { key: "about", label: "About", required: false, type: "string" },
  ];

  const bulkAddExampleData = [
    {
      name: "Memorial Sloan Kettering Cancer Center",
      address: "1275 York Avenue, New York, NY 10065",
      availableTherapies: ["Yescarta", "Kymriah"],
      phone: "(212) 639-2000",
      website: "https://www.mskcc.org",
      about: "Leading cancer treatment center offering advanced CAR-T cell therapies"
    },
    {
      name: "Dana-Farber Cancer Institute",
      address: "450 Brookline Avenue, Boston, MA 02215",
      availableTherapies: ["Kymriah"],
      phone: "(617) 632-3000",
      website: "https://www.dana-farber.org",
      about: "Comprehensive cancer center specializing in hematologic malignancies"
    }
  ];

  const handleBulkAdd = async (data: Record<string, unknown>[]) => {
    try {
      // Type the centers array to match the expected schema
      const centers = data.map(item => ({
        name: item.name as string,
        address: item.address as string,
        availableTherapies: item.availableTherapies as string[],
        website: item.website as string | undefined,
        phone: item.phone as string | undefined,
        about: item.about as string | undefined,
      }));
      
      await bulkCreateMutation.mutateAsync({ centers });
      toast.success(`Successfully added ${data.length} treatment centers`);
      refetch();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add treatment centers";
      toast.error(errorMessage);
      throw error;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Treatment Centers</h1>
          <p className="text-muted-foreground">
            Manage treatment center locations and information
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Center
          </Button>
          <Button variant="outline" onClick={() => setIsBulkAddOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Add
          </Button>
          <CopyTemplate 
            columns={bulkAddColumns}
            exampleData={bulkAddExampleData}
            name="Treatment Center"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Treatment Centers</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search centers..."
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
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort("address")}
                    >
                      Address
                      {getSortIcon("address")}
                    </Button>
                  </TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Available Therapies</TableHead>
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
                ) : data?.centers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No treatment centers found
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.centers.map((center) => (
                    <TableRow key={center.id}>
                      <TableCell className="font-medium">
                        {center.name}
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <div className="truncate" title={center.address}>
                          {center.address}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {center.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <span className="text-sm">{center.phone}</span>
                            </div>
                          )}
                          {center.website && (
                            <a
                              href={center.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                            >
                              <Globe className="h-3 w-3" />
                              <span className="text-sm">Website</span>
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {center.availableTherapies.slice(0, 3).map((therapy) => (
                            <Badge key={therapy} variant="secondary" className="text-xs">
                              {therapy}
                            </Badge>
                          ))}
                          {center.availableTherapies.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{center.availableTherapies.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(center.lastUpdated)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingCenter(center.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setDeletingCenter({
                                id: center.id,
                                name: center.name,
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
                {data.totalCount} centers
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === data.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <TreatmentCenterFormDialog
        open={isCreateOpen || !!editingCenter}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingCenter(null);
          }
        }}
        centerId={editingCenter}
        onSuccess={() => {
          setIsCreateOpen(false);
          setEditingCenter(null);
          refetch();
        }}
      />

      <DeleteTreatmentCenterDialog
        center={deletingCenter}
        onClose={() => setDeletingCenter(null)}
        onSuccess={() => {
          setDeletingCenter(null);
          refetch();
        }}
      />

      <BulkAddDialog
        open={isBulkAddOpen}
        onOpenChange={setIsBulkAddOpen}
        columns={bulkAddColumns}
        exampleData={bulkAddExampleData}
        onSubmit={handleBulkAdd}
        title="Bulk Add Treatment Centers"
        description="Add multiple treatment centers at once. Addresses will be geocoded automatically."
      />
    </div>
  );
}