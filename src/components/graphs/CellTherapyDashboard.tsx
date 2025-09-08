"use client";
import { useMemo, useState, useEffect, useCallback } from "react";

// Import graph components
import ApprovalsByProduct, {
  ApprovalsByProductData,
} from "./ApprovalsByProduct";
import ProductsByDisease, { ProductsByDiseaseData } from "./ProductsByDisease";
import RevenueByTherapy from "./RevenueByTherapy";

// Import data
import { getTherapyColor } from "@/lib/colour-utils";
import CostByTherapy, { CostByTherapyData } from "./CostByTherapy";
import TreatmentCenterMap from "./TreatmentCenterMap";
import { processRevenueWithHierarchy, ProcessedRevenueData as HierarchicalRevenueData } from "@/lib/utils/revenue-hierarchy";
import type { Therapy, Disease, TherapyApproval, TherapyRevenue, TreatmentCenter } from "@/lib/db/schema";

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

const formatPeriod = (period: string, isMobile: boolean = false): string => {
  const [year, quarter] = period.split("-");
  if (isMobile) {
    return year;
  }
  return `${quarter} ${year}`;
};

// Data interfaces
interface EnrichedTherapyData extends HierarchicalRevenueData {
  therapyName: string;
  pricePerTreatmentUsd: number;
  manufacturer: string;
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

const computeAvailableOptions = (
  data: {
    therapies: Array<{ id: string; mechanism: string; manufacturer: string }>;
    therapyRevenue: Array<{ region: string }>;
    therapyApprovals: Array<{
      approvalType: string;
      regulatoryBody: string;
      region: string;
      diseaseId?: string;
      diseaseIndication?: string | null;
      therapyId?: string;
      therapyName?: string | null;
    }>;
  },
  hierarchicalRevenue?: Array<{ region: string }>
) => {
  // Use hierarchical revenue data for regions if available, otherwise fall back to raw data
  const revenueRegions = hierarchicalRevenue 
    ? [...new Set(hierarchicalRevenue.map((item) => item.region))]
    : [...new Set(data.therapyRevenue.map((item) => item.region))];
  
  return {
    therapies: [...new Set(data.therapies.map((t) => t.id))],
    regions: revenueRegions,
    approvalTypes: [
      ...new Set(data.therapyApprovals.map((a) => a.approvalType)),
    ],
    regulatoryBodies: [
      ...new Set(data.therapyApprovals.map((a) => a.regulatoryBody)),
    ],
    diseaseIndications: [
      ...new Set(data.therapyApprovals.map((a) => a.diseaseIndication || a.diseaseId || "")),
    ],
    mechanisms: [...new Set(data.therapies.map((t) => t.mechanism))],
    manufacturers: [...new Set(data.therapies.map((t) => t.manufacturer))],
    approvalRegions: [...new Set(data.therapyApprovals.map((a) => a.region))],
  };
};

interface CellTherapyDashboardProps {
  data: {
    therapies: Therapy[];
    diseases: Disease[];
    therapyApprovals: TherapyApproval[];
    therapyRevenue: TherapyRevenue[];
    treatmentCenters: TreatmentCenter[];
  };
}

export default function CellTherapyDashboard({ data }: CellTherapyDashboardProps) {
  // === ALWAYS USE SERVER-PROVIDED DATA ===
  // No API calls from client - data always comes from SSR
  
  
  // Process revenue data with hierarchy first
  const hierarchicalRevenue = useMemo(() => {
    if (!data) return [];
    return processRevenueWithHierarchy(data.therapyRevenue);
  }, [data]);

  // === STATE MANAGEMENT ===
  const availableOptions = useMemo(
    () =>
      data
        ? computeAvailableOptions({
            therapies: data.therapies,
            therapyRevenue: data.therapyRevenue,
            therapyApprovals: data.therapyApprovals,
          }, hierarchicalRevenue)
        : {
            therapies: [],
            regions: [],
            approvalTypes: [],
            regulatoryBodies: [],
            diseaseIndications: [],
            mechanisms: [],
            manufacturers: [],
            approvalRegions: [],
          },
    [data, hierarchicalRevenue]
  );

  // Revenue chart state
  const [viewMode, setViewMode] = useState<"revenue" | "patients">("revenue");
  const [selectedRegions, setSelectedRegions] = useState<string[]>(() => 
    data ? availableOptions.regions : []
  );
  const [selectedTherapies, setSelectedTherapies] = useState<string[]>(() =>
    data ? availableOptions.therapies : []
  );

  // ApprovalsByProduct chart state
  const [selectedApprovalTypes, setSelectedApprovalTypes] = useState<string[]>(() =>
    data ? availableOptions.approvalTypes : []
  );
  const [, setSelectedRegulatoryBodies] = useState<
    string[]
  >(() => data ? availableOptions.regulatoryBodies : []);

  const [selectedDiseaseIndications, setSelectedDiseaseIndications] = useState<
    string[]
  >(() => data ? availableOptions.diseaseIndications : []);

  // ProductsByDisease chart state
  const [selectedRegionsForDisease, setSelectedRegionsForDisease] = useState<
    string[]
  >(() => data ? availableOptions.approvalRegions : []);
  const [selectedMechanisms, setSelectedMechanisms] = useState<string[]>(() =>
    data ? availableOptions.mechanisms : []
  );

  // Update states when data loads
  useEffect(() => {
    if (data && (availableOptions.regions.length > 0 || availableOptions.approvalRegions.length > 0)) {
      setSelectedRegions(prev => prev.length === 0 ? availableOptions.regions : prev);
      setSelectedTherapies(prev => prev.length === 0 ? availableOptions.therapies : prev);
      setSelectedApprovalTypes(prev => prev.length === 0 ? availableOptions.approvalTypes : prev);
      setSelectedRegulatoryBodies(prev => prev.length === 0 ? availableOptions.regulatoryBodies : prev);
      setSelectedDiseaseIndications(prev => prev.length === 0 ? availableOptions.diseaseIndications : prev);
      setSelectedRegionsForDisease(prev => prev.length === 0 ? availableOptions.approvalRegions : prev);
      setSelectedMechanisms(prev => prev.length === 0 ? availableOptions.mechanisms : prev);
    }
  }, [data, availableOptions]);

  // === DATA PROCESSING ===

  // Join hierarchical revenue data with therapy metadata
  const enrichedData: EnrichedTherapyData[] = useMemo(() => {
    if (!data || hierarchicalRevenue.length === 0) return [];
    
    // Enrich hierarchical revenue with therapy metadata
    return hierarchicalRevenue.map((revenue) => {
      const therapy = data.therapies.find((t) => t.id === revenue.therapyId);
      return {
        ...revenue,
        therapyName: therapy?.name || revenue.therapyId,
        pricePerTreatmentUsd: therapy?.pricePerTreatmentUsd || 0,
        manufacturer: therapy?.manufacturer || "Unknown",
      };
    });
  }, [data, hierarchicalRevenue]);

  // Get all unique periods and sort them
  const allPeriods = useMemo(() => {
    const periods = [...new Set(enrichedData.map((item) => item.period))];
    return periods.sort(
      (a, b) => periodToDate(a).getTime() - periodToDate(b).getTime()
    );
  }, [enrichedData]);

  // Date range slider state - initialize with full range
  const [dateRange, setDateRange] = useState<number[]>([0, 0]);
  
  // Time resolution state
  const [timeResolution, setTimeResolution] = useState<"quarterly" | "annual">("quarterly");

  // Update date range when periods change
  useEffect(() => {
    if (allPeriods.length > 0 && dateRange[1] === 0) {
      setDateRange([0, allPeriods.length - 1]);
    }
  }, [allPeriods, dateRange]);

  // Get filtered periods based on slider
  const filteredPeriods = useMemo(() => {
    if (allPeriods.length === 0) return [];
    return allPeriods.slice(dateRange[0], dateRange[1] + 1);
  }, [allPeriods, dateRange]);

  // Transform and filter data for revenue chart
  const chartData: ProcessedRevenueData[] = useMemo(() => {
    return enrichedData
      .filter((item) => selectedRegions.includes(item.region))
      .filter((item) => selectedTherapies.includes(item.therapyId))
      .filter((item) => filteredPeriods.includes(item.period))
      .map((item) => {
        const revenue = item.revenueMillionsUsd || 0;
        const price = item.pricePerTreatmentUsd || 1;
        const patients = Math.round((revenue * 1000000) / price);

        return {
          period: item.period,
          therapy: item.therapyId,
          region: item.region,
          revenue: revenue,
          patients: patients,
          price: item.pricePerTreatmentUsd || 0,
          key: `${item.therapyId}-${item.period}-${item.region}`,
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
    if (!data) return [];
    const filteredApprovals = data.therapyApprovals.filter(
      (approval) =>
        selectedApprovalTypes.includes(approval.approvalType) &&
        selectedDiseaseIndications.includes(approval.diseaseIndication || approval.diseaseId || "")
    );

    const grouped = filteredApprovals.reduce<
      Record<string, ApprovalsByProductData>
    >((acc, approval) => {
      const therapyName = approval.therapyName ||
        data.therapies.find((t) => t.id === approval.therapyId)?.name ||
        approval.therapyId || "Unknown";

      if (!acc[therapyName]) {
        acc[therapyName] = { therapy: therapyName };
      }
      acc[therapyName][approval.regulatoryBody] =
        ((acc[therapyName][approval.regulatoryBody] as number) || 0) + 1;

      return acc;
    }, {});

    // Sort by total approval count in descending order
    return Object.values(grouped).sort((a, b) => {
      const totalA = Object.keys(a)
        .filter(key => key !== 'therapy')
        .reduce((sum, key) => sum + (a[key] as number || 0), 0);
      const totalB = Object.keys(b)
        .filter(key => key !== 'therapy')
        .reduce((sum, key) => sum + (b[key] as number || 0), 0);
      return totalB - totalA;
    });
  }, [data, selectedApprovalTypes, selectedDiseaseIndications]);

  // Mobile responsive state
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 900);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Function to get disease display name for mobile (use indication) or desktop (use name)
  const getDiseaseDisplayName = useCallback((disease: { id: string; name: string; indication?: string | null }): string => {
    if (isMobile) {
      return disease.indication || disease.name;
    }
    return disease.name;
  }, [isMobile]);

  // Process data for ProductsByDisease chart
  const productsByDiseaseChartData: ProductsByDiseaseData[] = useMemo(() => {
    if (!data) return [];
    const filteredApprovals = data.therapyApprovals.filter((approval) =>
      selectedRegionsForDisease.includes(approval.region)
    );

    const uniqueCombinations = new Set(
      filteredApprovals.map(
        (approval) => `${approval.therapyName || approval.therapyId}-${approval.diseaseIndication || approval.diseaseId}-${approval.region}`
      )
    );

    const grouped = data.diseases.reduce<Record<string, ProductsByDiseaseData>>(
      (acc, disease) => {
        const displayName = getDiseaseDisplayName(disease);
        acc[disease.name] = { disease: displayName };
        return acc;
      },
      {}
    );

    uniqueCombinations.forEach((combo) => {
      const [therapyNameOrId, diseaseIndicationOrId] = combo.split("-");
      // Try to find therapy by name first (new structure), then by ID (old structure)
      const therapy = data.therapies.find((t) => t.name === therapyNameOrId || t.id === therapyNameOrId);
      // Try to find disease by indication first, then by ID
      const disease = data.diseases.find((d) => d.indication === diseaseIndicationOrId || d.id === diseaseIndicationOrId);

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
  }, [data, selectedRegionsForDisease, selectedMechanisms, getDiseaseDisplayName]);

  // Process data for CostByTherapy chart
  const costByTherapyChartData: CostByTherapyData[] = useMemo(() => {
    if (!data) return [];
    // Get therapies that have approvals for selected disease indications
    const approvedTherapyIds = new Set(
      data.therapyApprovals
        .filter((approval) =>
          selectedDiseaseIndications.includes(approval.diseaseIndication || approval.diseaseId || "")
        )
        .map((approval) => approval.therapyName || approval.therapyId || "")
    );

    const filteredTherapies = data.therapies.filter((therapy) =>
      approvedTherapyIds.has(therapy.name) || approvedTherapyIds.has(therapy.id)
    );

    // Create data structure where each therapy has its own column
    return filteredTherapies
      .map((therapy) => {
        const dataPoint: CostByTherapyData = { therapy: therapy.name };

        // Add cost for this therapy and 0 for others (to ensure proper coloring)
        // Convert to thousands for better y-axis readability
        filteredTherapies.forEach((t) => {
          dataPoint[t.name] =
            t.name === therapy.name ? (t.pricePerTreatmentUsd / 1000) : 0;
        });

        return dataPoint;
      })
      .sort((a, b) => {
        // Sort by the therapy's actual cost (not the therapy name)
        const aCost = Math.max(
          ...Object.values(a).filter((v) => typeof v === "number")
        ) as number;
        const bCost = Math.max(
          ...Object.values(b).filter((v) => typeof v === "number")
        ) as number;
        return bCost - aCost;
      });
  }, [data, selectedDiseaseIndications]);

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

  const handleTimeResolutionChange = (resolution: "quarterly" | "annual") => {
    setTimeResolution(resolution);
  };

  const handleViewModeChange = (mode: "revenue" | "patients") => {
    setViewMode(mode);
  };

  // === CONFIGURATION ===

  // Helper function to get therapy display name
  const getTherapyDisplayName = (therapyId: string): string => {
    return data?.therapies.find((t) => t.id === therapyId)?.name || therapyId;
  };

  // Helper function to get therapy color using utility
  const getTherapyColorForId = useCallback((therapyId: string): string => {
    return getTherapyColor(therapyId, availableOptions.therapies);
  }, [availableOptions.therapies]);

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
      options: availableOptions.diseaseIndications, // These are already indication strings
      selectedValues: selectedDiseaseIndications, // These should also be indication strings
      onToggle: (value: string) => {
        // Toggle the indication string directly
        setSelectedDiseaseIndications((prev) =>
          prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
        );
      },
    },
  ];

  // Config for ProductsByDisease chart
  const productsByDiseaseStacks = availableOptions.therapies.map(
    (therapyId) => {
      const therapyName =
        data?.therapies.find((t) => t.id === therapyId)?.name || therapyId;
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
      options: availableOptions.approvalRegions,
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

  // Config for CostByTherapy chart
  const costByTherapyStacks = useMemo(() => {
    if (!data) return [];
    // Get therapies that have approvals for selected disease indications
    const approvedTherapyIds = new Set(
      data.therapyApprovals
        .filter((approval) =>
          selectedDiseaseIndications.includes(approval.diseaseIndication || approval.diseaseId || "")
        )
        .map((approval) => approval.therapyName || approval.therapyId || "")
    );

    return data.therapies
      .filter((therapy) => approvedTherapyIds.has(therapy.name))
      .map((therapy) => ({
        key: therapy.name,
        name: therapy.name,
        color: getTherapyColorForId(therapy.id),
      }));
  }, [data, selectedDiseaseIndications, getTherapyColorForId]);

  const costByTherapyFilters = [
    {
      key: "diseaseIndication",
      label: "Disease Indication",
      options: availableOptions.diseaseIndications, // These are already indication strings
      selectedValues: selectedDiseaseIndications, // These should also be indication strings
      onToggle: (value: string) => {
        // Toggle the indication string directly
        setSelectedDiseaseIndications((prev) =>
          prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
        );
      },
    },
  ];

  // Early returns after all hooks and calculations
  // Data is always provided from server - no loading state needed
  if (!data) return <div className="p-6">No data available</div>;

  return (
    <div className="w-full space-y-8 p-0 sm:p-6">
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
        timeResolution={timeResolution}
        onTimeResolutionChange={handleTimeResolutionChange}
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
        diseases={data?.diseases.map(d => ({ id: d.id, name: d.name, indication: d.indication || null }))}
      />

      {/* Products by Disease Bar Chart */}
      <ProductsByDisease
        chartData={productsByDiseaseChartData}
        stacks={productsByDiseaseStacks}
        filters={productsByDiseaseFilters}
        title="Approved Products by Disease"
        description="Number of approved therapeutic products for each disease indication, stacked by manufacturer. Filter by region and mechanism of action."
        diseases={data?.diseases.map(d => ({ id: d.id, name: d.name, indication: d.indication || null }))}
      />

      {/* Cost by Therapy Bar Chart */}
      <CostByTherapy
        chartData={costByTherapyChartData}
        stacks={costByTherapyStacks}
        filters={costByTherapyFilters}
        title="Treatment Cost Comparison"
        description="Cost per treatment for different CAR-T therapies approved for selected disease indications."
        diseases={data?.diseases}
      />

      <TreatmentCenterMap 
        therapies={data.therapies}
        diseases={data.diseases}
        approvals={data.therapyApprovals}
        treatmentCenters={data.treatmentCenters}
      />
    </div>
  );
}
