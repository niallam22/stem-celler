import CustomTooltip from "@/components/charts/CustomTooltip";
import VerticalStackedBarChart from "@/components/charts/VerticalStackedBarChart";
import DiseaseNamesDialog from "@/components/ui/DiseaseNamesDialog";

// Prop interfaces
export interface StackConfig {
  key: string;
  name: string;
  color: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
}

// Data interfaces
export interface ApprovalsByProductData {
  therapy: string;
  [key: string]: string | number;
}

// Component props
interface ApprovalsByProductProps {
  chartData: ApprovalsByProductData[];
  stacks: StackConfig[];
  filters: FilterConfig[];
  title: string;
  description: string;
  diseases?: Array<{ id: string; name: string; indication: string | null }>;
}

export default function ApprovalsByProduct({
  chartData,
  stacks,
  filters,
  title,
  description,
  diseases = [],
}: ApprovalsByProductProps) {
  // Disease Names Dialog
  const diseaseNamesDialog = diseases.length > 0 ? (
    <DiseaseNamesDialog diseases={diseases} />
  ) : null;

  return (
    <div className="w-full space-y-6">
      <VerticalStackedBarChart
        data={chartData}
        xAxisKey="therapy"
        stacks={stacks}
        title={title}
        description={description}
        filters={filters}
        customTooltip={CustomTooltip}
        yAxisLabel="Number of Approvals"
        height={400}
        showSummaryStats={false}
        filterAdditionalContent={diseaseNamesDialog}
      />
    </div>
  );
}
