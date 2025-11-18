import { Connection } from '../connection/Connection';

export interface ColumnDefinition {
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  unique?: boolean;
  defaultValue?: any;
  length?: number;
}

/**
 * Schema builder for creating and modifying database tables
 */
export class SchemaBuilder {
  private connection: Connection;
  private tableName: string;
  private columns: Array<{ name: string; definition: ColumnDefinition }> = [];
  private indexes: Array<{ name: string; columns: string[]; unique?: boolean }> = [];
  private foreignKeys: Array<{
    column: string;
    references: { table: string; column: string };
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
  }> = [];

  constructor(connection: Connection, tableName: string) {
    this.connection = connection;
    this.tableName = tableName;
  }

  /**
   * Add a column to the table
   */
  column(name: string, type: string, definition?: Partial<ColumnDefinition>): this {
    const def: ColumnDefinition = {
      type,
      nullable: true,
      ...definition,
    };
    this.columns.push({ name, definition: def });
    return this;
  }

  /**
   * Add an ID column (primary key, auto increment)
   */
  id(name: string = 'id'): this {
    return this.column(name, this.getIntegerType(), {
      primaryKey: true,
      autoIncrement: true,
      nullable: false,
    });
  }

  /**
   * Add a string column
   */
  string(name: string, length: number = 255): this {
    return this.column(name, this.getStringType(length));
  }

  /**
   * Add an integer column
   */
  integer(name: string): this {
    return this.column(name, this.getIntegerType());
  }

  /**
   * Add a big integer column
   */
  bigInteger(name: string): this {
    return this.column(name, this.getBigIntegerType());
  }

  /**
   * Add a boolean column
   */
  boolean(name: string): this {
    return this.column(name, this.getBooleanType());
  }

  /**
   * Add a text column
   */
  text(name: string): this {
    return this.column(name, this.getTextType());
  }

  /**
   * Add a timestamp column
   */
  timestamp(name: string, nullable: boolean = true): this {
    return this.column(name, this.getTimestampType(), { nullable });
  }

  /**
   * Add timestamps (created_at, updated_at)
   */
  timestamps(): this {
    this.timestamp('created_at', false);
    this.timestamp('updated_at', true);
    return this;
  }

  /**
   * Add a foreign key
   */
  foreign(column: string, references: { table: string; column: string }): this {
    this.foreignKeys.push({ column, references });
    return this;
  }

  /**
   * Add an index
   */
  index(columns: string | string[], name?: string, unique: boolean = false): this {
    const cols = Array.isArray(columns) ? columns : [columns];
    const indexName = name || `idx_${this.tableName}_${cols.join('_')}`;
    this.indexes.push({ name: indexName, columns: cols, unique });
    return this;
  }

  /**
   * Make a column nullable
   */
  nullable(): this {
    if (this.columns.length > 0) {
      this.columns[this.columns.length - 1].definition.nullable = true;
    }
    return this;
  }

  /**
   * Make a column not nullable
   */
  notNull(): this {
    if (this.columns.length > 0) {
      this.columns[this.columns.length - 1].definition.nullable = false;
    }
    return this;
  }

  /**
   * Set default value
   */
  default(value: any): this {
    if (this.columns.length > 0) {
      this.columns[this.columns.length - 1].definition.defaultValue = value;
    }
    return this;
  }

  /**
   * Set column as unique
   */
  unique(): this {
    if (this.columns.length > 0) {
      this.columns[this.columns.length - 1].definition.unique = true;
    }
    return this;
  }

  /**
   * Build and execute CREATE TABLE statement
   */
  async create(): Promise<void> {
    const dialect = this.connection.getDialect();
    const sql = this.buildCreateTableSQL(dialect);
    await this.connection.query(sql);
    
    // Create indexes
    for (const index of this.indexes) {
      await this.createIndex(index, dialect);
    }

    // Create foreign keys
    for (const fk of this.foreignKeys) {
      await this.createForeignKey(fk, dialect);
    }
  }

  /**
   * Build and execute DROP TABLE statement
   */
  async drop(): Promise<void> {
    const sql = `DROP TABLE IF EXISTS ${this.tableName}`;
    await this.connection.query(sql);
  }

