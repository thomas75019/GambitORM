import { GambitORM } from '../../orm/GambitORM';
import { loadMigrations } from '../utils/loadMigrations';
import { loadConfig } from '../utils/configLoader';

export async function rollbackCommand(options: { config: string; all?: boolean }): Promise<void> {
  try {
    console.log(options.all ? 'Rolling back all migrations...\n' : 'Rolling back last migration batch...\n');

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

    // Rollback migrations
    if (options.all) {
      await orm.rollbackAll(migrations);
      console.log('✓ All migrations rolled back.');
    } else {
      await orm.rollback(migrations);
      console.log('✓ Last migration batch rolled back.');
    }

    // Get status
    const status = await orm.migrationStatus(migrations);
    const executed = status.filter(s => s.executed);

    if (executed.length > 0) {
      console.log(`\nRemaining migrations:`);
      executed.forEach(m => {
        console.log(`  ✓ ${m.name} (batch ${m.batch})`);
      });
    } else {
      console.log('\nNo migrations remain.');
    }

    await orm.disconnect();
  } catch (error) {
    console.error('Error rolling back migrations:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

