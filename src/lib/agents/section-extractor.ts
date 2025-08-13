import { DocumentStructure, Section } from './document-structure-analyzer';
import { AgentLogger } from './agent-logger';

export interface TextSection {
  text: string;
  pageNumbers: number[];
  sectionTitle?: string;
  searchTerm?: string;
}

export interface StructureBasedSections {
  financial: TextSection[];
  clinical: TextSection[];
  regulatory: TextSection[];
  pipeline: TextSection[];
  business: TextSection[];
  other: TextSection[];
}

export interface KeywordBasedSections {
  [therapyName: string]: TextSection[];
}

export class SectionExtractor {
  private logger = AgentLogger.getInstance();

  /**
   * Extract sections based on document structure
   */
  async extractStructureSections(
    structure: DocumentStructure,
    pageTexts: Map<number, string>
  ): Promise<StructureBasedSections> {
    console.log(`📑 SectionExtractor: Starting structure-based extraction from ${structure.sections.length} identified sections...`);

    // Log structure analysis start
    await this.logger.logMetadata("SectionExtractor", {
      operation: "structure_extraction_start",
      has_explicit_structure: structure.hasExplicitStructure,
      identified_sections: structure.sections.length,
      section_types: structure.sections.map(s => s.type),
      total_pages: pageTexts.size,
    });

    const sections: StructureBasedSections = {
      financial: [],
      clinical: [],
      regulatory: [],
      pipeline: [],
      business: [],
      other: [],
    };

    // Track section details for logging
    const sectionDetails: Record<string, any[]> = {
      financial: [],
      clinical: [],
      regulatory: [],
      pipeline: [],
      business: [],
      other: [],
    };

    for (const section of structure.sections) {
      const textSection = this.extractSectionText(section, pageTexts);
      if (textSection && textSection.text.trim().length > 0) {
        sections[section.type].push(textSection);

        // Collect details for logging
        sectionDetails[section.type].push({
          title: section.title,
          page_start: section.pageStart,
          page_end: section.pageEnd === -1 ? 'document_end' : section.pageEnd,
          text_length: textSection.text.length,
          text_preview: textSection.text.substring(0, 200) + (textSection.text.length > 200 ? '...' : ''),
        });

        // Log individual section extraction
        await this.logger.logMetadata("SectionExtractor", {
          operation: "structure_section_extracted",
          section_type: section.type,
          section_title: section.title,
          page_range: `${section.pageStart}-${section.pageEnd === -1 ? 'end' : section.pageEnd}`,
          pages_included: textSection.pageNumbers,
          text_length: textSection.text.length,
          content_preview: textSection.text.substring(0, 300) + (textSection.text.length > 300 ? '...' : ''),
        });
      } else {
        // Log when section extraction fails or produces empty content
        await this.logger.logMetadata("SectionExtractor", {
          operation: "structure_section_empty",
          section_type: section.type,
          section_title: section.title,
          page_range: `${section.pageStart}-${section.pageEnd === -1 ? 'end' : section.pageEnd}`,
          reason: textSection ? 'empty_content' : 'extraction_failed',
        });
      }
    }

    const totalSections = Object.values(sections).reduce((sum, secs) => sum + secs.length, 0);

    console.log(`📑 Structure-based extraction complete:
      - Financial: ${sections.financial.length} sections
      - Clinical: ${sections.clinical.length} sections
      - Regulatory: ${sections.regulatory.length} sections
      - Pipeline: ${sections.pipeline.length} sections
      - Business: ${sections.business.length} sections
      - Other: ${sections.other.length} sections
    `);

    // Log final structure extraction summary
    await this.logger.logMetadata("SectionExtractor", {
      operation: "structure_extraction_complete",
      total_sections_extracted: totalSections,
      sections_by_type: {
        financial: sections.financial.length,
        clinical: sections.clinical.length,
        regulatory: sections.regulatory.length,
        pipeline: sections.pipeline.length,
        business: sections.business.length,
        other: sections.other.length,
      },
      section_details: sectionDetails,
      extraction_success_rate: `${totalSections}/${structure.sections.length} sections extracted`,
    });

    return sections;
  }

