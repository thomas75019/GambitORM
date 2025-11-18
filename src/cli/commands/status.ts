import { GambitORM } from '../../orm/GambitORM';
import { loadMigrations } from '../utils/loadMigrations';
import { loadConfig } from '../utils/configLoader';

export async function statusCommand(options: { config: string }): Promise<void> {
  try {
    console.log('Migration Status\n');

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

    // Get status
    const status = await orm.migrationStatus(migrations);
    const executed = status.filter(s => s.executed);
    const pending = status.filter(s => !s.executed);

    console.log(`Total migrations: ${status.length}`);
    console.log(`  - Executed: ${executed.length}`);
    console.log(`  - Pending: ${pending.length}\n`);

    if (status.length > 0) {
      console.log('Migration Status:');
      console.log('─'.repeat(60));
      
      status.forEach(m => {
        const statusIcon = m.executed ? '✓' : '○';
        const batchInfo = m.executed ? ` (batch ${m.batch})` : '';
        console.log(`${statusIcon} ${m.name}${batchInfo}`);
      });
    }

    await orm.disconnect();
  } catch (error) {
    console.error('Error checking migration status:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

