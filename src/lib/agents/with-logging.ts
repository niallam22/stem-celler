import { AgentLogger } from './agent-logger';
import { DocumentInfo } from './document-classifier-agent';

/**
 * Base class that agents can extend to get logging functionality
 */
export class LoggableAgent {
  protected logger = AgentLogger.getInstance();
  protected agentName: string;

  constructor(agentName: string) {
    this.agentName = agentName;
  }

  /**
   * Log the start of an analysis operation
   */
  protected async logAnalysisStart(
    input: string | any,
    documentInfo?: DocumentInfo
  ): Promise<void> {
    await this.logger.logInput(this.agentName, {
      text: typeof input === 'string' ? input : JSON.stringify(input),
      context: documentInfo,
      parameters: { agentName: this.agentName },
    });
  }

  /**
   * Log the end of an analysis operation
   */
  protected async logAnalysisEnd(
    result: any,
    confidence?: any
  ): Promise<void> {
    await this.logger.logOutput(this.agentName, {
      parsedResult: result,
      confidence: typeof confidence === 'number' ? confidence : 
                  confidence?.therapy || confidence?.revenue || confidence?.approvals,
    });
  }

  /**
   * Log LLM interaction
   */
  protected async logLLMInteraction(
    prompt: string,
    response: string,
    model: string = 'gpt-4o-mini',
    duration?: number
  ): Promise<void> {
    await this.logger.logLLMCall(this.agentName, {
      prompt,
      response,
      model,
      duration,
    });
  }

  /**
   * Log timing for operations
   */
  protected async logTiming(
    operation: string,
    startTime: number,
    metadata?: any
  ): Promise<void> {
    const duration = Date.now() - startTime;
    await this.logger.logTiming(this.agentName, operation, duration, metadata);
  }

  /**
   * Log errors
   */
  protected async logError(error: Error | string, context?: any): Promise<void> {
    await this.logger.logError(this.agentName, error, context);
  }

  /**
   * Log validation results
   */
  protected async logValidation(
    success: boolean,
    originalData: any,
    validatedData?: any,
    errors?: any[]
  ): Promise<void> {
    await this.logger.logValidation(this.agentName, {
      success,
      originalData,
      validatedData,
      errors,
    });
  }
}

/**
 * Decorator function to add logging to existing agent methods
 */
export function withMethodLogging<T extends (...args: any[]) => Promise<any>>(
  originalMethod: T,
  agentName: string,
  methodName: string = 'analyze'
): T {
  return (async function(this: any, ...args: any[]) {
    const logger = AgentLogger.getInstance();
    
    if (!logger.isLoggingEnabled()) {
      // If logging is disabled, just run the original method
      return await originalMethod.apply(this, args);
    }

    const startTime = Date.now();

    try {
      // Log input
      const inputData = args[0]; // Assume first argument is the main input
      const documentInfo = args[1]; // Assume second argument is document info
      
      await logger.logInput(agentName, {
        text: typeof inputData === 'string' ? inputData : JSON.stringify(inputData),
        context: documentInfo,
        parameters: { methodName, argsLength: args.length },
      });

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Log successful output
      await logger.logOutput(agentName, {
        parsedResult: result,
        confidence: result?.confidence,
      });

      // Log timing
      const duration = Date.now() - startTime;
      await logger.logTiming(agentName, methodName, duration, {
        success: true,
        hasResult: !!result,
      });

      return result;

    } catch (error) {
      // Log error
      await logger.logError(agentName, error as Error, {
        methodName,
        args: args.map(arg => typeof arg === 'string' ? arg.substring(0, 100) + '...' : typeof arg),
      });

      // Log timing for failed operation
      const duration = Date.now() - startTime;
      await logger.logTiming(agentName, methodName, duration, {
        success: false,
        error: (error as Error).message,
      });

      // Re-throw the error
      throw error;
    }
  }) as T;
}

/**
 * High-level wrapper for agent analyze methods
 */
export function withAnalysisLogging<T extends { analyze: (...args: any[]) => Promise<any> }>(
  agentClass: new (...args: any[]) => T,
  agentName: string
) {
  return class extends agentClass {
    constructor(...args: any[]) {
      super(...args);
      
      // Wrap the analyze method with logging
      const originalAnalyze = this.analyze.bind(this);
      this.analyze = withMethodLogging(originalAnalyze, agentName, 'analyze');
    }
  };
}

/**
 * Utility class for manual logging in agents that prefer explicit logging
 */
export class AgentLoggerHelper {
  private logger = AgentLogger.getInstance();

  constructor(private agentName: string) {}

  /**
   * Time and log a function execution
   */
  async timeAndLog<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: any
  ): Promise<T> {
    if (!this.logger.isLoggingEnabled()) {
      return await fn();
    }

    const startTime = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      
      await this.logger.logTiming(this.agentName, operation, duration, {
        success: true,
        ...metadata,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await this.logger.logError(this.agentName, error as Error, {
        operation,
        ...metadata,
      });
      
      await this.logger.logTiming(this.agentName, operation, duration, {
        success: false,
        error: (error as Error).message,
        ...metadata,
      });

      throw error;
    }
  }

  /**
   * Log a successful parsing operation
   */
  async logSuccessfulParsing(
    rawContent: string,
    parsedResult: any,
    schema?: string
  ): Promise<void> {
    await this.logger.logValidation(this.agentName, {
      success: true,
      originalData: { content: rawContent.substring(0, 300) + '...' },
      validatedData: parsedResult,
    });
  }

  /**
   * Log a failed parsing operation
   */
  async logFailedParsing(
    rawContent: string,
    error: any,
    fallbackResult?: any
  ): Promise<void> {
    await this.logger.logValidation(this.agentName, {
      success: false,
      originalData: { content: rawContent.substring(0, 300) + '...' },
      validatedData: fallbackResult,
      errors: [error],
    });
  }

  /**
   * Log LLM interaction with automatic timing
   */
  async logLLMCall<T>(
    prompt: string,
    llmCall: () => Promise<{ content: T }>,
    model: string = 'gpt-4o-mini'
  ): Promise<{ content: T }> {
    const startTime = Date.now();
    
    try {
      const result = await llmCall();
      const duration = Date.now() - startTime;
      
      await this.logger.logLLMCall(this.agentName, {
        prompt,
        response: typeof result.content === 'string' ? result.content : JSON.stringify(result.content),
        model,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      await this.logger.logLLMCall(this.agentName, {
        prompt,
        response: `ERROR: ${(error as Error).message}`,
        model,
        duration,
      });

      throw error;
    }
  }

  /**
   * Get direct access to logger for custom logging
   */
  getLogger(): AgentLogger {
    return this.logger;
  }
}