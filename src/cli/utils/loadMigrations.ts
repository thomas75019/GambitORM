import * as fs from 'fs';
import * as path from 'path';
import { Migration } from '../../migration/Migration';

/**
 * Load migration files from the migrations directory
 * Note: This assumes migrations are compiled to JS or using ts-node/register
 */
export async function loadMigrations(directory: string = 'migrations'): Promise<Array<new () => Migration>> {
  const migrationsDir = path.resolve(process.cwd(), directory);
  
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => {
      // Only load .js files (compiled) or .ts files if ts-node is available
      const ext = path.extname(file);
      return (ext === '.js' || ext === '.ts') && !file.endsWith('.d.ts');
    })
    .sort();

  const migrations: Array<new () => Migration> = [];

  for (const file of files) {
    try {
      const filePath = path.join(migrationsDir, file);
      
      // Try to require the migration file
      // For TypeScript files, ts-node/register should be used
      // For compiled JS files, this will work directly
      delete require.cache[filePath];
      const module = require(filePath);
      
      // Find the Migration class in the module
      // Check both default export and named exports
      let MigrationClass: new () => Migration | undefined;
      
      if (module.default && module.default.prototype instanceof Migration) {
        MigrationClass = module.default;
      } else {
        MigrationClass = Object.values(module).find(
          (exported: any) => 
            exported && 
            typeof exported === 'function' && 
            exported.prototype instanceof Migration
        ) as new () => Migration | undefined;
      }

      if (MigrationClass && typeof MigrationClass === 'function') {
        migrations.push(MigrationClass as new () => Migration);
      }
    } catch (error) {
      // Silently skip files that can't be loaded
      // This might happen if ts-node is not available for .ts files
      if (file.endsWith('.ts')) {
        console.warn(`Warning: Could not load TypeScript migration ${file}. Make sure ts-node is installed or compile migrations first.`);
      } else {
        console.warn(`Warning: Could not load migration ${file}:`, error instanceof Error ? error.message : String(error));
      }
    }
  }

  return migrations;
}
