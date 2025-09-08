import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useMemo, useEffect, useState, useRef } from "react";
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

// Types for chart data and tooltip
interface ChartDataItem {
  [key: string]: string | number;
}

// Define a flexible tooltip props type that accepts what Recharts provides
// We use unknown for the props to avoid type conflicts with Recharts' complex generics
type TooltipProps = Record<string, unknown>;

interface VerticalStackedBarChartProps {
  data: ChartDataItem[];
  xAxisKey: string;
  stacks: StackConfig[];
  title: string;
  description: string;
  filters?: FilterConfig[];
  customTooltip?: React.ComponentType<TooltipProps>;
  yAxisLabel?: string;
  height?: number;
  xAxisAngle?: number;
  bottomMargin?: number;
  xAxisHeight?: number;
  legendPaddingTop?: number;
  showSummaryStats?: boolean;
  additionalContent?: React.ReactNode;
  filterAdditionalContent?: React.ReactNode;
}

const DefaultTooltip = (props: TooltipProps) => {
  const active = props.active as boolean | undefined;
  const payload = props.payload as Array<{
    name?: string | number;
    value?: string | number | (string | number)[];
    color?: string;
  }> | undefined;
  const label = props.label as string | number | undefined;
  
  if (active && payload && payload.length) {
    const total = payload.reduce(
      (sum: number, item) => {
        const val = Array.isArray(item.value) ? item.value[0] : item.value;
        return sum + (Number(val) || 0);
      },
      0
    );

    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-semibold">{label}</p>
        <p className="text-blue-600 font-medium">Total: {total}</p>
        {payload.map((item, index: number) => {
          const displayValue = Array.isArray(item.value) ? item.value[0] : item.value;
          return (
            <p key={index} style={{ color: item.color as string }} className="text-sm">
              {String(item.name || 'Unknown')}: {displayValue ?? 0}
            </p>
          );
        })}
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
  showSummaryStats = true,
  additionalContent,
  filterAdditionalContent,
}: VerticalStackedBarChartProps) {
  // Mobile responsiveness hook
  const [isMobile, setIsMobile] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 675);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset scroll position to start on mobile
  useEffect(() => {
    if (isMobile && scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
    }
  }, [isMobile, data]);

  // Calculate totals for each x-axis item
  const dataWithTotals = useMemo(() => {
    return data.map((item) => {
      const total = stacks.reduce(
        (sum, stack) => sum + (Number(item[stack.key]) || 0),
        0
      );
      return { ...item, total };
    });
  }, [data, stacks]) as Array<ChartDataItem & { total: number }>;

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
    ? { top: 5, right: 10, left: 15, bottom: 40 }
    : { top: 5, right: 30, left: 60, bottom: bottomMargin };

  // Calculate minimum width for mobile to ensure readability
  const chartWidth = isMobile ? Math.max(600, data.length * 80) : "100%";

  return (
    <Card className="sm:mx-0 sm:rounded-lg rounded-none">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        {/* Filters */}
        {filters.length > 0 && (
          <div className="space-y-4 mb-4">
            {filters.map((filter) => (
              <div key={filter.key} className="flex flex-col sm:flex-row sm:items-start gap-2">
                <span className="text-sm font-medium shrink-0">{filter.label}:</span>
                <div className="flex flex-wrap gap-2">
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
              </div>
            ))}
          </div>
        )}

        {/* Additional content below filters */}
        {filterAdditionalContent && (
          <div className="mb-6">
            {filterAdditionalContent}
          </div>
        )}

        {/* Chart */}
        <div ref={scrollContainerRef} style={{ height }} className={isMobile ? "overflow-x-auto" : ""}>
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

        {/* Additional Content (e.g., disease details button) */}
        {additionalContent && (
          <div className="mt-4">
            {additionalContent}
          </div>
        )}

        {/* Summary Stats */}
        {showSummaryStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {dataWithTotals.map((item) => (
              <Card key={String(item[xAxisKey])} className="p-4">
                <div className="text-sm font-medium text-gray-500">
                  {String(item[xAxisKey])}
                </div>
                <div className="text-2xl font-bold">{item.total}</div>
                <div className="text-xs text-gray-500">Total</div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