  /**
   * Build CREATE TABLE SQL
   */
  private buildCreateTableSQL(dialect: string): string {
    const columnDefs: string[] = [];

    for (const { name, definition } of this.columns) {
      let def = `${name} ${this.mapType(definition.type, dialect, definition.length)}`;

      if (definition.primaryKey && dialect === 'mysql') {
        def += ' PRIMARY KEY';
      }

      if (definition.autoIncrement) {
        def += this.getAutoIncrement(dialect);
      }

      if (definition.unique && !definition.primaryKey) {
        def += ' UNIQUE';
      }

      if (definition.nullable === false) {
        def += ' NOT NULL';
      }

      if (definition.defaultValue !== undefined) {
        def += ` DEFAULT ${this.formatDefaultValue(definition.defaultValue, dialect)}`;
      }

      columnDefs.push(def);
    }

    // Add primary key constraint for non-MySQL databases
    const primaryKeys = this.columns.filter(c => c.definition.primaryKey).map(c => c.name);
    if (primaryKeys.length > 0 && dialect !== 'mysql') {
      columnDefs.push(`PRIMARY KEY (${primaryKeys.join(', ')})`);
    }

    return `CREATE TABLE IF NOT EXISTS ${this.tableName} (${columnDefs.join(', ')})`;
  }

  /**
   * Create an index
   */
  private async createIndex(index: { name: string; columns: string[]; unique?: boolean }, dialect: string): Promise<void> {
    const unique = index.unique ? 'UNIQUE ' : '';
    const columns = index.columns.join(', ');
    const sql = `CREATE ${unique}INDEX IF NOT EXISTS ${index.name} ON ${this.tableName} (${columns})`;
    await this.connection.query(sql);
  }

  /**
   * Create a foreign key
   */
  private async createForeignKey(
    fk: { column: string; references: { table: string; column: string }; onDelete?: string; onUpdate?: string },
    dialect: string
  ): Promise<void> {
    if (dialect === 'sqlite') {
      // SQLite doesn't support adding foreign keys after table creation easily
      // This would require table recreation, so we'll skip it for now
      return;
    }

    const fkName = `fk_${this.tableName}_${fk.column}`;
    let sql = `ALTER TABLE ${this.tableName} ADD CONSTRAINT ${fkName} FOREIGN KEY (${fk.column}) REFERENCES ${fk.references.table}(${fk.references.column})`;

    if (fk.onDelete) {
      sql += ` ON DELETE ${fk.onDelete}`;
    }

    if (fk.onUpdate) {
      sql += ` ON UPDATE ${fk.onUpdate}`;
    }

    await this.connection.query(sql);
  }

  /**
   * Map type to database-specific type
   */
  private mapType(type: string, dialect: string, length?: number): string {
    const lengthStr = length ? `(${length})` : '';

    switch (type.toLowerCase()) {
      case 'string':
      case 'varchar':
        return dialect === 'postgres' ? `VARCHAR${lengthStr}` : `VARCHAR${lengthStr}`;
      case 'integer':
      case 'int':
        return dialect === 'postgres' ? 'INTEGER' : 'INT';
      case 'biginteger':
      case 'bigint':
        return 'BIGINT';
      case 'boolean':
      case 'bool':
        return dialect === 'postgres' ? 'BOOLEAN' : dialect === 'mysql' ? 'TINYINT(1)' : 'INTEGER';
      case 'text':
        return 'TEXT';
      case 'timestamp':
      case 'datetime':
        return dialect === 'postgres' ? 'TIMESTAMP' : 'DATETIME';
      default:
        return type;
    }
  }

  /**
   * Get auto increment syntax
   */
  private getAutoIncrement(dialect: string): string {
    switch (dialect) {
      case 'mysql':
        return ' AUTO_INCREMENT';
      case 'postgres':
        return '';
      case 'sqlite':
        return ' AUTOINCREMENT';
      default:
        return '';
    }
  }

  /**
   * Format default value
   */
  private formatDefaultValue(value: any, dialect: string): string {
    if (value === null) {
      return 'NULL';
    }
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    if (typeof value === 'boolean') {
      return dialect === 'postgres' ? (value ? 'TRUE' : 'FALSE') : (value ? '1' : '0');
    }
    return String(value);
  }

  /**
   * Get integer type for current dialect
   */
  private getIntegerType(): string {
    const dialect = this.connection.getDialect();
    return dialect === 'postgres' ? 'INTEGER' : 'INT';
  }

  /**
   * Get big integer type
   */
  private getBigIntegerType(): string {
    return 'BIGINT';
  }

  /**
   * Get string type
   */
  private getStringType(length: number): string {
    return 'VARCHAR';
  }

  /**
   * Get boolean type
   */
  private getBooleanType(): string {
    const dialect = this.connection.getDialect();
    return dialect === 'postgres' ? 'BOOLEAN' : 'TINYINT(1)';
  }

  /**
   * Get text type
   */
  private getTextType(): string {
    return 'TEXT';
  }

  /**
   * Get timestamp type
   */
  private getTimestampType(): string {
    const dialect = this.connection.getDialect();
    return dialect === 'postgres' ? 'TIMESTAMP' : 'DATETIME';
  }
}

