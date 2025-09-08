// TreatmentCenterMapClient.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DiseaseNamesDialog from "@/components/ui/DiseaseNamesDialog";
import { Input } from "@/components/ui/input";
import type { Therapy, Disease, TherapyApproval, TreatmentCenter as DBTreatmentCenter } from "@/lib/db/schema";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Globe, Loader2, MapPin, Phone, Search, X } from "lucide-react";
import React, { useMemo, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

// Types for database entities
// Using TreatmentCenter from schema (aliased as DBTreatmentCenter)
type TreatmentCenter = DBTreatmentCenter;

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
        <div
          key={filter.key}
          className="flex flex-col sm:flex-row sm:items-center gap-2"
        >
          <span className="text-sm font-medium">{filter.label}:</span>
          <div className="flex flex-wrap gap-2">
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

interface TreatmentCenterMapClientProps {
  therapies: Therapy[];
  diseases: Disease[];
  approvals: TherapyApproval[];
  treatmentCenters: DBTreatmentCenter[];
}

export default function TreatmentCenterMapClient({ 
  therapies = [], 
  diseases = [], 
  approvals: allApprovals = [],
  treatmentCenters = []
}: TreatmentCenterMapClientProps) {
  const [selectedCenter, setSelectedCenter] = useState<TreatmentCenter | null>(
    null
  );
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    40.7505, -73.9851,
  ]);
  const [mapZoom, setMapZoom] = useState<number>(6);
  const mapRef = useRef<L.Map | null>(null);
  
  // No loading state needed - data comes from props
  const isLoading = false;

  // Mobile responsiveness hook


  // Filter states
  const [selectedTherapies, setSelectedTherapies] = useState<string[]>([]);
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);

  // Create therapy to diseases mapping using therapy names
  const therapyToDiseases = useMemo(() => {
    const mapping: { [key: string]: string[] } = {};
    allApprovals.forEach((approval) => {
      if (!mapping[approval.therapyName]) {
        mapping[approval.therapyName] = [];
      }
      if (!mapping[approval.therapyName].includes(approval.diseaseIndication)) {
        mapping[approval.therapyName].push(approval.diseaseIndication);
      }
    });
    return mapping;
  }, [allApprovals]);

  // Filter treatment centers based on selected filters
  const filteredCenters = useMemo(() => {
    return treatmentCenters.filter((center) => {
      // If no filters selected, show all centers
      if (selectedTherapies.length === 0 && selectedDiseases.length === 0) {
        return true;
      }

      // Check if center offers selected therapies (by name)
      const hasSelectedTherapy =
        selectedTherapies.length === 0 ||
        selectedTherapies.some((therapyName) =>
          center.availableTherapies.includes(therapyName)
        );

      // Check if center treats selected diseases (through their therapies)
      const hasSelectedDisease =
        selectedDiseases.length === 0 ||
        selectedDiseases.some((diseaseName) =>
          center.availableTherapies.some((therapyName) =>
            therapyToDiseases[therapyName]?.includes(diseaseName)
          )
        );

      return hasSelectedTherapy && hasSelectedDisease;
    });
  }, [
    selectedTherapies,
    selectedDiseases,
    therapyToDiseases,
    treatmentCenters,
  ]);

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
  const toggleTherapy = (therapyName: string) => {
    setSelectedTherapies((prev) =>
      prev.includes(therapyName)
        ? prev.filter((name) => name !== therapyName)
        : [...prev, therapyName]
    );
  };

  const toggleDisease = (diseaseName: string) => {
    setSelectedDiseases((prev) =>
      prev.includes(diseaseName)
        ? prev.filter((name) => name !== diseaseName)
        : [...prev, diseaseName]
    );
  };

  // Filter configurations
  const filters: FilterConfig[] = [
    {
      key: "therapies",
      label: "Therapies",
      options: therapies.map((t) => t.name),
      selectedValues: selectedTherapies,
      onToggle: toggleTherapy,
    },
    {
      key: "diseases",
      label: "Diseases",
      options: diseases.map((d) => d.indication || d.name),
      selectedValues: selectedDiseases,
      onToggle: toggleDisease,
    },
  ];

  // Get diseases treated by center's therapies
  const getDiseasesForCenter = (center: TreatmentCenter): string[] => {
    const diseaseNames = new Set<string>();
    center.availableTherapies.forEach((therapyName) => {
      therapyToDiseases[therapyName]?.forEach((diseaseName) => {
        diseaseNames.add(diseaseName);
      });
    });
    return Array.from(diseaseNames);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Loading treatment centers...</p>
        </div>
      </div>
    );
  }

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
          <div className="flex-1">
            <FilterBadges filters={filters} />
            
            {/* Disease Names Dialog */}
            <DiseaseNamesDialog 
              diseases={diseases}
              className="mt-3"
            />
          </div>
          
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
              position={[parseFloat(center.lat), parseFloat(center.lng)]}
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
                </div>

                {/* Description */}
                {selectedCenter.about && (
                  <div className="mb-8">
                    <h3 className="font-semibold text-gray-900 mb-3">About</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {selectedCenter.about}
                    </p>
                  </div>
                )}

                {/* Available Therapies */}
                {selectedCenter.availableTherapies.length > 0 && (
                  <div className="mb-8">
                    <h3 className="font-semibold text-gray-900 mb-4">
                      Available Therapies
                    </h3>
                    <div className="grid gap-3">
                      {selectedCenter.availableTherapies.map(
                        (therapyName: string, index: number) => (
                          <div key={index} className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2.5 flex-shrink-0"></div>
                            <span className="text-gray-700 text-sm leading-relaxed">
                              {therapyName}
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
