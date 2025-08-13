import { ExtractionResults, ExtractedData } from "./enhanced-orchestrator-types";

export class ResultsReconciler {
  /**
   * Reconcile results from multiple extraction tracks
   */
  async reconcile(results: ExtractionResults[]): Promise<ExtractedData> {
    console.log(`🔗 Reconciling ${results.length} result sets...`);

    if (results.length === 0) {
      throw new Error("No results to reconcile");
    }

    if (results.length === 1) {
      // Single track, convert to final format
      return this.convertToFinalFormat(results[0]);
    }

    // Multiple tracks - merge intelligently
    const structureResults = results.find(r => r.sourceTrack === 'structure');
    const keywordResults = results.find(r => r.sourceTrack === 'keyword');

    // Merge therapies
    const mergedTherapies = this.mergeTherapies(
      structureResults?.therapy || [],
      keywordResults?.therapy || []
    );

    // Merge revenue
    const mergedRevenue = this.mergeRevenue(
      structureResults?.revenue || [],
      keywordResults?.revenue || []
    );

    // Merge approvals
    const mergedApprovals = this.mergeApprovals(
      structureResults?.approvals || [],
      keywordResults?.approvals || []
    );

    // Calculate combined confidence
    const confidence = this.calculateCombinedConfidence(results);

    // Collect all unique sources
    const allSources = this.collectAllSources(results);

    return {
      therapy: mergedTherapies,
      revenue: mergedRevenue,
      approvals: mergedApprovals,
      confidence,
      sources: allSources
    };
  }

  private convertToFinalFormat(results: ExtractionResults): ExtractedData {
    return {
      therapy: results.therapy,
      revenue: results.revenue || [],
      approvals: results.approvals?.map(a => ({
        ...a,
        approvalDate: new Date(a.approvalDate)
      })) || [],
      confidence: {
        therapy: results.confidence.therapy,
        revenue: results.confidence.revenue,
        approvals: results.confidence.approvals
      },
      sources: this.extractSourcesFromResults(results)
    };
  }

  private mergeTherapies(
    structureTherapies: ExtractionResults['therapy'],
    keywordTherapies: ExtractionResults['therapy']
  ): ExtractedData['therapy'] {
    const therapyMap = new Map<string, typeof structureTherapies[0]>();

    // Add structure-based therapies (higher priority)
    structureTherapies.forEach(therapy => {
      const key = `${therapy.name.toLowerCase()}-${therapy.manufacturer.toLowerCase()}`;
      therapyMap.set(key, therapy);
    });

    // Add keyword-based therapies if not already present
    keywordTherapies.forEach(therapy => {
      const key = `${therapy.name.toLowerCase()}-${therapy.manufacturer.toLowerCase()}`;
      if (!therapyMap.has(key)) {
        therapyMap.set(key, therapy);
      } else {
        // Merge sources
        const existing = therapyMap.get(key)!;
        const mergedSources = Array.from(new Set([...existing.sources, ...therapy.sources]));
        therapyMap.set(key, { ...existing, sources: mergedSources });
      }
    });

    return Array.from(therapyMap.values());
  }

  private mergeRevenue(
    structureRevenue: ExtractionResults['revenue'],
    keywordRevenue: ExtractionResults['revenue']
  ): ExtractedData['revenue'] {
    const revenueMap = new Map<string, typeof structureRevenue[0]>();

    // Create unique key for revenue records
    const createKey = (r: typeof structureRevenue[0]) => 
      `${r.therapyName.toLowerCase()}-${r.period}-${r.region.toLowerCase()}`;

    // Add structure-based revenue
    structureRevenue.forEach(revenue => {
      revenueMap.set(createKey(revenue), revenue);
    });

    // Merge keyword-based revenue
    keywordRevenue.forEach(revenue => {
      const key = createKey(revenue);
      if (!revenueMap.has(key)) {
        revenueMap.set(key, revenue);
      } else {
        // If amounts differ significantly, flag for review
        const existing = revenueMap.get(key)!;
        if (Math.abs(existing.revenueMillionsUsd - revenue.revenueMillionsUsd) > 0.1) {
          console.warn(`⚠️ Revenue amount mismatch for ${key}: ${existing.revenueMillionsUsd} vs ${revenue.revenueMillionsUsd}`);
          // Take the value from structure track (usually more accurate for financial data)
        }
        // Merge sources
        const mergedSources = Array.from(new Set([...existing.sources, ...revenue.sources]));
        revenueMap.set(key, { ...existing, sources: mergedSources });
      }
    });

    return Array.from(revenueMap.values());
  }

