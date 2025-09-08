import ComingSoon from "@/components/layout/ComingSoon";
import { Shield } from "lucide-react";

export default function PrivacyPage() {
  return (
    <ComingSoon
      title="Privacy Policy"
      description="Your data security is our priority. Learn how we protect your information and ensure compliance with global privacy regulations."
      icon={Shield}
    />
  );
}