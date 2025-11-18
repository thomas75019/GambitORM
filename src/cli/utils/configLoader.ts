import * as fs from 'fs';
import * as path from 'path';
import { DatabaseConfig } from '../../types';

/**
 * Load database configuration from a file
 */
export function loadConfig(configPath: string): DatabaseConfig | null {
  try {
    const fullPath = path.resolve(process.cwd(), configPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const config = JSON.parse(content);
      
      // Validate required fields
      if (!config.database) {
        throw new Error('Database name is required in config');
      }
      
      return config as DatabaseConfig;
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in config file: ${error.message}`);
    }
    throw error;
  }
  return null;
}

/**
 * Create a default config file template
 */
export function createDefaultConfig(configPath: string): void {
  const template = {
    host: 'localhost',
    port: 3306,
    database: 'mydb',
    user: 'root',
    password: '',
    dialect: 'mysql',
  };

  const fullPath = path.resolve(process.cwd(), configPath);
  fs.writeFileSync(fullPath, JSON.stringify(template, null, 2), 'utf-8');
  console.log(`Created default config file: ${configPath}`);
}

