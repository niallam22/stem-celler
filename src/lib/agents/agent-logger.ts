import { promises as fs } from 'fs';
import path from 'path';
import { createId } from '@paralleldrive/cuid2';

export type LogType = 'input' | 'output' | 'timing' | 'error' | 'llm_call' | 'validation' | 'metadata';

export interface LogEntry {
  sessionId: string;
  agentName: string;
  timestamp: string;
  logType: LogType;
  documentInfo?: {
    fileName?: string;
    company?: string;
    reportType?: string;
    period?: string;
  };
  data: any;
  duration?: number;
  metadata?: {
    nodeEnv: string;
    version?: string;
  };
}

export interface SessionInfo {
  sessionId: string;
  documentFileName?: string;
  startTime: Date;
  company?: string;
  reportType?: string;
  period?: string;
}

export class AgentLogger {
  private static instance: AgentLogger;
  private currentSession: SessionInfo | null = null;
  private logDir: string;
  private isEnabled: boolean;
  private logLevel: 'verbose' | 'debug' | 'info';
  private includeLLMResponses: boolean;

  private constructor() {
    // Environment-based configuration
    this.isEnabled = 
      process.env.NODE_ENV === 'development' && 
      process.env.AGENT_LOGGING_ENABLED !== 'false';
    
    this.logLevel = (process.env.AGENT_LOG_LEVEL as any) || 'debug';
    this.logDir = process.env.AGENT_LOG_DIR || path.join(process.cwd(), 'logs', 'development');
    this.includeLLMResponses = process.env.AGENT_LOG_LLM_RESPONSES !== 'false';

    if (this.isEnabled) {
      console.log(`📝 AgentLogger: Enabled (level: ${this.logLevel}, dir: ${this.logDir})`);
    }
  }

  public static getInstance(): AgentLogger {
    if (!AgentLogger.instance) {
      AgentLogger.instance = new AgentLogger();
    }
    return AgentLogger.instance;
  }

  /**
   * Start a new logging session for document processing
   */
  public startSession(documentFileName?: string, documentInfo?: {
    company?: string;
    reportType?: string;
    period?: string;
  }): string {
    if (!this.isEnabled) return '';

    const sessionId = createId();
    this.currentSession = {
      sessionId,
      documentFileName,
      startTime: new Date(),
      company: documentInfo?.company,
      reportType: documentInfo?.reportType,
      period: documentInfo?.period,
    };

    console.log(`🎯 AgentLogger: Started session ${sessionId} for ${documentFileName}`);
    
    // Create session directory
    this.ensureSessionDirectory(sessionId);

    // Log session start
    this.logSessionStart();

    return sessionId;
  }

  /**
   * End the current session
   */
  public endSession(): void {
    if (!this.isEnabled || !this.currentSession) return;

    this.logSessionEnd();
    console.log(`🎯 AgentLogger: Ended session ${this.currentSession.sessionId}`);
    this.currentSession = null;
  }

  /**
   * Log agent input
   */
  public async logInput(
    agentName: string,
    input: {
      text?: string;
      context?: any;
      parameters?: any;
    }
  ): Promise<void> {
    if (!this.isEnabled) return;

    await this.writeLog(agentName, 'input', {
      textLength: input.text?.length || 0,
      textPreview: input.text?.substring(0, 500) + (input.text && input.text.length > 500 ? '...' : ''),
      context: input.context,
      parameters: input.parameters,
    });
  }

  /**
   * Log LLM call details
   */
  public async logLLMCall(
    agentName: string,
    llmData: {
      prompt?: string;
      response?: string;
      model?: string;
      tokenEstimate?: number;
      duration?: number;
    }
  ): Promise<void> {
    if (!this.isEnabled) return;

    const logData: any = {
      model: llmData.model,
      tokenEstimate: llmData.tokenEstimate,
      duration: llmData.duration,
      promptLength: llmData.prompt?.length || 0,
      responseLength: llmData.response?.length || 0,
    };

    if (this.includeLLMResponses) {
      logData.prompt = llmData.prompt;
      logData.response = llmData.response;
    } else {
      logData.promptPreview = llmData.prompt?.substring(0, 200) + '...';
      logData.responsePreview = llmData.response?.substring(0, 200) + '...';
    }

    await this.writeLog(agentName, 'llm_call', logData, llmData.duration);
  }

  /**
   * Log agent output
   */
  public async logOutput(
    agentName: string,
    output: {
      rawResult?: any;
      parsedResult?: any;
      confidence?: number;
      errors?: string[];
    }
  ): Promise<void> {
    if (!this.isEnabled) return;

    await this.writeLog(agentName, 'output', {
      parsedResult: output.parsedResult,
      confidence: output.confidence,
      errors: output.errors,
      hasRawResult: !!output.rawResult,
      rawResultPreview: JSON.stringify(output.rawResult)?.substring(0, 300) + '...',
    });
  }

  /**
   * Log timing information
   */
  public async logTiming(
    agentName: string,
    operation: string,
    duration: number,
    metadata?: any
  ): Promise<void> {
    if (!this.isEnabled) return;

    await this.writeLog(agentName, 'timing', {
      operation,
      metadata,
    }, duration);
  }

