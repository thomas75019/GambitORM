import { UniqueValidator } from '../../../src/validation/validators/UniqueValidator';
import { Model } from '../../../src/orm/Model';
import { Connection } from '../../../src/connection/Connection';
import { MockAdapter } from '../../__mocks__/BaseAdapter';

jest.mock('../../../src/connection/Connection');

describe('UniqueValidator', () => {
  let mockConnection: jest.Mocked<Connection>;
  let mockAdapter: MockAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockAdapter = new MockAdapter();
    mockConnection = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(true),
      query: jest.fn().mockImplementation((sql, params) => mockAdapter.query(sql, params)),
      getAdapter: jest.fn(),
      getDialect: jest.fn().mockReturnValue('mysql'),
    } as any;

    (Connection as jest.Mock).mockImplementation(() => mockConnection);
    Model.setConnection(mockConnection);
  });

  it('should pass when value is null', async () => {
    const validator = new UniqueValidator('users', 'email');
    const result = await validator.validate(null, 'email', {});
    expect(result.valid).toBe(true);
  });

  it('should pass when value is unique', async () => {
    mockAdapter.setQueryResult({ rows: [], rowCount: 0 });
    
    const validator = new UniqueValidator('users', 'email');
    const result = await validator.validate('new@example.com', 'email', {});
    expect(result.valid).toBe(true);
  });

  it('should fail when value is not unique', async () => {
    mockAdapter.setQueryResult({ rows: [{ id: 1, email: 'existing@example.com' }], rowCount: 1 });
    
    const validator = new UniqueValidator('users', 'email');
    const result = await validator.validate('existing@example.com', 'email', {});
    expect(result.valid).toBe(false);
    expect(result.message).toContain('unique');
  });

  it('should ignore current record when updating', async () => {
    mockAdapter.setQueryResult({ rows: [], rowCount: 0 });
    
    const validator = new UniqueValidator('users', 'email', { ignoreId: 1 });
    const model = { id: 1, email: 'test@example.com' };
    const result = await validator.validate('test@example.com', 'email', model);
    expect(result.valid).toBe(true);
  });

  it('should auto-detect ID from model when updating', async () => {
    mockAdapter.setQueryResult({ rows: [], rowCount: 0 });
    
    const validator = new UniqueValidator('users', 'email');
    const model = { id: 1, email: 'test@example.com' };
    const result = await validator.validate('test@example.com', 'email', model);
    expect(result.valid).toBe(true);
  });

  it('should handle additional WHERE conditions', async () => {
    mockAdapter.setQueryResult({ rows: [], rowCount: 0 });
    
    const validator = new UniqueValidator('users', 'email', {
      where: { status: 'active' },
    });
    const result = await validator.validate('test@example.com', 'email', {});
    expect(result.valid).toBe(true);
  });

  it('should fail when connection is not available', async () => {
    Model.setConnection(null as any);
    
    const validator = new UniqueValidator('users', 'email');
    const result = await validator.validate('test@example.com', 'email', {});
    expect(result.valid).toBe(false);
    expect(result.message).toContain('connection');
  });
});

