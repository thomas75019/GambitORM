import { Model } from '../orm/Model';
import { QueryBuilder } from '../query/QueryBuilder';
import { Relationship } from './Relationship';

/**
 * HasOne relationship
 */
export class HasOne extends Relationship {
  async load(): Promise<Model | null> {
    const RelatedModel = this.relatedModel as unknown as (typeof Model) & { tableName: string };
    const localKey = this.localKey || 'id';
    const ownerTableName = (this.owner.constructor as typeof Model & { tableName: string }).tableName;
    const foreignKey = this.foreignKey || `${ownerTableName.replace(/s$/, '')}_id`;

    const localValue = (this.owner as any)[localKey];
    if (!localValue) {
      return null;
    }

    return await (RelatedModel as any).findOne({ [foreignKey]: localValue });
  }

  getQuery(): QueryBuilder {
    const RelatedModel = this.relatedModel as unknown as (typeof Model) & { tableName: string };
    const connection = Model.getConnection();
    const localKey = this.localKey || 'id';
    const ownerTableName = (this.owner.constructor as typeof Model & { tableName: string }).tableName;
    const foreignKey = this.foreignKey || `${ownerTableName.replace(/s$/, '')}_id`;
    const localValue = (this.owner as any)[localKey];

    const relatedTableName = RelatedModel.tableName;
    const query = new QueryBuilder(relatedTableName, connection);
    if (localValue) {
      query.where(foreignKey, '=', localValue);
    }
    return query;
  }
}

