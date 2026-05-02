# MailMind API Documentation

## Tauri Commands (Rust → TypeScript IPC)

### Email Sync Commands

#### `sync_connect`
Connect to an IMAP server and authenticate.

```typescript
import { invoke } from '@tauri-apps/api/core';

await invoke('sync_connect', {
  accountId: 'user@example.com',
  server: 'imap.example.com',
  port: 993,
  username: 'user@example.com',
  password: '***',
  useTls: true,
});
```

#### `sync_fetch_emails`
Fetch emails from the connected IMAP account.

```typescript
const emails = await invoke('ParsedEmail[]', 'sync_fetch_emails', {
  accountId: 'user@example.com',
  startUid: 0,  // 0 for full sync, last UID for incremental
  limit: 100,
});
```

Returns: `ParsedEmail[]` with fields: `message_id`, `subject`, `from`, `to`, `cc`, `body_text`, `date`, `has_attachment`.

### Model Commands

#### `classify_email`
Classify a single email using the 0.5B model.

```typescript
const result = await invoke<{ category: number; urgency: number; confidence: number }>(
  'classify_email',
  { subject: '...', bodyText: '...' }
);
```

#### `analyze_approval`
Analyze whether an email requires approval (7B model).

```typescript
const result = await invoke<{
  isApproval: boolean;
  confidence: number;
  amount?: string;
  deadline?: string;
}>('analyze_approval', { subject: '...', bodyText: '...' });
```

#### `generate_weekly_report`
Generate a weekly report from email summaries (7B model).

```typescript
const report = await invoke<string>('generate_weekly_report', {
  emailSummaries: '...',
  weekRange: '4月14日 - 4月18日',
});
```

## TypeScript Core APIs

### SyncStateManager

```typescript
import { syncStateManager } from './core/sync/sync-state';

// Mark account as syncing
syncStateManager.markSyncing('account-id');

// Mark idle with progress
syncStateManager.markIdle('account-id', lastUid, totalFetched);

// Mark interrupted (for resume-after-restart)
syncStateManager.markInterrupted('account-id');

// Get checkpoint
const cp = syncStateManager.get('account-id');
```

### ApprovalRuleEngine

```typescript
import { approvalRuleEngine } from './core/approval/rule-engine';

// Recall approval candidates (Layer 1, high recall)
const matches = approvalRuleEngine.recall(emails);
// Returns: RuleMatch[] with email, matchedKeywords, matchedSenderDomain, score
```

### AuditLog

```typescript
import { auditLog } from './core/approval/audit-log';

// Append action
auditLog.append(emailId, 'approved', 'operator', 'result');

// Get entries
const entries = auditLog.getEntries(emailId);

// Verify chain integrity
const isValid = auditLog.verifyChain();
```

### ReportGenerator

```typescript
import { reportGenerator } from './core/weekly-report/report-generator';

const report = reportGenerator.generateReport(emails, startDate, endDate);
const markdown = reportGenerator.exportToMarkdown(report);
```

### SceneRecommendEngine

```typescript
import { sceneEngine } from './core/scene-recommend/scene-engine';

const cards = await sceneEngine.generateRecommendations('user-id');
await sceneEngine.recordFeedback(cardId, 'user-id', isHelpful);
```
