import {
  BarChart3,
  FileSearch,
  Map,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react";

const features = [
  {
    name: "Real-time Revenue Tracking",
    description:
      "Monitor quarterly and annual revenue data from leading cell therapy companies.",
    icon: TrendingUp,
    color: "text-cellTeal",
    bgColor: "bg-cellTeal-50 dark:bg-cellTeal-900/20",
  },
  {
    name: "Regulatory Approval Monitoring",
    description:
      "Track FDA, EMA, and other global regulatory approvals as they happen.",
    icon: Shield,
    color: "text-cellPurple",
    bgColor: "bg-cellPurple-50 dark:bg-cellPurple-900/20",
  },
  {
    name: "Treatment Center Mapping",
    description:
      "Visualize global treatment centers and their capabilities on interactive maps.",
    icon: Map,
    color: "text-cellEmerald",
    bgColor: "bg-cellEmerald-50 dark:bg-cellEmerald-900/20",
  },
  {
    name: "Market Analytics",
    description:
      "Deep insights into market trends, therapy costs, and patient volumes.",
    icon: BarChart3,
    color: "text-cellTeal",
    bgColor: "bg-cellTeal-50 dark:bg-cellTeal-900/20",
  },
  {
    name: "Industry Insights",
    description:
      "Access the latest reports and insights from industry and academic experts.",
    icon: FileSearch,
    color: "text-cellPurple",
    bgColor: "bg-cellPurple-50 dark:bg-cellPurple-900/20",
  },
  {
    name: "Instant Updates",
    description:
      "Get notified of new approvals, revenue reports, and market changes.",
    icon: Zap,
    color: "text-cellEmerald",
    bgColor: "bg-cellEmerald-50 dark:bg-cellEmerald-900/20",
  },
];

export default function FeatureGrid() {
  return (
    <section className="py-16 sm:py-24 bg-white dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Everything you need to track the market
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Comprehensive tools for monitoring the stem cell therapy landscape
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.name}
                className="group relative rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
              >
                <div
                  className={`inline-flex rounded-lg p-3 ${feature.bgColor}`}
                >
                  <Icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                  {feature.name}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
