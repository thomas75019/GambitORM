import { QueryResult } from '../types';

export interface LoggedQuery {
  sql: string;
  params?: any[];
  executionTime: number; // in milliseconds
  timestamp: Date;
  result?: {
    rowCount?: number;
    insertId?: number | string;
  };
  error?: Error;
}

export interface QueryLogOptions {
  enabled?: boolean;
  logToConsole?: boolean;
  logToFile?: boolean;
  filePath?: string;
  maxQueries?: number; // Maximum number of queries to keep in memory
  slowQueryThreshold?: number; // Log slow queries separately (in milliseconds)
}

/**
 * Query logger for tracking and debugging database queries
 */
export class QueryLogger {
  private queries: LoggedQuery[] = [];
  private options: QueryLogOptions;
  private slowQueries: LoggedQuery[] = [];

  constructor(options: QueryLogOptions = {}) {
    this.options = {
      enabled: false,
      logToConsole: false,
      logToFile: false,
      maxQueries: 1000,
      slowQueryThreshold: 1000, // 1 second
      ...options,
    };
  }

  /**
   * Enable query logging
   */
  enable(options?: Partial<QueryLogOptions>): void {
    this.options = {
      ...this.options,
      ...options,
      enabled: true,
    };
  }

  /**
   * Disable query logging
   */
  disable(): void {
    this.options.enabled = false;
  }

  /**
   * Check if logging is enabled
   */
  isEnabled(): boolean {
    return this.options.enabled === true;
  }

  /**
   * Log a query
   */
  log(sql: string, params: any[] | undefined, executionTime: number, result?: QueryResult, error?: Error): void {
    if (!this.isEnabled()) {
      return;
    }

    const loggedQuery: LoggedQuery = {
      sql: this.formatSQL(sql, params),
      params: params ? [...params] : undefined,
      executionTime,
      timestamp: new Date(),
      result: result ? {
        rowCount: result.rowCount,
        insertId: result.insertId,
      } : undefined,
      error: error,
    };

    // Add to queries array
    this.queries.push(loggedQuery);

    // Keep only maxQueries
    if (this.options.maxQueries && this.queries.length > this.options.maxQueries) {
      this.queries.shift();
    }

    // Track slow queries
    if (this.options.slowQueryThreshold && executionTime >= this.options.slowQueryThreshold) {
      this.slowQueries.push(loggedQuery);
      if (this.options.maxQueries && this.slowQueries.length > this.options.maxQueries) {
        this.slowQueries.shift();
      }
    }

    // Log to console if enabled
    if (this.options.logToConsole) {
      this.logToConsole(loggedQuery);
    }

    // Log to file if enabled
    if (this.options.logToFile && this.options.filePath) {
      this.logToFile(loggedQuery);
    }
  }

  /**
   * Get all logged queries
   */
  getQueries(): LoggedQuery[] {
    return [...this.queries];
  }

  /**
   * Get slow queries
   */
  getSlowQueries(): LoggedQuery[] {
    return [...this.slowQueries];
  }

  /**
   * Get the last query
   */
  getLastQuery(): LoggedQuery | null {
    return this.queries.length > 0 ? this.queries[this.queries.length - 1] : null;
  }

  /**
   * Clear all logged queries
   */
  clear(): void {
    this.queries = [];
    this.slowQueries = [];
  }

  /**
   * Get query statistics
   */
  getStats(): {
    totalQueries: number;
    totalExecutionTime: number;
    averageExecutionTime: number;
    slowQueries: number;
    errors: number;
  } {
    const totalQueries = this.queries.length;
    const totalExecutionTime = this.queries.reduce((sum, q) => sum + q.executionTime, 0);
    const averageExecutionTime = totalQueries > 0 ? totalExecutionTime / totalQueries : 0;
    const slowQueries = this.slowQueries.length;
    const errors = this.queries.filter(q => q.error).length;

    return {
      totalQueries,
      totalExecutionTime,
      averageExecutionTime,
      slowQueries,
      errors,
    };
  }

  /**
   * Format SQL with parameters
   */
  private formatSQL(sql: string, params?: any[]): string {
    if (!params || params.length === 0) {
      return sql;
    }

    // Simple parameter replacement for logging
    // Note: This is for display purposes only, not for actual execution
    let formatted = sql;
    params.forEach((param, index) => {
      const placeholder = sql.includes('?') ? '?' : `$${index + 1}`;
      const value = this.formatValue(param);
      formatted = formatted.replace(placeholder, value);
    });

    return formatted;
  }

  /**
   * Format a value for SQL logging
   */
  private formatValue(value: any): string {
    if (value === null) {
      return 'NULL';
    }
    if (value === undefined) {
      return 'undefined';
    }
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }
    if (Array.isArray(value)) {
      return `[${value.map(v => this.formatValue(v)).join(', ')}]`;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Log to console
   */
  private logToConsole(query: LoggedQuery): void {
    const prefix = query.error ? '❌' : '✅';
    const time = query.executionTime.toFixed(2);
    console.log(`${prefix} [${time}ms] ${query.sql}`);
    
    if (query.result) {
      console.log(`   → Rows: ${query.result.rowCount ?? 'N/A'}, Insert ID: ${query.result.insertId ?? 'N/A'}`);
    }
    
    if (query.error) {
      console.error(`   → Error: ${query.error.message}`);
    }
  }

  /**
   * Log to file (async, non-blocking)
   */
  private logToFile(query: LoggedQuery): void {
    // File logging would require fs module
    // For now, we'll just store it in memory
    // In a full implementation, you could use fs.appendFileSync or a logging library
    // This is a placeholder for future file logging support
  }

  /**
   * Format SQL query for better readability
   */
  static formatSQL(sql: string): string {
    // Basic SQL formatting
    let formatted = sql
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\s*,\s*/g, ', ') // Format commas
      .replace(/\s*\(\s*/g, ' (') // Format opening parentheses
      .replace(/\s*\)\s*/g, ') ') // Format closing parentheses
      .trim();

    // Add line breaks for major SQL keywords
    const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'INSERT INTO', 'UPDATE', 'SET', 'DELETE FROM'];
    
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      formatted = formatted.replace(regex, `\n${keyword}`);
    });

    return formatted.trim();
  }
}

