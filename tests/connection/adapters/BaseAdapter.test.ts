import { DatabaseAdapter } from '../../../src/connection/adapters/BaseAdapter';
import { DatabaseConfig } from '../../../src/types';

describe('DatabaseAdapter', () => {
  class TestAdapter extends DatabaseAdapter {
    async connect(): Promise<void> {
      this.connected = true;
    }

    async disconnect(): Promise<void> {
      this.connected = false;
    }

    async query(): Promise<any> {
      return { rows: [] };
    }
  }

  const config: DatabaseConfig = {
    database: 'testdb',
    dialect: 'mysql',
  };

  describe('isConnected', () => {
    it('should return false initially', () => {
      const adapter = new TestAdapter(config);
      expect(adapter.isConnected()).toBe(false);
    });

    it('should return true after connect', async () => {
      const adapter = new TestAdapter(config);
      await adapter.connect();
      expect(adapter.isConnected()).toBe(true);
    });

    it('should return false after disconnect', async () => {
      const adapter = new TestAdapter(config);
      await adapter.connect();
      await adapter.disconnect();
      expect(adapter.isConnected()).toBe(false);
    });
  });
});

