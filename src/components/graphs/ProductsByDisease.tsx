import CustomTooltip from "@/components/charts/CustomTooltip";
import VerticalStackedBarChart from "@/components/charts/VerticalStackedBarChart";
import {
  FilterConfig,
  StackConfig,
} from "@/components/graphs/ApprovalsByProduct";
import DiseaseNamesDialog from "@/components/ui/DiseaseNamesDialog";
import { useEffect, useState } from "react";

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
  diseases?: Array<{ id: string; name: string; indication: string | null }>;
}

export default function ProductsByDisease({
  chartData,
  stacks,
  filters,
  title,
  description,
  diseases = [],
}: ProductsByDiseaseProps) {
  // Mobile responsiveness hook
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 900);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Get responsive legend padding
  const responsiveLegendPadding = isMobile ? 30 : 250;
  const responsiveHeight = isMobile ? 550 : 650;

  // Disease Names Dialog
  const diseaseNamesDialog = diseases.length > 0 ? (
    <DiseaseNamesDialog diseases={diseases} />
  ) : null;

  return (
    <div className="w-full">
      <VerticalStackedBarChart
        data={chartData}
        xAxisKey="disease"
        stacks={stacks}
        title={title}
        description={description}
        filters={filters}
        customTooltip={CustomTooltip}
        yAxisLabel="Number of Products"
        height={responsiveHeight}
        xAxisAngle={-45}
        bottomMargin={60}
        xAxisHeight={80}
        legendPaddingTop={responsiveLegendPadding}
        showSummaryStats={false}
        filterAdditionalContent={diseaseNamesDialog}
      />
    </div>
  );
}
