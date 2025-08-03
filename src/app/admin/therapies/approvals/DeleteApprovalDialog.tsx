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

interface DeleteApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approvalId?: string;
  therapyName?: string;
  diseaseName?: string;
  onSuccess: () => void;
}

export default function DeleteApprovalDialog({
  open,
  onOpenChange,
  approvalId,
  therapyName,
  diseaseName,
  onSuccess,
}: DeleteApprovalDialogProps) {
  const deleteMutation = api.admin.approval.delete.useMutation({
    onSuccess: () => {
      toast.success("Approval deleted successfully");
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete approval");
    },
  });

  const handleDelete = () => {
    if (!approvalId) return;
    deleteMutation.mutate({ id: approvalId });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Approval
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the approval for{" "}
            <span className="font-semibold">{therapyName}</span> to treat{" "}
            <span className="font-semibold">{diseaseName}</span>?
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