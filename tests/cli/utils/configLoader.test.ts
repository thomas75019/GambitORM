import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, createDefaultConfig } from '../../../src/cli/utils/configLoader';

describe('configLoader', () => {
  const testConfigPath = path.join(__dirname, '../../temp-config.json');

  beforeEach(() => {
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
  });

  afterEach(() => {
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
  });

  describe('loadConfig', () => {
    it('should load valid config file', () => {
      const config = {
        host: 'localhost',
        port: 3306,
        database: 'testdb',
        user: 'testuser',
        password: 'testpass',
        dialect: 'mysql',
      };

      fs.writeFileSync(testConfigPath, JSON.stringify(config), 'utf-8');
      const originalCwd = process.cwd();
      try {
        process.chdir(__dirname);
        const loaded = loadConfig('../../temp-config.json');
        expect(loaded).toEqual(config);
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should return null if config file does not exist', () => {
      const originalCwd = process.cwd();
      try {
        process.chdir(__dirname);
        const loaded = loadConfig('../../non-existent-config.json');
        expect(loaded).toBeNull();
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should throw error for invalid JSON', () => {
      fs.writeFileSync(testConfigPath, 'invalid json', 'utf-8');
      const originalCwd = process.cwd();
      try {
        process.chdir(__dirname);
        expect(() => loadConfig('../../temp-config.json')).toThrow();
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('createDefaultConfig', () => {
    it('should create default config file', () => {
      const originalCwd = process.cwd();
      try {
        process.chdir(__dirname);
        createDefaultConfig('../../temp-config.json');
        
        expect(fs.existsSync(testConfigPath)).toBe(true);
        const content = JSON.parse(fs.readFileSync(testConfigPath, 'utf-8'));
        expect(content).toHaveProperty('database');
        expect(content).toHaveProperty('dialect');
      } finally {
        process.chdir(originalCwd);
      }
    });
  });
});

