"use client";

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
import { api } from "@/lib/trpc/react";
import { toast } from "react-toastify";

interface DeleteRegulatoryBodyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bodyId?: string;
  bodyName?: string;
  bodyRegion?: string;
  onSuccess: () => void;
}

export default function DeleteRegulatoryBodyDialog({
  open,
  onOpenChange,
  bodyId,
  bodyName,
  bodyRegion,
  onSuccess,
}: DeleteRegulatoryBodyDialogProps) {
  const deleteMutation = api.admin.regulatoryBody.delete.useMutation({
    onSuccess: () => {
      toast.success("Regulatory body deleted successfully");
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete regulatory body");
    },
  });

  const handleDelete = async () => {
    if (bodyId) {
      await deleteMutation.mutateAsync({ id: bodyId });
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the regulatory body &quot;{bodyName}&quot; ({bodyRegion}).
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