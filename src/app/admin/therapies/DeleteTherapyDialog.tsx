"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { AlertTriangle } from "lucide-react";

interface DeleteTherapyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  therapyId?: string;
  therapyName?: string;
  onSuccess: () => void;
}

export default function DeleteTherapyDialog({
  open,
  onOpenChange,
  therapyId,
  therapyName,
  onSuccess,
}: DeleteTherapyDialogProps) {
  const [cascade, setCascade] = useState(false);

  const deleteMutation = api.admin.therapy.delete.useMutation({
    onSuccess: () => {
      toast.success("Therapy deleted successfully");
      onSuccess();
      setCascade(false);
    },
    onError: (error) => {
      if (error.message.includes("cascade")) {
        setCascade(true);
      } else {
        toast.error(error.message || "Failed to delete therapy");
      }
    },
  });

  const handleDelete = () => {
    if (!therapyId) return;
    deleteMutation.mutate({ id: therapyId, cascade });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Therapy
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <div>
                Are you sure you want to delete{" "}
                <span className="font-semibold">{therapyName}</span>?
              </div>
              {deleteMutation.error?.message.includes("cascade") && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm">
                  <div className="font-medium text-destructive">
                    Related Records Found
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {deleteMutation.error.message}
                  </div>
                  <div className="mt-2 text-muted-foreground">
                    To delete this therapy and all related records, click "Delete All" below.
                  </div>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          {cascade ? (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete All"}
            </Button>
          ) : (
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}