  /**
   * Extract sections based on keyword/therapy search
   */
  async extractKeywordSections(
    therapies: string[],
    pageTexts: Map<number, string>,
    contextPages: number = 1
  ): Promise<KeywordBasedSections> {
    console.log(`🔍 SectionExtractor: Starting keyword-based extraction for ${therapies.length} therapies...`);

    // Log the therapy search start
    await this.logger.logMetadata("SectionExtractor", {
      operation: "keyword_extraction_start",
      therapies_to_search: therapies,
      total_pages: pageTexts.size,
      context_pages: contextPages,
    });

    const sections: KeywordBasedSections = {};
    const therapyMatchDetails: Record<string, {pages: number[], matchCount: number}> = {};

    for (const therapy of therapies) {
      const therapySections = await this.searchAndExtract(
        therapy,
        pageTexts,
        contextPages
      );
      
      // Collect match statistics
      const matchingPages = new Set<number>();
      let totalMatches = 0;
      
      therapySections.forEach(section => {
        section.pageNumbers.forEach(page => matchingPages.add(page));
        // Count occurrences in the section text
        const matches = (section.text.toLowerCase().match(new RegExp(therapy.toLowerCase(), 'g')) || []).length;
        totalMatches += matches;
      });

      therapyMatchDetails[therapy] = {
        pages: Array.from(matchingPages).sort((a, b) => a - b),
        matchCount: totalMatches
      };

      if (therapySections.length > 0) {
        sections[therapy] = therapySections;

        // Log detailed extraction results for this therapy
        await this.logger.logMetadata("SectionExtractor", {
          operation: "therapy_sections_extracted",
          therapy_name: therapy,
          sections_found: therapySections.length,
          pages_with_mentions: Array.from(matchingPages).sort((a, b) => a - b),
          total_matches: totalMatches,
          sections_detail: therapySections.map(section => ({
            page_range: `${Math.min(...section.pageNumbers)}-${Math.max(...section.pageNumbers)}`,
            pages: section.pageNumbers,
            text_length: section.text.length,
            text_preview: section.text.substring(0, 300) + (section.text.length > 300 ? '...' : ''),
            highlighted_matches: section.text.substring(0, 500).includes('**') ? 'yes' : 'no'
          }))
        });
      } else {
        // Log when no sections found for a therapy
        await this.logger.logMetadata("SectionExtractor", {
          operation: "therapy_no_sections_found",
          therapy_name: therapy,
          total_pages_searched: pageTexts.size,
        });
      }
    }

    const foundTherapies = Object.keys(sections);
    const totalSections = Object.values(sections).reduce((sum, s) => sum + s.length, 0);

    console.log(`🔍 Keyword-based extraction complete:
      - Found mentions for ${foundTherapies.length} of ${therapies.length} therapies
      - Total sections extracted: ${totalSections}
    `);

    // Log final summary
    await this.logger.logMetadata("SectionExtractor", {
      operation: "keyword_extraction_complete",
      therapies_searched: therapies,
      therapies_found: foundTherapies,
      therapies_not_found: therapies.filter(t => !foundTherapies.includes(t)),
      total_sections_extracted: totalSections,
      therapy_match_summary: therapyMatchDetails,
      success_rate: `${foundTherapies.length}/${therapies.length} therapies found`
    });

    return sections;
  }

  /**
   * Extract text for a specific section
   */
  private extractSectionText(
    section: Section,
    pageTexts: Map<number, string>
  ): TextSection {
    const textSection: TextSection = {
      text: '',
      pageNumbers: [],
      sectionTitle: section.title,
    };

    const endPage = section.pageEnd === -1 ? pageTexts.size : section.pageEnd;
    
    for (let page = section.pageStart; page <= endPage; page++) {
      const pageText = pageTexts.get(page);
      if (pageText) {
        textSection.text += `\n[Page ${page}]\n${pageText}\n`;
        textSection.pageNumbers.push(page);
      }
    }

    return textSection;
  }

  /**
   * Search for a term and extract surrounding context
   */
  private async searchAndExtract(
    searchTerm: string,
    pageTexts: Map<number, string>,
    contextPages: number
  ): Promise<TextSection[]> {
    const matchingPages = new Set<number>();
    const searchTermLower = searchTerm.toLowerCase();

    // Find pages containing the search term
    pageTexts.forEach((text, pageNum) => {
      if (text.toLowerCase().includes(searchTermLower)) {
        matchingPages.add(pageNum);
      }
    });

    if (matchingPages.size === 0) {
      return [];
    }

    // Group continuous pages into sections
    const sections = this.groupContinuousPages(
      Array.from(matchingPages).sort((a, b) => a - b),
      contextPages,
      pageTexts.size
    );

    // Extract text for each section
    return sections.map(pageRange => {
      const textSection: TextSection = {
        text: '',
        pageNumbers: [],
        searchTerm,
      };

      for (let page = pageRange.start; page <= pageRange.end; page++) {
        const pageText = pageTexts.get(page);
        if (pageText) {
          // Highlight the search term in the text
          const highlightedText = this.highlightMatches(pageText, searchTerm);
          textSection.text += `\n[Page ${page}]\n${highlightedText}\n`;
          textSection.pageNumbers.push(page);
        }
      }

      return textSection;
    });
  }

