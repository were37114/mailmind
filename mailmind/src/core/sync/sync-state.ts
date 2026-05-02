/**
 * Sync state persistence for resume-after-interruption (断点续传)
 */

export interface SyncCheckpoint {
  accountId: string;
  lastUid: number;
  lastSyncTime: Date;
  totalFetched: number;
  phase: 'full' | 'incremental';
  status: 'idle' | 'syncing' | 'interrupted' | 'error';
  errorMessage?: string;
}

const STORAGE_KEY = 'mailmind_sync_state';

function getStorage(): Storage | null {
  try { return localStorage; } catch { return null; }
}

class SyncStateManager {
  private cache: Map<string, SyncCheckpoint> = new Map();

  load(): void {
    try {
      const storage = getStorage();
      const raw = storage?.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as Record<string, SyncCheckpoint>;
        for (const [k, v] of Object.entries(data)) {
          v.lastSyncTime = new Date(v.lastSyncTime);
          this.cache.set(k, v);
        }
      }
    } catch {
      this.cache.clear();
    }
  }

  get(accountId: string): SyncCheckpoint | undefined {
    return this.cache.get(accountId);
  }

  set(accountId: string, checkpoint: Partial<SyncCheckpoint>): void {
    const existing = this.cache.get(accountId) ?? {
      accountId,
      lastUid: 0,
      lastSyncTime: new Date(0),
      totalFetched: 0,
      phase: 'full' as const,
      status: 'idle' as const,
    };
    this.cache.set(accountId, { ...existing, ...checkpoint, accountId });
    this.persist();
  }

  markSyncing(accountId: string): void {
    this.set(accountId, { status: 'syncing' });
  }

  markIdle(accountId: string, lastUid: number, totalFetched: number): void {
    this.set(accountId, {
      status: 'idle',
      lastUid,
      totalFetched,
      lastSyncTime: new Date(),
    });
  }

  markInterrupted(accountId: string): void {
    this.set(accountId, { status: 'interrupted' });
  }

  markError(accountId: string, message: string): void {
    this.set(accountId, { status: 'error', errorMessage: message });
  }

  allCheckpoints(): SyncCheckpoint[] {
    return Array.from(this.cache.values());
  }

  private persist(): void {
    const storage = getStorage();
    if (!storage) return;
    const obj: Record<string, SyncCheckpoint> = {};
    for (const [k, v] of this.cache.entries()) {
      obj[k] = v;
    }
    storage.setItem(STORAGE_KEY, JSON.stringify(obj));
  }
}

export const syncStateManager = new SyncStateManager();
