import { PromptTemplate } from "@langchain/core/prompts";
import { ChatAnthropic } from "@langchain/anthropic";
import { AgentLogger } from "./agent-logger";

export interface RevenueVerificationResult {
  containsRevenueData: boolean;
  confidence: number;
  reasoning: string;
}

export class RevenueVerifierAgent {
  private llm: ChatAnthropic;
  private verificationPrompt: PromptTemplate;
  private logger = AgentLogger.getInstance();

  constructor() {
    this.llm = new ChatAnthropic({
      model: "claude-sonnet-4-20250514",
      temperature: 0,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    });

    this.verificationPrompt = PromptTemplate.fromTemplate(`
You are a Revenue Data Verifier. Check if this context contains revenue/sales TABLES related to: {therapyNames}

FULL CONTEXT:
{textSnippet}

KEY SNIPPETS WITH THERAPY MENTIONS:
{highlightedSnippets}

The highlighted snippets above show where "{therapyNames}" is mentioned in the text. Focus on these areas to determine if there are revenue tables or financial data.

VERIFICATION CRITERIA - Return TRUE only if you find:
✓ Revenue/sales TABLES with {therapyNames} specifically listed in the table
✓ Financial tables showing revenue figures FOR {therapyNames}
✓ Tabular data with {therapyNames} and corresponding revenue amounts

RETURN FALSE for:
✗ Revenue tables NOT about {therapyNames}
✗ Revenue tables exist but {therapyNames} mentioned elsewhere on page (not in table)
✗ Just therapy mentions without revenue figures
✗ Revenue data for other therapies only

RESPONSE FORMAT:
Respond with exactly this JSON structure:
{{
  "containsRevenueData": true/false,
  "confidence": [0-100],
  "reasoning": "Brief explanation of why this does/doesn't contain revenue tables for {therapyNames}"
}}

Focus on the highlighted snippets - only return true if you see actual revenue TABLES with {therapyNames} specifically listed in the table data.
`);
  }

  async verify(
    textSnippet: string,
    therapyName?: string
  ): Promise<RevenueVerificationResult> {
    const startTime = Date.now();
    const truncatedText = textSnippet.substring(0, 2000); // Limit to first 2000 chars for speed

    // Log verification start
    await this.logger.logMetadata("RevenueVerifierAgent", {
      operation: "snippet_verification_start",
      therapy_name: therapyName || "unknown",
      snippet_length: textSnippet.length,
      truncated_length: truncatedText.length,
      snippet_preview:
        truncatedText.substring(0, 200) +
        (truncatedText.length > 200 ? "..." : ""),
    });

    try {
      // Extract highlighted snippets around therapy mentions
      const highlightedSnippets = this.extractHighlightedSnippets(textSnippet, therapyName || "");
      
      const prompt = await this.verificationPrompt.format({
        textSnippet: truncatedText,
        therapyNames: therapyName || "any therapy",
        highlightedSnippets: highlightedSnippets,
      });

      const response = await this.llm.invoke(prompt);
      const duration = Date.now() - startTime;

      // Log LLM interaction
      await this.logger.logMetadata("RevenueVerifierAgent", {
        operation: "llm_verification_call",
        therapy_name: therapyName || "unknown",
        model: "claude-sonnet-4-20250514",
        prompt_length: prompt.length,
        response_length: (response.content as string).length,
        duration_ms: duration,
      });

      const result = this.parseVerificationResult(response.content as string);

      // Log verification result
      await this.logger.logMetadata("RevenueVerifierAgent", {
        operation: "verification_result",
        therapy_name: therapyName || "unknown",
        contains_revenue_data: result.containsRevenueData,
        confidence: result.confidence,
        reasoning: result.reasoning,
        decision: result.containsRevenueData ? "PASS" : "FAIL",
        duration_ms: duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log verification error
      await this.logger.logError("RevenueVerifierAgent", error as Error, {
        operation: "verification_failed",
        therapy_name: therapyName || "unknown",
        snippet_length: textSnippet.length,
        duration_ms: duration,
      });

      console.warn(
        `⚠️ Revenue Verifier: Verification failed, defaulting to false:`,
        error
      );
      return {
        containsRevenueData: false,
        confidence: 0,
        reasoning: "Verification failed due to error",
      };
    }
  }

  private parseVerificationResult(content: string): RevenueVerificationResult {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in verification response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        containsRevenueData: Boolean(parsed.containsRevenueData),
        confidence: Math.max(0, Math.min(100, Number(parsed.confidence) || 0)),
        reasoning: String(parsed.reasoning || "No reasoning provided"),
      };
    } catch (error) {
      console.warn("Failed to parse verification response:", content);
      return {
        containsRevenueData: false,
        confidence: 0,
        reasoning: "Failed to parse verification response",
      };
    }
  }

  /**
   * Extract highlighted snippets around therapy mentions
   */
  private extractHighlightedSnippets(text: string, therapyName: string): string {
    if (!therapyName || therapyName === "any therapy") {
      return "No specific therapy provided for highlighting.";
    }

    const snippets: string[] = [];
    const therapyLower = therapyName.toLowerCase();
    const textLower = text.toLowerCase();
    const contextSize = 200; // Characters around each mention
    
    let searchStart = 0;
    let mentionCount = 0;
    
    // Find all mentions of the therapy
    while (true) {
      const mentionIndex = textLower.indexOf(therapyLower, searchStart);
      if (mentionIndex === -1) break;
      
      mentionCount++;
      
      // Extract context around the mention
      const snippetStart = Math.max(0, mentionIndex - contextSize);
      const snippetEnd = Math.min(text.length, mentionIndex + therapyName.length + contextSize);
      
      let snippet = text.substring(snippetStart, snippetEnd);
      
      // Add ellipsis if we truncated
      if (snippetStart > 0) snippet = "..." + snippet;
      if (snippetEnd < text.length) snippet = snippet + "...";
      
      // Highlight the therapy name in this snippet
      const regex = new RegExp(`(${therapyName})`, 'gi');
      snippet = snippet.replace(regex, '**$1**');
      
      snippets.push(`SNIPPET ${mentionCount}: ${snippet}`);
      
      // Move search position past this mention
      searchStart = mentionIndex + therapyName.length;
      
      // Limit to prevent too many snippets
      if (mentionCount >= 10) break;
    }
    
    if (snippets.length === 0) {
      return `No mentions of "${therapyName}" found in the text.`;
    }
    
    return snippets.join('\n\n');
  }

  /**
   * Log batch verification summary for a therapy
   */
  async logBatchSummary(
    therapyName: string,
    totalSnippets: number,
    passedSnippets: number,
    averageConfidence: number,
    totalDuration: number
  ): Promise<void> {
    await this.logger.logMetadata("RevenueVerifierAgent", {
      operation: "batch_verification_complete",
      therapy_name: therapyName,
      total_snippets: totalSnippets,
      passed_snippets: passedSnippets,
      failed_snippets: totalSnippets - passedSnippets,
      pass_rate:
        totalSnippets > 0
          ? Math.round((passedSnippets / totalSnippets) * 100)
          : 0,
      average_confidence: Math.round(averageConfidence),
      total_duration_ms: totalDuration,
      avg_duration_per_snippet:
        totalSnippets > 0 ? Math.round(totalDuration / totalSnippets) : 0,
    });
  }
}
