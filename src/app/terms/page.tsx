import ComingSoon from "@/components/layout/ComingSoon";
import { FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <ComingSoon
      title="Terms of Service"
      description="Terms and conditions for using Cell Genie's platform and services. We're committed to transparency in how our service operates."
      icon={FileText}
    />
  );
}