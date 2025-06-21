import dynamic from "next/dynamic";

const TreatmentCenterMapClient = dynamic(
  () => import("./TreatmentCenterMapClient"),
  {
    ssr: false,
    loading: () => (
      <div className="relative h-screen w-full bg-gray-100">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading map...</p>
          </div>
        </div>
      </div>
    ),
  }
);

export default function TreatmentCenterMap() {
  return <TreatmentCenterMapClient />;
}
