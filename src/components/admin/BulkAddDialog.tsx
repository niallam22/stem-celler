"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface BulkAddColumn {
  key: string;
  label: string;
  required?: boolean;
  type?: "string" | "number" | "date" | "array";
}

export interface BulkAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  columns: BulkAddColumn[];
  exampleData: Record<string, unknown>[];
  onSubmit: (data: Record<string, unknown>[]) => Promise<void>;
  isLoading?: boolean;
}

interface ValidationError {
  row: number;
  column: string;
  message: string;
}

export default function BulkAddDialog({
  open,
  onOpenChange,
  title,
  description,
  columns,
  exampleData,
  onSubmit,
  isLoading = false,
}: BulkAddDialogProps) {
  const [jsonInput, setJsonInput] = useState("");
  const [parsedData, setParsedData] = useState<Record<string, unknown>[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [step, setStep] = useState<"input" | "preview">("input");

  const validateData = (data: Record<string, unknown>[]): ValidationError[] => {
    const errors: ValidationError[] = [];

    data.forEach((row, index) => {
      columns.forEach((column) => {
        const value = row[column.key];

        // Check required fields
        if (column.required && (value === undefined || value === null || value === "")) {
          errors.push({
            row: index + 1,
            column: column.key,
            message: "Required field is missing",
          });
        }

        // Type validation
        if (value !== undefined && value !== null && value !== "") {
          switch (column.type) {
            case "number":
              if (typeof value !== "number" && isNaN(Number(value))) {
                errors.push({
                  row: index + 1,
                  column: column.key,
                  message: "Must be a valid number",
                });
              }
              break;
            case "array":
              if (!Array.isArray(value)) {
                errors.push({
                  row: index + 1,
                  column: column.key,
                  message: "Must be an array",
                });
              }
              break;
            case "date":
              if (typeof value === "string" && isNaN(Date.parse(value))) {
                errors.push({
                  row: index + 1,
                  column: column.key,
                  message: "Must be a valid date",
                });
              }
              break;
          }
        }
      });
    });

    return errors;
  };

  const handleParseJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) {
        setParseError("JSON must be an array of objects");
        return;
      }

      const errors = validateData(parsed);
      setParsedData(parsed);
      setValidationErrors(errors);
      setParseError(null);
      setStep("preview");
    } catch (error) {
      setParseError("Invalid JSON format");
    }
  };

  const handleSubmit = async () => {
    if (validationErrors.length > 0) return;
    
    try {
      await onSubmit(parsedData);
      // Reset form on success
      setJsonInput("");
      setParsedData([]);
      setValidationErrors([]);
      setParseError(null);
      setStep("input");
      onOpenChange(false);
    } catch (error) {
      // Error handling is done by the parent component
    }
  };

  const handleBack = () => {
    setStep("input");
    setValidationErrors([]);
  };

  const formatCellValue = (value: unknown, type?: string) => {
    if (value === null || value === undefined) return "-";
    if (type === "array" && Array.isArray(value)) {
      return `[${value.join(", ")}]`;
    }
    return String(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {step === "input" ? (
          <div className="flex-1 space-y-4">
            <div>
              <label className="text-sm font-medium">JSON Data</label>
              <Textarea
                placeholder={`Example format:\n${JSON.stringify(exampleData, null, 2)}`}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="mt-2 min-h-[300px] font-mono text-sm"
              />
            </div>

            {parseError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Required Fields:</h3>
              <div className="flex flex-wrap gap-2">
                {columns
                  .filter((col) => col.required)
                  .map((col) => (
                    <span
                      key={col.key}
                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs"
                    >
                      {col.label}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">
                Preview ({parsedData.length} records)
              </h3>
              {validationErrors.length > 0 && (
                <Alert variant="destructive" className="w-auto">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {validationErrors.length} validation error(s) found
                  </AlertDescription>
                </Alert>
              )}
              {validationErrors.length === 0 && (
                <Alert className="w-auto border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    All data validated successfully
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {validationErrors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-red-600">Validation Errors:</h4>
                <ScrollArea className="h-24 border rounded p-2">
                  {validationErrors.map((error, index) => (
                    <div key={index} className="text-xs text-red-600">
                      Row {error.row}, {error.column}: {error.message}
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}

            <div className="max-h-[400px] border rounded overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    {columns.map((column) => (
                      <TableHead key={column.key}>
                        {column.label}
                        {column.required && <span className="text-red-500 ml-1">*</span>}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((row, index) => (
                    <TableRow key={index} className={
                      validationErrors.some(e => e.row === index + 1) 
                        ? "bg-red-50 border-l-2 border-l-red-500" 
                        : ""
                    }>
                      <TableCell className="font-mono text-xs">{index + 1}</TableCell>
                      {columns.map((column) => (
                        <TableCell key={column.key} className="text-xs">
                          {formatCellValue(row[column.key], column.type)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "input" ? (
            <Button onClick={handleParseJson} disabled={!jsonInput.trim()}>
              Parse & Preview
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={validationErrors.length > 0 || isLoading}
              >
                {isLoading ? "Adding..." : `Add ${parsedData.length} Records`}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}