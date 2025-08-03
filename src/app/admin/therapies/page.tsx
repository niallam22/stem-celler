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
import { Plus, Search, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "react-toastify";
import TherapyFormDialog from "./TherapyFormDialog";
import DeleteTherapyDialog from "./DeleteTherapyDialog";

type SortBy = "name" | "manufacturer" | "pricePerTreatmentUsd" | "lastUpdated";
type SortOrder = "asc" | "desc";

export default function TherapiesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTherapy, setEditingTherapy] = useState<string | null>(null);
  const [deletingTherapy, setDeletingTherapy] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { data, isLoading, refetch } = api.admin.therapy.list.useQuery({
    page,
    pageSize,
    search,
    sortBy,
    sortOrder,
  });

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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Therapies</h1>
          <p className="text-muted-foreground">
            Manage stem cell therapy records
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Therapy
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Therapies</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search therapies..."
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
                      onClick={() => handleSort("manufacturer")}
                    >
                      Manufacturer
                      {getSortIcon("manufacturer")}
                    </Button>
                  </TableHead>
                  <TableHead>Mechanism</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort("pricePerTreatmentUsd")}
                    >
                      Price
                      {getSortIcon("pricePerTreatmentUsd")}
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
                    <TableCell colSpan={6} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : data?.therapies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No therapies found
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.therapies.map((therapy) => (
                    <TableRow key={therapy.id}>
                      <TableCell className="font-medium">
                        {therapy.name}
                      </TableCell>
                      <TableCell>{therapy.manufacturer}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {therapy.mechanism}
                      </TableCell>
                      <TableCell>
                        {formatPrice(therapy.pricePerTreatmentUsd)}
                      </TableCell>
                      <TableCell>
                        {new Date(therapy.lastUpdated).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingTherapy(therapy.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setDeletingTherapy({
                                id: therapy.id,
                                name: therapy.name,
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
                {data.totalCount} therapies
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

      <TherapyFormDialog
        open={isCreateOpen || !!editingTherapy}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingTherapy(null);
          }
        }}
        therapyId={editingTherapy}
        onSuccess={() => {
          refetch();
          setIsCreateOpen(false);
          setEditingTherapy(null);
        }}
      />

      <DeleteTherapyDialog
        open={!!deletingTherapy}
        onOpenChange={(open) => {
          if (!open) setDeletingTherapy(null);
        }}
        therapyId={deletingTherapy?.id}
        therapyName={deletingTherapy?.name}
        onSuccess={() => {
          refetch();
          setDeletingTherapy(null);
        }}
      />
    </div>
  );
}