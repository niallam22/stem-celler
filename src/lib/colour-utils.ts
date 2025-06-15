/**
 * 15 carefully selected, visually distinct colors for automatic chart assignment
 * Colors are chosen for accessibility and visual distinction
 */
export const PRESET_COLORS = [
  "#3b82f6", // Blue - Primary
  "#ef4444", // Red - Secondary
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Violet
  "#f97316", // Orange
  "#06b6d4", // Cyan
  "#84cc16", // Lime
  "#ec4899", // Pink
  "#6366f1", // Indigo
  "#14b8a6", // Teal
  "#f472b6", // Rose
  "#a855f7", // Purple
  "#22c55e", // Green
  "#eab308", // Yellow
] as const;

/**
 * Get color by index, automatically cycling through preset colors
 * @param index - Zero-based index
 * @returns Hex color string
 */
export const getColorByIndex = (index: number): string => {
  return PRESET_COLORS[index % PRESET_COLORS.length];
};

/**
 * Get color for an item based on its position in an array
 * @param item - The item to get color for
 * @param items - Array of all items
 * @returns Hex color string
 */
export const getColorForItem = <T>(item: T, items: T[]): string => {
  const index = items.indexOf(item);
  return index !== -1 ? getColorByIndex(index) : PRESET_COLORS[0];
};

/**
 * Generate color mapping for an array of items
 * @param items - Array of items to generate colors for
 * @returns Object mapping each item to its color
 */
export const generateColorMap = <T extends string | number>(
  items: T[]
): Record<T, string> => {
  return items.reduce((acc, item, index) => {
    acc[item] = getColorByIndex(index);
    return acc;
  }, {} as Record<T, string>);
};

/**
 * Get therapy-specific color with consistent assignment
 * Used specifically for therapy charts where order matters
 */
export const getTherapyColor = (
  therapyId: string,
  allTherapies: string[]
): string => {
  return getColorForItem(therapyId, allTherapies);
};

/**
 * Common color assignments for regions (can be customized)
 */
export const REGION_COLORS = {
  US: "#3b82f6", // Blue
  Europe: "#ef4444", // Red
  Other: "#10b981", // Emerald
  Asia: "#f59e0b", // Amber
  ROW: "#8b5cf6", // Violet (Rest of World)
} as const;

/**
 * Get color for a region with fallback to auto-assignment
 */
export const getRegionColor = (region: string): string => {
  return (
    REGION_COLORS[region as keyof typeof REGION_COLORS] ||
    getColorByIndex(Object.keys(REGION_COLORS).length)
  );
};
