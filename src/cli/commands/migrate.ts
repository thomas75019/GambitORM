import { GambitORM } from '../../orm/GambitORM';
import { loadMigrations } from '../utils/loadMigrations';
import { loadConfig } from '../utils/configLoader';

export async function migrateCommand(options: { config: string }): Promise<void> {
  try {
    console.log('Running migrations...\n');

    // Load database config
    const config = loadConfig(options.config);
    if (!config) {
      console.error('Error: Database configuration not found.');
      console.error(`Please create a ${options.config} file or use --config option.`);
      process.exit(1);
    }

    // Initialize ORM
    const orm = new GambitORM(config);
    await orm.connect();

    // Load migrations
    const migrations = await loadMigrations();
    if (migrations.length === 0) {
      console.log('No migrations found.');
      await orm.disconnect();
      return;
    }

    // Run migrations
    await orm.migrate(migrations);

    // Get status
    const status = await orm.migrationStatus(migrations);
    const pending = status.filter(s => !s.executed);
    const executed = status.filter(s => s.executed);

    console.log(`\n✓ Migrations completed:`);
    console.log(`  - Executed: ${executed.length}`);
    console.log(`  - Pending: ${pending.length}`);

    if (executed.length > 0) {
      console.log(`\nExecuted migrations:`);
      executed.forEach(m => {
        console.log(`  ✓ ${m.name} (batch ${m.batch})`);
      });
    }

    await orm.disconnect();
  } catch (error) {
    console.error('Error running migrations:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

