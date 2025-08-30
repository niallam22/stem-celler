import CustomTooltip from "@/components/charts/CustomTooltip";
import VerticalStackedBarChart from "@/components/charts/VerticalStackedBarChart";
import {
  FilterConfig,
  StackConfig,
} from "@/components/graphs/ApprovalsByProduct";

// Data interfaces
export interface ProductsByDiseaseData {
  disease: string;
  [key: string]: string | number;
}

// Component props
interface ProductsByDiseaseProps {
  chartData: ProductsByDiseaseData[];
  stacks: StackConfig[];
  filters: FilterConfig[];
  title: string;
  description: string;
}

export default function ProductsByDisease({
  chartData,
  stacks,
  filters,
  title,
  description,
}: ProductsByDiseaseProps) {
  return (
    <div className="w-full space-y-6">
      <VerticalStackedBarChart
        data={chartData}
        xAxisKey="disease"
        stacks={stacks}
        title={title}
        description={description}
        filters={filters}
        customTooltip={CustomTooltip}
        yAxisLabel="Number of Products"
        height={500}
        xAxisAngle={-25}
        bottomMargin={60}
        xAxisHeight={80}
        legendPaddingTop={80}
      />
    </div>
  );
}
