"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/trpc/react";
import { Plus, X } from "lucide-react";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-toastify";

const revenueFormSchema = z.object({
  therapyId: z.string().min(1, "Therapy is required"),
  period: z.string().min(1, "Period is required").regex(
    /^(Q[1-4]\s\d{4}|\d{4})$/,
    "Period must be in format 'Q1 2024' or '2024'"
  ),
  region: z.string().min(1, "Region is required"),
  revenueMillionsUsd: z.string().transform((val) => {
    const num = Number(val);
    if (isNaN(num) || num <= 0) {
      throw new Error("Revenue must be a positive number");
    }
    return num;
  }),
  sources: z.array(z.string()).min(1, "At least one source is required"),
});

type RevenueFormValues = z.input<typeof revenueFormSchema>;

interface RevenueFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revenueId?: string | null;
  onSuccess: () => void;
}

const REGIONS = [
  "United States",
  "European Union", 
  "United Kingdom",
  "Canada",
  "Australia",
  "Japan",
  "China",
  "Global",
  "Other"
];

export default function RevenueFormDialog({
  open,
  onOpenChange,
  revenueId,
  onSuccess,
}: RevenueFormDialogProps) {
  const isEdit = !!revenueId;

  const form = useForm<RevenueFormValues>({
    resolver: zodResolver(revenueFormSchema),
    defaultValues: {
      therapyId: "",
      period: "",
      region: "",
      revenueMillionsUsd: "",
      sources: [""],
    },
  });

  const { data: revenue } = api.admin.revenue.getById.useQuery(
    { id: revenueId! },
    { enabled: isEdit }
  );

  const { data: therapyOptions } = api.admin.revenue.getTherapyOptions.useQuery();

  const createMutation = api.admin.revenue.create.useMutation({
    onSuccess: () => {
      toast.success("Revenue record created successfully");
      onSuccess();
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create revenue record");
    },
  });

  const updateMutation = api.admin.revenue.update.useMutation({
    onSuccess: () => {
      toast.success("Revenue record updated successfully");
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update revenue record");
    },
  });

  useEffect(() => {
    if (revenue) {
      form.reset({
        therapyId: revenue.therapyId,
        period: revenue.period,
        region: revenue.region,
        revenueMillionsUsd: revenue.revenueMillionsUsd.toString(),
        sources: revenue.sources,
      });
    }
  }, [revenue, form]);

  const onSubmit = (values: RevenueFormValues) => {
    const data = {
      ...values,
      revenueMillionsUsd: Number(values.revenueMillionsUsd),
    };

    if (isEdit) {
      updateMutation.mutate({ id: revenueId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const addSource = () => {
    const sources = form.getValues("sources");
    form.setValue("sources", [...sources, ""]);
  };

  const removeSource = (index: number) => {
    const sources = form.getValues("sources");
    form.setValue("sources", sources.filter((_, i) => i !== index));
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Revenue Record" : "Add New Revenue Record"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the revenue information below."
              : "Fill in the information for the new revenue record."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="therapyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Therapy</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select therapy" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {therapyOptions?.map((therapy) => (
                        <SelectItem key={therapy.id} value={therapy.id}>
                          {therapy.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Q1 2024 or 2024"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Format: "Q1 2024" for quarterly or "2024" for annual
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {REGIONS.map((region) => (
                          <SelectItem key={region} value={region}>
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="revenueMillionsUsd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Revenue (Millions USD)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="e.g., 450.5"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the revenue amount in millions of USD
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Sources</FormLabel>
              {form.watch("sources").map((_, index) => (
                <FormField
                  key={index}
                  control={form.control}
                  name={`sources.${index}`}
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input
                            placeholder="e.g., https://investor.company.com/..."
                            {...field}
                          />
                        </FormControl>
                        {form.watch("sources").length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSource(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSource}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Source
              </Button>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? isEdit
                    ? "Updating..."
                    : "Creating..."
                  : isEdit
                  ? "Update Revenue Record"
                  : "Create Revenue Record"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}