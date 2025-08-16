import { TherapyRevenue } from "@/lib/db/schema";

// Enums for data hierarchy
export enum DataGranularity {
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual'
}

export enum GeographicScope {
  REGIONAL = 'regional',
  GLOBAL = 'global'
}

export enum Region {
  US = 'United States',
  EUROPE = 'Europe', 
  OTHER = 'Other',
  GLOBAL = 'Global'
}

// Hierarchy levels (1 = highest priority, 4 = lowest priority)
export enum HierarchyLevel {
  QUARTERLY_REGIONAL = 1,
  QUARTERLY_GLOBAL = 2,
  ANNUAL_REGIONAL = 3,
  ANNUAL_GLOBAL = 4
}

// Enhanced revenue data with hierarchy metadata
export interface ProcessedRevenueData {
  id: string;
  therapyId: string;
  period: string; // Standardized to "YYYY-QX" format
  region: Region;
  revenueMillionsUsd: number;
  sources: string[];
  lastUpdated: Date;
  
  // Hierarchy metadata
  hierarchyLevel: HierarchyLevel;
  dataGranularity: DataGranularity;
  geographicScope: GeographicScope;
  originalPeriod: string; // Original period from source data
  isInterpolated: boolean; // True if annual data was divided by 4
  confidence: number; // 1-100 score based on hierarchy level and interpolation
}

// Parsed period information
export interface ParsedPeriod {
  year: number;
  quarter?: number; // 1-4, undefined for annual data
  isAnnual: boolean;
  standardized: string; // "YYYY-QX" for quarterly, "YYYY" for annual
}

// Data selection candidate
interface DataCandidate {
  data: TherapyRevenue;
  hierarchyLevel: HierarchyLevel;
  parsedPeriod: ParsedPeriod;
  standardizedRegion: Region;
}

/**
 * Parse period string into structured format
 */
export function parsePeriod(period: string): ParsedPeriod {
  // Remove whitespace and convert to uppercase
  const normalized = period.trim().toUpperCase();
  
  // Extract year (4 digits)
  const yearMatch = normalized.match(/(\d{4})/);
  if (!yearMatch) {
    throw new Error(`Invalid period format: ${period}`);
  }
  
  const year = parseInt(yearMatch[1]);
  
  // Look for quarter patterns
  const quarterPatterns = [
    /Q([1-4])/,           // Q1, Q2, Q3, Q4
    /(\d)[ST]?Q/,         // 1Q, 2Q, 3Q, 4Q (with optional ST)
    /QUARTER\s*([1-4])/,  // QUARTER 1, QUARTER 2, etc.
  ];
  
  for (const pattern of quarterPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const quarter = parseInt(match[1]);
      if (quarter >= 1 && quarter <= 4) {
        return {
          year,
          quarter,
          isAnnual: false,
          standardized: `${year}-Q${quarter}`
        };
      }
    }
  }
  
  // If no quarter found, assume annual
  return {
    year,
    isAnnual: true,
    standardized: year.toString()
  };
}

/**
 * Standardize region names to consistent enum values
 */
export function standardizeRegion(region: string): Region {
  const normalized = region.trim().toLowerCase();
  
  const regionMappings: Record<string, Region> = {
    // US variations
    'us': Region.US,
    'usa': Region.US,
    'united states': Region.US,
    'united states of america': Region.US,
    'north america': Region.US,
    'america': Region.US,
    
    // Europe variations
    'eu': Region.EUROPE,
    'europe': Region.EUROPE,
    'european union': Region.EUROPE,
    'ema': Region.EUROPE,
    
    // Other variations
    'other': Region.OTHER,
    'rest of world': Region.OTHER,
    'row': Region.OTHER,
    'international': Region.OTHER,
    'apac': Region.OTHER,
    'asia pacific': Region.OTHER,
    'asia': Region.OTHER,
    'japan': Region.OTHER,
    'china': Region.OTHER,
    
    // Global variations
    'global': Region.GLOBAL,
    'worldwide': Region.GLOBAL,
    'total': Region.GLOBAL,
    'consolidated': Region.GLOBAL,
  };
  
  const mapped = regionMappings[normalized];
  if (!mapped) {
    console.warn(`Unknown region "${region}", mapping to Other`);
    return Region.OTHER;
  }
  
  return mapped;
}

/**
 * Determine hierarchy level based on data characteristics
 */
function getHierarchyLevel(
  granularity: DataGranularity,
  scope: GeographicScope
): HierarchyLevel {
  if (granularity === DataGranularity.QUARTERLY) {
    return scope === GeographicScope.REGIONAL 
      ? HierarchyLevel.QUARTERLY_REGIONAL 
      : HierarchyLevel.QUARTERLY_GLOBAL;
  } else {
    return scope === GeographicScope.REGIONAL 
      ? HierarchyLevel.ANNUAL_REGIONAL 
      : HierarchyLevel.ANNUAL_GLOBAL;
  }
}

