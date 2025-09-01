import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useState } from "react";

export interface LineConfig {
  dataKey: string;
  name: string;
  stroke: string;
  strokeWidth?: number;
  dot?: any;
  visible: boolean;
  onDotMouseEnter?: (
    payload: any,
    dataKey: string,
    position?: { x: number; y: number }
  ) => void;
  onDotMouseLeave?: () => void;
}

export interface ChartConfig {
  data: any[];
  xAxisKey: string;
  lines: LineConfig[];
  xAxisFormatter?: (value: any) => string;
  yAxisLabel?: string;
  height?: number;
  margin?: { top: number; right: number; left: number; bottom: number };
  tooltip?: React.ComponentType<any>;
}

interface ConfigurableLineChartProps {
  config: ChartConfig;
}

export default function ConfigurableLineChart({
  config,
}: ConfigurableLineChartProps) {
  const {
    data,
    xAxisKey,
    lines,
    xAxisFormatter,
    yAxisLabel,
    height = 400,
    margin = { top: 5, right: 30, left: 60, bottom: 60 },
    tooltip: CustomTooltip,
  } = config;

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

  // Adjust margins for mobile
  const responsiveMargin = isMobile 
    ? { top: 5, right: 15, left: 25, bottom: 40 }
    : margin;

  // Calculate minimum width for mobile to ensure readability
  const chartWidth = isMobile ? Math.max(800, data.length * 60) : "100%";

  return (
    <div style={{ height }} className={isMobile ? "overflow-x-auto" : ""}>
      <ResponsiveContainer width={chartWidth} height="100%">
        <LineChart data={data} margin={responsiveMargin}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey={xAxisKey}
            tickFormatter={xAxisFormatter}
            interval={isMobile ? "preserveStartEnd" : 0}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            label={{
              value: yAxisLabel,
              angle: -90,
              position: "insideLeft",
              style: { textAnchor: 'middle' },
            }}
          />
          {CustomTooltip && (
            <Tooltip content={<CustomTooltip />} cursor={false} />
          )}
          <Legend />

          {lines
            .filter((line) => line.visible)
            .map((line, index) => {
              const renderCustomDot = (props: any) => {
                const {
                  cx,
                  cy,
                  stroke,
                  payload,
                  value,
                  index: dotIndex,
                } = props;

                if (value === undefined || value === null) {
                  return null;
                }

                const handleMouseEnter = () => {
                  if (line.onDotMouseEnter) {
                    line.onDotMouseEnter(payload, line.dataKey, {
                      x: cx,
                      y: cy,
                    });
                  }
                };

                const handleMouseLeave = () => {
                  if (line.onDotMouseLeave) {
                    line.onDotMouseLeave();
                  }
                };

                return (
                  <circle
                    key={`dot-${line.dataKey}-${dotIndex}`}
                    cx={cx}
                    cy={cy}
                    r={5}
                    stroke={stroke}
                    strokeWidth={2}
                    fill={stroke}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    style={{ cursor: "pointer" }}
                  />
                );
              };

              return (
                <Line
                  key={`line-${line.dataKey}-${index}`}
                  type="monotone"
                  dataKey={line.dataKey}
                  stroke={line.stroke}
                  strokeWidth={line.strokeWidth || 3}
                  dot={
                    line.onDotMouseEnter
                      ? renderCustomDot
                      : line.dot || { fill: line.stroke, strokeWidth: 2, r: 4 }
                  }
                  activeDot={{
                    r: 8,
                    stroke: line.stroke,
                    strokeWidth: 2,
                    fill: line.stroke,
                  }}
                  name={line.name}
                  connectNulls={false}
                />
              );
            })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Helper function to create chart configs
export const createChartConfig = (
  data: any[],
  xAxisKey: string,
  lines: LineConfig[],
  options?: {
    xAxisFormatter?: (value: any) => string;
    yAxisLabel?: string;
    height?: number;
    margin?: { top: number; right: number; left: number; bottom: number };
    tooltip?: React.ComponentType<any>;
  }
): ChartConfig => ({
  data,
  xAxisKey,
  lines,
  ...options,
});
