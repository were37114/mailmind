---
title: "MailMind MVP — 本地AI邮件第二大脑开发计划"
type: feat
status: active
date: 2026-04-27
origin: https://www.feishu.cn/docx/INWfd849FoUQcmxegw0cZeyQnJh
depth: deep
reviewed: 2026-04-27
reviewers: gstack:ceo, gstack:eng, gstack:qa, gstack:security, gstack:design
---

# MailMind MVP 开发计划

## Overview

为 MailMind（本地AI邮件第二大脑）构建从 **Phase 0 技术验证** 到 **Phase 1 MVP** 的完整开发路径。核心目标：验证本地大模型（0.5B+7B）在邮件场景的可行性，并交付包含邮件同步、AI分类、审批汇总、周报生成、场景推荐功能的跨平台桌面客户端。

**技术栈**: Tauri (Rust+Web) + TypeScript + PGLite (WASM) + pgvector + llama.cpp + ONNX Runtime  
**预算**: ¥221,000（5 FTE × 10 周）  
**团队**: 产品经理 + Tech Lead + 前端 + AI/后端 + 测试(0.5) + 设计师(0.5) + 增长/商务(0.5)

---

## Problem Frame

企业中高层管理者每天处理50-200封邮件，但：
- 审批邮件容易遗漏，导致业务阻塞
- 周报需要手工回忆整理，耗时且不准确
- 重要讨论邮件遗忘回复，影响协作
- 报价/合同邮件散落各处，难以追踪

现有解决方案（Outlook规则、手动整理、助理人工汇总）都是"人+工具"的折中，没有真正的智能化。MailMind 通过本地AI模型构建个人邮件知识库，主动推送可执行任务，将邮件从"信息洪流"变为"可执行洞察"。

