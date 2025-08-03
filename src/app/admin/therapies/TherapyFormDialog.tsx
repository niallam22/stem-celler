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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import { Plus, X } from "lucide-react";

const therapyFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  manufacturer: z.string().min(1, "Manufacturer is required"),
  mechanism: z.string().min(1, "Mechanism is required"),
  pricePerTreatmentUsd: z.string().transform((val) => {
    const num = Number(val);
    if (isNaN(num) || num <= 0) {
      throw new Error("Price must be a positive number");
    }
    return num;
  }),
  sources: z.array(z.string()).min(1, "At least one source is required"),
});

type TherapyFormValues = z.input<typeof therapyFormSchema>;

interface TherapyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  therapyId?: string | null;
  onSuccess: () => void;
}

export default function TherapyFormDialog({
  open,
  onOpenChange,
  therapyId,
  onSuccess,
}: TherapyFormDialogProps) {
  const isEdit = !!therapyId;

  const form = useForm<TherapyFormValues>({
    resolver: zodResolver(therapyFormSchema),
    defaultValues: {
      name: "",
      manufacturer: "",
      mechanism: "",
      pricePerTreatmentUsd: "",
      sources: [""],
    },
  });

  const { data: therapy } = api.admin.therapy.getById.useQuery(
    { id: therapyId! },
    { enabled: isEdit }
  );

  const createMutation = api.admin.therapy.create.useMutation({
    onSuccess: () => {
      toast.success("Therapy created successfully");
      onSuccess();
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create therapy");
    },
  });

  const updateMutation = api.admin.therapy.update.useMutation({
    onSuccess: () => {
      toast.success("Therapy updated successfully");
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update therapy");
    },
  });

  useEffect(() => {
    if (therapy) {
      form.reset({
        name: therapy.name,
        manufacturer: therapy.manufacturer,
        mechanism: therapy.mechanism,
        pricePerTreatmentUsd: therapy.pricePerTreatmentUsd.toString(),
        sources: therapy.sources,
      });
    }
  }, [therapy, form]);

  const onSubmit = (values: TherapyFormValues) => {
    const data = {
      ...values,
      pricePerTreatmentUsd: Number(values.pricePerTreatmentUsd),
    };

    if (isEdit) {
      updateMutation.mutate({ id: therapyId, data });
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
          <DialogTitle>{isEdit ? "Edit Therapy" : "Add New Therapy"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the therapy information below."
              : "Fill in the information for the new therapy."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Kymriah" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="manufacturer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Manufacturer</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Novartis" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mechanism"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mechanism</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., CAR-T cell therapy targeting CD19"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Brief description of how the therapy works
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pricePerTreatmentUsd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price per Treatment (USD)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 475000"
                      {...field}
                    />
                  </FormControl>
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
                            placeholder="e.g., https://www.fda.gov/..."
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
                  ? "Update Therapy"
                  : "Create Therapy"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}