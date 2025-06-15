import VerticalStackedBarChart from "@/components/charts/VerticalStackedBarChart";
import { useMemo, useState } from "react";

// Import data (in real implementation, this would be from your data file)
import CustomTooltip from "@/components/charts/CustomTooltip";
import { diseases, therapies, therapyApprovals } from "./therapy-data";

interface ProductsByDiseaseData {
  disease: string;
  Gilead: number;
  Novartis: number;
  [key: string]: string | number;
}

export default function ProductsByDisease() {
  // Filter states
  const [selectedRegions, setSelectedRegions] = useState<string[]>([
    "US",
    "Europe",
  ]);
  const [selectedMechanisms, setSelectedMechanisms] = useState<string[]>([
    "CAR-T",
  ]);

  // Get unique filter options
  const regions = [...new Set(therapyApprovals.map((a) => a.region))];
  const mechanisms = [...new Set(therapies.map((t) => t.mechanism))];

  // Process data
  const chartData: ProductsByDiseaseData[] = useMemo(() => {
    // Filter approvals based on selected regions
    const filteredApprovals = therapyApprovals.filter((approval) =>
      selectedRegions.includes(approval.region)
    );

    // Get unique therapy-disease combinations
    const uniqueCombinations = new Set(
      filteredApprovals.map(
        (approval) => `${approval.therapy_id}-${approval.disease_id}`
      )
    );

    // Group by disease and count unique products by manufacturer
    const grouped = diseases.reduce((acc, disease) => {
      acc[disease.name] = {
        disease: disease.name,
        Gilead: 0,
        Novartis: 0,
      };
      return acc;
    }, {} as Record<string, ProductsByDiseaseData>);

    // Count products for each disease by manufacturer
    uniqueCombinations.forEach((combo) => {
      const [therapyId, diseaseId] = combo.split("-");
      const therapy = therapies.find((t) => t.id === therapyId);
      const disease = diseases.find((d) => d.id === diseaseId);

      // Filter by mechanism
      if (!therapy || !selectedMechanisms.includes(therapy.mechanism)) {
        return;
      }

      if (disease && therapy && grouped[disease.name]) {
        if (therapy.manufacturer === "Gilead") {
          grouped[disease.name].Gilead += 1;
        } else if (therapy.manufacturer === "Novartis") {
          grouped[disease.name].Novartis += 1;
        }
      }
    });

    return Object.values(grouped)
      .filter((item) => item.Gilead > 0 || item.Novartis > 0) // Only show diseases with products
      .sort((a, b) => {
        const totalA = a.Gilead + a.Novartis;
        const totalB = b.Gilead + b.Novartis;
        return totalB - totalA; // Sort by total products descending
      });
  }, [selectedRegions, selectedMechanisms]);

  // Stack configuration
  const stacks = [
    { key: "Gilead", name: "Gilead", color: "#3b82f6" },
    { key: "Novartis", name: "Novartis", color: "#ef4444" },
  ];

  // Filter configuration
  const filters = [
    {
      key: "region",
      label: "Regions",
      options: regions,
      selectedValues: selectedRegions,
      onToggle: (value: string) => {
        setSelectedRegions((prev) =>
          prev.includes(value)
            ? prev.filter((v) => v !== value)
            : [...prev, value]
        );
      },
    },
    {
      key: "mechanism",
      label: "Mechanism",
      options: mechanisms,
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
    <div className="w-full space-y-6">
      <VerticalStackedBarChart
        data={chartData}
        xAxisKey="disease"
        stacks={stacks}
        title="Approved Products by Disease"
        description="Number of approved therapeutic products for each disease indication, stacked by manufacturer. Filter by region and mechanism of action."
        filters={filters}
        customTooltip={CustomTooltip}
        yAxisLabel="Number of Products"
        height={400}
      />
    </div>
  );
}
