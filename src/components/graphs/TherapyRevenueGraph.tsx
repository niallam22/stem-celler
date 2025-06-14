"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useMemo, useState } from "react";
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

// Helper function to convert period string to sortable format
const periodToDate = (period: string): Date => {
  const [year, quarter] = period.split("-");
  const quarterMonth = {
    Q1: 0, // January
    Q2: 3, // April
    Q3: 6, // July
    Q4: 9, // October
  };
  return new Date(
    parseInt(year),
    quarterMonth[quarter as keyof typeof quarterMonth] || 0,
    1
  );
};

// Helper function to format date for display
const formatPeriod = (period: string): string => {
  const [year, quarter] = period.split("-");
  return `${quarter} ${year}`;
};

// TypeScript Interfaces
interface TherapyData {
  record_id: string;
  therapy_id: string;
  period: string;
  region: string;
  revenue_millions_usd: number;
  price_per_treatment_usd: number;
  source_report: string;
  last_updated: string;
}

interface ChartData {
  period: string;
  therapy: string;
  region: string;
  revenue: number;
  patients: number;
  price: number;
}

// Sample Data
const sampleData: TherapyData[] = [
  // YESCARTA 2023 Data
  {
    record_id: "YES_2023_Q1_US",
    therapy_id: "YESCARTA",
    period: "2023-Q1",
    region: "US",
    revenue_millions_usd: 195,
    price_per_treatment_usd: 373000,
    source_report: "Gilead Q1 2023",
    last_updated: "2023-05-02",
  },
  {
    record_id: "YES_2023_Q1_EU",
    therapy_id: "YESCARTA",
    period: "2023-Q1",
    region: "Europe",
    revenue_millions_usd: 125,
    price_per_treatment_usd: 320000,
    source_report: "Gilead Q1 2023",
    last_updated: "2023-05-02",
  },
  {
    record_id: "YES_2023_Q1_OTH",
    therapy_id: "YESCARTA",
    period: "2023-Q1",
    region: "Other",
    revenue_millions_usd: 28,
    price_per_treatment_usd: 280000,
    source_report: "Gilead Q1 2023",
    last_updated: "2023-05-02",
  },

  {
    record_id: "YES_2023_Q2_US",
    therapy_id: "YESCARTA",
    period: "2023-Q2",
    region: "US",
    revenue_millions_usd: 208,
    price_per_treatment_usd: 373000,
    source_report: "Gilead Q2 2023",
    last_updated: "2023-08-01",
  },
  {
    record_id: "YES_2023_Q2_EU",
    therapy_id: "YESCARTA",
    period: "2023-Q2",
    region: "Europe",
    revenue_millions_usd: 142,
    price_per_treatment_usd: 320000,
    source_report: "Gilead Q2 2023",
    last_updated: "2023-08-01",
  },
  {
    record_id: "YES_2023_Q2_OTH",
    therapy_id: "YESCARTA",
    period: "2023-Q2",
    region: "Other",
    revenue_millions_usd: 35,
    price_per_treatment_usd: 280000,
    source_report: "Gilead Q2 2023",
    last_updated: "2023-08-01",
  },

  {
    record_id: "YES_2023_Q3_US",
    therapy_id: "YESCARTA",
    period: "2023-Q3",
    region: "US",
    revenue_millions_usd: 221,
    price_per_treatment_usd: 373000,
    source_report: "Gilead Q3 2023",
    last_updated: "2023-11-02",
  },
  {
    record_id: "YES_2023_Q3_EU",
    therapy_id: "YESCARTA",
    period: "2023-Q3",
    region: "Europe",
    revenue_millions_usd: 140,
    price_per_treatment_usd: 320000,
    source_report: "Gilead Q3 2023",
    last_updated: "2023-11-02",
  },
  {
    record_id: "YES_2023_Q3_OTH",
    therapy_id: "YESCARTA",
    period: "2023-Q3",
    region: "Other",
    revenue_millions_usd: 35,
    price_per_treatment_usd: 280000,
    source_report: "Gilead Q3 2023",
    last_updated: "2023-11-02",
  },

  {
    record_id: "YES_2023_Q4_US",
    therapy_id: "YESCARTA",
    period: "2023-Q4",
    region: "US",
    revenue_millions_usd: 187,
    price_per_treatment_usd: 373000,
    source_report: "Gilead Q4 2023",
    last_updated: "2024-02-06",
  },
  {
    record_id: "YES_2023_Q4_EU",
    therapy_id: "YESCARTA",
    period: "2023-Q4",
    region: "Europe",
    revenue_millions_usd: 140,
    price_per_treatment_usd: 320000,
    source_report: "Gilead Q4 2023",
    last_updated: "2024-02-06",
  },
  {
    record_id: "YES_2023_Q4_OTH",
    therapy_id: "YESCARTA",
    period: "2023-Q4",
    region: "Other",
    revenue_millions_usd: 42,
    price_per_treatment_usd: 280000,
    source_report: "Gilead Q4 2023",
    last_updated: "2024-02-06",
  },

  // KYMRIAH 2024 Data
  {
    record_id: "KYM_2024_Q1_US",
    therapy_id: "KYMRIAH",
    period: "2024-Q1",
    region: "US",
    revenue_millions_usd: 85,
    price_per_treatment_usd: 475000,
    source_report: "Novartis Q1 2024",
    last_updated: "2024-04-25",
  },
  {
    record_id: "KYM_2024_Q1_EU",
    therapy_id: "KYMRIAH",
    period: "2024-Q1",
    region: "Europe",
    revenue_millions_usd: 35,
    price_per_treatment_usd: 420000,
    source_report: "Novartis Q1 2024",
    last_updated: "2024-04-25",
  },
  {
    record_id: "KYM_2024_Q1_OTH",
    therapy_id: "KYMRIAH",
    period: "2024-Q1",
    region: "Other",
    revenue_millions_usd: 15,
    price_per_treatment_usd: 380000,
    source_report: "Novartis Q1 2024",
    last_updated: "2024-04-25",
  },

  {
    record_id: "KYM_2024_Q2_US",
    therapy_id: "KYMRIAH",
    period: "2024-Q2",
    region: "US",
    revenue_millions_usd: 78,
    price_per_treatment_usd: 475000,
    source_report: "Novartis Q2 2024",
    last_updated: "2024-07-25",
  },
  {
    record_id: "KYM_2024_Q2_EU",
    therapy_id: "KYMRIAH",
    period: "2024-Q2",
    region: "Europe",
    revenue_millions_usd: 32,
    price_per_treatment_usd: 420000,
    source_report: "Novartis Q2 2024",
    last_updated: "2024-07-25",
  },
  {
    record_id: "KYM_2024_Q2_OTH",
    therapy_id: "KYMRIAH",
    period: "2024-Q2",
    region: "Other",
    revenue_millions_usd: 12,
    price_per_treatment_usd: 380000,
    source_report: "Novartis Q2 2024",
    last_updated: "2024-07-25",
  },

  {
    record_id: "KYM_2024_Q3_US",
    therapy_id: "KYMRIAH",
    period: "2024-Q3",
    region: "US",
    revenue_millions_usd: 72,
    price_per_treatment_usd: 475000,
    source_report: "Novartis Q3 2024",
    last_updated: "2024-10-25",
  },
  {
    record_id: "KYM_2024_Q3_EU",
    therapy_id: "KYMRIAH",
    period: "2024-Q3",
    region: "Europe",
    revenue_millions_usd: 28,
    price_per_treatment_usd: 420000,
    source_report: "Novartis Q3 2024",
    last_updated: "2024-10-25",
  },
  {
    record_id: "KYM_2024_Q3_OTH",
    therapy_id: "KYMRIAH",
    period: "2024-Q3",
    region: "Other",
    revenue_millions_usd: 10,
    price_per_treatment_usd: 380000,
    source_report: "Novartis Q3 2024",
    last_updated: "2024-10-25",
  },

  {
    record_id: "KYM_2024_Q4_US",
    therapy_id: "KYMRIAH",
    period: "2024-Q4",
    region: "US",
    revenue_millions_usd: 65,
    price_per_treatment_usd: 475000,
    source_report: "Novartis Q4 2024",
    last_updated: "2025-01-30",
  },
  {
    record_id: "KYM_2024_Q4_EU",
    therapy_id: "KYMRIAH",
    period: "2024-Q4",
    region: "Europe",
    revenue_millions_usd: 25,
    price_per_treatment_usd: 420000,
    source_report: "Novartis Q4 2024",
    last_updated: "2025-01-30",
  },
  {
    record_id: "KYM_2024_Q4_OTH",
    therapy_id: "KYMRIAH",
    period: "2024-Q4",
    region: "Other",
    revenue_millions_usd: 18,
    price_per_treatment_usd: 380000,
    source_report: "Novartis Q4 2024",
    last_updated: "2025-01-30",
  },
];

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label, viewMode }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;

    // Safety checks for undefined values
    const revenue = data.revenue || 0;
    const patients = data.patients || 0;
    const price = data.price || 0;

    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-semibold">{`${
          data.therapy || "Unknown"
        } - ${label}`}</p>
        <p className="text-blue-600">
          {viewMode === "revenue"
            ? `Revenue: ${revenue.toFixed(1)}M`
            : `Patients: ${Math.round(patients)}`}
        </p>
        <p className="text-gray-500 text-sm">
          Region: {data.region || "Unknown"}
        </p>
        <p className="text-gray-500 text-sm">
          Price: ${(price / 1000).toFixed(0)}K
        </p>
      </div>
    );
  }
  return null;
};

export default function CellTherapyDashboard() {
  const [viewMode, setViewMode] = useState<"revenue" | "patients">("revenue");
  const [selectedRegions, setSelectedRegions] = useState<string[]>([
    "US",
    "Europe",
    "Other",
  ]);
  const [selectedTherapies, setSelectedTherapies] = useState<string[]>([
    "YESCARTA",
    "KYMRIAH",
  ]);

  // Get all unique periods and sort them
  const allPeriods = useMemo(() => {
    const periods = [...new Set(sampleData.map((item) => item.period))];
    return periods.sort(
      (a, b) => periodToDate(a).getTime() - periodToDate(b).getTime()
    );
  }, []);

  // Date range slider state
  const [dateRange, setDateRange] = useState<number[]>([
    0,
    allPeriods.length - 1,
  ]);

  // Get filtered periods based on slider
  const filteredPeriods = useMemo(() => {
    return allPeriods.slice(dateRange[0], dateRange[1] + 1);
  }, [allPeriods, dateRange]);

  // Transform data for chart
  const chartData = useMemo(() => {
    return sampleData
      .filter((item) => selectedRegions.includes(item.region))
      .filter((item) => selectedTherapies.includes(item.therapy_id))
      .filter((item) => filteredPeriods.includes(item.period)) // Add date range filter
      .map((item) => {
        // Safety checks and calculations
        const revenue = item.revenue_millions_usd || 0;
        const price = item.price_per_treatment_usd || 1; // Avoid division by zero
        const patients = Math.round((revenue * 1000000) / price);

        return {
          period: item.period,
          therapy: item.therapy_id,
          region: item.region,
          revenue: revenue,
          patients: patients,
          price: item.price_per_treatment_usd || 0,
          key: `${item.therapy_id}-${item.period}-${item.region}`,
        };
      });
  }, [selectedRegions, selectedTherapies, filteredPeriods]);

  // Aggregate data by period for the chart
  const aggregatedData = useMemo(() => {
    // Start with all filtered periods to ensure we have complete timeline
    const grouped = filteredPeriods.reduce((acc, period) => {
      acc[period] = {
        period: period,
        YESCARTA_revenue: 0,
        YESCARTA_patients: 0,
        KYMRIAH_revenue: 0,
        KYMRIAH_patients: 0,
      };
      return acc;
    }, {} as any);

    // Add actual data to the structure
    chartData.forEach((item) => {
      const period = item.period;
      if (grouped[period]) {
        // Safety checks for undefined values
        const revenue = item.revenue || 0;
        const patients = item.patients || 0;

        if (item.therapy === "YESCARTA") {
          grouped[period].YESCARTA_revenue += revenue;
          grouped[period].YESCARTA_patients += patients;
        } else if (item.therapy === "KYMRIAH") {
          grouped[period].KYMRIAH_revenue += revenue;
          grouped[period].KYMRIAH_patients += patients;
        }
      }
    });

    return Object.values(grouped).sort(
      (a: any, b: any) =>
        periodToDate(a.period).getTime() - periodToDate(b.period).getTime()
    );
  }, [chartData, filteredPeriods]);

  const regions = ["US", "Europe", "Other"];
  const therapies = ["YESCARTA", "KYMRIAH"];

  const toggleRegion = (region: string) => {
    setSelectedRegions((prev) =>
      prev.includes(region)
        ? prev.filter((r) => r !== region)
        : [...prev, region]
    );
  };

  const toggleTherapy = (therapy: string) => {
    setSelectedTherapies((prev) =>
      prev.includes(therapy)
        ? prev.filter((t) => t !== therapy)
        : [...prev, therapy]
    );
  };

  return (
    <div className="w-full space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Cell Therapy Market Analysis</CardTitle>
          <CardDescription>
            Interactive line chart with date range slider showing{" "}
            {viewMode === "revenue" ? "revenue" : "patient volume"} trends.
            Filter by time period, regions, and therapies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Controls */}
          <div className="space-y-4 mb-6">
            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">View:</span>
              <Button
                variant={viewMode === "revenue" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("revenue")}
              >
                Revenue ($M)
              </Button>
              <Button
                variant={viewMode === "patients" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("patients")}
              >
                Patient Volume
              </Button>
            </div>

            {/* Date Range Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Date Range:</span>
                <span className="text-sm text-gray-500">
                  {formatPeriod(allPeriods[dateRange[0]])} -{" "}
                  {formatPeriod(allPeriods[dateRange[1]])}
                </span>
              </div>
              <div className="px-3">
                <div className="relative h-8 flex items-center">
                  {/* Background track */}
                  <div className="absolute w-full h-2 bg-gray-200 rounded-lg pointer-events-none" />

                  {/* Selected range indicator */}
                  <div
                    className="absolute h-2 bg-blue-500 rounded pointer-events-none"
                    style={{
                      left: `${
                        (dateRange[0] / (allPeriods.length - 1)) * 100
                      }%`,
                      width: `${
                        ((dateRange[1] - dateRange[0]) /
                          (allPeriods.length - 1)) *
                        100
                      }%`,
                    }}
                  />

                  {/* Start handle */}
                  <div
                    className="absolute w-5 h-5 bg-blue-600 border-2 border-white rounded-full cursor-grab active:cursor-grabbing shadow-md z-30 hover:scale-110 transition-transform"
                    style={{
                      left: `calc(${
                        (dateRange[0] / (allPeriods.length - 1)) * 100
                      }% - 10px)`,
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const startX = e.clientX;
                      const startValue = dateRange[0];
                      const rect =
                        e.currentTarget.parentElement!.getBoundingClientRect();
                      const width = rect.width - 40; // Account for padding

                      const handleMouseMove = (e: MouseEvent) => {
                        const deltaX = e.clientX - startX;
                        const deltaValue = Math.round(
                          (deltaX / width) * (allPeriods.length - 1)
                        );
                        const newValue = Math.max(
                          0,
                          Math.min(
                            allPeriods.length - 1,
                            startValue + deltaValue
                          )
                        );
                        setDateRange([
                          newValue,
                          Math.max(newValue, dateRange[1]),
                        ]);
                      };

                      const handleMouseUp = () => {
                        document.removeEventListener(
                          "mousemove",
                          handleMouseMove
                        );
                        document.removeEventListener("mouseup", handleMouseUp);
                      };

                      document.addEventListener("mousemove", handleMouseMove);
                      document.addEventListener("mouseup", handleMouseUp);
                    }}
                  />

                  {/* End handle */}
                  <div
                    className="absolute w-5 h-5 bg-blue-600 border-2 border-white rounded-full cursor-grab active:cursor-grabbing shadow-md z-40 hover:scale-110 transition-transform"
                    style={{
                      left: `calc(${
                        (dateRange[1] / (allPeriods.length - 1)) * 100
                      }% - 10px)`,
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const startX = e.clientX;
                      const startValue = dateRange[1];
                      const rect =
                        e.currentTarget.parentElement!.getBoundingClientRect();
                      const width = rect.width - 40; // Account for padding

                      const handleMouseMove = (e: MouseEvent) => {
                        const deltaX = e.clientX - startX;
                        const deltaValue = Math.round(
                          (deltaX / width) * (allPeriods.length - 1)
                        );
                        const newValue = Math.max(
                          0,
                          Math.min(
                            allPeriods.length - 1,
                            startValue + deltaValue
                          )
                        );
                        setDateRange([
                          Math.min(dateRange[0], newValue),
                          newValue,
                        ]);
                      };

                      const handleMouseUp = () => {
                        document.removeEventListener(
                          "mousemove",
                          handleMouseMove
                        );
                        document.removeEventListener("mouseup", handleMouseUp);
                      };

                      document.addEventListener("mousemove", handleMouseMove);
                      document.addEventListener("mouseup", handleMouseUp);
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>{formatPeriod(allPeriods[0])}</span>
                <span>{formatPeriod(allPeriods[allPeriods.length - 1])}</span>
              </div>
            </div>

            {/* Region Filters */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Regions:</span>
              {regions.map((region) => (
                <Badge
                  key={region}
                  variant={
                    selectedRegions.includes(region) ? "default" : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => toggleRegion(region)}
                >
                  {region}
                </Badge>
              ))}
            </div>

            {/* Therapy Filters */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Therapies:</span>
              {therapies.map((therapy) => (
                <Badge
                  key={therapy}
                  variant={
                    selectedTherapies.includes(therapy) ? "default" : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => toggleTherapy(therapy)}
                >
                  {therapy}
                </Badge>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={aggregatedData}
                margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="period"
                  tickFormatter={(value) => formatPeriod(value)}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  label={{
                    value:
                      viewMode === "revenue"
                        ? "Revenue (Millions USD)"
                        : "Patients Treated",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip
                  content={(props) => (
                    <CustomTooltip
                      {...props}
                      viewMode={viewMode}
                      selectedRegions={selectedRegions}
                      dateRange={dateRange}
                      allPeriods={allPeriods}
                    />
                  )}
                />
                <Legend />

                {selectedTherapies.includes("YESCARTA") && (
                  <Line
                    type="monotone"
                    dataKey={
                      viewMode === "revenue"
                        ? "YESCARTA_revenue"
                        : "YESCARTA_patients"
                    }
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: "#3b82f6", strokeWidth: 2, r: 6 }}
                    name="Yescarta"
                    connectNulls={false}
                  />
                )}

                {selectedTherapies.includes("KYMRIAH") && (
                  <Line
                    type="monotone"
                    dataKey={
                      viewMode === "revenue"
                        ? "KYMRIAH_revenue"
                        : "KYMRIAH_patients"
                    }
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ fill: "#ef4444", strokeWidth: 2, r: 6 }}
                    name="Kymriah"
                    connectNulls={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            {selectedTherapies.map((therapy) => {
              const therapyData = chartData.filter(
                (d) => d.therapy === therapy
              );
              const totalRevenue = therapyData.reduce(
                (sum, d) => sum + (d.revenue || 0),
                0
              );
              const totalPatients = therapyData.reduce(
                (sum, d) => sum + (d.patients || 0),
                0
              );

              return (
                <Card key={therapy} className="p-4">
                  <div className="text-sm font-medium text-gray-500">
                    {therapy}
                  </div>
                  <div className="text-2xl font-bold">
                    {viewMode === "revenue"
                      ? `${totalRevenue.toFixed(1)}M`
                      : `${totalPatients.toLocaleString()}`}
                  </div>
                  <div className="text-xs text-gray-500">
                    {viewMode === "revenue"
                      ? "Total Revenue"
                      : "Total Patients"}
                  </div>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
