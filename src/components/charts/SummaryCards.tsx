import { Card } from "@/components/ui/card";

export interface SummaryCardData {
  id: string;
  title: string;
  value: string | number;
  subtitle: string;
  formatter?: (value: string | number) => string;
}

interface SummaryCardsProps {
  cards: SummaryCardData[];
  className?: string;
  cardClassName?: string;
}

export default function SummaryCards({
  cards,
  className = "grid grid-cols-2 md:grid-cols-4 gap-4",
  cardClassName = "p-4",
}: SummaryCardsProps) {
  return (
    <div className={className}>
      {cards.map((card) => {
        const displayValue = card.formatter
          ? card.formatter(card.value)
          : card.value;

        return (
          <Card key={card.id} className={cardClassName}>
            <div className="text-sm font-medium text-gray-500">
              {card.title}
            </div>
            <div className="text-2xl font-bold">{displayValue}</div>
            <div className="text-xs text-gray-500">{card.subtitle}</div>
          </Card>
        );
      })}
    </div>
  );
}

// Helper function to create summary card configs
export const createSummaryCards = (
  data: Array<{
    id: string;
    title: string;
    value: string | number;
    subtitle: string;
    formatter?: (value: string | number) => string;
  }>
): SummaryCardData[] => data;
