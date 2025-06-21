"use client";
import { useMemo, useState } from "react";

// Import graph components
import ApprovalsByProduct, {
  ApprovalsByProductData,
} from "./ApprovalsByProduct";
import ProductsByDisease, { ProductsByDiseaseData } from "./ProductsByDisease";
import RevenueByTherapy from "./RevenueByTherapy";

// Import data
import { getTherapyColor } from "@/lib/colour-utils";
import {
  diseases,
  therapies,
  therapyApprovals,
  therapyRevenue,
} from "./therapy-data";
import TreatmentCenterMap from "./TreatmentCenterMap";

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

const computeAvailableOptions = (data: {
  therapies: Array<{ id: string; mechanism: string; manufacturer: string }>;
  therapyRevenue: Array<{ region: string }>;
  therapyApprovals: Array<{
    approval_type: string;
    regulatory_body: string;
    region: string;
    disease_id: string;
  }>;
}) => {
  return {
    therapies: [...new Set(data.therapies.map((t) => t.id))],
    regions: [...new Set(data.therapyRevenue.map((item) => item.region))],
    approvalTypes: [
      ...new Set(data.therapyApprovals.map((a) => a.approval_type)),
    ],
    regulatoryBodies: [
      ...new Set(data.therapyApprovals.map((a) => a.regulatory_body)),
    ],
    diseaseIndications: [
      ...new Set(data.therapyApprovals.map((a) => a.disease_id)),
    ],
    mechanisms: [...new Set(data.therapies.map((t) => t.mechanism))],
    manufacturers: [...new Set(data.therapies.map((t) => t.manufacturer))],
    approvalRegions: [...new Set(data.therapyApprovals.map((a) => a.region))],
  };
};

