import { describe, it, expect, beforeEach } from 'vitest';
import { syncStateManager } from '../src/core/sync/sync-state';

describe('SyncStateManager', () => {
  beforeEach(() => {
    (syncStateManager as any).cache.clear();
    syncStateManager.load();
  });

  it('creates default checkpoint for new account', () => {
    const cp = syncStateManager.get('acc-new');
    expect(cp).toBeUndefined();
  });

  it('marks syncing and persists', () => {
    syncStateManager.markSyncing('acc-1');
    const cp = syncStateManager.get('acc-1');
    expect(cp?.status).toBe('syncing');
  });

  it('marks idle with progress', () => {
    syncStateManager.markIdle('acc-2', 150, 150);
    const cp = syncStateManager.get('acc-2');
    expect(cp?.status).toBe('idle');
    expect(cp?.lastUid).toBe(150);
    expect(cp?.totalFetched).toBe(150);
  });

  it('marks interrupted', () => {
    syncStateManager.markSyncing('acc-3');
    syncStateManager.markInterrupted('acc-3');
    expect(syncStateManager.get('acc-3')?.status).toBe('interrupted');
  });

  it('marks error with message', () => {
    syncStateManager.markError('acc-4', 'Network timeout');
    expect(syncStateManager.get('acc-4')?.status).toBe('error');
    expect(syncStateManager.get('acc-4')?.errorMessage).toBe('Network timeout');
  });

  it('lists all checkpoints', () => {
    syncStateManager.markIdle('acc-a', 10, 10);
    syncStateManager.markSyncing('acc-b');
    expect(syncStateManager.allCheckpoints().length).toBeGreaterThanOrEqual(2);
  });
});
