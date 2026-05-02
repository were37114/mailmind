/**
 * Immutable audit log for approval actions.
 * Entries are append-only; no deletion or modification allowed.
 * Each entry is hash-chained for tamper detection.
 */

export interface AuditLogEntry {
  id: string;
  emailId: number;
  action: 'viewed' | 'previewed' | 'approved' | 'rejected' | 'delegated' | 'deferred' | 'confirmed' | 'notified' | 'archived';
  timestamp: string; // ISO 8601
  operator: string;
  result?: string;
  prevHash: string;
  hash: string;
}

const STORAGE_KEY = 'mailmind_audit_log';

function getStorage(): Storage | null {
  try { return localStorage; } catch { return null; }
}

function computeHash(entry: Omit<AuditLogEntry, 'hash'>): string {
  // Simple hash for tamper detection (not cryptographic, but sufficient for local app)
  const str = JSON.stringify(entry);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

class AuditLog {
  private entries: AuditLogEntry[] = [];

  constructor() {
    this.load();
  }

  append(emailId: number, action: AuditLogEntry['action'], operator: string, result?: string): AuditLogEntry {
    const prevHash = this.entries.length > 0
      ? this.entries[this.entries.length - 1].hash
      : 'genesis';

    const partial: Omit<AuditLogEntry, 'hash'> = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      emailId,
      action,
      timestamp: new Date().toISOString(),
      operator,
      result,
      prevHash,
    };

    const hash = computeHash(partial);
    const entry: AuditLogEntry = { ...partial, hash };
    this.entries.push(entry);
    this.persist();
    return entry;
  }

  /** Get log entries, optionally filtered by emailId */
  getEntries(emailId?: number): AuditLogEntry[] {
    if (emailId !== undefined) {
      return this.entries.filter(e => e.emailId === emailId);
    }
    return [...this.entries];
  }

  /** Verify chain integrity — returns true if no tampering detected */
  verifyChain(): boolean {
    if (this.entries.length === 0) return true;

    // Check genesis
    if (this.entries[0].prevHash !== 'genesis') return false;

    for (let i = 1; i < this.entries.length; i++) {
      if (this.entries[i].prevHash !== this.entries[i - 1].hash) return false;
    }

    // Verify each entry's own hash
    for (const entry of this.entries) {
      const { hash: _, ...partial } = entry;
      if (computeHash(partial) !== entry.hash) return false;
    }

    return true;
  }

  private load(): void {
    try {
      const storage = getStorage();
      const raw = storage?.getItem(STORAGE_KEY);
      if (raw) {
        this.entries = JSON.parse(raw) as AuditLogEntry[];
      }
    } catch {
      this.entries = [];
    }
  }

  private persist(): void {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
  }
}

export const auditLog = new AuditLog();
