"use client";

import { api } from "@/lib/trpc/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "react-toastify";
import { AlertTriangle } from "lucide-react";

interface DeleteRevenueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revenueId?: string;
  therapyName?: string;
  period?: string;
  region?: string;
  onSuccess: () => void;
}

export default function DeleteRevenueDialog({
  open,
  onOpenChange,
  revenueId,
  therapyName,
  period,
  region,
  onSuccess,
}: DeleteRevenueDialogProps) {
  const deleteMutation = api.admin.revenue.delete.useMutation({
    onSuccess: () => {
      toast.success("Revenue record deleted successfully");
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete revenue record");
    },
  });

  const handleDelete = () => {
    if (!revenueId) return;
    deleteMutation.mutate({ id: revenueId });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Revenue Record
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the revenue record for{" "}
            <span className="font-semibold">{therapyName}</span> in{" "}
            <span className="font-semibold">{region}</span> for{" "}
            <span className="font-semibold">{period}</span>?
            <br />
            <br />
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}