import ComingSoon from "@/components/layout/ComingSoon";
import { Mail } from "lucide-react";

export default function ContactPage() {
  return (
    <ComingSoon
      title="Contact Us"
      description="Get in touch with our team for inquiries, support, or partnership opportunities. We're here to help you navigate the cell therapy landscape."
      icon={Mail}
    />
  );
}