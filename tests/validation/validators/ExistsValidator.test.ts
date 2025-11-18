import { ExistsValidator } from '../../../src/validation/validators/ExistsValidator';
import { Model } from '../../../src/orm/Model';
import { Connection } from '../../../src/connection/Connection';
import { MockAdapter } from '../../__mocks__/BaseAdapter';

jest.mock('../../../src/connection/Connection');

describe('ExistsValidator', () => {
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
    const validator = new ExistsValidator('roles', 'id');
    const result = await validator.validate(null, 'role_id', {});
    expect(result.valid).toBe(true);
  });

  it('should pass when value exists', async () => {
    mockAdapter.setQueryResult({ rows: [{ id: 1, name: 'Admin' }], rowCount: 1 });
    
    const validator = new ExistsValidator('roles', 'id');
    const result = await validator.validate(1, 'role_id', {});
    expect(result.valid).toBe(true);
  });

  it('should fail when value does not exist', async () => {
    mockAdapter.setQueryResult({ rows: [], rowCount: 0 });
    
    const validator = new ExistsValidator('roles', 'id');
    const result = await validator.validate(999, 'role_id', {});
    expect(result.valid).toBe(false);
    expect(result.message).toContain('exist');
  });

  it('should handle additional WHERE conditions', async () => {
    mockAdapter.setQueryResult({ rows: [{ id: 1 }], rowCount: 1 });
    
    const validator = new ExistsValidator('roles', 'id', {
      where: { status: 'active' },
    });
    const result = await validator.validate(1, 'role_id', {});
    expect(result.valid).toBe(true);
  });
});

