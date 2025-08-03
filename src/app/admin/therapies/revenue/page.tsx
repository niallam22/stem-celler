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
import { Plus, Search, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown, DollarSign } from "lucide-react";
import { toast } from "react-toastify";
import RevenueFormDialog from "./RevenueFormDialog";
import DeleteRevenueDialog from "./DeleteRevenueDialog";

type SortBy = "therapyName" | "period" | "region" | "revenueMillionsUsd" | "lastUpdated";
type SortOrder = "asc" | "desc";

export default function RevenuePage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [therapyFilter, setTherapyFilter] = useState("__all__");
  const [periodFilter, setPeriodFilter] = useState("__all__");
  const [regionFilter, setRegionFilter] = useState("__all__");
  const [sortBy, setSortBy] = useState<SortBy>("lastUpdated");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState<string | null>(null);
  const [deletingRevenue, setDeletingRevenue] = useState<{
    id: string;
    therapyName: string;
    period: string;
    region: string;
  } | null>(null);

  const { data, isLoading, refetch } = api.admin.revenue.list.useQuery({
    page,
    pageSize,
    search,
    therapyId: therapyFilter && therapyFilter !== "__all__" ? therapyFilter : undefined,
    period: periodFilter && periodFilter !== "__all__" ? periodFilter : undefined,
    region: regionFilter && regionFilter !== "__all__" ? regionFilter : undefined,
    sortBy,
    sortOrder,
  });

  const { data: therapyOptions } = api.admin.revenue.getTherapyOptions.useQuery();
  const { data: filterOptions } = api.admin.revenue.getFilterOptions.useQuery();

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

  const formatRevenue = (revenue: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(revenue * 1000000); // Convert millions to actual amount
  };

  const clearFilters = () => {
    setSearch("");
    setTherapyFilter("__all__");
    setPeriodFilter("__all__");
    setRegionFilter("__all__");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Therapy Revenue</h1>
          <p className="text-muted-foreground">
            Manage revenue data for therapies
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Revenue Record
        </Button>
      </div>


      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Revenue Records</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search revenue records..."
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
                {therapyOptions?.map((therapy) => (
                  <SelectItem key={therapy.id} value={therapy.id}>
                    {therapy.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All periods</SelectItem>
                {filterOptions?.periods.map((period) => (
                  <SelectItem key={period} value={period}>
                    {period}
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
            
            {(search || (therapyFilter && therapyFilter !== "__all__") || (periodFilter && periodFilter !== "__all__") || (regionFilter && regionFilter !== "__all__")) && (
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
                      onClick={() => handleSort("period")}
                    >
                      Period
                      {getSortIcon("period")}
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
                      onClick={() => handleSort("revenueMillionsUsd")}
                    >
                      Revenue
                      {getSortIcon("revenueMillionsUsd")}
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
                ) : data?.revenues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No revenue records found
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.revenues.map((revenue) => (
                    <TableRow key={revenue.id}>
                      <TableCell className="font-medium">
                        {revenue.therapyName}
                      </TableCell>
                      <TableCell>{revenue.period}</TableCell>
                      <TableCell>{revenue.region}</TableCell>
                      <TableCell className="font-medium">
                        {formatRevenue(revenue.revenueMillionsUsd)}
                      </TableCell>
                      <TableCell>
                        {new Date(revenue.lastUpdated).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingRevenue(revenue.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setDeletingRevenue({
                                id: revenue.id,
                                therapyName: revenue.therapyName,
                                period: revenue.period,
                                region: revenue.region,
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

      <RevenueFormDialog
        open={isCreateOpen || !!editingRevenue}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingRevenue(null);
          }
        }}
        revenueId={editingRevenue}
        onSuccess={() => {
          refetch();
          setIsCreateOpen(false);
          setEditingRevenue(null);
        }}
      />

      <DeleteRevenueDialog
        open={!!deletingRevenue}
        onOpenChange={(open) => {
          if (!open) setDeletingRevenue(null);
        }}
        revenueId={deletingRevenue?.id}
        therapyName={deletingRevenue?.therapyName}
        period={deletingRevenue?.period}
        region={deletingRevenue?.region}
        onSuccess={() => {
          refetch();
          setDeletingRevenue(null);
        }}
      />
    </div>
  );
}