/**
 * Determine geographic scope from region
 */
function getGeographicScope(region: Region): GeographicScope {
  return region === Region.GLOBAL ? GeographicScope.GLOBAL : GeographicScope.REGIONAL;
}

/**
 * Calculate confidence score based on hierarchy level and interpolation
 */
function calculateConfidence(hierarchyLevel: HierarchyLevel, isInterpolated: boolean): number {
  const baseScores = {
    [HierarchyLevel.QUARTERLY_REGIONAL]: 95,
    [HierarchyLevel.QUARTERLY_GLOBAL]: 85,
    [HierarchyLevel.ANNUAL_REGIONAL]: 75,
    [HierarchyLevel.ANNUAL_GLOBAL]: 65,
  };
  
  let score = baseScores[hierarchyLevel];
  
  // Reduce confidence for interpolated data
  if (isInterpolated) {
    score -= 10;
  }
  
  return Math.max(10, Math.min(100, score));
}

/**
 * Generate quarterly timeline from earliest to latest period
 */
function generateQuarterlyTimeline(
  startYear: number, 
  startQuarter: number, 
  endYear: number, 
  endQuarter: number
): string[] {
  const timeline: string[] = [];
  
  let currentYear = startYear;
  let currentQuarter = startQuarter;
  
  while (currentYear < endYear || (currentYear === endYear && currentQuarter <= endQuarter)) {
    timeline.push(`${currentYear}-Q${currentQuarter}`);
    
    currentQuarter++;
    if (currentQuarter > 4) {
      currentQuarter = 1;
      currentYear++;
    }
  }
  
  return timeline;
}

/**
 * Process raw revenue data with hierarchical selection
 */
export function processRevenueWithHierarchy(
  rawRevenue: TherapyRevenue[]
): ProcessedRevenueData[] {
  const processedData: ProcessedRevenueData[] = [];
  
  // Group data by therapy
  const therapyGroups = new Map<string, TherapyRevenue[]>();
  for (const revenue of rawRevenue) {
    if (!therapyGroups.has(revenue.therapyId)) {
      therapyGroups.set(revenue.therapyId, []);
    }
    therapyGroups.get(revenue.therapyId)!.push(revenue);
  }
  
  // Process each therapy separately
  for (const therapyId of therapyGroups.keys()) {
    const therapyRevenue = therapyGroups.get(therapyId)!;
    const therapyProcessedData = processTherapyRevenue(therapyId, therapyRevenue);
    processedData.push(...therapyProcessedData);
  }
  
  return processedData.sort((a, b) => {
    // Sort by therapy, then by period
    if (a.therapyId !== b.therapyId) {
      return a.therapyId.localeCompare(b.therapyId);
    }
    return a.period.localeCompare(b.period);
  });
}

/**
 * Process revenue data for a single therapy
 */
function processTherapyRevenue(
  therapyId: string, 
  therapyRevenue: TherapyRevenue[]
): ProcessedRevenueData[] {
  // Parse and prepare data candidates
  const candidates: DataCandidate[] = [];
  
  for (const revenue of therapyRevenue) {
    try {
      const parsedPeriod = parsePeriod(revenue.period);
      const standardizedRegion = standardizeRegion(revenue.region);
      const granularity = parsedPeriod.isAnnual ? DataGranularity.ANNUAL : DataGranularity.QUARTERLY;
      const scope = getGeographicScope(standardizedRegion);
      const hierarchyLevel = getHierarchyLevel(granularity, scope);
      
      candidates.push({
        data: revenue,
        hierarchyLevel,
        parsedPeriod,
        standardizedRegion
      });
    } catch (error) {
      console.warn(`Skipping invalid revenue data for ${therapyId}:`, error);
    }
  }
  
  if (candidates.length === 0) {
    return [];
  }
  
  // Find the date range for this therapy
  const allYears = candidates.map(c => c.parsedPeriod.year);
  const quarterlyPeriods = candidates.filter(c => !c.parsedPeriod.isAnnual);
  
  const minYear = Math.min(...allYears);
  const maxYear = Math.max(...allYears);
  
  // Determine start quarter (earliest quarterly data, or Q1 if only annual data)
  let startQuarter = 1;
  if (quarterlyPeriods.length > 0) {
    const minYearQuarters = quarterlyPeriods
      .filter(c => c.parsedPeriod.year === minYear)
      .map(c => c.parsedPeriod.quarter!);
    if (minYearQuarters.length > 0) {
      startQuarter = Math.min(...minYearQuarters);
    }
  }
  
  // Determine end quarter (latest quarterly data, or Q4 if only annual data)
  let endQuarter = 4;
  if (quarterlyPeriods.length > 0) {
    const maxYearQuarters = quarterlyPeriods
      .filter(c => c.parsedPeriod.year === maxYear)
      .map(c => c.parsedPeriod.quarter!);
    if (maxYearQuarters.length > 0) {
      endQuarter = Math.max(...maxYearQuarters);
    }
  }
  
  // Generate complete quarterly timeline
  const timeline = generateQuarterlyTimeline(minYear, startQuarter, maxYear, endQuarter);
  
  const processedData: ProcessedRevenueData[] = [];
  
  // Process each quarter in the timeline
  for (const quarterPeriod of timeline) {
    const [year, quarterStr] = quarterPeriod.split('-Q');
    const quarter = parseInt(quarterStr);
    
    // Find the best data candidates for this quarter - one per region
    const regionCandidates = selectBestCandidatesPerRegion(candidates, parseInt(year), quarter);
    
    // Add all regional candidates to processed data
    for (const candidate of regionCandidates) {
      const processed = createProcessedData(candidate, quarterPeriod);
      processedData.push(processed);
    }
  }
  
  return processedData;
}

