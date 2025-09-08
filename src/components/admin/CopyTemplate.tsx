"use client";

import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "react-toastify";
import { BulkAddColumn } from "@/components/admin/BulkAddDialog";

interface CopyTemplateProps {
  columns: BulkAddColumn[];
  exampleData: Record<string, unknown>[];
  name: string;
}

export default function CopyTemplate({ columns, exampleData, name }: CopyTemplateProps) {
  const generateTemplate = () => {
    // Return example data directly as array format for bulk import
    return JSON.stringify(exampleData, null, 2);
  };

  const handleCopyTemplate = async () => {
    try {
      const template = generateTemplate();
      await navigator.clipboard.writeText(template);
      toast.success(`${name} template copied to clipboard!`);
    } catch (error) {
      console.error("Failed to copy template:", error);
      toast.error("Failed to copy template to clipboard");
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={handleCopyTemplate}
      className="gap-2"
    >
      <Copy className="h-4 w-4" />
      Copy Template
    </Button>
  );
}