  /**
   * Group continuous pages into ranges
   */
  private groupContinuousPages(
    pages: number[],
    contextPages: number,
    maxPage: number
  ): Array<{ start: number; end: number }> {
    if (pages.length === 0) return [];

    const ranges: Array<{ start: number; end: number }> = [];
    let currentStart = Math.max(1, pages[0] - contextPages);
    let currentEnd = Math.min(maxPage, pages[0] + contextPages);

    for (let i = 1; i < pages.length; i++) {
      const expandedStart = Math.max(1, pages[i] - contextPages);
      const expandedEnd = Math.min(maxPage, pages[i] + contextPages);

      // Check if this page's context overlaps with current range
      if (expandedStart <= currentEnd + 1) {
        // Extend current range
        currentEnd = expandedEnd;
      } else {
        // Save current range and start new one
        ranges.push({ start: currentStart, end: currentEnd });
        currentStart = expandedStart;
        currentEnd = expandedEnd;
      }
    }

    // Add final range
    ranges.push({ start: currentStart, end: currentEnd });

    return ranges;
  }

  /**
   * Highlight search term matches in text
   */
  private highlightMatches(text: string, searchTerm: string): string {
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '**$1**');
  }

  /**
   * Merge sections from structure and keyword extraction
   */
  mergeSections(
    structureSections: StructureBasedSections,
    keywordSections: KeywordBasedSections
  ): {
    merged: Map<string, TextSection[]>;
    overlaps: Array<{ therapy: string; structureType: string; pageOverlap: number[] }>;
  } {
    const merged = new Map<string, TextSection[]>();
    const overlaps: Array<{ therapy: string; structureType: string; pageOverlap: number[] }> = [];

    // Add all structure sections
    Object.entries(structureSections).forEach(([type, sections]) => {
      sections.forEach(section => {
        const key = `structure_${type}_${section.sectionTitle}`;
        merged.set(key, [section]);
      });
    });

    // Process keyword sections
    Object.entries(keywordSections).forEach(([therapy, therapySections]) => {
      therapySections.forEach((therapySection, index) => {
        const key = `keyword_${therapy}_${index}`;
        
        // Check for overlaps with structure sections
        Object.entries(structureSections).forEach(([structureType, structureSections]) => {
          structureSections.forEach(structureSection => {
            const overlap = this.findPageOverlap(
              therapySection.pageNumbers,
              structureSection.pageNumbers
            );
            
            if (overlap.length > 0) {
              overlaps.push({
                therapy,
                structureType,
                pageOverlap: overlap,
              });
            }
          });
        });

        merged.set(key, [therapySection]);
      });
    });

    console.log(`🔗 Section merge complete:
      - Total unique sections: ${merged.size}
      - Detected ${overlaps.length} overlapping regions
    `);

    return { merged, overlaps };
  }

  /**
   * Find overlapping pages between two sections
   */
  private findPageOverlap(pages1: number[], pages2: number[]): number[] {
    const set1 = new Set(pages1);
    return pages2.filter(page => set1.has(page));
  }

  /**
   * Smart section routing based on content and structure
   */
  async routeSectionsToAgents(
    sections: Map<string, TextSection[]>,
    overlaps: Array<{ therapy: string; structureType: string; pageOverlap: number[] }>
  ): Promise<{
    revenue: TextSection[];
    business: TextSection[];
  }> {
    console.log(`🔀 SectionExtractor: Starting section routing for ${sections.size} section groups...`);

    // Log routing start
    await this.logger.logMetadata("SectionExtractor", {
      operation: "section_routing_start",
      total_section_groups: sections.size,
      section_keys: Array.from(sections.keys()),
      overlaps_detected: overlaps.length,
      overlap_details: overlaps.map(o => ({
        therapy: o.therapy,
        structure_type: o.structureType,
        overlapping_pages: o.pageOverlap,
      })),
    });

    const routing = {
      revenue: [] as TextSection[],
      business: [] as TextSection[],
    };

    // Track routing decisions for logging
    const routingDecisions: Array<{
      sectionKey: string;
      routingType: 'structure' | 'keyword';
      agents: string[];
      reason: string;
      textPreview: string;
    }> = [];

    sections.forEach((sectionList, key) => {
      sectionList.forEach(section => {
        const decision = {
          sectionKey: key,
          routingType: key.startsWith('structure_') ? 'structure' as const : 'keyword' as const,
          agents: [] as string[],
          reason: '',
          textPreview: section.text.substring(0, 150) + '...'
        };

        if (key.startsWith('structure_')) {
          // Route based on structure type
          const type = key.split('_')[1];
          switch (type) {
            case 'financial':
              routing.revenue.push(section);
              decision.agents = ['revenue'];
              decision.reason = `Structure type '${type}' → revenue agent`;
              break;
            case 'clinical':
            case 'regulatory':
            case 'pipeline':
              // Market analysis removed - these sections will be skipped
              decision.agents = [];
              decision.reason = `Structure type '${type}' → skipped (market analysis removed)`;
              break;
            case 'business':
              routing.business.push(section);
              decision.agents = ['business'];
              decision.reason = `Structure type '${type}' → business agent`;
              break;
            default:
              // Analyze content to determine routing
              this.routeByContent(section, routing);
              decision.agents = ['determined by content analysis'];
              decision.reason = `Unknown structure type '${type}' → content-based routing`;
          }
        } else if (key.startsWith('keyword_')) {
          // Keyword sections go to revenue agent only (market analysis removed)
          const therapyName = key.split('_')[1];
          routing.revenue.push(section);
          decision.agents = ['revenue'];
          decision.reason = `Keyword section for therapy '${therapyName}' → revenue agent`;
        }

        routingDecisions.push(decision);
      });
    });

    // Handle overlaps - ensure both agents get overlapping content
    overlaps.forEach(overlap => {
      console.log(`📍 Overlap detected: ${overlap.therapy} appears in ${overlap.structureType} section (pages ${overlap.pageOverlap.join(', ')})`);
    });

    const totalSections = routing.revenue.length + routing.business.length;

    // Log detailed routing decisions
    await this.logger.logMetadata("SectionExtractor", {
      operation: "section_routing_complete",
      routing_summary: {
        revenue_sections: routing.revenue.length,
        business_sections: routing.business.length,
        total_section_assignments: totalSections, // Note: sections can be assigned to multiple agents
      },
      routing_decisions: routingDecisions,
      overlap_handling: overlaps.map(overlap => ({
        therapy: overlap.therapy,
        structure_type: overlap.structureType,
        overlapping_pages: overlap.pageOverlap,
        resolution: 'sections sent to both structure and keyword agents'
      })),
    });

    console.log(`🔀 Section routing complete:
      - Revenue: ${routing.revenue.length} sections  
      - Business: ${routing.business.length} sections
    `);

    return routing;
  }

  /**
   * Route sections based on content analysis
   */
  private routeByContent(
    section: TextSection,
    routing: { revenue: TextSection[]; business: TextSection[] }
  ): void {
    const text = section.text.toLowerCase();
    
    const revenueKeywords = ['revenue', 'sales', 'earnings', 'income', 'financial', 'quarter', '$', 'million', 'billion'];
    const clinicalKeywords = ['trial', 'patient', 'efficacy', 'safety', 'clinical', 'study', 'endpoint'];
    const businessKeywords = ['market', 'competition', 'partnership', 'strategy', 'commercial', 'licensing'];

    const revenueScore = revenueKeywords.filter(k => text.includes(k)).length;
    const clinicalScore = clinicalKeywords.filter(k => text.includes(k)).length;
    const businessScore = businessKeywords.filter(k => text.includes(k)).length;

    // Route to agent with highest relevance score
    const maxScore = Math.max(revenueScore, clinicalScore, businessScore);
    
    if (maxScore === 0) {
      // Default to revenue if no clear match (market analysis removed)
      routing.revenue.push(section);
    } else {
      if (revenueScore === maxScore) routing.revenue.push(section);
      if (clinicalScore === maxScore) {
        // Clinical sections now go to revenue (market analysis removed)
        routing.revenue.push(section);
      }
      if (businessScore === maxScore) routing.business.push(section);
    }
  }
}