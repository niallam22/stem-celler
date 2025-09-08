"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";

const documentFormSchema = z.object({
  companyName: z.string().nullable().optional(),
  reportType: z.enum(["annual", "quarterly"]).nullable().optional(),
  reportingPeriod: z.string().nullable().optional(),
});

type DocumentFormValues = z.infer<typeof documentFormSchema>;

interface DocumentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string | null;
  onSuccess: () => void;
}

export default function DocumentFormDialog({
  open,
  onOpenChange,
  documentId,
  onSuccess,
}: DocumentFormDialogProps) {
  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: {
      companyName: "",
      reportType: null,
      reportingPeriod: "",
    },
  });

  const { data: document } = api.admin.document.getById.useQuery(
    { id: documentId! },
    { enabled: !!documentId }
  );

  const { data: companyOptions } = api.admin.document.getCompanyOptions.useQuery();

  const updateMutation = api.admin.document.update.useMutation({
    onSuccess: () => {
      toast.success("Document updated successfully");
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update document");
    },
  });

  useEffect(() => {
    if (document) {
      form.reset({
        companyName: document.companyName || "",
        reportType: document.reportType as "annual" | "quarterly" | null,
        reportingPeriod: document.reportingPeriod || "",
      });
    }
  }, [document, form]);

  const onSubmit = async (values: DocumentFormValues) => {
    if (!documentId) return;
    
    await updateMutation.mutateAsync({
      id: documentId,
      companyName: values.companyName || null,
      reportType: values.reportType || null,
      reportingPeriod: values.reportingPeriod || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Document</DialogTitle>
          <DialogDescription>
            Update the document metadata. These changes will help with classification and searching.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a company" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {companyOptions?.map((company) => (
                          <SelectItem key={company} value={company || ""}>
                            {company}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reportType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Report Type</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value || ""}
                      onValueChange={(value) =>
                        field.onChange(value || null)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select report type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        <SelectItem value="annual">Annual Report</SelectItem>
                        <SelectItem value="quarterly">Quarterly Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reportingPeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reporting Period</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      placeholder="e.g., Q3-2024 or 2024"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Updating..." : "Update Document"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}