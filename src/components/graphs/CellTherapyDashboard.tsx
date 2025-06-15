"use client";
import { useMemo, useState } from "react";

// Import graph components
import ApprovalsByProduct from "./ApprovalsByProduct";
import ProductsByDisease from "./ProductsByDisease";
import RevenueByTherapy from "./RevenueByTherapy";

// Import data
import { getTherapyColor } from "@/lib/colour-utils";
import { therapies, therapyRevenue } from "./therapy-data";

// Helper functions
const periodToDate = (period: string): Date => {
  const [year, quarter] = period.split("-");
  const quarterMonth = {
    Q1: 0,
    Q2: 3,
    Q3: 6,
    Q4: 9,
  };
  return new Date(
    parseInt(year),
    quarterMonth[quarter as keyof typeof quarterMonth] || 0,
    1
  );
};

const formatPeriod = (period: string): string => {
  const [year, quarter] = period.split("-");
  return `${quarter} ${year}`;
};

// Data interfaces
interface EnrichedTherapyData {
  id: string;
  therapy_id: string;
  therapy_name: string;
  period: string;
  region: string;
  revenue_millions_usd: number;
  price_per_treatment_usd: number;
  manufacturer: string;
  sources: string[];
  last_updated: string;
}

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

export default function CellTherapyDashboard() {
  // === STATE MANAGEMENT ===

  // Revenue chart state
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

  // === DATA PROCESSING ===

  // Join revenue data with therapy metadata
  const enrichedData: EnrichedTherapyData[] = useMemo(() => {
    return therapyRevenue.map((revenue) => {
      const therapy = therapies.find((t) => t.id === revenue.therapy_id);
      return {
        ...revenue,
        therapy_name: therapy?.name || revenue.therapy_id,
        price_per_treatment_usd: therapy?.price_per_treatment_usd || 0,
        manufacturer: therapy?.manufacturer || "Unknown",
      };
    });
  }, []);

  // Get all unique periods and sort them
  const allPeriods = useMemo(() => {
    const periods = [...new Set(enrichedData.map((item) => item.period))];
    return periods.sort(
      (a, b) => periodToDate(a).getTime() - periodToDate(b).getTime()
    );
  }, [enrichedData]);

  // Date range slider state - initialize with full range
  const [dateRange, setDateRange] = useState<number[]>([
    0,
    Math.max(0, allPeriods.length - 1),
  ]);

  // Get filtered periods based on slider
  const filteredPeriods = useMemo(() => {
    if (allPeriods.length === 0) return [];
    return allPeriods.slice(dateRange[0], dateRange[1] + 1);
  }, [allPeriods, dateRange]);

  // Transform and filter data for revenue chart
  const chartData: ProcessedRevenueData[] = useMemo(() => {
    return enrichedData
      .filter((item) => selectedRegions.includes(item.region))
      .filter((item) => selectedTherapies.includes(item.therapy_id))
      .filter((item) => filteredPeriods.includes(item.period))
      .map((item) => {
        const revenue = item.revenue_millions_usd || 0;
        const price = item.price_per_treatment_usd || 1;
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
  }, [enrichedData, selectedRegions, selectedTherapies, filteredPeriods]);

  // Aggregate data by period for the line chart
  const aggregatedData: AggregatedData[] = useMemo(() => {
    // Initialize with empty structure for all filtered periods
    const initialGrouped: Record<string, AggregatedData> = {};

    filteredPeriods.forEach((period) => {
      initialGrouped[period] = {
        period,
        therapies: {},
      };

      // Initialize all selected therapies with zero values
      selectedTherapies.forEach((therapyId) => {
        initialGrouped[period].therapies[therapyId] = {
          revenue: 0,
          patients: 0,
        };
      });
    });

    // Aggregate actual data
    chartData.forEach((item) => {
      const period = item.period;
      const therapy = item.therapy;

      if (initialGrouped[period] && selectedTherapies.includes(therapy)) {
        if (!initialGrouped[period].therapies[therapy]) {
          initialGrouped[period].therapies[therapy] = {
            revenue: 0,
            patients: 0,
          };
        }

        initialGrouped[period].therapies[therapy].revenue += item.revenue || 0;
        initialGrouped[period].therapies[therapy].patients +=
          item.patients || 0;
      }
    });

    return Object.values(initialGrouped).sort(
      (a, b) =>
        periodToDate(a.period).getTime() - periodToDate(b.period).getTime()
    );
  }, [chartData, filteredPeriods, selectedTherapies]);

  // === EVENT HANDLERS ===

  const handleRegionToggle = (region: string) => {
    setSelectedRegions((prev) =>
      prev.includes(region)
        ? prev.filter((r) => r !== region)
        : [...prev, region]
    );
  };

  const handleTherapyToggle = (therapy: string) => {
    setSelectedTherapies((prev) =>
      prev.includes(therapy)
        ? prev.filter((t) => t !== therapy)
        : [...prev, therapy]
    );
  };

  const handleDateRangeChange = (range: number[]) => {
    setDateRange(range);
  };

  const handleViewModeChange = (mode: "revenue" | "patients") => {
    setViewMode(mode);
  };

  // === CONFIGURATION ===

  const availableRegions = ["US", "Europe", "Other"];
  const availableTherapies = therapies.map((t) => t.id);

  // Helper function to get therapy display name
  const getTherapyDisplayName = (therapyId: string): string => {
    return therapies.find((t) => t.id === therapyId)?.name || therapyId;
  };

  // Helper function to get therapy color using utility
  const getTherapyColorForId = (therapyId: string): string => {
    return getTherapyColor(therapyId, availableTherapies);
  };

  return (
    <div className="w-full space-y-8 p-6">
      {/* Revenue by Therapy Line Chart */}
      <RevenueByTherapy
        chartData={chartData}
        aggregatedData={aggregatedData}
        allPeriods={allPeriods}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        selectedRegions={selectedRegions}
        onRegionToggle={handleRegionToggle}
        selectedTherapies={selectedTherapies}
        onTherapyToggle={handleTherapyToggle}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        availableRegions={availableRegions}
        availableTherapies={availableTherapies}
        formatPeriod={formatPeriod}
        getTherapyDisplayName={getTherapyDisplayName}
        getTherapyColor={getTherapyColorForId}
        title="Cell Therapy Revenue Analysis"
        description="Interactive line chart with date range slider showing revenue and patient volume trends. Filter by time period, regions, and therapies."
      />

      {/* Approvals by Product Bar Chart */}
      <ApprovalsByProduct />

      {/* Products by Disease Bar Chart */}
      <ProductsByDisease />
    </div>
  );
}
