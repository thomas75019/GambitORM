import { QueryResult } from '../../src/types';
import { BaseAdapter } from '../../src/connection/adapters/BaseAdapter';

/**
 * Mock adapter for testing
 */
export class MockAdapter implements BaseAdapter {
  private connected: boolean = false;
  private queries: Array<{ sql: string; params?: any[] }> = [];
  private queryResults: QueryResult[] = [];
  private transactionActive: boolean = false;

  connect(): Promise<void> {
    this.connected = true;
    return Promise.resolve();
  }

  disconnect(): Promise<void> {
    this.connected = false;
    return Promise.resolve();
  }

  async query(sql: string, params?: any[]): Promise<QueryResult> {
    this.queries.push({ sql, params });
    
    // If we have queued results, use them in order
    if (this.queryResults.length > 0) {
      const result = this.queryResults.shift()!;
      return Promise.resolve(result);
    }
    
    // Default empty result
    return Promise.resolve({ rows: [], rowCount: 0 });
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Test helpers
  getQueries(): Array<{ sql: string; params?: any[] }> {
    return this.queries;
  }

  clearQueries(): void {
    this.queries = [];
  }

  setQueryResult(result: QueryResult): void {
    this.queryResults.push(result);
  }

  setQueryResults(results: QueryResult[]): void {
    this.queryResults = results;
  }

  async beginTransaction(): Promise<void> {
    if (this.transactionActive) {
      throw new Error('Transaction already active');
    }
    this.transactionActive = true;
    this.queries.push({ sql: 'BEGIN TRANSACTION' });
  }

  async commit(): Promise<void> {
    if (!this.transactionActive) {
      throw new Error('No active transaction');
    }
    this.transactionActive = false;
    this.queries.push({ sql: 'COMMIT' });
  }

  async rollback(): Promise<void> {
    if (!this.transactionActive) {
      throw new Error('No active transaction');
    }
    this.transactionActive = false;
    this.queries.push({ sql: 'ROLLBACK' });
  }

  getTransactionConnection(): any {
    return this;
  }

  isTransactionActive(): boolean {
    return this.transactionActive;
  }
}

