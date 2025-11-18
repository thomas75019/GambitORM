#!/usr/bin/env node

/**
 * GambitORM CLI Tool
 * 
 * Usage:
 *   gambit migrate              - Run pending migrations
 *   gambit migrate:rollback     - Rollback last migration batch
 *   gambit migrate:status       - Check migration status
 *   gambit migrate:create <name> - Create a new migration file
 */

import { Command } from 'commander';
import { migrateCommand } from './commands/migrate';
import { rollbackCommand } from './commands/rollback';
import { statusCommand } from './commands/status';
import { createCommand } from './commands/create';

const program = new Command();

program
  .name('gambit')
  .description('GambitORM CLI - Database migration and management tool')
  .version('0.1.0');

// Migrate command
program
  .command('migrate')
  .description('Run pending migrations')
  .option('-c, --config <path>', 'Path to database config file', '.gambitorm.json')
  .action(async (options) => {
    await migrateCommand(options);
  });

// Rollback command
program
  .command('migrate:rollback')
  .alias('migrate:down')
  .description('Rollback the last migration batch')
  .option('-c, --config <path>', 'Path to database config file', '.gambitorm.json')
  .option('--all', 'Rollback all migrations')
  .action(async (options) => {
    await rollbackCommand(options);
  });

// Status command
program
  .command('migrate:status')
  .description('Check migration status')
  .option('-c, --config <path>', 'Path to database config file', '.gambitorm.json')
  .action(async (options) => {
    await statusCommand(options);
  });

// Create command
program
  .command('migrate:create')
  .description('Create a new migration file')
  .argument('<name>', 'Migration name')
  .option('-d, --directory <path>', 'Migrations directory', 'migrations')
  .action(async (name, options) => {
    await createCommand(name, options);
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

