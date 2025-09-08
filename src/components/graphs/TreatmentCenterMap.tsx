import dynamic from "next/dynamic";
import type { Therapy, Disease, TherapyApproval, TreatmentCenter } from "@/lib/db/schema";

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

interface TreatmentCenterMapProps {
  therapies: Therapy[];
  diseases: Disease[];
  approvals: TherapyApproval[];
  treatmentCenters: TreatmentCenter[];
}

export default function TreatmentCenterMap({ therapies, diseases, approvals, treatmentCenters }: TreatmentCenterMapProps) {
  return <TreatmentCenterMapClient 
    therapies={therapies}
    diseases={diseases}
    approvals={approvals}
    treatmentCenters={treatmentCenters}
  />;
}
