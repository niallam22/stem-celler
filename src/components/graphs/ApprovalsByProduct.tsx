import { useMemo, useState } from "react";

import CustomTooltip from "@/components/charts/CustomTooltip";
import VerticalStackedBarChart from "@/components/charts/VerticalStackedBarChart";
import { therapies, therapyApprovals } from "./therapy-data";

interface ApprovalsByProductData {
  therapy: string;
  US: number;
  Europe: number;
  [key: string]: string | number;
}

export default function ApprovalsByProduct() {
  // Filter states
  const [selectedApprovalTypes, setSelectedApprovalTypes] = useState<string[]>([
    "Full",
    "Conditional",
  ]);
  const [selectedRegulatoryBodies, setSelectedRegulatoryBodies] = useState<
    string[]
  >(["FDA", "EMA"]);

  // Get unique filter options
  const approvalTypes = [
    ...new Set(therapyApprovals.map((a) => a.approval_type)),
  ];
  const regulatoryBodies = [
    ...new Set(therapyApprovals.map((a) => a.regulatory_body)),
  ];

  // Process data
  const chartData: ApprovalsByProductData[] = useMemo(() => {
    // Filter approvals based on selected filters
    const filteredApprovals = therapyApprovals.filter(
      (approval) =>
        selectedApprovalTypes.includes(approval.approval_type) &&
        selectedRegulatoryBodies.includes(approval.regulatory_body)
    );

    // Group by therapy and region
    const grouped = filteredApprovals.reduce((acc, approval) => {
      const therapyName =
        therapies.find((t) => t.id === approval.therapy_id)?.name ||
        approval.therapy_id;

      if (!acc[therapyName]) {
        acc[therapyName] = { therapy: therapyName, US: 0, Europe: 0 };
      }

      if (approval.region === "US") {
        acc[therapyName].US += 1;
      } else if (approval.region === "Europe") {
        acc[therapyName].Europe += 1;
      }

      return acc;
    }, {} as Record<string, ApprovalsByProductData>);

    return Object.values(grouped).sort((a, b) =>
      a.therapy.localeCompare(b.therapy)
    );
  }, [selectedApprovalTypes, selectedRegulatoryBodies]);

  // Stack configuration
  const stacks = [
    { key: "US", name: "United States", color: "#3b82f6" },
    { key: "Europe", name: "Europe", color: "#ef4444" },
  ];

  // Filter configuration
  const filters = [
    {
      key: "approvalType",
      label: "Approval Type",
      options: approvalTypes,
      selectedValues: selectedApprovalTypes,
      onToggle: (value: string) => {
        setSelectedApprovalTypes((prev) =>
          prev.includes(value)
            ? prev.filter((v) => v !== value)
            : [...prev, value]
        );
      },
    },
    {
      key: "regulatoryBody",
      label: "Regulatory Body",
      options: regulatoryBodies,
      selectedValues: selectedRegulatoryBodies,
      onToggle: (value: string) => {
        setSelectedRegulatoryBodies((prev) =>
          prev.includes(value)
            ? prev.filter((v) => v !== value)
            : [...prev, value]
        );
      },
    },
  ];

  return (
    <div className="w-full space-y-6">
      <VerticalStackedBarChart
        data={chartData}
        xAxisKey="therapy"
        stacks={stacks}
        title="Regulatory Approvals by Product"
        description="Number of regulatory approvals for each therapy, stacked by region. Filter by approval type and regulatory body."
        filters={filters}
        customTooltip={CustomTooltip}
        yAxisLabel="Number of Approvals"
        height={400}
      />
    </div>
  );
}