/**
 * Select the best data candidates for a specific quarter - one per region using hierarchy
 */
function selectBestCandidatesPerRegion(
  candidates: DataCandidate[],
  targetYear: number,
  targetQuarter: number
): DataCandidate[] {
  // Filter candidates that can provide data for this quarter
  const applicableCandidates = candidates.filter(candidate => {
    if (candidate.parsedPeriod.isAnnual) {
      // Annual data applies to the whole year
      return candidate.parsedPeriod.year === targetYear;
    } else {
      // Quarterly data must match exactly
      return candidate.parsedPeriod.year === targetYear && 
             candidate.parsedPeriod.quarter === targetQuarter;
    }
  });
  
  if (applicableCandidates.length === 0) {
    return [];
  }
  
  // Group candidates by region
  const candidatesByRegion = new Map<Region, DataCandidate[]>();
  for (const candidate of applicableCandidates) {
    if (!candidatesByRegion.has(candidate.standardizedRegion)) {
      candidatesByRegion.set(candidate.standardizedRegion, []);
    }
    candidatesByRegion.get(candidate.standardizedRegion)!.push(candidate);
  }
  
  const selectedCandidates: DataCandidate[] = [];
  
  // Check if we have regional data (non-Global)
  const regionalCandidates = Array.from(candidatesByRegion.entries())
    .filter(([region]) => region !== Region.GLOBAL);
  
  if (regionalCandidates.length > 0) {
    // We have regional data - use hierarchy within each region
    for (const [, regionCandidates] of regionalCandidates) {
      // Sort by hierarchy level (1 = highest priority) within this region
      regionCandidates.sort((a, b) => a.hierarchyLevel - b.hierarchyLevel);
      selectedCandidates.push(regionCandidates[0]);
    }
  } else {
    // No regional data - fall back to global data if available
    const globalCandidates = candidatesByRegion.get(Region.GLOBAL);
    if (globalCandidates && globalCandidates.length > 0) {
      // Sort global candidates by hierarchy level
      globalCandidates.sort((a, b) => a.hierarchyLevel - b.hierarchyLevel);
      selectedCandidates.push(globalCandidates[0]);
    }
  }
  
  return selectedCandidates;
}

/**
 * Create processed revenue data from a candidate
 */
function createProcessedData(
  candidate: DataCandidate,
  targetPeriod: string
): ProcessedRevenueData {
  const isInterpolated = candidate.parsedPeriod.isAnnual;
  const revenue = isInterpolated 
    ? candidate.data.revenueMillionsUsd / 4 
    : candidate.data.revenueMillionsUsd;
  
  const granularity = candidate.parsedPeriod.isAnnual 
    ? DataGranularity.ANNUAL 
    : DataGranularity.QUARTERLY;
  const scope = getGeographicScope(candidate.standardizedRegion);
  const confidence = calculateConfidence(candidate.hierarchyLevel, isInterpolated);
  
  return {
    id: `${candidate.data.id}-processed-${targetPeriod}`,
    therapyId: candidate.data.therapyId,
    period: targetPeriod,
    region: candidate.standardizedRegion,
    revenueMillionsUsd: revenue,
    sources: candidate.data.sources,
    lastUpdated: candidate.data.lastUpdated,
    
    hierarchyLevel: candidate.hierarchyLevel,
    dataGranularity: granularity,
    geographicScope: scope,
    originalPeriod: candidate.data.period,
    isInterpolated,
    confidence
  };
}