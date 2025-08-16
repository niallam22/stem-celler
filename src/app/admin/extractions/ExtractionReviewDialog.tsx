"use client";

import { api } from "@/lib/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Activity, 
  DollarSign, 
  CheckCircle2,
  AlertCircle,
  Edit,
  XCircle
} from "lucide-react";

interface ExtractionReviewDialogProps {
  extractionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: () => void;
}

export default function ExtractionReviewDialog({
  extractionId,
  open,
  onOpenChange,
  onApprove,
}: ExtractionReviewDialogProps) {
  const { data: extraction, isLoading } = api.admin.extraction.getById.useQuery(
    { id: extractionId },
    { enabled: open }
  );

  if (isLoading || !extraction) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const { extractedData, document } = extraction;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Review Extraction</DialogTitle>
          <DialogDescription>
            Review extracted data from {document.fileName}
          </DialogDescription>
          <div className="flex items-center gap-4 mt-2">
            <span className="font-medium">{document.fileName}</span>
            <Badge variant="outline">{document.companyName}</Badge>
            <Badge variant="outline">{document.reportingPeriod}</Badge>
          </div>
        </DialogHeader>

        {/* Show rejection information if extraction has been rejected */}
        {!extraction.requiresReview && !extraction.approvedAt && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <div className="flex items-center gap-2 text-red-800 mb-2">
              <XCircle className="h-5 w-5" />
              <span className="font-semibold">This extraction was rejected</span>
            </div>
            <div className="text-sm text-red-700">
              <div><strong>Rejected by:</strong> {extraction.approvedBy}</div>
            </div>
          </div>
        )}

        <Tabs defaultValue="therapy" className="flex-1 flex flex-col">
          <TabsList>
            <TabsTrigger value="therapy" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Therapies ({extractedData.therapy?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="revenue" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Revenue ({extractedData.revenue?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="approvals" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Approvals ({extractedData.approvals?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="sources" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Sources
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="therapy" className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Therapy Data</h3>
                <Badge variant={extractedData.confidence.therapy >= 80 ? "default" : "secondary"}>
                  Confidence: {extractedData.confidence.therapy}%
                </Badge>
              </div>
              {extractedData.therapy?.map((therapy, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-base">{therapy.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div><strong>Manufacturer:</strong> {therapy.manufacturer}</div>
                    <div><strong>Mechanism:</strong> {therapy.mechanism}</div>
                    <div><strong>Price per Treatment:</strong> ${therapy.pricePerTreatmentUsd.toLocaleString()}</div>
                    <div><strong>Sources:</strong> {therapy.sources.join(", ")}</div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="revenue" className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Revenue Data</h3>
                <Badge variant={extractedData.confidence.revenue >= 80 ? "default" : "secondary"}>
                  Confidence: {extractedData.confidence.revenue}%
                </Badge>
              </div>
              {extractedData.revenue?.map((revenue, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-base">{revenue.therapyName}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div><strong>Period:</strong> {revenue.period}</div>
                    <div><strong>Region:</strong> {revenue.region}</div>
                    <div><strong>Revenue:</strong> ${revenue.revenueMillionsUsd}M</div>
                    <div><strong>Sources:</strong> {revenue.sources.join(", ")}</div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="approvals" className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Approval Data</h3>
                <Badge variant={extractedData.confidence.approvals >= 80 ? "default" : "secondary"}>
                  Confidence: {extractedData.confidence.approvals}%
                </Badge>
              </div>
              {extractedData.approvals?.map((approval, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-base">{approval.therapyName}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div><strong>Disease:</strong> {approval.diseaseName}</div>
                    <div><strong>Region:</strong> {approval.region}</div>
                    <div><strong>Approval Date:</strong> {new Date(approval.approvalDate).toLocaleDateString()}</div>
                    <div><strong>Type:</strong> {approval.approvalType}</div>
                    <div><strong>Regulatory Body:</strong> {approval.regulatoryBody}</div>
                    <div><strong>Sources:</strong> {approval.sources.join(", ")}</div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="sources" className="space-y-4">
              <h3 className="text-lg font-semibold mb-2">Source References</h3>
              {extractedData.sources.map((source, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div><strong>Page {source.page}:</strong> {source.section}</div>
                      <blockquote className="border-l-4 pl-4 italic text-sm text-muted-foreground">
                        "{source.quote}"
                      </blockquote>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            Review all data carefully before approving
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {extraction.requiresReview && (
              <>
                <Button variant="outline">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Data
                </Button>
                <Button onClick={onApprove}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve & Import
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}