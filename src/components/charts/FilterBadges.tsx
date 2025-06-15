import { Badge } from "@/components/ui/badge";

export interface FilterConfig {
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

export default function FilterBadges({
  filters,
  className = "",
}: FilterBadgesProps) {
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
