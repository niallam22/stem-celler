interface DateRangeSliderProps {
  periods: string[];
  dateRange: number[];
  setDateRange: (range: number[]) => void;
  formatPeriod: (period: string) => string;
  label?: string;
}

export default function DateRangeSlider({
  periods,
  dateRange,
  setDateRange,
  formatPeriod,
  label = "Date Range:",
}: DateRangeSliderProps) {
  if (periods.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-gray-500">
          {formatPeriod(periods[dateRange[0]])} -{" "}
          {formatPeriod(periods[dateRange[1]])}
        </span>
      </div>
      <div className="px-3">
        <div className="relative h-8 flex items-center">
          {/* Background track */}
          <div className="absolute w-full h-2 bg-gray-200 rounded-lg pointer-events-none" />

          {/* Selected range indicator */}
          <div
            className="absolute h-2 bg-blue-500 rounded pointer-events-none"
            style={{
              left: `${(dateRange[0] / (periods.length - 1)) * 100}%`,
              width: `${
                ((dateRange[1] - dateRange[0]) / (periods.length - 1)) * 100
              }%`,
            }}
          />

          {/* Start handle */}
          <div
            className="absolute w-5 h-5 bg-blue-600 border-2 border-white rounded-full cursor-grab active:cursor-grabbing shadow-md z-30 hover:scale-110 transition-transform"
            style={{
              left: `calc(${
                (dateRange[0] / (periods.length - 1)) * 100
              }% - 10px)`,
              top: "50%",
              transform: "translateY(-50%)",
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startValue = dateRange[0];
              const rect =
                e.currentTarget.parentElement!.getBoundingClientRect();
              const width = rect.width - 40; // Account for padding

              const handleMouseMove = (e: MouseEvent) => {
                const deltaX = e.clientX - startX;
                const deltaValue = Math.round(
                  (deltaX / width) * (periods.length - 1)
                );
                const newValue = Math.max(
                  0,
                  Math.min(periods.length - 1, startValue + deltaValue)
                );
                setDateRange([newValue, Math.max(newValue, dateRange[1])]);
              };

              const handleMouseUp = () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
              };

              document.addEventListener("mousemove", handleMouseMove);
              document.addEventListener("mouseup", handleMouseUp);
            }}
          />

          {/* End handle */}
          <div
            className="absolute w-5 h-5 bg-blue-600 border-2 border-white rounded-full cursor-grab active:cursor-grabbing shadow-md z-40 hover:scale-110 transition-transform"
            style={{
              left: `calc(${
                (dateRange[1] / (periods.length - 1)) * 100
              }% - 10px)`,
              top: "50%",
              transform: "translateY(-50%)",
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startValue = dateRange[1];
              const rect =
                e.currentTarget.parentElement!.getBoundingClientRect();
              const width = rect.width - 40; // Account for padding

              const handleMouseMove = (e: MouseEvent) => {
                const deltaX = e.clientX - startX;
                const deltaValue = Math.round(
                  (deltaX / width) * (periods.length - 1)
                );
                const newValue = Math.max(
                  0,
                  Math.min(periods.length - 1, startValue + deltaValue)
                );
                setDateRange([Math.min(dateRange[0], newValue), newValue]);
              };

              const handleMouseUp = () => {
                document.removeEventListener("mousemove", handleMouseMove);
                document.removeEventListener("mouseup", handleMouseUp);
              };

              document.addEventListener("mousemove", handleMouseMove);
              document.addEventListener("mouseup", handleMouseUp);
            }}
          />
        </div>
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{formatPeriod(periods[0])}</span>
        <span>{formatPeriod(periods[periods.length - 1])}</span>
      </div>
    </div>
  );
}