  private mergeApprovals(
    structureApprovals: ExtractionResults['approvals'],
    keywordApprovals: ExtractionResults['approvals']
  ): ExtractedData['approvals'] {
    const approvalMap = new Map<string, typeof structureApprovals[0]>();

    // Create unique key for approval records
    const createKey = (a: typeof structureApprovals[0]) => 
      `${a.therapyName.toLowerCase()}-${a.diseaseName.toLowerCase()}-${a.region.toLowerCase()}-${a.approvalDate}`;

    // Process all approvals
    [...structureApprovals, ...keywordApprovals].forEach(approval => {
      const key = createKey(approval);
      if (!approvalMap.has(key)) {
        approvalMap.set(key, approval);
      } else {
        // Merge sources
        const existing = approvalMap.get(key)!;
        const mergedSources = Array.from(new Set([...existing.sources, ...approval.sources]));
        approvalMap.set(key, { ...existing, sources: mergedSources });
      }
    });

    return Array.from(approvalMap.values()).map(a => ({
      ...a,
      approvalDate: new Date(a.approvalDate)
    }));
  }

  private calculateCombinedConfidence(results: ExtractionResults[]): ExtractedData['confidence'] {
    let therapyConfidence = 0;
    let revenueConfidence = 0;
    let approvalsConfidence = 0;
    let count = 0;

    results.forEach(result => {
      if (result.confidence.therapy > 0) {
        therapyConfidence += result.confidence.therapy;
        count++;
      }
      if (result.confidence.revenue > 0) {
        revenueConfidence += result.confidence.revenue;
        count++;
      }
      if (result.confidence.approvals > 0) {
        approvalsConfidence += result.confidence.approvals;
        count++;
      }
    });

    return {
      therapy: count > 0 ? Math.round(therapyConfidence / results.length) : 0,
      revenue: count > 0 ? Math.round(revenueConfidence / results.length) : 0,
      approvals: count > 0 ? Math.round(approvalsConfidence / results.length) : 0
    };
  }

  private extractSourcesFromResults(results: ExtractionResults): ExtractedData['sources'] {
    const sources: ExtractedData['sources'] = [];
    
    // Extract page numbers from source strings
    const extractPageFromSource = (source: string): number | null => {
      const match = source.match(/Page (\d+)/i);
      return match ? parseInt(match[1]) : null;
    };

    // Collect from all data types
    ['therapy', 'revenue', 'approvals'].forEach(dataType => {
      const items = results[dataType as keyof ExtractionResults];
      if (items && Array.isArray(items)) {
        items.forEach((item: { sources?: string[] }) => {
          if (item.sources) {
            item.sources.forEach((source: string) => {
              const page = extractPageFromSource(source);
              if (page) {
                sources.push({
                  page,
                  section: dataType,
                  quote: source
                });
              }
            });
          }
        });
      }
    });

    // Remove duplicates
    const uniqueSources = sources.filter((source, index, self) =>
      index === self.findIndex(s => 
        s.page === source.page && s.section === source.section && s.quote === source.quote
      )
    );

    return uniqueSources;
  }

  private collectAllSources(results: ExtractionResults[]): ExtractedData['sources'] {
    const allSources: ExtractedData['sources'] = [];
    
    results.forEach(result => {
      const sources = this.extractSourcesFromResults(result);
      allSources.push(...sources);
    });

    // Remove duplicates
    const uniqueSources = allSources.filter((source, index, self) =>
      index === self.findIndex(s => 
        s.page === source.page && s.section === source.section && s.quote === source.quote
      )
    );

    return uniqueSources.sort((a, b) => a.page - b.page);
  }
}