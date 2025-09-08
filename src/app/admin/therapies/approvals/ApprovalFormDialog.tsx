"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/trpc/react";
import { format } from "date-fns";
import { CalendarIcon, Plus, X } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";

const approvalFormSchema = z.object({
  therapyName: z.string().min(1, "Therapy is required"),
  diseaseIndication: z.string().min(1, "Disease indication is required"),
  region: z.string().min(1, "Region is required"),
  approvalDate: z.date({ required_error: "Approval date is required" }),
  approvalType: z.string().min(1, "Approval type is required"),
  regulatoryBody: z.string().min(1, "Regulatory body is required"),
  sources: z.array(z.string()).min(1, "At least one source is required"),
});

type ApprovalFormValues = z.infer<typeof approvalFormSchema>;

interface ApprovalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  approvalId?: string | null;
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
  "Other"
];

const REGULATORY_BODIES = [
  "FDA",
  "EMA",
  "MHRA",
  "Health Canada",
  "TGA",
  "PMDA",
  "NMPA",
  "Other"
];

const APPROVAL_TYPES = [
  "Full Approval",
  "Conditional Approval",
  "Accelerated Approval",
  "Priority Review",
  "Orphan Drug Designation",
  "Fast Track Designation",
  "Breakthrough Therapy Designation"
];

export default function ApprovalFormDialog({
  open,
  onOpenChange,
  approvalId,
  onSuccess,
}: ApprovalFormDialogProps) {
  const isEdit = !!approvalId;
  const [calendarOpen, setCalendarOpen] = useState(false);

  const form = useForm<ApprovalFormValues>({
    resolver: zodResolver(approvalFormSchema),
    defaultValues: {
      therapyName: "",
      diseaseIndication: "",
      region: "",
      approvalDate: undefined,
      approvalType: "",
      regulatoryBody: "",
      sources: [""],
    },
  });

  const { data: approval } = api.admin.approval.getById.useQuery(
    { id: approvalId! },
    { enabled: isEdit }
  );

  const { data: options } = api.admin.approval.getOptions.useQuery();

  const createMutation = api.admin.approval.create.useMutation({
    onSuccess: () => {
      toast.success("Approval created successfully");
      onSuccess();
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create approval");
    },
  });

  const updateMutation = api.admin.approval.update.useMutation({
    onSuccess: () => {
      toast.success("Approval updated successfully");
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update approval");
    },
  });

  useEffect(() => {
    if (approval) {
      form.reset({
        therapyName: approval.therapyName || "",
        diseaseIndication: approval.diseaseIndication || "",
        region: approval.region,
        approvalDate: new Date(approval.approvalDate),
        approvalType: approval.approvalType,
        regulatoryBody: approval.regulatoryBody,
        sources: approval.sources,
      });
    }
  }, [approval, form]);

  const onSubmit = (values: ApprovalFormValues) => {
    if (isEdit) {
      updateMutation.mutate({ id: approvalId, data: values });
    } else {
      createMutation.mutate(values);
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
          <DialogTitle>{isEdit ? "Edit Approval" : "Add New Approval"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the approval information below."
              : "Fill in the information for the new approval."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="therapyName"
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
                        {options?.therapies.map((therapy) => (
                          <SelectItem key={therapy.name} value={therapy.name}>
                            {therapy.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="diseaseIndication"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Disease Indication</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select disease indication" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {options?.diseaseIndications?.map((indication) => (
                          <SelectItem key={indication} value={indication}>
                            {indication}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <FormField
                control={form.control}
                name="regulatoryBody"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Regulatory Body</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select regulatory body" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {REGULATORY_BODIES.map((body) => (
                          <SelectItem key={body} value={body}>
                            {body}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="approvalDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Approval Date</FormLabel>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setCalendarOpen(false);
                          }}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="approvalType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Approval Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select approval type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {APPROVAL_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                  ? "Update Approval"
                  : "Create Approval"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}