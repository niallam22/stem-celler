"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/trpc/react";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  RotateCcw,
  Ban,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  Timer
} from "lucide-react";
import { toast } from "react-toastify";
import Link from "next/link";

type SortBy = "priority" | "createdAt" | "startedAt";
type SortOrder = "asc" | "desc";

const statusConfig = {
  pending: { label: "Pending", icon: Clock, color: "warning" },
  processing: { label: "Processing", icon: Loader2, color: "default" },
  completed: { label: "Completed", icon: CheckCircle2, color: "success" },
  failed: { label: "Failed", icon: XCircle, color: "destructive" },
} as const;

const priorityConfig = {
  1: { label: "High", color: "destructive" },
  2: { label: "Medium", color: "warning" },
  3: { label: "Low", color: "secondary" },
} as const;

export default function JobQueuePage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<"pending" | "processing" | "completed" | "failed" | "all">("all");
  const [sortBy, setSortBy] = useState<SortBy>("priority");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const { data: jobs, isLoading, refetch } = api.admin.queue.list.useQuery({
    page,
    pageSize,
    status: statusFilter,
    sortBy,
    sortOrder,
  });

  const { data: stats } = api.admin.queue.getStats.useQuery();

  const retryMutation = api.admin.queue.retry.useMutation({
    onSuccess: () => {
      toast.success("Job queued for retry");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const cancelMutation = api.admin.queue.cancel.useMutation({
    onSuccess: () => {
      toast.success("Job cancelled");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetMutation = api.admin.queue.reset.useMutation({
    onSuccess: () => {
      toast.success("Job reset to pending");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Auto-refresh for processing jobs
  useEffect(() => {
    const hasProcessingJobs = jobs?.jobs.some(j => j.status === "processing");
    if (hasProcessingJobs) {
      const interval = setInterval(() => {
        refetch();
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(interval);
    }
  }, [jobs, refetch]);

  const handleSort = (column: SortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder(column === "priority" ? "asc" : "desc");
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

  const getStatusBadge = (status: keyof typeof statusConfig) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <Badge variant={config.color as any} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: number) => {
    const config = priorityConfig[priority as keyof typeof priorityConfig];
    return (
      <Badge variant={config.color as any}>
        {config.label}
      </Badge>
    );
  };

  const formatDuration = (start: Date, end?: Date) => {
    if (!start) return "-";
    const endTime = end || new Date();
    const diff = endTime.getTime() - new Date(start).getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const isJobStuck = (job: any) => {
    if (job.status !== "processing" || !job.startedAt) return false;
    const stuckTimeoutMinutes = parseInt(process.env.NEXT_PUBLIC_QUEUE_STUCK_JOB_TIMEOUT_MINUTES || '60');
    const processingMinutes = (new Date().getTime() - new Date(job.startedAt).getTime()) / 60000;
    return processingMinutes > stuckTimeoutMinutes;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Queue</h1>
          <p className="text-muted-foreground">
            Monitor and manage document processing jobs
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processing</CardTitle>
              <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.processing}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.failed}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Time</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.avgProcessingTimeMinutes ? `${stats.avgProcessingTimeMinutes}m` : "-"}
              </div>
            </CardContent>
          </Card>
          
          {stats.stuck > 0 && (
            <Card className="border-orange-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-500">Stuck</CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">{stats.stuck}</div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Job Queue</CardTitle>
            <div className="flex items-center gap-4">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as any)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
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
                  <TableHead>Job ID</TableHead>
                  <TableHead>Document Name</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort("priority")}
                    >
                      Priority
                      {getSortIcon("priority")}
                    </Button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort("createdAt")}
                    >
                      Created
                      {getSortIcon("createdAt")}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 font-medium"
                      onClick={() => handleSort("startedAt")}
                    >
                      Started
                      {getSortIcon("startedAt")}
                    </Button>
                  </TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : jobs?.jobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">
                      No jobs found
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs?.jobs.map((job) => {
                    const stuck = isJobStuck(job);
                    return (
                    <TableRow key={job.id} className={stuck ? "bg-orange-50 dark:bg-orange-950/10" : ""}>
                      <TableCell className="font-mono text-xs">
                        {job.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span title={job.document.fileName}>
                            {job.document.fileName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getPriorityBadge(job.priority)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(job.status as keyof typeof statusConfig)}
                          {stuck && (
                            <Badge variant="outline" className="border-orange-500 text-orange-500">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Stuck
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(job.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {job.startedAt ? new Date(job.startedAt).toLocaleString() : "-"}
                      </TableCell>
                      <TableCell>
                        {job.status === "processing" || job.completedAt
                          ? formatDuration(job.startedAt!, job.completedAt || undefined)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span>{job.attempts}</span>
                          <span className="text-muted-foreground">/ {job.maxAttempts}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <Link href={`/admin/documents?id=${job.documentId}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          {/* Cancel button - only for pending and processing jobs */}
                          {(job.status === "pending" || job.status === "processing") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => cancelMutation.mutate({ id: job.id })}
                              title="Cancel job"
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {/* Retry/Reset button - for failed jobs */}
                          {job.status === "failed" && (
                            job.attempts !== null && job.maxAttempts !== null && job.attempts < job.maxAttempts ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => retryMutation.mutate({ id: job.id })}
                                title="Retry job"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => resetMutation.mutate({ id: job.id })}
                                title="Reset to pending (max attempts reached)"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )})
                )}
              </TableBody>
            </Table>
          </div>

          {jobs && (jobs.hasNextPage || jobs.hasPreviousPage) && (
            <div className="mt-4 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={!jobs.hasPreviousPage}
                >
                  Previous
                </Button>
                <span className="text-sm">Page {page}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={!jobs.hasNextPage}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}