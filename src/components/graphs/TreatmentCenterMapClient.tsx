// TreatmentCenterMapClient.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Clock, Globe, MapPin, Phone, Search, X } from "lucide-react";
import React, { useMemo, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

// Import therapy data types and data
interface Therapy {
  id: string;
  name: string;
  manufacturer: string;
  mechanism: string;
  price_per_treatment_usd: number;
  sources: string[];
  last_updated: string;
}

interface Disease {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  icd_10_code?: string;
  annual_incidence_us?: number;
  sources: string[];
  last_updated: string;
}

interface TherapyApproval {
  id: string;
  therapy_id: string;
  disease_id: string;
  region: string;
  approval_date: string;
  approval_type: string;
  regulatory_body: string;
  sources: string[];
  last_updated: string;
}

// Therapy data
const therapies: Therapy[] = [
  {
    id: "YESCARTA",
    name: "Yescarta",
    manufacturer: "Gilead",
    mechanism: "CAR-T",
    price_per_treatment_usd: 373000,
    sources: ["Gilead product information"],
    last_updated: "2023-01-01",
  },
  {
    id: "KYMRIAH",
    name: "Kymriah",
    manufacturer: "Novartis",
    mechanism: "CAR-T",
    price_per_treatment_usd: 475000,
    sources: ["Novartis product information"],
    last_updated: "2024-01-01",
  },
];

// Disease data
const diseases: Disease[] = [
  {
    id: "DLBCL",
    name: "Diffuse Large B-Cell Lymphoma",
    category: "Hematologic Malignancy",
    subcategory: "B-Cell Lymphoma",
    icd_10_code: "C83.3",
    annual_incidence_us: 27000,
    sources: ["American Cancer Society", "SEER database"],
    last_updated: "2024-01-01",
  },
  {
    id: "PMBCL",
    name: "Primary Mediastinal B-Cell Lymphoma",
    category: "Hematologic Malignancy",
    subcategory: "B-Cell Lymphoma",
    icd_10_code: "C85.2",
    annual_incidence_us: 1500,
    sources: ["National Cancer Institute", "SEER database"],
    last_updated: "2024-01-01",
  },
  {
    id: "PEDIATRIC_B_ALL",
    name: "Pediatric B-cell Acute Lymphoblastic Leukemia",
    category: "Hematologic Malignancy",
    subcategory: "Acute Leukemia",
    icd_10_code: "C91.0",
    annual_incidence_us: 3000,
    sources: ["Children's Oncology Group", "SEER database"],
    last_updated: "2024-01-01",
  },
];

// Therapy approvals data
const therapyApprovals: TherapyApproval[] = [
  {
    id: "YES_DLBCL_US",
    therapy_id: "YESCARTA",
    disease_id: "DLBCL",
    region: "US",
    approval_date: "2017-10-18",
    approval_type: "Full",
    regulatory_body: "FDA",
    sources: ["FDA approval letter"],
    last_updated: "2023-01-01",
  },
  {
    id: "YES_PMBCL_US",
    therapy_id: "YESCARTA",
    disease_id: "PMBCL",
    region: "US",
    approval_date: "2017-10-18",
    approval_type: "Full",
    regulatory_body: "FDA",
    sources: ["FDA approval letter"],
    last_updated: "2023-01-01",
  },
  {
    id: "KYM_BALL_US",
    therapy_id: "KYMRIAH",
    disease_id: "PEDIATRIC_B_ALL",
    region: "US",
    approval_date: "2017-08-30",
    approval_type: "Full",
    regulatory_body: "FDA",
    sources: ["FDA approval letter"],
    last_updated: "2024-01-01",
  },
  {
    id: "KYM_DLBCL_US",
    therapy_id: "KYMRIAH",
    disease_id: "DLBCL",
    region: "US",
    approval_date: "2018-05-01",
    approval_type: "Full",
    regulatory_body: "FDA",
    sources: ["FDA approval letter"],
    last_updated: "2024-01-01",
  },
];

// Updated Treatment Center interface
interface TreatmentCenter {
  id: number;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  website?: string;
  hours?: string;
  therapies: string[]; // Array of therapy IDs
  description?: string;
}

// Filter interfaces
interface FilterConfig {
  key: string;
  label: string;
  options: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
}

interface FilterBadgesProps {
  filters: FilterConfig[];
  className?: string;
}

function FilterBadges({ filters, className = "" }: FilterBadgesProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {filters.map((filter) => (
        <div key={filter.key} className="flex items-center space-x-2">
          <span className="text-sm font-medium">{filter.label}:</span>
          {filter.options.map((option) => (
            <Badge
              key={option}
              variant={
                filter.selectedValues.includes(option) ? "default" : "outline"
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
  );
}

// Fix for default markers in react-leaflet
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Updated treatment center data with therapies
const treatmentCenters: TreatmentCenter[] = [
  {
    id: 1,
    name: "Memorial Sloan Kettering Cancer Center",
    lat: 40.7589,
    lng: -73.9851,
    address: "1275 York Avenue, New York, NY 10065",
    phone: "(212) 639-2000",
    website: "https://www.mskcc.org",
    hours: "24/7",
    therapies: ["YESCARTA", "KYMRIAH"],
    description:
      "Leading cancer treatment center offering advanced CAR-T cell therapies for hematologic malignancies.",
  },
  {
    id: 2,
    name: "Dana-Farber Cancer Institute",
    lat: 42.3359,
    lng: -71.1072,
    address: "450 Brookline Avenue, Boston, MA 02215",
    phone: "(617) 632-3000",
    website: "https://www.dana-farber.org",
    hours: "Mon-Fri 8AM-5PM",
    therapies: ["KYMRIAH"],
    description:
      "Comprehensive cancer center specializing in pediatric and adult hematologic malignancies.",
  },
  {
    id: 3,
    name: "MD Anderson Cancer Center",
    lat: 29.7078,
    lng: -95.3965,
    address: "1515 Holcombe Boulevard, Houston, TX 77030",
    website: "https://www.mdanderson.org",
    therapies: ["YESCARTA", "KYMRIAH"],
    description:
      "Premier cancer treatment facility offering comprehensive CAR-T cell therapy programs.",
  },
  {
    id: 4,
    name: "Children's Hospital of Philadelphia",
    lat: 39.946,
    lng: -75.1914,
    phone: "(215) 590-1000",
    website: "https://www.chop.edu",
    hours: "24/7",
    therapies: ["KYMRIAH"],
    description:
      "Leading pediatric hospital specializing in CAR-T therapy for childhood leukemias and lymphomas.",
  },
];

// Custom marker icon
const createCustomIcon = (): L.Icon => {
  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#3b82f6" width="32" height="32">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

export default function TreatmentCenterMapClient() {
  const [selectedCenter, setSelectedCenter] = useState<TreatmentCenter | null>(
    null
  );
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    40.7505, -73.9851,
  ]);
  const [mapZoom, setMapZoom] = useState<number>(6);
  const mapRef = useRef<any>(null);

  // Filter states
  const [selectedTherapies, setSelectedTherapies] = useState<string[]>([]);
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);

  // Create therapy to diseases mapping
  const therapyToDiseases = useMemo(() => {
    const mapping: { [key: string]: string[] } = {};
    therapyApprovals.forEach((approval) => {
      if (!mapping[approval.therapy_id]) {
        mapping[approval.therapy_id] = [];
      }
      if (!mapping[approval.therapy_id].includes(approval.disease_id)) {
        mapping[approval.therapy_id].push(approval.disease_id);
      }
    });
    return mapping;
  }, []);

  // Filter treatment centers based on selected filters
  const filteredCenters = useMemo(() => {
    return treatmentCenters.filter((center) => {
      // If no filters selected, show all centers
      if (selectedTherapies.length === 0 && selectedDiseases.length === 0) {
        return true;
      }

      // Check if center offers selected therapies
      const hasSelectedTherapy =
        selectedTherapies.length === 0 ||
        selectedTherapies.some((therapyId) =>
          center.therapies.includes(therapyId)
        );

      // Check if center treats selected diseases (through their therapies)
      const hasSelectedDisease =
        selectedDiseases.length === 0 ||
        selectedDiseases.some((diseaseId) =>
          center.therapies.some((therapyId) =>
            therapyToDiseases[therapyId]?.includes(diseaseId)
          )
        );

      return hasSelectedTherapy && hasSelectedDisease;
    });
  }, [selectedTherapies, selectedDiseases, therapyToDiseases]);

  const handleMarkerClick = (center: TreatmentCenter): void => {
    setSelectedCenter(center);
    setSidebarOpen(true);
  };

  const closeSidebar = (): void => {
    setSidebarOpen(false);
    setSelectedCenter(null);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);

        setMapCenter([lat, lon]);
        setMapZoom(12);

        if (mapRef.current) {
          mapRef.current.flyTo([lat, lon], 12, {
            duration: 1.5,
          });
        }
      } else {
        alert("Location not found. Please try a different search term.");
      }
    } catch (error) {
      console.error("Error searching for location:", error);
      alert("Error searching for location. Please try again.");
    }
  };

  // Filter toggle handlers
  const toggleTherapy = (therapyId: string) => {
    setSelectedTherapies((prev) =>
      prev.includes(therapyId)
        ? prev.filter((id) => id !== therapyId)
        : [...prev, therapyId]
    );
  };

  const toggleDisease = (diseaseId: string) => {
    setSelectedDiseases((prev) =>
      prev.includes(diseaseId)
        ? prev.filter((id) => id !== diseaseId)
        : [...prev, diseaseId]
    );
  };

  // Filter configurations
  const filters: FilterConfig[] = [
    {
      key: "therapies",
      label: "Therapies",
      options: therapies.map((t) => t.name),
      selectedValues: selectedTherapies.map(
        (id) => therapies.find((t) => t.id === id)?.name || id
      ),
      onToggle: (therapyName: string) => {
        const therapy = therapies.find((t) => t.name === therapyName);
        if (therapy) toggleTherapy(therapy.id);
      },
    },
    {
      key: "diseases",
      label: "Diseases",
      options: diseases.map((d) => d.name),
      selectedValues: selectedDiseases.map(
        (id) => diseases.find((d) => d.id === id)?.name || id
      ),
      onToggle: (diseaseName: string) => {
        const disease = diseases.find((d) => d.name === diseaseName);
        if (disease) toggleDisease(disease.id);
      },
    },
  ];

  // Get therapy names for display
  const getTherapyName = (therapyId: string): string => {
    return therapies.find((t) => t.id === therapyId)?.name || therapyId;
  };

  // Get diseases treated by center's therapies
  const getDiseasesForCenter = (center: TreatmentCenter): string[] => {
    const diseaseIds = new Set<string>();
    center.therapies.forEach((therapyId) => {
      therapyToDiseases[therapyId]?.forEach((diseaseId) => {
        diseaseIds.add(diseaseId);
      });
    });
    return Array.from(diseaseIds).map(
      (id) => diseases.find((d) => d.id === id)?.name || id
    );
  };

  return (
    <div className="flex flex-col h-screen w-full">
      {/* Search and Filter Section */}
      <div className="p-4 border-b border-gray-200">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md mb-4">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <Input
              type="text"
              placeholder="Search for a city or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" className="px-6">
            Search
          </Button>
        </form>

        {/* Filters */}
        <div className="flex items-start justify-between">
          <FilterBadges filters={filters} />
          {(selectedTherapies.length > 0 || selectedDiseases.length > 0) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedTherapies([]);
                setSelectedDiseases([]);
              }}
              className="ml-4 mt-1"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="relative flex-1">
        <MapContainer
          ref={mapRef}
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {/* Filtered markers */}
          {filteredCenters.map((center: TreatmentCenter) => (
            <Marker
              key={center.id}
              position={[center.lat, center.lng]}
              icon={createCustomIcon()}
              eventHandlers={{
                click: () => handleMarkerClick(center),
              }}
            />
          ))}
        </MapContainer>

        {/* Sidebar */}
        {sidebarOpen && selectedCenter && (
          <div className="absolute top-0 right-0 h-full w-96 bg-white shadow-2xl z-20 border-l border-gray-100">
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-100">
                <button
                  onClick={closeSidebar}
                  className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-md hover:shadow-lg hover:bg-gray-50 transition-all duration-200"
                >
                  <X size={18} className="text-gray-600" />
                </button>
                <h2 className="text-2xl font-bold text-gray-900 pr-12 leading-tight">
                  {selectedCenter.name}
                </h2>
              </div>

              {/* Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                {/* Contact Info */}
                <div className="space-y-4 mb-8">
                  {selectedCenter.address && (
                    <div className="flex items-start gap-3">
                      <MapPin
                        size={20}
                        className="text-blue-600 mt-0.5 flex-shrink-0"
                      />
                      <span className="text-gray-700 text-sm leading-relaxed">
                        {selectedCenter.address}
                      </span>
                    </div>
                  )}

                  {selectedCenter.phone && (
                    <div className="flex items-center gap-3">
                      <Phone
                        size={20}
                        className="text-blue-600 flex-shrink-0"
                      />
                      <a
                        href={`tel:${selectedCenter.phone}`}
                        className="text-gray-700 text-sm hover:text-blue-600 transition-colors"
                      >
                        {selectedCenter.phone}
                      </a>
                    </div>
                  )}

                  {selectedCenter.website && (
                    <div className="flex items-center gap-3">
                      <Globe
                        size={20}
                        className="text-blue-600 flex-shrink-0"
                      />
                      <a
                        href={selectedCenter.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 text-sm hover:text-blue-800 transition-colors hover:underline"
                      >
                        Visit Website
                      </a>
                    </div>
                  )}

                  {selectedCenter.hours && (
                    <div className="flex items-center gap-3">
                      <Clock
                        size={20}
                        className="text-blue-600 flex-shrink-0"
                      />
                      <span className="text-gray-700 text-sm">
                        {selectedCenter.hours}
                      </span>
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedCenter.description && (
                  <div className="mb-8">
                    <h3 className="font-semibold text-gray-900 mb-3">About</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {selectedCenter.description}
                    </p>
                  </div>
                )}

                {/* Available Therapies */}
                {selectedCenter.therapies.length > 0 && (
                  <div className="mb-8">
                    <h3 className="font-semibold text-gray-900 mb-4">
                      Available Therapies
                    </h3>
                    <div className="grid gap-3">
                      {selectedCenter.therapies.map(
                        (therapyId: string, index: number) => (
                          <div key={index} className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2.5 flex-shrink-0"></div>
                            <span className="text-gray-700 text-sm leading-relaxed">
                              {getTherapyName(therapyId)}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Diseases Treated */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Diseases Treated
                  </h3>
                  <div className="grid gap-3">
                    {getDiseasesForCenter(selectedCenter).map(
                      (diseaseName: string, index: number) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2.5 flex-shrink-0"></div>
                          <span className="text-gray-700 text-sm leading-relaxed">
                            {diseaseName}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overlay when sidebar is open */}
        {sidebarOpen && selectedCenter && (
          <div
            className="absolute inset-0 bg-black bg-opacity-25 z-10"
            onClick={closeSidebar}
          ></div>
        )}
      </div>
    </div>
  );
}
