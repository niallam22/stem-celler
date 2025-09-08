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

interface DeleteTreatmentCenterDialogProps {
  center: {
    id: string;
    name: string;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteTreatmentCenterDialog({
  center,
  onClose,
  onSuccess,
}: DeleteTreatmentCenterDialogProps) {
  const deleteMutation = api.admin.treatmentCenter.delete.useMutation({
    onSuccess: () => {
      toast.success(`Treatment center "${center?.name}" deleted successfully`);
      onSuccess();
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete treatment center");
    },
  });

  const handleDelete = () => {
    if (!center) return;
    deleteMutation.mutate({ id: center.id });
  };

  return (
    <AlertDialog open={!!center} onOpenChange={() => onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Treatment Center</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{center?.name}&quot;? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}