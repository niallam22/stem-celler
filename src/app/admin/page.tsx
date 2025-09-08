"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill, Activity, CheckCircle, DollarSign, Clock, Loader2, XCircle, Play, Square, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import Link from "next/link";

export default function AdminDashboard() {
  const [isWorkerLoading, setIsWorkerLoading] = useState(false);

  const { data: queueStats, refetch: refetchStats } = api.admin.queue.getStats.useQuery();

  const startWorker = async () => {
    setIsWorkerLoading(true);
    try {
      const response = await fetch("/api/worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      
      if (response.ok) {
        toast.success("Worker started successfully");
      } else {
        toast.error("Failed to start worker");
      }
    } catch {
      toast.error("Error starting worker");
    } finally {
      setIsWorkerLoading(false);
    }
  };

  const stopWorker = async () => {
    setIsWorkerLoading(true);
    try {
      const response = await fetch("/api/worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      
      if (response.ok) {
        toast.success("Worker stopped successfully");
      } else {
        toast.error("Failed to stop worker");
      }
    } catch {
      toast.error("Error stopping worker");
    } finally {
      setIsWorkerLoading(false);
    }
  };

  const cleanupJobs = async () => {
    setIsWorkerLoading(true);
    try {
      const response = await fetch("/api/worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cleanup" }),
      });
      
      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        refetchStats();
      } else {
        toast.error("Failed to cleanup jobs");
      }
    } catch {
      toast.error("Error cleaning up jobs");
    } finally {
      setIsWorkerLoading(false);
    }
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to the Stem Cell Therapy Admin Panel
        </p>
      </div>

      {/* Data Management Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/therapies">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Therapies</CardTitle>
              <Pill className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Manage therapy records
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/diseases">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Diseases</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Manage disease records
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/therapies/approvals">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approvals</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Regulatory approvals
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/therapies/revenue">
          <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue Records</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">
                Financial data
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Document Processing Queue Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Jobs</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queueStats?.pending || 0}</div>
            <p className="text-xs text-muted-foreground">
              Waiting for processing
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queueStats?.processing || 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently being processed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queueStats?.completed || 0}</div>
            <p className="text-xs text-muted-foreground">
              Successfully processed
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queueStats?.failed || 0}</div>
            <p className="text-xs text-muted-foreground">
              Processing failed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Worker Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Background Worker Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Document Processing Worker</h3>
              <p className="text-sm text-muted-foreground">
                Processes queued documents and extracts data using AI agents
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={startWorker}
                disabled={isWorkerLoading}
                size="sm"
              >
                <Play className="mr-2 h-4 w-4" />
                Start Worker
              </Button>
              <Button
                onClick={stopWorker}
                disabled={isWorkerLoading}
                variant="outline"
                size="sm"
              >
                <Square className="mr-2 h-4 w-4" />
                Stop Worker
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <h3 className="font-medium">Queue Maintenance</h3>
              <p className="text-sm text-muted-foreground">
                Clean up old completed jobs (older than 30 days)
              </p>
              {queueStats?.avgProcessingTimeMinutes && (
                <p className="text-xs text-muted-foreground">
                  Average processing time: {queueStats.avgProcessingTimeMinutes} minutes
                </p>
              )}
            </div>
            <Button
              onClick={cleanupJobs}
              disabled={isWorkerLoading}
              variant="outline"
              size="sm"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Cleanup Jobs
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest changes to the database</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No recent activity to display</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/documents" className="block">
              <div className="rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                <p className="text-sm font-medium">Upload Document</p>
                <p className="text-xs text-muted-foreground">Upload PDF for data extraction</p>
              </div>
            </Link>
            <Link href="/admin/extractions" className="block">
              <div className="rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                <p className="text-sm font-medium">Review Extractions</p>
                <p className="text-xs text-muted-foreground">Approve extracted data</p>
              </div>
            </Link>
            <Link href="/admin/therapies" className="block">
              <div className="rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                <p className="text-sm font-medium">Add New Therapy</p>
                <p className="text-xs text-muted-foreground">Create a new therapy record</p>
              </div>
            </Link>
            <Link href="/admin/diseases" className="block">
              <div className="rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                <p className="text-sm font-medium">Add New Disease</p>
                <p className="text-xs text-muted-foreground">Create a new disease record</p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}