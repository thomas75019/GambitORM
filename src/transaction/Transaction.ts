import { Connection } from '../connection/Connection';

/**
 * Transaction class for managing database transactions
 */
export class Transaction {
  private connection: Connection;
  private committed: boolean = false;
  private rolledBack: boolean = false;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Begin the transaction
   */
  async begin(): Promise<void> {
    const adapter = this.connection.getAdapter();
    if (!adapter || !adapter.beginTransaction) {
      throw new Error('Transaction not supported by this database adapter');
    }

    if (!this.connection.isConnected()) {
      throw new Error('Database connection is not established. Call connect() first.');
    }

    await adapter.beginTransaction();
  }

  /**
   * Commit the transaction
   */
  async commit(): Promise<void> {
    if (this.committed) {
      throw new Error('Transaction already committed');
    }

    if (this.rolledBack) {
      throw new Error('Transaction already rolled back');
    }

    const adapter = this.connection.getAdapter();
    if (!adapter || !adapter.commit) {
      throw new Error('Transaction not supported by this database adapter');
    }

    await adapter.commit();
    this.committed = true;
  }

  /**
   * Rollback the transaction
   */
  async rollback(): Promise<void> {
    if (this.committed) {
      throw new Error('Cannot rollback a committed transaction');
    }

    if (this.rolledBack) {
      return; // Already rolled back, no-op
    }

    const adapter = this.connection.getAdapter();
    if (!adapter || !adapter.rollback) {
      throw new Error('Transaction not supported by this database adapter');
    }

    await adapter.rollback();
    this.rolledBack = true;
  }

  /**
   * Check if transaction is active
   */
  isActive(): boolean {
    return !this.committed && !this.rolledBack;
  }

  /**
   * Get the connection associated with this transaction
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Execute a callback within a transaction
   * Automatically commits on success or rolls back on error
   */
  static async run<T>(
    connection: Connection,
    callback: (transaction: Transaction) => Promise<T>
  ): Promise<T> {
    const transaction = new Transaction(connection);
    
    try {
      await transaction.begin();
      const result = await callback(transaction);
      await transaction.commit();
      return result;
    } catch (error) {
      if (transaction.isActive()) {
        await transaction.rollback();
      }
      throw error;
    }
  }
}

