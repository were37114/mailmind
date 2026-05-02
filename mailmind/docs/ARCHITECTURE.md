# MailMind Architecture

## System Overview

```
┌─────────────────────────────────────────────┐
│                  UI (React)                  │
│  Inbox │ ApprovalDashboard │ WeeklyReport │ ScenePanel
└──────────────────┬──────────────────────────┘
                   │ Tauri IPC
┌──────────────────┴──────────────────────────┐
│            Core (TypeScript)                 │
│  SyncManager │ ClassifyEngine │ ApprovalEngine │ ReportGenerator │ SceneEngine
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────┴──────────────────────────┐
│         Model Layer (Rust + TS)             │
│  llama.cpp (0.5B/7B) │ ONNX Runtime (Embedding)
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────┴──────────────────────────┐
│         Data Layer (PGLite WASM)            │
│  emails │ embeddings │ entities │ recommendations
└─────────────────────────────────────────────┘
```

## Key Design Decisions

### Tauri v2 + React
- Rust layer: System I/O, IMAP sync, llama.cpp FFI
- TypeScript layer: Business logic, UI, DB queries
- Communication: Tauri Commands (IPC) + Tauri Events (async push)

### PGLite (WASM Postgres)
- Embedded in browser, no external DB server
- pgvector for vector search (HNSW index)
- Schema with 4 tables: emails, email_embeddings, entities, recommendations

### Dual-Layer Approval
- Layer 1 (Rule Engine): Keywords + sender domain whitelist → high recall (>99%)
- Layer 2 (7B Model): Precision filter → high precision (>80%)
- Fallback: If 7B unavailable, show rule engine results with low confidence labels

### Async Model Inference
- 0.5B: Synchronous (<500ms), runs on every new email
- 7B: Async queue with progress indicator, runs on demand (approval/refinement, weekly report)
- 0.5B-only degradation mode for <8GB RAM machines

### Audit Log
- Append-only, hash-chained entries for tamper detection
- All approval operations logged with timestamp, operator, action, result

### Data Flow
```
New Email → IMAP Download (Rust) → Parse (Rust) → Store (PGLite)
  → 0.5B Classify (sync) → Update category/urgency
  → Embedding (async, ONNX) → Store vector
  → Rule Engine Check → Trigger scene cards
```

## Directory Structure

```
mailmind/
├── src/                    # TypeScript
│   ├── core/               # Business logic
│   │   ├── sync/           # sync-manager, sync-state
│   │   ├── classify/       # classify-engine
│   │   ├── approval/       # approval-service, rule-engine, audit-log
│   │   ├── weekly-report/  # report-generator
│   │   └── scene-recommend/# scene-engine, scene-rules
│   ├── db/                 # PGLite + repositories
│   ├── models/             # ONNX embedder, prompts
│   ├── components/         # React UI components
│   ├── pages/              # React pages
│   ├── layouts/            # MainLayout
│   └── types/              # Shared types
├── src-tauri/              # Rust
│   └── src/
│       ├── sync/           # IMAP + parser
│       ├── llama/          # classifier + analyzer
│       └── commands/       # Tauri IPC commands
├── tests/                  # Vitest test suites
└── docs/                   # Documentation
```
