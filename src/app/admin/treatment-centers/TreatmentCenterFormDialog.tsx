"use client";

import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";

const treatmentCenterFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  availableTherapies: z.array(z.string()).min(1, "At least one therapy is required"),
  website: z.string().optional(),
  phone: z.string().optional(),
  about: z.string().optional(),
});

type TreatmentCenterFormValues = z.input<typeof treatmentCenterFormSchema>;

interface TreatmentCenterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  centerId?: string | null;
  onSuccess: () => void;
}

export default function TreatmentCenterFormDialog({
  open,
  onOpenChange,
  centerId,
  onSuccess,
}: TreatmentCenterFormDialogProps) {
  const isEdit = !!centerId;
  const [isGeocoding, setIsGeocoding] = useState(false);

  const form = useForm<TreatmentCenterFormValues>({
    resolver: zodResolver(treatmentCenterFormSchema),
    defaultValues: {
      name: "",
      address: "",
      availableTherapies: [],
      website: "",
      phone: "",
      about: "",
    },
  });

  // Fetch all therapies for the multi-select
  const { data: therapiesData } = api.admin.therapy.list.useQuery({
    page: 1,
    pageSize: 100,
    sortBy: "name",
    sortOrder: "asc",
  });

  const { data: center } = api.admin.treatmentCenter.getById.useQuery(
    { id: centerId! },
    { enabled: isEdit }
  );

  const createMutation = api.admin.treatmentCenter.create.useMutation({
    onMutate: () => {
      setIsGeocoding(true);
    },
    onSuccess: () => {
      toast.success("Treatment center created successfully");
      onSuccess();
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create treatment center");
    },
    onSettled: () => {
      setIsGeocoding(false);
    },
  });

  const updateMutation = api.admin.treatmentCenter.update.useMutation({
    onMutate: () => {
      setIsGeocoding(true);
    },
    onSuccess: () => {
      toast.success("Treatment center updated successfully");
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update treatment center");
    },
    onSettled: () => {
      setIsGeocoding(false);
    },
  });

  useEffect(() => {
    if (center) {
      form.reset({
        name: center.name,
        address: center.address,
        availableTherapies: center.availableTherapies,
        website: center.website || "",
        phone: center.phone || "",
        about: center.about || "",
      });
    }
  }, [center, form]);

  const onSubmit = (values: TreatmentCenterFormValues) => {
    const cleanedData = {
      ...values,
      website: values.website || undefined,
      phone: values.phone || undefined,
      about: values.about || undefined,
    };

    if (isEdit) {
      updateMutation.mutate({ id: centerId, data: cleanedData });
    } else {
      createMutation.mutate(cleanedData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || isGeocoding;

  // Get unique therapy names
  const therapyOptions = therapiesData?.therapies.map(t => t.name) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Treatment Center" : "Add New Treatment Center"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the treatment center information below."
              : "Fill in the information for the new treatment center. The location will be geocoded automatically from the address."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Memorial Sloan Kettering Cancer Center" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 1275 York Avenue, New York, NY 10065" {...field} />
                  </FormControl>
                  <FormDescription>
                    Full address including city, state/country. This will be geocoded to get coordinates.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., (212) 639-2000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., https://www.mskcc.org" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="about"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>About (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of the treatment center..."
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="availableTherapies"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel>Available Therapies *</FormLabel>
                    <FormDescription>
                      Select all therapies available at this treatment center
                    </FormDescription>
                  </div>
                  <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                    <div className="space-y-2">
                      {therapyOptions.map((therapyName) => (
                        <FormField
                          key={therapyName}
                          control={form.control}
                          name="availableTherapies"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={therapyName}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(therapyName)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, therapyName])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== therapyName
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {therapyName}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                  </ScrollArea>
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
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isGeocoding ? "Geocoding..." : "Saving..."}
                  </>
                ) : (
                  isEdit ? "Update" : "Create"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}