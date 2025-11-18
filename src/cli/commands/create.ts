import * as fs from 'fs';
import * as path from 'path';

export async function createCommand(name: string, options: { directory: string }): Promise<void> {
  try {
    const migrationsDir = path.resolve(process.cwd(), options.directory);
    
    // Create migrations directory if it doesn't exist
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
      console.log(`Created migrations directory: ${options.directory}`);
    }

    // Generate timestamp
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0].replace('T', '_');
    const className = name
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');

    const fileName = `${timestamp}_${name}.ts`;
    const filePath = path.join(migrationsDir, fileName);

    // Generate migration template
    const template = generateMigrationTemplate(className, name);

    // Write migration file
    fs.writeFileSync(filePath, template, 'utf-8');

    console.log(`✓ Created migration: ${fileName}`);
    console.log(`  Path: ${filePath}`);
  } catch (error) {
    console.error('Error creating migration:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function generateMigrationTemplate(className: string, name: string): string {
  return `import { Migration } from 'gambitorm';

export class ${className} extends Migration {
  async up(): Promise<void> {
    // Write your migration code here
    // Example:
    // await this.schema('users')
    //   .id()
    //   .string('name')
    //   .string('email')
    //   .timestamp('created_at')
    //   .create();
  }

  async down(): Promise<void> {
    // Write your rollback code here
    // Example:
    // await this.schema('users').drop();
  }

  getName(): string {
    return '${name}';
  }
}
`;
}

