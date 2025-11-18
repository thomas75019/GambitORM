import { Model } from '../orm/Model';
import { QueryBuilder } from '../query/QueryBuilder';
import { MongoDBQueryBuilder } from '../query/MongoDBQueryBuilder';
import { Relationship } from './Relationship';
import { Connection } from '../connection/Connection';

export interface BelongsToManyOptions {
  pivotTable: string;
  foreignKey?: string;
  relatedKey?: string;
  localKey?: string;
  relatedLocalKey?: string;
  withPivot?: string[];
}

/**
 * BelongsToMany relationship for many-to-many relationships
 */
export class BelongsToMany extends Relationship {
  private pivotTable: string;
  private relatedKey: string;
  private relatedLocalKey: string;
  private withPivot: string[];

  constructor(
    owner: Model,
    relatedModel: new () => Model,
    options: BelongsToManyOptions
  ) {
    super(owner, relatedModel);
    this.pivotTable = options.pivotTable;
    this.foreignKey = options.foreignKey;
    this.localKey = options.localKey || 'id';
    this.relatedKey = options.relatedKey || this.getDefaultRelatedKey();
    this.relatedLocalKey = options.relatedLocalKey || 'id';
    this.withPivot = options.withPivot || [];
  }

  private getDefaultRelatedKey(): string {
    const RelatedModel = this.relatedModel as unknown as (typeof Model) & { tableName: string };
    const relatedTableName = RelatedModel.tableName;
    return `${relatedTableName.replace(/s$/, '')}_id`;
  }

  async load(): Promise<Model[]> {
    const RelatedModel = this.relatedModel as unknown as (typeof Model) & { tableName: string };
    const connection = Model.getConnection();
    const isMongoDB = connection.getDialect() === 'mongodb';
    
    const localValue = (this.owner as any)[this.localKey!];
    if (!localValue) {
      return [];
    }

    const relatedTableName = RelatedModel.tableName;
    const foreignKey = this.foreignKey || this.getDefaultForeignKey();
    
    if (isMongoDB) {
      // For MongoDB, we need to use aggregation or multiple queries
      // Simplified implementation: get IDs from pivot, then fetch related models
      const pivotQuery = new MongoDBQueryBuilder(this.pivotTable, connection);
      pivotQuery.where(foreignKey, '=', localValue);
      const pivotResult = await pivotQuery.execute();
      
      const relatedIds = pivotResult.rows.map((row: any) => row[this.relatedKey]);
      if (relatedIds.length === 0) {
        return [];
      }

      // Fetch related models using whereIn
      const relatedQuery = new MongoDBQueryBuilder(relatedTableName, connection);
      relatedQuery.whereIn('id', relatedIds);
      const relatedResult = await relatedQuery.execute();
      
      // Create instances from results
      const instances: Model[] = relatedResult.rows.map((row: any) => {
        const instance = new (this.relatedModel as any)();
        Object.assign(instance, row);
        return instance;
      });
      
      // Attach pivot data if requested
      if (this.withPivot.length > 0) {
        for (const instance of instances) {
          const pivotRow = pivotResult.rows.find((p: any) => p[this.relatedKey] === instance.id);
          if (pivotRow) {
            for (const pivotField of this.withPivot) {
              (instance as any)[`pivot_${pivotField}`] = pivotRow[pivotField];
            }
          }
        }
      }
      
      return instances;
    } else {
      // SQL: Join pivot table with related table
      const query = new QueryBuilder(relatedTableName, connection);
      query.join(
        this.pivotTable,
        {
          left: `${relatedTableName}.id`,
          right: `${this.pivotTable}.${this.relatedKey}`,
        },
        'INNER'
      );
      query.where(`${this.pivotTable}.${foreignKey}`, '=', localValue);

      // Select pivot columns if requested
      if (this.withPivot.length > 0) {
        const pivotSelects = this.withPivot.map(field => `${this.pivotTable}.${field} AS pivot_${field}`);
        query.select([`${relatedTableName}.*`, ...pivotSelects]);
      }

      const result = await query.execute();
      
      // Create instances from joined result, avoiding duplicates
      const instances: Model[] = [];
      const seenIds = new Set();
      
      for (const row of result.rows) {
        // Skip if we've already processed this ID
        if (seenIds.has(row.id)) {
          continue;
        }
        
        // Create instance with only related model fields (exclude pivot fields)
        const instance = new (this.relatedModel as any)();
        const relatedFields: Record<string, any> = {};
        const pivotPrefix = 'pivot_';
        
        for (const key in row) {
          if (!key.startsWith(pivotPrefix)) {
            relatedFields[key] = row[key];
          }
        }
        Object.assign(instance, relatedFields);
        instances.push(instance);
        seenIds.add(row.id);
        
        // Attach pivot data
        for (const pivotField of this.withPivot) {
          if (row[`pivot_${pivotField}`] !== undefined) {
            (instance as any)[`pivot_${pivotField}`] = row[`pivot_${pivotField}`];
          }
        }
      }
      
      return instances;
    }
  }

