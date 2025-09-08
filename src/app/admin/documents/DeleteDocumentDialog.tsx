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

interface DeleteDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string | null;
  documentName: string | null;
  onSuccess: () => void;
}

export default function DeleteDocumentDialog({
  open,
  onOpenChange,
  documentId,
  documentName,
  onSuccess,
}: DeleteDocumentDialogProps) {
  const deleteMutation = api.admin.document.delete.useMutation({
    onSuccess: () => {
      toast.success("Document deleted successfully");
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      if (error.message.includes("extractions or active jobs")) {
        toast.error(
          "Cannot delete this document because it has associated extractions or active jobs. Please remove them first."
        );
      } else {
        toast.error(error.message || "Failed to delete document");
      }
    },
  });

  const handleDelete = async () => {
    if (!documentId) return;
    await deleteMutation.mutateAsync({ id: documentId });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the document
            {documentName && (
              <>
                {" "}
                <span className="font-semibold">&quot;{documentName}&quot;</span>
              </>
            )}
            . This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
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