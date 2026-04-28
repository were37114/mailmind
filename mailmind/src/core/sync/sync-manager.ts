import { invoke } from '@tauri-apps/api/core';
import type { Email } from '../../types';

export interface SyncAccount {
  id: string;
  email: string;
  provider: 'imap' | 'pop3' | 'ews';
  server: string;
  port: number;
  useTls: boolean;
  username: string;
  password: string; // 加密存储
}

export interface SyncState {
  accountId: string;
  lastSyncAt: Date | null;
  lastUid: number;
  totalEmails: number;
  status: 'idle' | 'syncing' | 'error';
  errorMessage: string | null;
  progress: number; // 0-100
}

export interface SyncProgress {
  accountId: string;
  downloaded: number;
  total: number;
  currentEmail?: string;
}

class SyncManager {
  private accounts: Map<string, SyncAccount> = new Map();
  private states: Map<string, SyncState> = new Map();

  addAccount(account: SyncAccount): void {
    this.accounts.set(account.id, account);
    this.states.set(account.id, {
      accountId: account.id,
      lastSyncAt: null,
      lastUid: 0,
      totalEmails: 0,
      status: 'idle',
      errorMessage: null,
      progress: 0,
    });
  }

  removeAccount(accountId: string): void {
    this.accounts.delete(accountId);
    this.states.delete(accountId);
  }

  getState(accountId: string): SyncState | undefined {
    return this.states.get(accountId);
  }

  async syncAccount(accountId: string): Promise<void> {
    const account = this.accounts.get(accountId);
    if (!account) throw new Error(`Account ${accountId} not found`);

    const state = this.states.get(accountId)!;
    state.status = 'syncing';
    state.progress = 0;

    try {
      // Call Rust layer for actual IMAP sync
      const emails: Email[] = await invoke('sync_emails', {
        server: account.server,
        username: account.username,
        password: account.password,
        lastUid: state.lastUid,
      });

      state.lastSyncAt = new Date();
      state.totalEmails += emails.length;
      state.status = 'idle';
      state.progress = 100;

      // Trigger classification for new emails
      for (const email of emails) {
        // TODO: U10 - trigger classification
        console.log('New email:', email.subject);
      }
    } catch (error) {
      state.status = 'error';
      state.errorMessage = error instanceof Error ? error.message : String(error);
      state.progress = 0;
      throw error;
    }
  }

  async syncAll(): Promise<void> {
    for (const accountId of this.accounts.keys()) {
      await this.syncAccount(accountId);
    }
  }
}

export const syncManager = new SyncManager();
