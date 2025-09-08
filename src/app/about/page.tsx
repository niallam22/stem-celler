import ComingSoon from "@/components/layout/ComingSoon";
import { Users } from "lucide-react";

export default function AboutPage() {
  return (
    <ComingSoon
      title="About Cell Genie"
      description="Learn about our mission to democratize stem cell therapy intelligence and make market data accessible to researchers, investors, and healthcare professionals worldwide."
      icon={Users}
    />
  );
}