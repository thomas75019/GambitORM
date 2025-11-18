import { GambitORM } from '../../src/orm/GambitORM';
import { DatabaseConfig } from '../../src/types';
import { Connection } from '../../src/connection/Connection';

// Mock the Connection class
jest.mock('../../src/connection/Connection');

describe('GambitORM', () => {
  const config: DatabaseConfig = {
    host: 'localhost',
    port: 3306,
    database: 'testdb',
    user: 'testuser',
    password: 'testpass',
    dialect: 'mysql',
  };

  let mockConnection: jest.Mocked<Connection>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConnection = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(false),
      query: jest.fn(),
      getAdapter: jest.fn(),
      getDialect: jest.fn().mockReturnValue('mysql'),
    } as any;

    (Connection as jest.Mock).mockImplementation(() => mockConnection);
  });

  describe('Constructor', () => {
    it('should create a Connection with the provided config', () => {
      new GambitORM(config);

      expect(Connection).toHaveBeenCalledWith(config);
    });
  });

  describe('connect', () => {
    it('should connect to the database', async () => {
      const orm = new GambitORM(config);
      await orm.connect();

      expect(mockConnection.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('disconnect', () => {
    it('should disconnect from the database', async () => {
      const orm = new GambitORM(config);
      await orm.disconnect();

      expect(mockConnection.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('isConnected', () => {
    it('should return connection status', () => {
      const orm = new GambitORM(config);

      mockConnection.isConnected.mockReturnValue(true);
      expect(orm.isConnected()).toBe(true);

      mockConnection.isConnected.mockReturnValue(false);
      expect(orm.isConnected()).toBe(false);
    });
  });

  describe('getConnection', () => {
    it('should return the connection instance', () => {
      const orm = new GambitORM(config);
      const connection = orm.getConnection();

      expect(connection).toBe(mockConnection);
    });
  });
});

