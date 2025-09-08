import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useMemo, useState, useEffect } from "react";

// Import reusable components
import ConfigurableLineChart, {
  createChartConfig,
  type LineConfig,
} from "@/components/charts/ConfigurableLineChart";
import DateRangeSlider from "@/components/charts/DateRangeSlider";
import FilterBadges, {
  type FilterConfig,
} from "@/components/charts/FilterBadges";
import SummaryCards, {
  createSummaryCards,
  type SummaryCardData,
} from "@/components/charts/SummaryCards";

// Data interfaces
interface ProcessedRevenueData {
  period: string;
  therapy: string;
  region: string;
  revenue: number;
  patients: number;
  price: number;
  key: string;
}

interface TherapyMetrics {
  revenue: number;
  patients: number;
}

interface AggregatedData {
  period: string;
  therapies: Record<string, TherapyMetrics>;
}

interface RevenueByTherapyProps {
  // Data
  chartData: ProcessedRevenueData[];
  aggregatedData: AggregatedData[];
  allPeriods: string[];

  // State & Handlers
  viewMode: "revenue" | "patients";
  onViewModeChange: (mode: "revenue" | "patients") => void;
  selectedRegions: string[];
  onRegionToggle: (region: string) => void;
  selectedTherapies: string[];
  onTherapyToggle: (therapy: string) => void;
  dateRange: number[];
  onDateRangeChange: (range: number[]) => void;
  timeResolution: "quarterly" | "annual";
  onTimeResolutionChange: (resolution: "quarterly" | "annual") => void;

  // Configuration
  availableRegions: string[];
  availableTherapies: string[];
  formatPeriod: (period: string, isMobile?: boolean) => string;
  getTherapyDisplayName: (therapyId: string) => string;
  getTherapyColor: (therapyId: string) => string;

  // Optional customization
  title?: string;
  description?: string;
  height?: number;
}

