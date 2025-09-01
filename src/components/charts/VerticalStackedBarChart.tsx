import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useMemo, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface StackConfig {
  key: string;
  name: string;
  color: string;
}

interface FilterConfig {
  key: string;
  label: string;
  options: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
}

interface VerticalStackedBarChartProps {
  data: any[];
  xAxisKey: string;
  stacks: StackConfig[];
  title: string;
  description: string;
  filters?: FilterConfig[];
  customTooltip?: React.ComponentType<any>;
  yAxisLabel?: string;
  height?: number;
  xAxisAngle?: number;
  bottomMargin?: number;
  xAxisHeight?: number;
  legendPaddingTop?: number;
}

const DefaultTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce(
      (sum: number, item: any) => sum + (item.value || 0),
      0
    );

    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-semibold">{label}</p>
        <p className="text-blue-600 font-medium">Total: {total}</p>
        {payload.map((item: any, index: number) => (
          <p key={index} style={{ color: item.color }} className="text-sm">
            {item.name}: {item.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function VerticalStackedBarChart({
  data,
  xAxisKey,
  stacks,
  title,
  description,
  filters = [],
  customTooltip: CustomTooltipContent = DefaultTooltip,
  yAxisLabel = "Count",
  height = 400,
  xAxisAngle = -45,
  bottomMargin = 60,
  xAxisHeight = 80,
  legendPaddingTop = 0,
}: VerticalStackedBarChartProps) {
  // Mobile responsiveness hook
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 675);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate totals for each x-axis item
  const dataWithTotals = useMemo(() => {
    return data.map((item) => {
      const total = stacks.reduce(
        (sum, stack) => sum + (item[stack.key] || 0),
        0
      );
      return { ...item, total };
    });
  }, [data, stacks]);

  const maxTotal = useMemo(() => {
    if (dataWithTotals.length === 0) return 0;
    const totals = dataWithTotals.map((item) => item.total);
    return Math.max(...totals);
  }, [dataWithTotals]);

  const tickCount = useMemo(() => {
    const ceiledMax = Math.ceil(maxTotal);
    if (ceiledMax > 0 && ceiledMax < 5) {
      return ceiledMax + 1;
    }
    return undefined;
  }, [maxTotal]);

  // Adjust margins for mobile
  const responsiveMargin = isMobile 
    ? { top: 5, right: 15, left: 25, bottom: 40 }
    : { top: 5, right: 30, left: 60, bottom: bottomMargin };

  // Calculate minimum width for mobile to ensure readability
  const chartWidth = isMobile ? Math.max(600, data.length * 80) : "100%";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        {filters.length > 0 && (
          <div className="space-y-4 mb-20">
            {filters.map((filter) => (
              <div key={filter.key} className="flex items-center space-x-2">
                <span className="text-sm font-medium">{filter.label}:</span>
                {filter.options.map((option) => (
                  <Badge
                    key={option}
                    variant={
                      filter.selectedValues.includes(option)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => filter.onToggle(option)}
                  >
                    {option}
                  </Badge>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        <div style={{ height }} className={isMobile ? "overflow-x-auto" : ""}>
          <ResponsiveContainer width={chartWidth} height="100%">
            <BarChart
              data={dataWithTotals}
              margin={responsiveMargin}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey={xAxisKey}
                interval={isMobile ? "preserveStartEnd" : 0}
                angle={xAxisAngle}
                textAnchor="end"
                height={xAxisHeight}
              />
              <YAxis
                allowDecimals={false}
                tickCount={tickCount}
                label={{
                  value: yAxisLabel,
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: 'middle' },
                }}
              />
              <Tooltip
                content={(props) => <CustomTooltipContent {...props} />}
                cursor={{ fill: "rgba(206, 212, 218, 0.2)" }}
              />
              <Legend 
                verticalAlign="bottom"
                wrapperStyle={{ paddingTop: `${legendPaddingTop}px` }}
              />

              {stacks.map((stack) => (
                <Bar
                  key={stack.key}
                  dataKey={stack.key}
                  stackId="a"
                  fill={stack.color}
                  name={stack.name}
                  barSize={20}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {dataWithTotals.map((item) => (
            <Card key={item[xAxisKey]} className="p-4">
              <div className="text-sm font-medium text-gray-500">
                {item[xAxisKey]}
              </div>
              <div className="text-2xl font-bold">{item.total}</div>
              <div className="text-xs text-gray-500">Total</div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
