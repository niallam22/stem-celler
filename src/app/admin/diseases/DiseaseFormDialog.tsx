"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";

const diseaseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  indication: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  icd10Code: z.string().optional(),
  annualIncidenceUs: z.coerce.number().positive().optional(),
  sources: z.array(z.string()).min(1, "At least one source is required"),
});

type DiseaseFormData = z.infer<typeof diseaseSchema>;

interface DiseaseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diseaseId?: string | null;
  onSuccess: () => void;
}

export default function DiseaseFormDialog({
  open,
  onOpenChange,
  diseaseId,
  onSuccess,
}: DiseaseFormDialogProps) {
  const [sourceInput, setSourceInput] = useState("");
  const isEditing = !!diseaseId;

  const form = useForm<DiseaseFormData>({
    resolver: zodResolver(diseaseSchema),
    defaultValues: {
      name: "",
      indication: "",
      category: "",
      subcategory: "",
      icd10Code: "",
      annualIncidenceUs: undefined,
      sources: [],
    },
  });

  const { data: diseaseData } = api.admin.disease.getById.useQuery(
    { id: diseaseId! },
    { enabled: isEditing }
  );

  const createMutation = api.admin.disease.create.useMutation({
    onSuccess: () => {
      toast.success("Disease created successfully");
      onSuccess();
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = api.admin.disease.update.useMutation({
    onSuccess: () => {
      toast.success("Disease updated successfully");
      onSuccess();
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  useEffect(() => {
    if (diseaseData) {
      form.reset({
        name: diseaseData.name,
        indication: diseaseData.indication || "",
        category: diseaseData.category,
        subcategory: diseaseData.subcategory || "",
        icd10Code: diseaseData.icd10Code || "",
        annualIncidenceUs: diseaseData.annualIncidenceUs || undefined,
        sources: diseaseData.sources,
      });
    } else if (!isEditing) {
      form.reset({
        name: "",
        indication: "",
        category: "",
        subcategory: "",
        icd10Code: "",
        annualIncidenceUs: undefined,
        sources: [],
      });
    }
  }, [diseaseData, isEditing, form]);

  const onSubmit = (data: DiseaseFormData) => {
    if (isEditing) {
      updateMutation.mutate({
        id: diseaseId!,
        data,
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const addSource = () => {
    if (sourceInput.trim()) {
      const currentSources = form.getValues("sources");
      if (!currentSources.includes(sourceInput.trim())) {
        form.setValue("sources", [...currentSources, sourceInput.trim()]);
        setSourceInput("");
      }
    }
  };

  const removeSource = (sourceToRemove: string) => {
    const currentSources = form.getValues("sources");
    form.setValue(
      "sources",
      currentSources.filter((source) => source !== sourceToRemove)
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSource();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Disease" : "Add New Disease"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the disease information below."
              : "Fill in the disease information below."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Disease Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter disease name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="indication"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indication</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter indication" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter category" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="subcategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategory</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter subcategory" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="icd10Code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ICD-10 Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter ICD-10 code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="annualIncidenceUs"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Annual Incidence (US)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter annual incidence"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sources"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sources *</FormLabel>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter source URL or citation"
                        value={sourceInput}
                        onChange={(e) => setSourceInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                      />
                      <Button type="button" onClick={addSource}>
                        Add
                      </Button>
                    </div>
                    {field.value.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {field.value.map((source, index) => (
                          <Badge key={index} variant="secondary" className="pr-1">
                            <span className="mr-1 max-w-[200px] truncate">
                              {source}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0.5 hover:bg-transparent"
                              onClick={() => removeSource(source)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : isEditing
                  ? "Update Disease"
                  : "Create Disease"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}