  /**
   * Log errors
   */
  public async logError(
    agentName: string,
    error: Error | string,
    context?: any
  ): Promise<void> {
    if (!this.isEnabled) return;

    await this.writeLog(agentName, 'error', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
      context,
    });
  }

  /**
   * Log validation results
   */
  public async logValidation(
    agentName: string,
    validation: {
      success: boolean;
      errors?: any[];
      originalData?: any;
      validatedData?: any;
    }
  ): Promise<void> {
    if (!this.isEnabled) return;

    await this.writeLog(agentName, 'validation', {
      success: validation.success,
      errors: validation.errors,
      hasOriginalData: !!validation.originalData,
      hasValidatedData: !!validation.validatedData,
      validatedDataSample: JSON.stringify(validation.validatedData)?.substring(0, 200) + '...',
    });
  }

  /**
   * Log general metadata
   */
  public async logMetadata(
    agentName: string,
    metadata: any
  ): Promise<void> {
    if (!this.isEnabled) return;

    await this.writeLog(agentName, 'metadata', metadata);
  }

  /**
   * Core logging method
   */
  private async writeLog(
    agentName: string,
    logType: LogType,
    data: any,
    duration?: number
  ): Promise<void> {
    if (!this.isEnabled || !this.currentSession) return;

    const logEntry: LogEntry = {
      sessionId: this.currentSession.sessionId,
      agentName,
      timestamp: new Date().toISOString(),
      logType,
      documentInfo: {
        fileName: this.currentSession.documentFileName,
        company: this.currentSession.company,
        reportType: this.currentSession.reportType,
        period: this.currentSession.period,
      },
      data,
      duration,
      metadata: {
        nodeEnv: process.env.NODE_ENV || 'unknown',
      },
    };

    try {
      // Write to agent-specific file
      await this.writeToFile(agentName, logEntry);
      
      // Also write to session summary file
      await this.writeToSessionSummary(logEntry);
    } catch (error) {
      console.error('AgentLogger: Failed to write log entry:', error);
    }
  }

  /**
   * Write log entry to agent-specific file
   */
  private async writeToFile(agentName: string, logEntry: LogEntry): Promise<void> {
    if (!this.currentSession) return;

    const sessionDir = this.getSessionDirectory(this.currentSession.sessionId);
    const agentFileName = `${agentName.toLowerCase().replace(/agent$/, '')}.json`;
    const filePath = path.join(sessionDir, agentFileName);

    // Read existing logs or create empty array
    let logs: LogEntry[] = [];
    try {
      const existingContent = await fs.readFile(filePath, 'utf-8');
      logs = JSON.parse(existingContent);
    } catch (error) {
      // File doesn't exist or is invalid, start with empty array
    }

    // Append new log entry
    logs.push(logEntry);

    // Write back to file
    await fs.writeFile(filePath, JSON.stringify(logs, null, 2));
  }

  /**
   * Write log entry to session summary file
   */
  private async writeToSessionSummary(logEntry: LogEntry): Promise<void> {
    if (!this.currentSession) return;

    const sessionDir = this.getSessionDirectory(this.currentSession.sessionId);
    const summaryPath = path.join(sessionDir, 'session-summary.json');

    // Read existing summary or create empty array
    let summary: LogEntry[] = [];
    try {
      const existingContent = await fs.readFile(summaryPath, 'utf-8');
      summary = JSON.parse(existingContent);
    } catch (error) {
      // File doesn't exist, start with empty array
    }

    // Append new log entry
    summary.push(logEntry);

    // Write back to file
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  }

  /**
   * Log session start
   */
  private async logSessionStart(): Promise<void> {
    if (!this.currentSession) return;

    const sessionInfo = {
      action: 'session_start',
      sessionId: this.currentSession.sessionId,
      documentFileName: this.currentSession.documentFileName,
      startTime: this.currentSession.startTime.toISOString(),
      company: this.currentSession.company,
      reportType: this.currentSession.reportType,
      period: this.currentSession.period,
    };

    await this.writeLog('orchestrator', 'metadata', sessionInfo);
  }

  /**
   * Log session end
   */
  private async logSessionEnd(): Promise<void> {
    if (!this.currentSession) return;

    const endTime = new Date();
    const duration = endTime.getTime() - this.currentSession.startTime.getTime();

    const sessionInfo = {
      action: 'session_end',
      sessionId: this.currentSession.sessionId,
      endTime: endTime.toISOString(),
      totalDuration: duration,
    };

    await this.writeLog('orchestrator', 'metadata', sessionInfo, duration);
  }

  /**
   * Ensure session directory exists
   */
  private async ensureSessionDirectory(sessionId: string): Promise<void> {
    const sessionDir = this.getSessionDirectory(sessionId);
    
    try {
      await fs.mkdir(sessionDir, { recursive: true });
    } catch (error) {
      console.error(`AgentLogger: Failed to create session directory ${sessionDir}:`, error);
    }
  }

  /**
   * Get session directory path
   */
  private getSessionDirectory(sessionId: string): string {
    const today = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, 'sessions', `${today}_session-${sessionId}`);
  }

  /**
   * Get current session ID
   */
  public getCurrentSessionId(): string | null {
    return this.currentSession?.sessionId || null;
  }

  /**
   * Check if logging is enabled
   */
  public isLoggingEnabled(): boolean {
    return this.isEnabled;
  }
}