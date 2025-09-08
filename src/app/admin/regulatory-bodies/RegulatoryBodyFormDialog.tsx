"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
import { api } from "@/lib/trpc/react";
import { toast } from "react-toastify";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  fullName: z.string().min(1, "Full name is required"),
  region: z.string().min(1, "Region is required"),
  country: z.string().nullable().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface RegulatoryBodyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bodyId?: string | null;
  onSuccess: () => void;
}

export default function RegulatoryBodyFormDialog({
  open,
  onOpenChange,
  bodyId,
  onSuccess,
}: RegulatoryBodyFormDialogProps) {
  const isEditing = !!bodyId;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      fullName: "",
      region: "",
      country: null,
    },
  });

  // Fetch existing body data when editing
  const { data: existingBody } = api.admin.regulatoryBody.getById.useQuery(
    { id: bodyId! },
    { enabled: isEditing }
  );

  // Mutations
  const createMutation = api.admin.regulatoryBody.create.useMutation({
    onSuccess: () => {
      toast.success("Regulatory body created successfully");
      onSuccess();
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create regulatory body");
    },
  });

  const updateMutation = api.admin.regulatoryBody.update.useMutation({
    onSuccess: () => {
      toast.success("Regulatory body updated successfully");
      onSuccess();
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update regulatory body");
    },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  // Populate form when editing
  useEffect(() => {
    if (existingBody) {
      form.reset({
        name: existingBody.name,
        fullName: existingBody.fullName,
        region: existingBody.region,
        country: existingBody.country,
      });
    }
  }, [existingBody, form]);

  const onSubmit = async (data: FormData) => {
    if (isEditing) {
      await updateMutation.mutateAsync({
        id: bodyId,
        data: {
          ...data,
          country: data.country || undefined,
        },
      });
    } else {
      await createMutation.mutateAsync({
        ...data,
        country: data.country || undefined,
      });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Regulatory Body" : "Add New Regulatory Body"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the regulatory body information."
              : "Enter the details for the new regulatory body."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name/Abbreviation</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., FDA, EMA" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Food and Drug Administration" 
                      {...field} 
                    />
                  </FormControl>
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
                  <FormControl>
                    <Input 
                      placeholder="e.g., United States, European Union" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., United States (leave empty for regions like EU)" 
                      {...field} 
                      value={field.value || ""}
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
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading 
                  ? (isEditing ? "Updating..." : "Creating...")
                  : (isEditing ? "Update" : "Create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}