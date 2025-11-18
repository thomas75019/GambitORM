/**
 * Global test setup and teardown
 */

import { Model } from '../src/orm/Model';
import { Connection } from '../src/connection/Connection';

// Clean up after all tests
afterAll(async () => {
  // Clear any model connections by setting a dummy connection
  // This helps prevent connection leaks between test suites
  const dummyConnection = {
    connect: async () => {},
    disconnect: async () => {},
    isConnected: () => false,
    query: async () => ({ rows: [], rowCount: 0 }),
    getAdapter: () => null,
    getDialect: () => 'mysql',
  } as any;
  
  Model.setConnection(dummyConnection);
  
  // Give Jest time to clean up any remaining handles
  await new Promise(resolve => setTimeout(resolve, 100));
});

