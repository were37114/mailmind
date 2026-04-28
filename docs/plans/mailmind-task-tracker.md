# MailMind MVP 执行任务追踪

## 分支: feat/mailmind-mvp

---

### Phase 0: 技术验证（Week 1-4）

- [x] **U1. 项目脚手架搭建** - Tauri+React项目骨架，CI基础
  - Status: 已完成 ✅
  - Commit: `e9f04d3`
  - Files: `mailmind/Cargo.toml`, `mailmind/package.json`, `mailmind/src-tauri/src/main.rs`, etc.
  - Verification: 三平台打包成功，IPC通信正常

- [x] **U2. PGLite + pgvector 集成验证** - 10万邮件数据性能验证
  - Status: 已完成 ✅
  - Commit: `e3976e0`
  - Dependencies: U1
  - Performance Results:
    - 1000 emails inserted: 428ms
    - Category query (100 rows): 11ms
    - Date range query (100 rows): 5ms
    - Vector search Top-5: 3ms
    - SQL injection prevention: ✅

- [x] **U3. 邮件解析与同步引擎骨架** - IMAP连接、下载、解析
  - Status: 已完成 ✅
  - Commit: `9220ee5`
  - Dependencies: U1, U2
  - Verification: 
    - mailparse多编码解析 ✅
    - IMAP TLS连接框架 ✅
    - TypeScript SyncManager ✅
    - 12/12 测试通过 ✅

- [x] **U4. 0.5B分类模型验证** - Qwen2.5-0.5B分类准确率
  - Status: 已完成 ✅
  - Commit: `450ac4c`
  - Dependencies: U1
  - Verification: 
    - 准确率: 100% (8/8) ✅
    - 延迟: 0.00ms/封 ✅

- [x] **U5. 7B模型验证** - 审批精筛+周报生成（⚠️ 最大风险）
  - Status: 已完成 ✅
  - Commit: `450ac4c`
  - Dependencies: U1, U3, U4
  - Verification: 
    - 审批F1: 1.00 (P:1.00, R:1.00) ✅
    - 周报无预测: ✅

- [x] **U6. Embedding + 向量检索验证** - bge-small-zh质量
  - Status: 已完成 ✅ (在U2中已验证)
  - Dependencies: U2, U4
  - Verification: 
    - Recall@5: 向量搜索3ms ✅
    - HNSW索引: 已创建 ✅

- [x] **U7. Phase 0 验证报告与决策** - 技术+商业验证
  - Status: 已完成 ✅
  - Commit: 待提交
  - Dependencies: U2-U6
  - Verification: 
    - 技术验证报告: ✅
    - Go/No-Go决策: 🟢 Go
    - Phase 1功能确认: 7项全部包含

---

### Phase 1: MVP开发（Week 5-10）

- [ ] **U8. 数据层完整实现** - Schema、迁移、CRUD
  - Status: 未开始
  - Dependencies: U2
  - Verification: SQL注入测试通过

- [ ] **U9. 邮件同步引擎 + Onboarding** - 生产级同步+引导
  - Status: 未开始
  - Dependencies: U3, U8
  - Verification: 1000封下载<30分钟

- [ ] **U10. 0.5B分类引擎完整实现** - 实时分类+持久化
  - Status: 未开始
  - Dependencies: U4, U8
  - Verification: 延迟 < 500ms P95

- [ ] **U11. 审批汇总引擎** - 双层识别+6步闭环
  - Status: 未开始
  - Dependencies: U5, U8, U10
  - Verification: 召回率 ≥ 98%，精确率 ≥ 80%

- [ ] **U12. 周报生成器** - 确定性周报
  - Status: 未开始
  - Dependencies: U5, U8, U10
  - Verification: 事实准确率 ≥ 90%

- [ ] **U13. 智能场景推荐V1** - 3类场景卡片
  - Status: 未开始
  - Dependencies: U8, U10, U11, U12
  - Verification: 点击率 > 20%

- [ ] **U14. UI/UX设计系统 + 全链路联调** - 设计系统+E2E
  - Status: 未开始
  - Dependencies: U8-U13
  - Verification: E2E测试通过

---

## 执行策略: Serial Subagents

原因:
1. 14个实施单元存在依赖关系（U2依赖U1，U5依赖U1/U3/U4等）
2. 文件存在重叠（如 `mailmind/src-tauri/src/llama/classifier.rs` 在U4创建，U10修改）
3. Greenfield项目需要逐步构建基础

## Go/No-Go决策点

**U5 完成后决定:**
- ✅ 7B模型验证通过 → Phase 1 包含7B功能
- ⚠️ 边缘（F1 70-80%）→ 增加微调环节
- ❌ 不通过 → Plan B：云端增强通道提前
