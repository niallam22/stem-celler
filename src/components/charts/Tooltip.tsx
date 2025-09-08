export interface TooltipField {
  key: string;
  label: string;
  formatter?: (value: unknown) => string;
  color?: string;
  style?: React.CSSProperties;
}

export interface TooltipConfig {
  title?: (data: Record<string, unknown>, label: string) => string;
  fields: TooltipField[];
  className?: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: Record<string, unknown> }>;
  label?: string;
  config: TooltipConfig;
}

export default function Tooltip({
  active,
  payload,
  label,
  config,
}: TooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;
  const title = config.title ? config.title(data, label || "") : label;

  return (
    <div
      className={`bg-white p-3 border rounded-lg shadow-lg ${
        config.className || ""
      }`}
    >
      {title && <p className="font-semibold">{title}</p>}
      {config.fields.map((field, index) => {
        const value = data[field.key];
        const displayValue = field.formatter 
          ? field.formatter(value) 
          : String(value ?? '');
        const style =
          field.style || (field.color ? { color: field.color } : {});
        const className = field.color ? "" : "text-gray-500 text-sm";

        return (
          <p key={index} style={style} className={className}>
            {field.label}: {displayValue}
          </p>
        );
      })}
    </div>
  );
}

// Helper function to create tooltip configs
export const createTooltipConfig = (
  fields: TooltipField[],
  options?: {
    title?: (data: Record<string, unknown>, label: string) => string;
    className?: string;
  }
): TooltipConfig => ({
  title: options?.title,
  fields,
  className: options?.className,
});
