import { DatabaseConfig } from '../types';
import { Connection } from '../connection/Connection';

/**
 * Main ORM class that manages database connections and models
 */
export class GambitORM {
  private connection: Connection;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.connection = new Connection(config);
  }

  /**
   * Initialize the database connection
   */
  async connect(): Promise<void> {
    await this.connection.connect();
  }

  /**
   * Close the database connection
   */
  async disconnect(): Promise<void> {
    await this.connection.disconnect();
  }

  /**
   * Get the underlying connection instance
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Check if the connection is active
   */
  isConnected(): boolean {
    return this.connection.isConnected();
  }
}

