/**
 * Base class for database migrations
 */
export abstract class Migration {
  /**
   * Run the migration
   */
  abstract up(): Promise<void>;

  /**
   * Rollback the migration
   */
  abstract down(): Promise<void>;

  /**
   * Get migration name
   */
  abstract getName(): string;
}