  getQuery(): QueryBuilder {
    const RelatedModel = this.relatedModel as unknown as (typeof Model) & { tableName: string };
    const connection = Model.getConnection();
    const relatedTableName = RelatedModel.tableName;
    const localValue = (this.owner as any)[this.localKey!];
    const foreignKey = this.foreignKey || this.getDefaultForeignKey();

    const query = new QueryBuilder(relatedTableName, connection);
    query.join(
      this.pivotTable,
      {
        left: `${relatedTableName}.id`,
        right: `${this.pivotTable}.${this.relatedKey}`,
      },
      'INNER'
    );
    
    if (localValue) {
      query.where(`${this.pivotTable}.${foreignKey}`, '=', localValue);
    }
    
    return query;
  }

  private getDefaultForeignKey(): string {
    const ownerTableName = (this.owner.constructor as typeof Model & { tableName: string }).tableName;
    return `${ownerTableName.replace(/s$/, '')}_id`;
  }

  /**
   * Attach a related model to the pivot table
   */
  async attach(relatedId: number | string, pivotData?: Record<string, any>): Promise<void> {
    const connection = Model.getConnection();
    const isMongoDB = connection.getDialect() === 'mongodb';
    const localValue = (this.owner as any)[this.localKey!];
    const foreignKey = this.foreignKey || this.getDefaultForeignKey();

    if (!localValue) {
      throw new Error('Cannot attach: owner model has no id');
    }

    const pivotRecord: Record<string, any> = {
      [foreignKey]: localValue,
      [this.relatedKey]: relatedId,
      ...pivotData,
    };

    if (isMongoDB) {
      const query = new MongoDBQueryBuilder(this.pivotTable, connection);
      await query.insert(pivotRecord).execute();
    } else {
      const query = new QueryBuilder(this.pivotTable, connection);
      await query.insert(pivotRecord).execute();
    }
  }

  /**
   * Attach multiple related models
   */
  async attachMany(relatedIds: (number | string)[], pivotData?: Record<string, any>): Promise<void> {
    const connection = Model.getConnection();
    const isMongoDB = connection.getDialect() === 'mongodb';
    const localValue = (this.owner as any)[this.localKey!];
    const foreignKey = this.foreignKey || this.getDefaultForeignKey();

    if (!localValue) {
      throw new Error('Cannot attach: owner model has no id');
    }

    const pivotRecords = relatedIds.map(relatedId => ({
      [foreignKey]: localValue,
      [this.relatedKey]: relatedId,
      ...pivotData,
    }));

    if (isMongoDB) {
      const query = new MongoDBQueryBuilder(this.pivotTable, connection);
      await query.insert(pivotRecords).execute();
    } else {
      const query = new QueryBuilder(this.pivotTable, connection);
      await query.insert(pivotRecords).execute();
    }
  }

