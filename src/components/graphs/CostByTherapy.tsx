import CustomTooltip from "@/components/charts/CustomTooltip";
import VerticalStackedBarChart from "@/components/charts/VerticalStackedBarChart";

// Data interfaces
export interface CostByTherapyData {
  therapy: string;
  [key: string]: string | number; // Allow dynamic therapy name keys
}

// Stack configuration interface
export interface StackConfig {
  key: string;
  name: string;
  color: string;
}

// Filter configuration interface
export interface FilterConfig {
  key: string;
  label: string;
  options: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
}

// Component props
interface CostByTherapyProps {
  chartData: CostByTherapyData[];
  stacks: StackConfig[];
  filters: FilterConfig[];
  title: string;
  description: string;
}


// Custom tooltip that shows only the hovered therapy's cost
const CostTooltipWrapper = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    // Filter to show only non-zero values (the actual therapy being hovered)
    const activePayload = payload.filter((item: any) => item.value > 0);
    
    if (activePayload.length > 0) {
      return <CustomTooltip 
        active={active} 
        payload={activePayload.map((item: any) => ({
          name: item.name,
          value: new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(item.value * 1000), // Multiply by 1000 to show actual dollar amount
          color: item.color,
        }))} 
        label={label} 
      />;
    }
  }
  return null;
};

export default function CostByTherapy({
  chartData,
  stacks,
  filters,
  title,
  description,
}: CostByTherapyProps) {
  return (
    <div className="w-full space-y-6">
      <VerticalStackedBarChart
        data={chartData}
        xAxisKey="therapy"
        stacks={stacks}
        title={title}
        description={description}
        filters={filters}
        customTooltip={CostTooltipWrapper}
        yAxisLabel="Cost per Treatment ($USD, 000s)"
        height={400}
      />
    </div>
  );
}
