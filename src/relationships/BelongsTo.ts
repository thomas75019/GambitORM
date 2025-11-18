import { Model } from '../orm/Model';
import { QueryBuilder } from '../query/QueryBuilder';
import { Relationship } from './Relationship';

/**
 * BelongsTo relationship
 */
export class BelongsTo extends Relationship {
  private foreignKeyOn?: string;

  constructor(owner: Model, relatedModel: new () => Model, foreignKey?: string, localKey?: string, foreignKeyOn?: string) {
    super(owner, relatedModel, foreignKey, localKey);
    this.foreignKeyOn = foreignKeyOn;
  }

  async load(): Promise<Model | null> {
    const RelatedModel = this.relatedModel as unknown as (typeof Model) & { tableName: string };
    const relatedTableName = RelatedModel.tableName;
    const localKey = this.localKey || (this.foreignKeyOn || this.foreignKey || `${relatedTableName.replace(/s$/, '')}_id`);
    const foreignKey = 'id'; // Always use id on the related model

    const localValue = (this.owner as any)[localKey];
    if (!localValue) {
      return null;
    }

    return await (RelatedModel as any).findById(localValue);
  }

  getQuery(): QueryBuilder {
    const RelatedModel = this.relatedModel as unknown as (typeof Model) & { tableName: string };
    const connection = Model.getConnection();
    const relatedTableName = RelatedModel.tableName;
    const localKey = this.localKey || (this.foreignKeyOn || this.foreignKey || `${relatedTableName.replace(/s$/, '')}_id`);
    const localValue = (this.owner as any)[localKey];

    const query = new QueryBuilder(relatedTableName, connection);
    if (localValue) {
      query.where('id', '=', localValue);
    }
    return query;
  }
}

