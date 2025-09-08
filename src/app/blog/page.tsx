import ComingSoon from "@/components/layout/ComingSoon";
import { BookOpen } from "lucide-react";

export default function BlogPage() {
  return (
    <ComingSoon
      title="Cell Genie Blog"
      description="Industry insights, market analysis, and the latest developments in cell therapy. Stay informed with expert commentary and data-driven articles."
      icon={BookOpen}
    />
  );
}