export default function CellTherapyDashboard() {
  // === STATE MANAGEMENT ===
  const availableOptions = useMemo(
    () =>
      computeAvailableOptions({
        therapies,
        therapyRevenue,
        therapyApprovals,
      }),
    [] // Static data - compute once when component mounts
  );

  // Revenue chart state
  const [viewMode, setViewMode] = useState<"revenue" | "patients">("revenue");
  const [selectedRegions, setSelectedRegions] = useState<string[]>(
    () => availableOptions.regions
  );
  const [selectedTherapies, setSelectedTherapies] = useState<string[]>(
    () => availableOptions.therapies
  );

  // ApprovalsByProduct chart state
  const [selectedApprovalTypes, setSelectedApprovalTypes] = useState<string[]>(
    () => availableOptions.approvalTypes
  );
  const [selectedRegulatoryBodies, setSelectedRegulatoryBodies] = useState<
    string[]
  >(() => availableOptions.regulatoryBodies);

  const [selectedDiseaseIndications, setSelectedDiseaseIndications] = useState<
    string[]
  >(() => availableOptions.diseaseIndications);

  // ProductsByDisease chart state
  const [selectedRegionsForDisease, setSelectedRegionsForDisease] = useState<
    string[]
  >(() => availableOptions.approvalRegions);
  const [selectedMechanisms, setSelectedMechanisms] = useState<string[]>(
    () => availableOptions.mechanisms
  );

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

  // Process data for ApprovalsByProduct chart
  const approvalsByProductChartData: ApprovalsByProductData[] = useMemo(() => {
    const filteredApprovals = therapyApprovals.filter(
      (approval) =>
        selectedApprovalTypes.includes(approval.approval_type) &&
        selectedDiseaseIndications.includes(approval.disease_id)
    );

    const grouped = filteredApprovals.reduce<
      Record<string, ApprovalsByProductData>
    >((acc, approval) => {
      const therapyName =
        therapies.find((t) => t.id === approval.therapy_id)?.name ||
        approval.therapy_id;

      if (!acc[therapyName]) {
        acc[therapyName] = { therapy: therapyName };
      }
      acc[therapyName][approval.regulatory_body] =
        ((acc[therapyName][approval.regulatory_body] as number) || 0) + 1;

      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) =>
      a.therapy.localeCompare(b.therapy)
    );
  }, [selectedApprovalTypes, selectedDiseaseIndications]);

  // Process data for ProductsByDisease chart
  const productsByDiseaseChartData: ProductsByDiseaseData[] = useMemo(() => {
    const filteredApprovals = therapyApprovals.filter((approval) =>
      selectedRegionsForDisease.includes(approval.region)
    );

    const uniqueCombinations = new Set(
      filteredApprovals.map(
        (approval) => `${approval.therapy_id}-${approval.disease_id}`
      )
    );

    const grouped = diseases.reduce<Record<string, ProductsByDiseaseData>>(
      (acc, disease) => {
        acc[disease.name] = { disease: disease.name };
        return acc;
      },
      {}
    );

    uniqueCombinations.forEach((combo) => {
      const [therapyId, diseaseId] = combo.split("-");
      const therapy = therapies.find((t) => t.id === therapyId);
      const disease = diseases.find((d) => d.id === diseaseId);

      if (!therapy || !selectedMechanisms.includes(therapy.mechanism)) {
        return;
      }

      if (disease && therapy && grouped[disease.name]) {
        const productName = therapy.name;
        if (!grouped[disease.name][productName]) {
          grouped[disease.name][productName] = 0;
        }
        (grouped[disease.name][productName] as number) += 1;
      }
    });

    return Object.values(grouped)
      .filter((item) =>
        Object.keys(item).some(
          (key) =>
            key !== "disease" &&
            typeof item[key] === "number" &&
            (item[key] as number) > 0
        )
      )
      .sort((a, b) => {
        const totalA = Object.values(a).reduce<number>(
          (sum, val) => (typeof val === "number" ? sum + val : sum),
          0
        );
        const totalB = Object.values(b).reduce<number>(
          (sum, val) => (typeof val === "number" ? sum + val : sum),
          0
        );
        return totalB - totalA;
      });
  }, [selectedRegionsForDisease, selectedMechanisms]);

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

  // Helper function to get therapy display name
  const getTherapyDisplayName = (therapyId: string): string => {
    return therapies.find((t) => t.id === therapyId)?.name || therapyId;
  };

  // Helper function to get therapy color using utility
  const getTherapyColorForId = (therapyId: string): string => {
    return getTherapyColor(therapyId, availableOptions.therapies);
  };

  // Config for ApprovalsByProduct chart
  const approvalsByProductStacks = availableOptions.regulatoryBodies.map(
    (body) => ({
      key: body,
      name: body,
      color: getTherapyColor(body, availableOptions.regulatoryBodies),
    })
  );

  const approvalsByProductFilters = [
    {
      key: "approvalType",
      label: "Approval Type",
      options: availableOptions.approvalTypes,
      selectedValues: selectedApprovalTypes,
      onToggle: (value: string) => {
        setSelectedApprovalTypes((prev) =>
          prev.includes(value)
            ? prev.filter((v) => v !== value)
            : [...prev, value]
        );
      },
    },
    {
      key: "diseaseIndication",
      label: "Disease Indication",
      options: availableOptions.diseaseIndications.map((id) => {
        const disease = diseases.find((d) => d.id === id);
        return disease ? `${disease.name} (${id})` : id;
      }),
      selectedValues: selectedDiseaseIndications.map((id) => {
        const disease = diseases.find((d) => d.id === id);
        return disease ? `${disease.name} (${id})` : id;
      }),
      onToggle: (value: string) => {
        // Extract ID from the formatted string if it contains parentheses
        const id = value.includes("(")
          ? value.match(/\(([^)]+)\)/)?.[1] || value
          : value;
        setSelectedDiseaseIndications((prev) =>
          prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
        );
      },
    },
  ];

  // Config for ProductsByDisease chart
  const productsByDiseaseStacks = availableOptions.therapies.map(
    (therapyId) => {
      const therapyName =
        therapies.find((t) => t.id === therapyId)?.name || therapyId;
      return {
        key: therapyName,
        name: therapyName,
        color: getTherapyColor(therapyId, availableOptions.therapies),
      };
    }
  );

  const productsByDiseaseFilters = [
    {
      key: "region",
      label: "Regions",
      options: availableOptions.regions,
      selectedValues: selectedRegionsForDisease,
      onToggle: (value: string) => {
        setSelectedRegionsForDisease((prev) =>
          prev.includes(value)
            ? prev.filter((v) => v !== value)
            : [...prev, value]
        );
      },
    },
    {
      key: "mechanism",
      label: "Mechanism",
      options: availableOptions.mechanisms,
      selectedValues: selectedMechanisms,
      onToggle: (value: string) => {
        setSelectedMechanisms((prev) =>
          prev.includes(value)
            ? prev.filter((v) => v !== value)
            : [...prev, value]
        );
      },
    },
  ];

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
        availableRegions={availableOptions.regions}
        availableTherapies={availableOptions.therapies}
        formatPeriod={formatPeriod}
        getTherapyDisplayName={getTherapyDisplayName}
        getTherapyColor={getTherapyColorForId}
        title="Cell Therapy Revenue Analysis"
        description="Interactive line chart with date range slider showing revenue and patient volume trends. Filter by time period, regions, and therapies."
      />

      {/* Approvals by Product Bar Chart */}
      <ApprovalsByProduct
        chartData={approvalsByProductChartData}
        stacks={approvalsByProductStacks}
        filters={approvalsByProductFilters}
        title="Regulatory Approvals by Product"
        description="Number of regulatory approvals for each therapy, stacked by regulatory body. Filter by approval type and disease indication."
      />

      {/* Products by Disease Bar Chart */}
      <ProductsByDisease
        chartData={productsByDiseaseChartData}
        stacks={productsByDiseaseStacks}
        filters={productsByDiseaseFilters}
        title="Approved Products by Disease"
        description="Number of approved therapeutic products for each disease indication, stacked by manufacturer. Filter by region and mechanism of action."
      />

      <TreatmentCenterMap />
    </div>
  );
}