(see origin: PRD v7.1 — https://www.feishu.cn/docx/INWfd849FoUQcmxegw0cZeyQnJh)

---

## Requirements Trace

- **R1. 邮件同步**：支持IMAP/POP3/EWS协议，全量首次下载+增量实时同步
- **R2. AI分类**：0.5B本地模型实现5类分类（审批/通知/讨论/汇报/其他）+紧急度标记
- **R3. 审批汇总**：双层识别（规则引擎召回+7B精筛），6步闭环操作，召回率>98%，精确率>80%
- **R4. 周报生成**：7B模型基于本周邮件生成确定性周报，事实准确率>95%，无"下周计划"
- **R5. 场景推荐**：3类场景卡片（审批汇总/周报生成/待办提醒），用户反馈飞轮
- **R6. 数据安全**：原始邮件不离机，本地模型推理，可选云端增强需脱敏

**Origin actors:** A1 企业高管, A2 销售经理, A3 项目经理, A4 HR/财务/行政
**Origin flows:** F1 邮件同步→分类→分析→推荐, F2 审批识别→操作闭环, F3 周报生成→导出
**Origin acceptance examples:** AE1 审批汇总（covers R3）, AE2 周报生成（covers R4）, AE3 场景推荐（covers R5）, AE4 邮件分类与检索（covers R2）

---

## Scope Boundaries

### Deferred for later (Phase 2)
- 知识库语义搜索（向量检索+结构化查询）
- 报价分析（供应商报价趋势）
- 实体关系图谱可视化
- 附件深度理解（PDF/Excel解析）
- Outlook/Gmail/Foxmail插件形态
- 企业版功能（管理后台/权限/审计）
- 云端增强通道

### Outside this product's identity
- 邮件发送/撰写辅助（非MailMind核心）
- 跨平台即时通讯集成（Slack/飞书/Teams）
- 通用知识管理（Notion/Obsidian替代）

### Deferred to Follow-Up Work
- Phase 0 验证报告 → 独立文档
- 模型微调（LoRA） → Phase 2
- 多语言支持 → Phase 2

---

## Context & Research

### Technology Stack Decisions

| 组件 | 选型 | 版本 | 理由 |
|------|------|------|------|
| 桌面框架 | Tauri | v2.x | 比Electron体积小10x，Rust核心性能更好 |
| 前端 | React + TypeScript | v18+ | 团队熟悉，生态成熟 |
| 数据库 | PGLite (WASM) | latest | 嵌入式Postgres，无需安装，支持pgvector |
| 向量索引 | pgvector | 0.7+ | Postgres生态，Hybrid Search成熟 |
| 模型推理 | llama.cpp | latest | 本地推理标准，支持GGUF量化模型 |
| Embedding | ONNX Runtime | v1.17+ | 比Python transformers快2-5x |
| 邮件解析 | mailparser | v3.x | Node.js成熟库，编码处理完善 |
| 状态管理 | Zustand | v4+ | 轻量，适合Tauri IPC架构 |

### Local Model Requirements

| 模型 | 用途 | 格式 | 大小 | 来源 |
|------|------|------|------|------|
| Qwen2.5-0.5B-Instruct | 实时分类 | GGUF Q4_K_M | ~350MB | HuggingFace |
| Qwen2.5-7B-Instruct-GPTQ-Int4 | 深度分析 | GGUF Q4_K_M | ~4.5GB | HuggingFace |
| bge-small-zh-v1.5 | 向量化 | ONNX | ~95MB | HuggingFace |

### Institutional Learnings

- V5/V6文档已基于GBrain完成Postgres Schema设计和Hybrid Search验证
- DuckDB FTS索引不自动更新，对邮件实时同步场景不适用
- 7B模型在CPU上推理延迟3-5s，必须设计异步队列+进度指示

---

## Key Technical Decisions

- **Tauri over Electron**: 安装包体积从~150MB降至~15MB，启动速度提升3x，内存占用降低50%。代价：Rust学习曲线，但核心逻辑用TypeScript仍可复用。
- **PGLite over DuckDB**: PGLite支持pgvector和完整SQL，Hybrid Search方案已在V5/V6验证。DuckDB分析性能强但FTS索引不自动更新，不适合邮件实时同步。
- **llama.cpp over vLLM/Ollama**: llama.cpp是本地推理标准，GGUF格式生态成熟，跨平台支持最好。vLLM需要GPU，Ollama封装过重。
- **异步模型推理**: 7B模型推理>3s（CPU），必须异步处理。设计后台任务队列，UI显示进度条。
- **0.5B-only降级模式**: 低配机器（<8GB RAM）自动降级为0.5B-only模式，审批仅用规则引擎。
- **模型文件完整性校验**: 所有GGUF/ONNX模型文件下载后进行SHA-256校验（与官方发布值比对），可选GPG签名验证，防止恶意模型替换。
- **SQL注入防护**: 自然语言搜索通过结构化查询 builder 生成参数化SQL，禁止任何字符串拼接SQL语句。
- **云端增强k-匿名化**: 云端增强传输的数据必须经过k-匿名化（k≥5）处理，或仅传输统计特征，不传输具体邮件内容。明确告知用户"脱敏不等于匿名"。

---

## Open Questions

### Resolved During Planning

- **Q: Tauri的Rust层和TS层如何分工？**
  - A: Rust层负责系统级操作（文件读写、网络请求、llama.cpp FFI调用），TS层负责业务逻辑和UI。模型推理通过Tauri Command调用Rust层。
- **Q: PGLite的WASM性能是否足够？**
  - A: PGLite在10万行数据下查询<100ms，足够MVP阶段。如性能不足可后期切换为原生Postgres。
- **Q: 模型首次下载体验？**
  - A: 分阶段下载。安装包仅包含0.5B模型（350MB），7B模型（4.5GB）在首次启动时后台下载，显示进度条。
- **Q: 如何防止恶意模型文件？**
  - A: 模型文件SHA-256校验（与官方发布值比对）+ 可选GPG签名验证 + 沙箱化推理（限制网络访问）。
- **Q: 自然语言搜索的SQL注入风险？**
  - A: 使用结构化查询builder生成参数化SQL，禁止字符串拼接。所有用户输入经过严格类型校验。
- **Q: 云端增强的合规性？**
  - A: 传输数据经过k-匿名化（k≥5）或仅传统计特征，不传输具体邮件内容。用户协议中明确告知"脱敏不等于匿名"。

### Deferred to Implementation

- **Q: 具体的中文邮件编码问题（GBK/GB2312/Big5）**
  - A: mailparser库声称支持，但需实测。如发现问题，可在实现时替换为更底层的编码处理方案。
- **Q: 具体的Tauri + React状态同步模式**
  - A: 依赖实现时的Tauri v2 IPC最佳实践，计划使用Zustand + Tauri Event进行跨层状态同步。
- **Q: 7B模型的具体Prompt工程**
  - A: 依赖Phase 0验证时的实测数据，Prompt模板在实现时根据验证结果调整。

---

## Output Structure

```
mailmind/
├── src/                          # TypeScript业务逻辑+前端
│   ├── core/                     # 核心业务逻辑
│   │   ├── sync/                 # 邮件同步引擎
│   │   ├── classify/             # 0.5B分类引擎
│   │   ├── approval/             # 审批汇总（双层识别+闭环）
│   │   ├── weekly-report/        # 周报生成器
│   │   ├── scene-recommend/      # 场景推荐引擎
│   │   └── search/               # 搜索接口（MVP简化版）
│   ├── models/                   # 模型调度层
│   │   ├── llama-scheduler.ts    # llama.cpp调度器
│   │   ├── onnx-embedder.ts      # ONNX Embedding推理
│   │   └── model-manager.ts      # 模型生命周期管理
│   ├── db/                       # 数据层
│   │   ├── schema.ts             # PGLite Schema定义
│   │   ├── migrations/           # 数据库迁移
│   │   └── queries/              # SQL查询封装
│   ├── types/                    # 共享类型定义
│   └── utils/                    # 工具函数
├── src-tauri/                    # Rust层（Tauri）
│   ├── src/
│   │   ├── main.rs               # 入口
│   │   ├── commands/             # Tauri Commands（IPC）
│   │   ├── llama/                # llama.cpp FFI封装
│   │   ├── sync/                 # 邮件同步（IMAP/POP3/EWS）
│   │   └── fs/                   # 文件系统操作
│   └── Cargo.toml
├── src-ui/                       # React前端
│   ├── src/
│   │   ├── components/           # UI组件
│   │   ├── pages/                # 页面
│   │   ├── hooks/                # React Hooks
│   │   └── stores/               # Zustand状态管理
│   └── package.json
├── models/                       # 本地模型文件（.gitignore）
│   ├── qwen2.5-0.5b.gguf
│   ├── qwen2.5-7b-q4.gguf
│   └── bge-small-zh-v1.5.onnx
├── tests/                        # 测试数据+测试脚本
│   ├── fixtures/                 # 脱敏邮件样本
│   └── e2e/                      # E2E测试
└── docs/                         # 项目文档
    ├── PRD.md
    └── api/                      # API文档
```

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

### 数据流架构

```
┌─────────────────────────────────────────────────────────────┐
│                        UI层 (React)                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│  │ 收件箱   │ │审批面板 │ │ 周报页  │ │推荐卡片 │         │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘         │
└───────┼──────────┼──────────┼──────────┼────────────────┘
        │          │          │          │
        └──────────┴────┬─────┴──────────┘
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Core层 (TypeScript)                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │
│  │ 同步引擎     │ │ 分类引擎     │ │ 场景推荐引擎         │  │
│  │ (IMAP/EWS)  │ │ (0.5B模型)  │ │ (规则+7B推理)       │  │
│  └──────┬──────┘ └──────┬──────┘ └──────────┬──────────┘  │
│         │               │                    │             │
│  ┌──────┴───────────────┴────────────────────┴──────┐     │
│  │              审批引擎 / 周报生成器                 │     │
│  │         (规则召回 + 7B精筛 + 闭环UI)              │     │
│  └───────────────────────────────────────────────────┘     │
└───────────────────────────┬─────────────────────────────────┘
                            │ Tauri IPC (Commands + Events)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   模型调度层 (Rust + TS)                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐   │
│  │ llama.cpp    │ │ llama.cpp    │ │ ONNX Runtime     │   │
│  │ 0.5B分类     │ │ 7B分析       │ │ Embedding        │   │
│  └──────────────┘ └──────────────┘ └──────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              模型管理器 (加载/卸载/队列)             │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   数据层 (PGLite WASM)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ emails   │ │entities  │ │embeddings│ │recommendations│  │
│  │ 邮件主表  │ │实体表    │ │向量索引  │ │推荐记录      │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 异步处理模型

```
新邮件到达
  ├── 同步引擎下载 → 存储原始.eml（Rust）
  ├── 解析引擎提取元数据（TS）
  ├── 0.5B分类（同步，Rust调用llama.cpp，<500ms）
  │     └── 结果 → PGLite emails表
  ├── 规则引擎匹配触发条件（TS）
  │     └── 结果 → 事件队列
  ├── Embedding向量化（异步，TS调用ONNX，后台队列）
  │     └── 结果 → PGLite email_embeddings表
  └── 7B分析（异步，Rust调用llama.cpp，后台队列）
        └── 结果 → PGLite entities表

场景推荐生成（定时/用户触发）
  ├── 读取事件队列（TS）
  ├── 匹配场景规则（TS）
  ├── 7B生成推荐文案（异步，Rust）
  └── 推送推荐卡片 → UI
```

---

## Implementation Units

### Phase 0: 技术验证（4周）

---

- U1. **项目脚手架搭建**

**Goal:** 创建Tauri+React项目骨架，配置开发环境，建立CI基础

**Requirements:** R1（基础设施）

**Dependencies:** None

**Files:**
- Create: `mailmind/Cargo.toml`, `mailmind/package.json`, `mailmind/src-tauri/src/main.rs`
- Create: `mailmind/src-ui/src/App.tsx`, `mailmind/src-ui/index.html`
- Create: `.github/workflows/ci.yml`

**Approach:**
- 使用 `npm create tauri-app@latest` 创建项目模板
- 配置TypeScript严格模式 + ESLint + Prettier
- 配置Tauri v2的权限和能力（Capabilities）
- 设置GitHub Actions：build + lint + test

**Execution note:** Start with a failing integration test for the Tauri Command IPC contract — verify frontend can call a Rust echo command before any real logic is added.

**Patterns to follow:**
- Tauri v2官方最佳实践（https://v2.tauri.app/）

**Test scenarios:**
- **Happy path:** `cargo tauri dev` 成功启动开发服务器
- **Happy path:** `cargo tauri build` 成功打包（Win/Mac/Linux）
- **Integration:** 前端通过Tauri Command调用Rust层的echo函数，返回结果正确

**Verification:**
- 三平台（Linux/macOS/Windows）打包成功
- 前端与Rust IPC通信正常

---

- U2. **PGLite + pgvector 集成验证**

**Goal:** 验证PGLite在Tauri环境下的性能，确认10万邮件数据下的查询延迟

**Requirements:** R1（数据基础设施）

**Dependencies:** U1

**Files:**
- Create: `mailmind/src/db/schema.ts`
- Create: `mailmind/src/db/pglite-client.ts`
- Create: `mailmind/src/db/migrations/001_initial.sql`
- Test: `mailmind/tests/db-perf.test.ts`

**Approach:**
- 在PGLite中创建emails + email_embeddings表
- 加载pgvector扩展，创建HNSW索引
- 生成10万条模拟邮件数据（使用faker.js）
- 测试：全文搜索、向量检索、Hybrid Search（RRF融合）
- 测量：查询延迟P95、索引构建时间、内存占用

**Execution note:** Implement performance benchmarks test-first — define P95 latency thresholds in tests before writing the schema.

**Test scenarios:**
- **Happy path:** PGLite在Tauri中成功初始化，pgvector扩展加载成功，向量维度768
- **Edge case:** 空表查询返回空数组，不报错
- **Performance:** 10万邮件全文搜索 < 200ms P95
- **Performance:** 向量检索Top-5 < 100ms P95
- **Performance:** Hybrid Search RRF融合 < 300ms P95
- **Performance:** 索引构建时间 < 5分钟（10万条）

**Verification:**
- 性能测试报告：所有查询延迟达标
- 内存占用 < 500MB（10万邮件+向量索引）

---

- U3. **邮件解析与同步引擎骨架**

**Goal:** 实现邮件协议连接、下载、解析的基础能力

**Requirements:** R1（邮件同步）

**Dependencies:** U1, U2

**Files:**
- Create: `mailmind/src-tauri/src/sync/imap.rs`
- Create: `mailmind/src-tauri/src/sync/parser.rs`
- Create: `mailmind/src/core/sync/email-sync.ts`
- Test: `mailmind/tests/sync-parse.test.ts`

**Approach:**
- Rust层使用 `imap` crate 实现IMAP协议连接和下载
- 使用 `mailparse` crate 解析.eml文件提取元数据
- TS层封装同步逻辑：全量首次下载 + UID-based增量同步
- 处理编码问题：UTF-8 / GBK / GB2312 / Big5

**Test scenarios:**
- **Happy path:** 成功连接测试IMAP服务器（Gmail/O365），下载10封邮件并正确解析元数据
- **Happy path:** 增量同步只下载新邮件，不重复不遗漏
- **Edge case:** 邮件主题为空字符串 → 解析不崩溃
- **Edge case:** 邮件正文为纯HTML → 正确提取textContent
- **Edge case:** 多语言编码邮件（GBK/GB2312/Big5/UTF-8）→ 解析正确
- **Error path:** IMAP连接失败 → 重试3次 → 报错并提示用户
- **Error path:** 邮件编码无法识别 → 尝试UTF-8降级 → 不崩溃

**Verification:**
- 成功连接2个以上测试邮箱
- 100封邮件解析无错误
- 增量同步准确（不重复、不遗漏）

---

- U4. **0.5B分类模型验证**

**Goal:** 验证Qwen2.5-0.5B在本地CPU上的分类准确率和延迟

**Requirements:** R2（AI分类）

**Dependencies:** U1

**Files:**
- Create: `mailmind/src-tauri/src/llama/classifier.rs`
- Create: `mailmind/src/models/prompts/classify.txt`
- Create: `mailmind/tests/classify-eval.test.ts`
- Create: `mailmind/tests/fixtures/labeled-emails.json`

**Approach:**
- Rust层集成llama.cpp，加载Qwen2.5-0.5B-GGUF
- 设计5类分类Prompt（审批/通知/讨论/汇报/其他）
- 准备200封人工标注的测试邮件（各40封）
- 运行分类，计算准确率、召回率、F1、延迟

**Execution note:** Characterization-first — collect 200 labeled emails before writing classifier code, then verify the model can reproduce human labels.

**Test scenarios:**
- **Happy path:** 单封邮件分类 < 500ms（CPU）
- **Happy path:** 200封测试邮件整体准确率 > 85%
- **Happy path:** 审批类召回率 > 90%
- **Edge case:** 50封错误案例集测试（"通知"误分类为"审批"等边界案例）→ 错误率 < 15%
- **Edge case:** 极短邮件（<10字）→ 返回"其他"
- **Edge case:** 混合类型邮件（审批+讨论）→ 返回主类型
- **Edge case:** 多语言编码邮件（GBK/GB2312/Big5/UTF-8）→ 解析正确
- **Performance:** 连续分类100封，内存不泄漏
- **Performance:** 1000封批量分类吞吐量测试 → 平均延迟 < 500ms/封

**Verification:**
- 分类准确率 ≥ 85%
- 单封延迟 < 500ms P95
- 内存占用稳定
- 错误案例集通过率 ≥ 85%

---

- U5. **7B模型验证（审批精筛 + 周报生成）**

**Goal:** 验证Qwen2.5-7B在本地CPU上的推理质量，这是项目最大技术风险点

**Requirements:** R3（审批汇总）, R4（周报生成）

**Dependencies:** U1, U3, U4

**Files:**
- Create: `mailmind/src-tauri/src/llama/analyzer.rs`
- Create: `mailmind/src/models/prompts/approval-filter.txt`
- Create: `mailmind/src/models/prompts/weekly-report.txt`
- Create: `mailmind/tests/approval-eval.test.ts`
- Create: `mailmind/tests/weekly-report-eval.test.ts`

**Approach:**
- Rust层加载Qwen2.5-7B-GPTQ-Int4（4.5GB）
- 设计审批精筛Prompt：判断是否需要用户审批，提取金额/截止时间
- 设计周报生成Prompt：基于本周邮件列表生成周报，禁止预测
- 准备50封审批邮件+20份周报测试集
- 运行推理，人工评估质量

**Execution note:** Add characterization coverage before modifying this legacy parser — establish baseline quality metrics with manual evaluation before automating.

**Test scenarios（审批精筛）:**
- **Happy path:** 审批邮件识别F1 > 80%
- **Happy path:** 金额提取准确率 > 85%
- **Happy path:** 截止时间提取准确率 > 80%
- **Edge case:** 非审批邮件（如通知）→ 正确排除
- **Edge case:** 模糊的"请确认"邮件 → 标记为低置信度
- **Error path:** 模型文件被篡改 → SHA-256校验失败 → 拒绝加载并提示重新下载
- **Error path:** 模型加载失败 → 降级为0.5B-only模式
- **Performance:** 连续推理50封邮件，内存占用增长 < 10%（无泄漏）

**Test scenarios（周报生成）:**
- **Happy path:** 周报事实准确率 > 90%
- **Happy path:** 生成时间 < 30s（CPU，20封邮件）
- **Happy path:** 输出中无"下周计划"或预测性内容
- **Edge case:** 本周无邮件 → 生成空周报提示
- **Edge case:** 邮件内容混乱 → 不编造事实
- **Performance:** 长时间运行（连续生成10份周报），内存不泄漏

**Verification:**
- 审批精筛F1 ≥ 80%
- 周报事实准确率 ≥ 90%
- 推理延迟可接受（单封<5s，周报<30s）
- 模型文件校验100%通过
- 内存泄漏测试通过

---

- U6. **Embedding + 向量检索验证**

**Goal:** 验证bge-small-zh的Embedding质量和向量检索效果

**Requirements:** R1（数据基础设施）

**Dependencies:** U2, U4

**Files:**
- Create: `mailmind/src/models/onnx-embedder.ts`
- Create: `mailmind/tests/embedding-eval.test.ts`
- Test: `mailmind/tests/vector-search.test.ts`

**Approach:**
- TypeScript层使用ONNX Runtime加载bge-small-zh-v1.5
- 生成100封测试邮件的Embedding，写入PGLite
- 设计语义查询测试集（如"上周张总关于预算的邮件"）
- 计算Recall@5和MRR指标

**Test scenarios:**
- **Happy path:** 单封邮件Embedding生成 < 100ms
- **Happy path:** 中文语义搜索Recall@5 > 60%
- **Happy path:** 中英文混合查询正常返回
- **Edge case:** 超长邮件（>5000字）→ 截断后处理
- **Edge case:** 空查询 → 返回空结果，不报错
- **Edge case:** SQL注入测试（输入"; DROP TABLE emails; --"）→ 返回空结果，不执行恶意SQL
- **Performance:** 1000封邮件批量Embedding < 60s
- **Performance:** 1000封邮件批量Embedding后内存释放 → 内存回到基线

**Verification:**
- 语义搜索Recall@5 ≥ 60%
- Embedding生成速度可接受
- SQL注入测试通过
- 内存泄漏测试通过

---

- U7. **Phase 0 验证报告与决策 + 商业验证**

**Goal:** 汇总技术验证结果，完成商业验证，输出决策报告

**Requirements:** 全局

**Dependencies:** U2-U6

**Files:**
- Create: `mailmind/docs/phase0-report.md`
- Create: `mailmind/docs/phase0-decisions.md`
- Create: `mailmind/docs/user-research-report.md`

**技术验证（W1-W4）：**
- 汇总所有测试数据：性能、准确率、延迟、内存
- 针对未达标项制定缓解方案
- 确定Phase 1最终功能清单

**商业验证（W1-W2，与开发并行）：**
- **用户访谈**：20-30 名目标用户深度访谈（企业高管/销售经理/项目经理）
  - 核心问题：是否愿意为本地 AI 邮件助手付费？可接受价格区间？
  - **预付费意向问卷**：询问是否愿意预付 3 个月费用（验证真实付费意愿）
- **Figma 原型测试**：5 名用户测试场景推荐交互（主动推荐 vs 被动搜索）
  - 核心问题：用户是否接受系统主动推送任务？推荐卡片是否打扰？
- **企业接触**：联系 3-5 家目标企业，验证采购决策链长度
  - 核心问题：从接触到签约需要多少环节？决策人是谁？预算审批流程？

**Verification:**
- 技术报告覆盖所有验证项
- 用户访谈报告 ≥ 20 份有效样本
- 预付费意向率 ≥ 20%（若低于此，需重新评估定价或商业模式）
- 企业接触报告 ≥ 3 家反馈

---

### Phase 1: MVP 开发（6周）

---

- U8. **数据层完整实现**

**Goal:** 完成PGLite Schema、迁移、CRUD封装

**Requirements:** R1（数据基础设施）

**Dependencies:** U2（验证通过）

**Files:**
- Create: `mailmind/src/db/schema.ts`
- Create: `mailmind/src/db/migrations/001_initial.sql`
- Create: `mailmind/src/db/repositories/email-repo.ts`
- Create: `mailmind/src/db/repositories/entity-repo.ts`
- Create: `mailmind/src/db/repositories/recommendation-repo.ts`
- Test: `mailmind/tests/db/integration.test.ts`

**Approach:**
- 实现完整的4张表Schema（emails, email_embeddings, entities, recommendations）
- 设计Repository模式，封装所有数据库操作
- 所有查询使用参数化SQL，禁止字符串拼接，防止SQL注入
- 实现事务支持（审批操作需要原子性）
- 数据库加密密钥使用OS密钥链（Keychain/Windows Credential）存储

**Execution note:** Implement new domain behavior test-first — write failing integration tests for CRUD operations before implementing repository methods.

**Test scenarios:**
- **Happy path:** CRUD所有表，数据一致
- **Edge case:** 重复message_id插入 → 忽略或更新（upsert）
- **Edge case:** 大批量插入（1000封）→ 使用事务批量提交
- **Security:** SQL注入测试 → 参数化查询阻止恶意输入
- **Integration:** 邮件插入后向量索引自动更新

**Verification:**
- 所有Repository方法有单元测试覆盖
- 数据库操作无内存泄漏
- SQL注入渗透测试通过

---

- U9. **邮件同步引擎 + 首次启动Onboarding**

**Goal:** 实现生产级的邮件同步（全量下载+增量同步+多账户）+ 新用户首次启动引导

**Requirements:** R1（邮件同步）

**Dependencies:** U3, U8

**Files:**
- Modify: `mailmind/src-tauri/src/sync/imap.rs`
- Create: `mailmind/src/core/sync/sync-manager.ts`
- Create: `mailmind/src/core/sync/sync-state.ts`
- Create: `mailmind/src-ui/src/components/SyncStatus.tsx`
- Create: `mailmind/src-ui/src/pages/OnboardingWizard.tsx`
- Create: `mailmind/src-ui/src/components/ModelDownloadProgress.tsx`
- Test: `mailmind/tests/sync/integration.test.ts`

**Approach:**
- 支持多账户配置（IMAP/POP3/EWS）
- 全量下载：分页下载，显示进度条
- 增量同步：基于UID/ModSeq，每5分钟自动检查
- 同步状态持久化（断点续传）
- 首次启动Onboarding：欢迎页 → 账户配置向导（自动检测IMAP服务器） → 首次同步进度（预计时间） → 模型下载进度（7B模型4.5GB后台下载）
- 空状态设计：无账户时显示"添加账户"引导；同步中显示进度+预计剩余时间

**Test scenarios:**
- **Happy path:** 首次全量下载1000封邮件，进度条更新正常
- **Happy path:** 增量同步只下载新邮件
- **Happy path:** 多账户同时同步不冲突
- **Happy path:** 新用户首次启动 → Onboarding向导 → 账户配置 → 同步进度 → 模型下载进度
- **Edge case:** 同步中断 → 重启后断点续传
- **Edge case:** 邮件被服务器删除 → 本地标记为已删除
- **Edge case:** 首次启动无网络 → 显示"离线模式"，仅使用本地功能
- **Error path:** 网络断开 → 指数退避重试
- **Error path:** 模型下载失败 → 显示"稍后重试"按钮，不影响其他功能

**Verification:**
- 1000封邮件全量下载 < 30分钟
- 增量同步准确无误
- Onboarding流程完整可走完
- 模型下载失败有友好提示

---

- U10. **0.5B分类引擎完整实现**

**Goal:** 生产级的实时分类：同步推理+结果持久化+置信度展示

**Requirements:** R2（AI分类）

**Dependencies:** U4, U8

**Files:**
- Modify: `mailmind/src-tauri/src/llama/classifier.rs`
- Create: `mailmind/src/core/classify/classify-engine.ts`
- Create: `mailmind/src-ui/src/components/CategoryBadge.tsx`
- Create: `mailmind/src-ui/src/components/UrgencyIndicator.tsx`
- Test: `mailmind/tests/classify/integration.test.ts`

**Approach:**
- 新邮件到达时自动触发0.5B分类
- 分类结果写入emails表（category + urgency + confidence）
- UI展示分类标签和紧急度指示器
- 用户可手动修正分类，反馈用于后续模型微调

**Execution note:** Start with a failing integration test for the classify→persist→display flow before implementing the engine.

**Test scenarios:**
- **Happy path:** 新邮件到达后3秒内显示分类标签
- **Happy path:** 分类结果正确持久化到数据库
- **Happy path:** 用户手动修改分类 → 更新数据库
- **Edge case:** 模型加载失败 → 降级为规则分类
- **Edge case:** 分类置信度<50% → 标记为"待确认"

**Verification:**
- 分类延迟 < 500ms P95
- 分类准确率 ≥ 85%（基于测试集）

---

- U11. **审批汇总引擎（双层识别 + 6步闭环）**

**Goal:** 实现审批邮件的识别、展示、操作闭环

**Requirements:** R3（审批汇总）

**Dependencies:** U5, U8, U10

**Files:**
- Create: `mailmind/src/core/approval/rule-engine.ts`
- Create: `mailmind/src/core/approval/approval-service.ts`
- Create: `mailmind/src/core/approval/audit-log.ts`
- Create: `mailmind/src-ui/src/pages/ApprovalDashboard.tsx`
- Create: `mailmind/src-ui/src/components/ApprovalCard.tsx`
- Create: `mailmind/src-ui/src/components/ApprovalActionModal.tsx`
- Test: `mailmind/tests/approval/integration.test.ts`

**Approach:**
- Layer 1（规则引擎）：关键词+发件人白名单召回候选集
- Layer 2（7B精筛）：判断是否需要用户审批，提取关键信息
- 三级置信度展示：高(>90%)/中(70-90%)/低(<70%)
- 置信度标签设计：高=绿色+盾牌图标，中=黄色+感叹号图标，低=灰色+问号图标（色盲友好）
- 6步闭环UI：查看→预览(AI摘要)→操作(通过/驳回/转交/暂缓)→确认→通知→归档
- 审计日志：所有审批操作（通过/驳回/转交/暂缓）记录时间戳+操作人+邮件ID+操作结果，不可篡改

**Test scenarios:**
- **Happy path:** 规则引擎召回率 > 99%
- **Happy path:** 7B精筛精确率 > 80%
- **Happy path:** 审批卡片按紧急度排序
- **Happy path:** 用户点击"通过"→确认弹窗→操作完成→状态更新
- **Happy path:** 审批操作后 → 审计日志正确记录（时间戳+操作+邮件ID）
- **Edge case:** 金额>10万 → 二次确认弹窗
- **Edge case:** 审批链接失效 → 标记"链接失效"+手动入口
- **Edge case:** 色盲模式测试 → 通过图标+文字区分紧急度，不依赖颜色
- **Error path:** 7B模型不可用 → 仅展示规则引擎结果
- **Error path:** 审计日志写入失败 → 操作回滚，提示用户

**Verification:**
- 召回率 ≥ 98%，精确率 ≥ 80%
- 6步闭环完成率 ≥ 90%（定义：从查看到最终操作确认的比例）
- 审计日志完整性100%
- 色盲用户可正常识别紧急度

---

- U12. **周报生成器**

**Goal:** 基于本周邮件生成确定性周报

**Requirements:** R4（周报生成）

**Dependencies:** U5, U8, U10

**Files:**
- Create: `mailmind/src/core/weekly-report/report-generator.ts`
- Create: `mailmind/src-ui/src/pages/WeeklyReport.tsx`
- Create: `mailmind/src-ui/src/components/ReportEditor.tsx`
- Create: `mailmind/src-ui/src/components/ReportExportModal.tsx`
- Test: `mailmind/tests/weekly-report/integration.test.ts`

**Approach:**
- 检索本周邮件（周一00:00至周五16:00）
- 按项目/主题聚类
- 7B模型生成每个cluster的总结（确定性事实）
- 提取待跟进项（明确提到的待办/截止/未回复）
- 用户可编辑、导出Word/飞书/邮件

**Test scenarios:**
- **Happy path:** 基于20封邮件生成周报 < 30s
- **Happy path:** 周报事实准确率 > 90%
- **Happy path:** 输出中无"下周计划"或预测性内容
- **Happy path:** 导出Word文件格式正确
- **Edge case:** 本周无邮件 → 生成空周报提示
- **Edge case:** 邮件内容混乱 → 不编造事实
- **Error path:** 7B模型不可用 → 提示"模型加载中，请稍后"

**Verification:**
- 事实准确率 ≥ 90%
- 生成时间 < 30s
- 编辑修改率 < 30%

---

- U13. **智能场景推荐V1**

**Goal:** 实现3类场景卡片的主动推荐

**Requirements:** R5（场景推荐）

**Dependencies:** U8, U10, U11, U12

**Files:**
- Create: `mailmind/src/core/scene-recommend/scene-engine.ts`
- Create: `mailmind/src/core/scene-recommend/scene-rules.ts`
- Create: `mailmind/src-ui/src/components/SceneCard.tsx`
- Create: `mailmind/src-ui/src/components/ScenePanel.tsx`
- Test: `mailmind/tests/scene-recommend/integration.test.ts`

**Approach:**
- 3类场景规则：审批汇总（≥3封未处理）、周报生成（周五+≥2汇报）、待办提醒（3天未回复）
- 评分算法：score = 0.35*urgency + 0.30*relevance + 0.20*history + 0.15*frequency
- 反馈飞轮：👍/👎/🔄 调整history_score
- 定时扫描：每30分钟检查一次触发条件

**Test scenarios:**
- **Happy path:** 未处理审批≥3封 → 显示"您有3封待审批"卡片
- **Happy path:** 周五16:00 → 显示"生成本周周报"卡片
- **Happy path:** 用户点击👍 → 同类型推荐权重提升
- **Happy path:** 用户点击👎 → 同类型推荐权重降低
- **Edge case:** 无触发条件 → 不显示任何卡片
- **Edge case:** 多个场景同时触发 → 按score排序，最多显示3个

**Verification:**
- 场景触发准确率 > 80%
- 用户点击率 > 20%
- 有用反馈率 > 60%

---

- U14. **UI/UX 设计系统 + 状态设计 + 全链路联调**

**Goal:** 建立完整设计系统，实现加载/空/错误状态，完成端到端流程验证

**Requirements:** R1-R6（全局体验）

**Dependencies:** U8-U13

**Files:**
- Create: `mailmind/src-ui/src/styles/theme.css`
- Create: `mailmind/src-ui/src/styles/design-system.md`
- Create: `mailmind/src-ui/src/layouts/MainLayout.tsx`
- Create: `mailmind/src-ui/src/components/LoadingSkeleton.tsx`
- Create: `mailmind/src-ui/src/components/EmptyState.tsx`
- Create: `mailmind/src-ui/src/components/ErrorState.tsx`
- Create: `mailmind/src-ui/src/components/ModelLoadingIndicator.tsx`
- Modify: 所有UI组件统一视觉风格
- Create: `mailmind/tests/e2e/smoke.test.ts`

**Approach:**
- 设计系统：定义品牌色（主色/辅色/功能色）、字体（无衬线正文+等宽代码）、间距（4px基线网格）、圆角（卡片4px/按钮8px）、阴影层级
- 功能色：审批=橙色，通知=蓝色，讨论=绿色，汇报=紫色，其他=灰色；紧急=红色+火焰图标，普通=黄色，低=灰色
- 主布局：侧边栏导航 + 主内容区（参考Superhuman分栏设计）
- 暗黑/亮色模式切换
- 响应式布局（适配不同屏幕尺寸）
- 加载状态设计：骨架屏（Skeleton Screen）用于内容区域；进度条用于长时间操作（同步/模型下载）；"AI分析中..."旋转指示器用于7B推理
- 渐进式加载：先显示规则引擎结果，7B结果到达后平滑更新
- 空状态设计：每个列表/面板都有空状态（无账户/同步中/无审批/无周报/无推荐），使用插画+文案+行动按钮
- 错误状态设计：7B OOM→"性能模式已切换"提示；模型下载失败→"稍后重试"按钮；数据库损坏→"数据修复"引导；同步认证失败→"密码错误/授权失效"提示
- E2E冒烟测试：完整用户旅程

**Test scenarios:**
- **Integration:** 完整用户旅程：添加账户→同步邮件→查看分类→审批汇总→生成周报
- **Integration:** 暗黑模式切换 → 所有组件颜色正确更新
- **Integration:** 窗口resize → 布局自适应
- **Integration:** 7B推理期间 → 骨架屏显示+进度指示器
- **Integration:** 无审批邮件 → 空状态插画+"暂无待审批"文案
- **Integration:** 色盲模式 → 通过图标+文字区分，不依赖颜色
- **Error path:** 模型加载失败 → UI显示降级提示
- **Error path:** 数据库损坏 → 提示重新初始化
- **Error path:** 7B模型OOM → 显示"已切换性能模式"提示，自动降级

**Verification:**
- E2E测试通过
- 无视觉回归
- 所有功能可端到端使用
- 加载状态覆盖所有>1s的操作
- 空状态覆盖所有列表/面板
- 错误状态覆盖所有降级路径

---

## System-Wide Impact

### Interaction Graph
- 邮件同步触发分类 → 分类触发场景推荐 → 场景推荐展示UI卡片
- 审批操作修改邮件状态 → 状态变更影响场景推荐评分
- 周报生成读取邮件数据 → 不影响邮件原始状态

### Error Propagation
- 模型层错误 → Core层捕获 → UI层降级提示
- 数据库错误 → 事务回滚 → 日志记录 → 用户提示
- 同步错误 → 指数退避重试 → 最终提示用户

### State Lifecycle Risks
- 邮件同步中断 → UID状态持久化 → 断点续传
- 模型推理中断 → 任务队列重试 → 或标记为失败
- 审批操作未完成 → 保留操作草稿 → 用户可恢复

### Unchanged Invariants
- 原始邮件.eml文件只写不删（除非用户主动删除）
- 分类结果可被用户手动覆盖（以用户为准）
- 所有AI推理结果标注置信度，低置信度需用户确认

---

## Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| 7B模型在低配机器OOM | 高 | 高 | 4-bit量化+动态加载+0.5B-only降级模式 |
| 7B推理延迟>5s体验差 | 中 | 高 | 异步队列+进度条+批量处理 |
| 中文邮件编码解析错误 | 中 | 中 | mailparser兜底+自定义编码检测 |
| PGLite WASM性能不足 | 低 | 中 | 备选方案：切换为原生Postgres |
| Tauri跨平台兼容性 | 中 | 中 | CI三平台构建，早期发现问题 |
| 审批识别精确率不达标 | 中 | 高 | 规则引擎兜底+Prompt工程优化 |
| 模型首次下载体验差 | 中 | 中 | 分阶段下载+进度条+后台下载 |
| **恶意模型文件替换** | **低** | **高** | **SHA-256校验+GPG签名+沙箱化推理** |
| **SQL注入攻击** | **低** | **高** | **参数化查询+输入校验** |
| **脱敏数据合规风险** | **低** | **高** | **k-匿名化+仅传统计特征+用户告知** |
| **首次启动用户流失** | **中** | **中** | **Onboarding向导+进度预估+离线模式** |
| 用户数据隐私合规 | 低 | 高 | 本地处理+脱敏+用户授权 |
| **巨头入局（Outlook Copilot/Gmail Gemini）** | **高** | **极高** | **12-18 个月差异化窗口，优先建立领域场景壁垒** |
| **开源替代冲击** | **中** | **高** | **品牌+用户体验壁垒，审批/周报场景深度优化** |
| **邮件服务商限制 IMAP** | **中** | **高** | **Phase 1 增加 OAuth 2.0 + Gmail API 备选** |
| **获客成本低估** | **高** | **中** | **真实 CAC 可能 ¥200-300，优先拓展企业版高 LTV 客户摊薄** |

---

## Phased Delivery

### Phase 0: 技术验证（Week 1-4）
- U1-U7: 验证技术可行性，产出验证报告
- **Go/No-Go决策点**: 7B模型验证（U5）决定Phase 1是否包含7B功能

### Phase 1: MVP开发（Week 5-10）
- Week 5-6: U8-U10（数据层+同步+分类）
- Week 7-8: U11-U12（审批汇总+周报生成）
- Week 9: U13（场景推荐）
- Week 10: U14（UI打磨+联调+发布准备）

---

## Success Metrics

| 指标 | Phase 0目标 | Phase 1目标 | 测量方法 |
|------|------------|------------|----------|
| 0.5B分类准确率 | >85% | >85% | 200封标注测试集 |
| 7B审批精筛F1 | >80% | >80% | 50封标注测试集 |
| 周报事实准确率 | >90% | >90% | 人工核对10份周报 |
| 场景推荐点击率 | - | >20% | 埋点统计 |
| 安装包体积 | - | <50MB | 不含7B模型 |
| 首次启动时间 | - | <3s | 计时器 |

---

## Documentation Plan

- `docs/PRD.md` — 产品需求文档（已有v7.1）
- `docs/API.md` — Tauri Command API文档
- `docs/ARCHITECTURE.md` — 架构设计文档
- `docs/DEPLOYMENT.md` — 打包发布指南
- `docs/USER_GUIDE.md` — 用户操作手册

---

## Operational / Rollout Notes

- **模型分发**: 0.5B模型打包进安装包，7B模型首次启动后台下载
- **更新机制**: Tauri Updater（自动检查更新）
- **错误上报**: 可选匿名错误上报（Sentry self-hosted）
- **数据备份**: 用户可导出/导入PGLite数据库

---

## Sources & References

- **Origin document:** [MailMind PRD v7.1](https://www.feishu.cn/docx/INWfd849FoUQcmxegw0cZeyQnJh)
- **评审报告:** [gstack双评审报告](https://www.feishu.cn/docx/MCl6dviKaoGX6SxppjEcmN8inMb)
- **Tauri v2 docs:** https://v2.tauri.app/
- **PGLite docs:** https://pglite.dev/
- **llama.cpp docs:** https://github.com/ggerganov/llama.cpp
- **Qwen2.5 model card:** https://huggingface.co/Qwen/Qwen2.5-7B-Instruct
- **bge-small-zh model card:** https://huggingface.co/BAAI/bge-small-zh-v1.5
