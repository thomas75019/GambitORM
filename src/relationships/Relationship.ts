import { Model } from '../orm/Model';
import { QueryBuilder } from '../query/QueryBuilder';

export type RelationshipType = 'hasOne' | 'hasMany' | 'belongsTo';

export interface RelationshipConfig {
  model: new () => Model;
  foreignKey?: string;
  localKey?: string;
  foreignKeyOn?: string; // For belongsTo, the foreign key on the related model
}

export interface RelationshipDefinition {
  type: RelationshipType;
  config: RelationshipConfig;
  name: string;
}

/**
 * Base class for relationships
 */
export abstract class Relationship {
  protected owner: Model;
  protected relatedModel: new () => Model;
  protected foreignKey?: string;
  protected localKey?: string;

  constructor(owner: Model, relatedModel: new () => Model, foreignKey?: string, localKey?: string) {
    this.owner = owner;
    this.relatedModel = relatedModel;
    this.foreignKey = foreignKey;
    this.localKey = localKey;
  }

  abstract getQuery(): QueryBuilder;
  abstract load(): Promise<Model | Model[] | null>;
}

