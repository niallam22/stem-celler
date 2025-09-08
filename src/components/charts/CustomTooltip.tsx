import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TooltipItem {
  name: string;
  value: string | number;
  color: string;
  formatter?: (value: string | number) => string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string;
  title?: string;
  position?: { x: number; y: number };
}

export default function CustomTooltip({
  active,
  payload,
  label,
  title,
  position,
}: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const renderContent = () => (
      <Card className="w-56">
        <CardHeader className="p-3">
          <CardTitle className="text-base">{title || label}</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="space-y-2">
            {payload.map((item, index) => {
              const displayValue = item.formatter
                ? item.formatter(item.value)
                : item.value;
              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span
                      className="w-2.5 h-2.5 rounded-full mr-2"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-sm font-bold">{displayValue}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );

    if (position) {
      return (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          {renderContent()}
        </div>
      );
    }

    return renderContent();
  }

  return null;
}