export default function RevenueByTherapy({
  chartData,
  aggregatedData,
  allPeriods,
  viewMode,
  onViewModeChange,
  selectedRegions,
  onRegionToggle,
  selectedTherapies,
  onTherapyToggle,
  dateRange,
  onDateRangeChange,
  timeResolution,
  onTimeResolutionChange,
  availableRegions,
  availableTherapies,
  formatPeriod,
  getTherapyDisplayName,
  getTherapyColor,
  title = "Cell Therapy Revenue Analysis",
  description = "Interactive line chart showing revenue and patient volume trends over time.",
  height = 400,
}: RevenueByTherapyProps) {
  // Mobile responsiveness hook (currently unused but kept for future use)
  const [, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 675);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Create time-resolution-aware format function
  const resolutionAwareFormatPeriod = useMemo(() => {
    return (period: string | number) => formatPeriod(String(period), timeResolution === 'annual');
  }, [formatPeriod, timeResolution]);

  // Track which data point is being hovered with position
  const [hoveredDataPoint, setHoveredDataPoint] = useState<{
    period: string;
    therapyId: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
  } | null>(null);

  // Custom Positioned Tooltip Component (only shows on dot hover)
  const LineChartTooltip = () => {
    if (!hoveredDataPoint) {
      return null;
    }

    const { therapyId, data, position } = hoveredDataPoint;
    const therapyName = getTherapyDisplayName(therapyId);
    const color = getTherapyColor(therapyId);
    const value = data[`${therapyId}_${viewMode}`] as number | undefined;

    if (value === undefined || value === null) {
      return null;
    }

    const formattedValue =
      viewMode === "revenue"
        ? `${value.toFixed(1)}M`
        : `${Math.round(value).toLocaleString()}`;

    return (
      <div
        className="fixed z-50 pointer-events-none"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: "translate(-50%, -100%)",
        }}
      >
        <Card className="w-56">
          <CardHeader className="p-3">
            <CardTitle className="text-base">{therapyName}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span
                    className="w-2.5 h-2.5 rounded-full mr-2"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {viewMode === "revenue" ? "Revenue" : "Patients"}
                  </span>
                </div>
                <span className="text-sm font-bold">{formattedValue}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Filter configuration
  const filterConfigs: FilterConfig[] = [
    {
      key: "regions",
      label: "Regions",
      options: availableRegions,
      selectedValues: selectedRegions,
      onToggle: onRegionToggle,
    },
    {
      key: "therapies",
      label: "Therapies",
      options: availableTherapies.map(getTherapyDisplayName),
      selectedValues: selectedTherapies.map(getTherapyDisplayName),
      onToggle: (displayName: string) => {
        // Find the therapyId from the display name
        const therapyId = availableTherapies.find(id => getTherapyDisplayName(id) === displayName);
        if (therapyId) {
          onTherapyToggle(therapyId);
        }
      },
    },
  ];

  // Transform aggregated data for Recharts (flatten therapy data)
  const chartDataForRecharts = useMemo(() => {
    if (timeResolution === 'annual') {
      // Aggregate quarterly data by year
      const yearlyData = new Map<string, Record<string, number | string>>();
      
      aggregatedData.forEach((periodData) => {
        const year = periodData.period.split('-')[0];
        
        if (!yearlyData.has(year)) {
          yearlyData.set(year, { period: year });
        }
        
        const yearData = yearlyData.get(year)!;
        
        // Sum up therapy data for the year
        Object.entries(periodData.therapies).forEach(([therapyId, metrics]) => {
          const revenueKey = `${therapyId}_revenue`;
          const patientsKey = `${therapyId}_patients`;
          
          // Only add values if they exist (not 0 from no data)
          if (metrics.revenue > 0) {
            yearData[revenueKey] = (Number(yearData[revenueKey]) || 0) + metrics.revenue;
          }
          if (metrics.patients > 0) {
            yearData[patientsKey] = (Number(yearData[patientsKey]) || 0) + metrics.patients;
          }
        });
      });
      
      return Array.from(yearlyData.values()).sort((a, b) => String(a.period).localeCompare(String(b.period)));
    } else {
      // Use quarterly data
      return aggregatedData.map((periodData) => {
        const flattened: Record<string, number | string | undefined> = { period: periodData.period };

        // Flatten therapy data into period-level keys for Recharts
        Object.entries(periodData.therapies).forEach(([therapyId, metrics]) => {
          // Only add values if they exist (not 0 from no data)
          // Use undefined for missing data points so the line doesn't render
          flattened[`${therapyId}_revenue`] = metrics.revenue > 0 ? metrics.revenue : undefined;
          flattened[`${therapyId}_patients`] = metrics.patients > 0 ? metrics.patients : undefined;
        });

        return flattened;
      });
    }
  }, [aggregatedData, timeResolution]);

  // Chart line configuration - dynamically generated from available therapies
  const lineConfigs: LineConfig[] = useMemo(() => {
    return selectedTherapies
      .filter((therapy) => availableTherapies.includes(therapy))
      .map((therapyId) => ({
        dataKey: `${therapyId}_${viewMode}`,
        name: getTherapyDisplayName(therapyId),
        stroke: getTherapyColor(therapyId),
        visible: true,
        // Add mouse event handlers for dot-specific hover tracking
        onDotMouseEnter: (payload, dataKey, position) => {
          const chartContainer = document.querySelector(".recharts-wrapper");
          const containerRect = chartContainer?.getBoundingClientRect();
          setHoveredDataPoint({
            period: payload.period as string,
            therapyId: therapyId,
            position: {
              x: (containerRect?.left || 0) + (position?.x || 0),
              y: (containerRect?.top || 0) + (position?.y || 0),
            },
            data: payload,
          });
        },
        onDotMouseLeave: () => {
          setHoveredDataPoint(null);
        },
      }));
  }, [
    viewMode,
    selectedTherapies,
    availableTherapies,
    getTherapyDisplayName,
    getTherapyColor,
  ]);

  // Chart configuration
  const chartConfig = useMemo(() => {
    return createChartConfig(chartDataForRecharts, "period", lineConfigs, {
      xAxisFormatter: resolutionAwareFormatPeriod,
      yAxisLabel:
        viewMode === "revenue" ? "Revenue (Millions USD)" : "Patients Treated",
      height,
      // tooltip: undefined, // Using custom positioned tooltip instead
    });
  }, [
    chartDataForRecharts,
    lineConfigs,
    resolutionAwareFormatPeriod,
    viewMode,
    height,
  ]);

  // Summary cards configuration
  const summaryCards: SummaryCardData[] = useMemo(
    () =>
      createSummaryCards(
        selectedTherapies.map((therapy) => {
          const therapyData = chartData.filter((d) => d.therapy === therapy);
          const totalRevenue = therapyData.reduce(
            (sum, d) => sum + (d.revenue || 0),
            0
          );
          const totalPatients = therapyData.reduce(
            (sum, d) => sum + (d.patients || 0),
            0
          );

          return {
            id: therapy,
            title: getTherapyDisplayName(therapy),
            value: viewMode === "revenue" ? totalRevenue : totalPatients,
            subtitle:
              viewMode === "revenue" ? "Total Revenue" : "Total Patients",
            formatter: (value: string | number) =>
              viewMode === "revenue"
                ? `${Number(value).toFixed(1)}M`
                : Number(value).toLocaleString(),
          };
        })
      ),
    [selectedTherapies, chartData, viewMode, getTherapyDisplayName]
  );

  return (
    <Card className="sm:mx-0 sm:rounded-lg rounded-none">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        {/* Controls */}
        <div className="space-y-4 mb-6">
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">View:</span>
            <Button
              variant={viewMode === "revenue" ? "default" : "outline"}
              size="sm"
              onClick={() => onViewModeChange("revenue")}
            >
              Revenue ($M)
            </Button>
            <Button
              variant={viewMode === "patients" ? "default" : "outline"}
              size="sm"
              onClick={() => onViewModeChange("patients")}
            >
              Patient Volume
            </Button>
          </div>

          {/* Time Resolution Toggle */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Time Resolution:</span>
            <Button
              variant={timeResolution === "quarterly" ? "default" : "outline"}
              size="sm"
              onClick={() => onTimeResolutionChange("quarterly")}
            >
              Quarterly
            </Button>
            <Button
              variant={timeResolution === "annual" ? "default" : "outline"}
              size="sm"
              onClick={() => onTimeResolutionChange("annual")}
            >
              Annual
            </Button>
          </div>

          {/* Date Range Slider */}
          <DateRangeSlider
            periods={allPeriods}
            dateRange={dateRange}
            setDateRange={onDateRangeChange}
            formatPeriod={resolutionAwareFormatPeriod}
          />

          {/* Filter Badges */}
          <FilterBadges filters={filterConfigs} />
        </div>

        {/* Chart */}
        <div className="relative">
          <ConfigurableLineChart config={chartConfig} />
          {/* Custom Positioned Tooltip */}
          <LineChartTooltip />
        </div>

        {/* Summary Stats */}
        <div className="mt-6">
          <SummaryCards cards={summaryCards} />
        </div>
      </CardContent>
    </Card>
  );
}
