"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "react-toastify";

interface DeleteDiseaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diseaseId?: string;
  diseaseName?: string;
  onSuccess: () => void;
}

export default function DeleteDiseaseDialog({
  open,
  onOpenChange,
  diseaseId,
  diseaseName,
  onSuccess,
}: DeleteDiseaseDialogProps) {
  const [cascade, setCascade] = useState(false);

  const deleteMutation = api.admin.disease.delete.useMutation({
    onSuccess: () => {
      toast.success("Disease deleted successfully");
      onSuccess();
      setCascade(false);
    },
    onError: (error) => {
      if (error.data?.code === "PRECONDITION_FAILED") {
        toast.error(error.message);
      } else {
        toast.error("Failed to delete disease");
      }
    },
  });

  const handleDelete = () => {
    if (diseaseId) {
      deleteMutation.mutate({
        id: diseaseId,
        cascade,
      });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Disease</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <div>
              Are you sure you want to delete <strong>{diseaseName}</strong>?
              This action cannot be undone.
            </div>
            
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-800">
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Warning:</strong> This disease may have related approval records.
                If related records exist, the deletion will fail unless you enable cascade delete.
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="cascade"
                checked={cascade}
                onCheckedChange={(checked) => setCascade(checked as boolean)}
              />
              <label
                htmlFor="cascade"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Also delete all related approval records (cascade delete)
              </label>
            </div>

            {cascade && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-800 dark:text-red-200">
                  <strong>Caution:</strong> Enabling cascade delete will permanently remove
                  all therapy approval records associated with this disease.
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Disease"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}