  /**
   * Detach a related model from the pivot table
   */
  async detach(relatedId?: number | string): Promise<number> {
    const connection = Model.getConnection();
    const isMongoDB = connection.getDialect() === 'mongodb';
    const localValue = (this.owner as any)[this.localKey!];
    const foreignKey = this.foreignKey || this.getDefaultForeignKey();

    if (!localValue) {
      throw new Error('Cannot detach: owner model has no id');
    }

    if (isMongoDB) {
      const query = new MongoDBQueryBuilder(this.pivotTable, connection);
      query.where(foreignKey, '=', localValue);
      if (relatedId !== undefined) {
        query.where(this.relatedKey, '=', relatedId);
      }
      const result = await query.delete().execute();
      return result.rowCount || 0;
    } else {
      const query = new QueryBuilder(this.pivotTable, connection);
      query.where(foreignKey, '=', localValue);
      if (relatedId !== undefined) {
        query.where(this.relatedKey, '=', relatedId);
      }
      const result = await query.delete().execute();
      return result.rowCount || 0;
    }
  }

  /**
   * Sync related models (detach all and attach specified ones)
   */
  async sync(relatedIds: (number | string)[], detaching: boolean = true): Promise<void> {
    if (detaching) {
      await this.detach();
    }
    if (relatedIds.length > 0) {
      await this.attachMany(relatedIds);
    }
  }

  /**
   * Toggle a related model (attach if not attached, detach if attached)
   */
  async toggle(relatedId: number | string): Promise<boolean> {
    const connection = Model.getConnection();
    const isMongoDB = connection.getDialect() === 'mongodb';
    const localValue = (this.owner as any)[this.localKey!];
    const foreignKey = this.foreignKey || this.getDefaultForeignKey();

    if (!localValue) {
      throw new Error('Cannot toggle: owner model has no id');
    }

    // Check if relationship exists
    if (isMongoDB) {
      const query = new MongoDBQueryBuilder(this.pivotTable, connection);
      query.where(foreignKey, '=', localValue);
      query.where(this.relatedKey, '=', relatedId);
      const result = await query.execute();
      
      if (result.rows.length > 0) {
        // Detach
        await this.detach(relatedId);
        return false;
      } else {
        // Attach
        await this.attach(relatedId);
        return true;
      }
    } else {
      const query = new QueryBuilder(this.pivotTable, connection);
      query.where(foreignKey, '=', localValue);
      query.where(this.relatedKey, '=', relatedId);
      const result = await query.execute();
      
      if (result.rows.length > 0) {
        // Detach
        await this.detach(relatedId);
        return false;
      } else {
        // Attach
        await this.attach(relatedId);
        return true;
      }
    }
  }

  /**
   * Check if a related model is attached
   */
  async has(relatedId: number | string): Promise<boolean> {
    const connection = Model.getConnection();
    const isMongoDB = connection.getDialect() === 'mongodb';
    const localValue = (this.owner as any)[this.localKey!];
    const foreignKey = this.foreignKey || this.getDefaultForeignKey();

    if (!localValue) {
      return false;
    }

    if (isMongoDB) {
      const query = new MongoDBQueryBuilder(this.pivotTable, connection);
      query.where(foreignKey, '=', localValue);
      query.where(this.relatedKey, '=', relatedId);
      query.limit(1);
      const result = await query.execute();
      return result.rows.length > 0;
    } else {
      const query = new QueryBuilder(this.pivotTable, connection);
      query.where(foreignKey, '=', localValue);
      query.where(this.relatedKey, '=', relatedId);
      query.limit(1);
      const result = await query.execute();
      return result.rows.length > 0;
    }
  }

  /**
   * Count related models
   */
  async count(): Promise<number> {
    const connection = Model.getConnection();
    const isMongoDB = connection.getDialect() === 'mongodb';
    const localValue = (this.owner as any)[this.localKey!];
    const foreignKey = this.foreignKey || this.getDefaultForeignKey();

    if (!localValue) {
      return 0;
    }

    if (isMongoDB) {
      const query = new MongoDBQueryBuilder(this.pivotTable, connection);
      query.where(foreignKey, '=', localValue);
      const result = await query.execute();
      return result.rowCount || 0;
    } else {
      const query = new QueryBuilder(this.pivotTable, connection);
      query.where(foreignKey, '=', localValue);
      query.count();
      const result = await query.execute();
      return parseInt(result.rows[0]?.count || '0', 10);
    }
  }
}

