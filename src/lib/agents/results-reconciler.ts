import { ExtractionResults, ExtractedData } from "./enhanced-orchestrator-types";

export class ResultsReconciler {
  /**
   * Reconcile results from revenue extraction
   */
  async reconcile(results: ExtractionResults[]): Promise<ExtractedData> {
    console.log(`🔗 Reconciling ${results.length} result sets...`);

    if (results.length === 0) {
      throw new Error("No results to reconcile");
    }

    if (results.length === 1) {
      // Single result set, convert to final format
      return this.convertToFinalFormat(results[0]);
    }

    // Multiple result sets - merge revenue data
    const mergedRevenue = this.mergeRevenue(results);

    // Calculate combined confidence
    const confidence = this.calculateCombinedConfidence(results);

    // Collect all unique sources
    const allSources = this.collectAllSources(results);

    return {
      revenue: mergedRevenue,
      confidence,
      sources: allSources
    };
  }

  private convertToFinalFormat(results: ExtractionResults): ExtractedData {
    return {
      revenue: results.revenue,
      confidence: results.confidence,
      sources: this.extractSourcesFromResults(results)
    };
  }

  private mergeRevenue(results: ExtractionResults[]): ExtractedData['revenue'] {
    const revenueMap = new Map<string, {record: ExtractedData['revenue'][0], confidence: number, sources: Set<string>}>();
    let totalOverlaps = 0;

    console.log(`🔗 Merging revenue data from ${results.length} result sets...`);

    // Create unique key for revenue records (therapy + period + region)
    const createKey = (r: ExtractedData['revenue'][0]) => 
      `${r.therapyName.toLowerCase()}-${r.period}-${r.region.toLowerCase()}`;

    // Track which result set each record came from for debugging
    results.forEach((result, resultIndex) => {
      console.log(`🔗 Processing result set ${resultIndex + 1}: ${result.revenue.length} records with ${result.confidence}% confidence`);
      
      result.revenue.forEach((revenue, recordIndex) => {
        const key = createKey(revenue);
        console.log(`🔗   Record ${recordIndex + 1}: ${revenue.therapyName} ${revenue.period} ${revenue.region} = $${revenue.revenueMillionsUsd}M`);
        
        if (!revenueMap.has(key)) {
          // New unique record
          revenueMap.set(key, {
            record: revenue,
            confidence: result.confidence,
            sources: new Set(revenue.sources)
          });
          console.log(`🔗     ✅ Added as new record`);
        } else {
          // Overlap detected - resolve based on confidence and amount consistency
          totalOverlaps++;
          const existing = revenueMap.get(key)!;
          const existingRecord = existing.record;
          
          console.log(`🔗     ⚠️ OVERLAP DETECTED with existing record:`);
          console.log(`🔗       Existing: $${existingRecord.revenueMillionsUsd}M (confidence: ${existing.confidence}%)`);
          console.log(`🔗       New: $${revenue.revenueMillionsUsd}M (confidence: ${result.confidence}%)`);
          
          // Check if amounts are significantly different
          const amountDiff = Math.abs(existingRecord.revenueMillionsUsd - revenue.revenueMillionsUsd);
          if (amountDiff > 0.1) {
            console.log(`🔗       💰 Amount difference: $${amountDiff.toFixed(2)}M`);
            
            // Use the record with higher confidence for conflicting amounts
            if (result.confidence > existing.confidence) {
              console.log(`🔗       🎯 Using NEW record (higher confidence: ${result.confidence}% > ${existing.confidence}%)`);
              existing.record = revenue;
              existing.confidence = result.confidence;
            } else {
              console.log(`🔗       🎯 Keeping EXISTING record (higher confidence: ${existing.confidence}% >= ${result.confidence}%)`);
            }
          } else {
            console.log(`🔗       ✅ Amounts are consistent (diff: $${amountDiff.toFixed(2)}M)`);
          }
          
          // Always merge sources from both records
          revenue.sources.forEach(source => existing.sources.add(source));
          existing.record.sources = Array.from(existing.sources);
          
          console.log(`🔗       📎 Merged sources: ${existing.sources.size} total sources`);
        }
      });
    });

    const finalRevenue = Array.from(revenueMap.values()).map(item => item.record);
    
    console.log(`🔗 Merge complete: ${finalRevenue.length} unique records (${totalOverlaps} overlaps resolved)`);
    
    // Log final summary by therapy
    const summaryByTherapy = new Map<string, {count: number, totalAmount: number}>();
    finalRevenue.forEach(record => {
      const therapy = record.therapyName;
      if (!summaryByTherapy.has(therapy)) {
        summaryByTherapy.set(therapy, {count: 0, totalAmount: 0});
      }
      const summary = summaryByTherapy.get(therapy)!;
      summary.count++;
      summary.totalAmount += record.revenueMillionsUsd;
    });
    
    summaryByTherapy.forEach((summary, therapy) => {
      console.log(`🔗   ${therapy}: ${summary.count} records, $${summary.totalAmount.toFixed(1)}M total`);
    });

    return finalRevenue;
  }

  private calculateCombinedConfidence(results: ExtractionResults[]): number {
    if (results.length === 0) return 0;
    
    const totalConfidence = results.reduce((sum, result) => sum + result.confidence, 0);
    return Math.round(totalConfidence / results.length);
  }

  private extractSourcesFromResults(results: ExtractionResults): ExtractedData['sources'] {
    const sources: ExtractedData['sources'] = [];
    
    // Extract page numbers from source strings
    const extractPageFromSource = (source: string): number | null => {
      const match = source.match(/Page (\d+)/i);
      return match ? parseInt(match[1]) : null;
    };

    // Collect from revenue data
    results.revenue.forEach((item) => {
      if (item.sources) {
        item.sources.forEach((source: string) => {
          const page = extractPageFromSource(source);
          if (page) {
            sources.push({
              page,
              section: 'revenue',
              quote: source
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