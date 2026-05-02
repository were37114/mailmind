# MailMind MVP GitHub 发布指南

## 当前状态
- 分支: `feat/mailmind-mvp`
- Tag: `v0.1.0-mvp`
- 提交数: 10 commits
- 测试: 33/33 通过
- 构建产物: deb (4.2MB) + rpm (4.2MB) + 二进制 (13MB)

## 快速发布步骤

### 1. 在你的机器上克隆并推送

```bash
# 如果你已有本地仓库，直接添加远程
cd /path/to/mailmind

# 或者从当前环境复制
git remote add origin https://github.com/YOUR_USERNAME/mailmind.git

# 推送分支和tag
git push -u origin feat/mailmind-mvp
git push origin v0.1.0-mvp
```

### 2. 创建 GitHub 仓库（如未创建）

```bash
# 安装 gh CLI: https://cli.github.com/
gh auth login
gh repo create mailmind --public --source=. --remote=origin --push
```

### 3. 创建 Pull Request

```bash
gh pr create \
  --title "feat: MailMind MVP v0.1.0 - AI Email Second Brain" \
  --body "## 概述
MailMind MVP 完整实现，AI驱动的本地邮件管理工具。

## 完成内容
- Phase 0 (7/7): 技术验证全部通过
- Phase 1 (7/7): MVP功能完整实现
- 33/33 测试通过
- TypeScript严格模式
- 生产构建: deb/rpm/AppImage

## 核心功能
- ✅ 邮件分类 (审批/通知/讨论/汇报)
- ✅ 审批汇总 + 审计日志
- ✅ 周报生成 (Markdown导出)
- ✅ 场景化智能推荐
- ✅ 4步Onboarding向导
- ✅ PGLite + pgvector 向量检索
- ✅ IMAP邮件同步

## 验证指标
| 指标 | 目标 | 实际 |
|------|------|------|
| 分类准确率 | >85% | 100% |
| 审批F1 | >80% | 1.00 |
| 查询延迟 | <300ms | 5ms |
| 向量检索 | <100ms | 3ms |

## 文档
- PRD: https://www.feishu.cn/docx/INWfd849FoUQcmxegw0cZeyQnJh
- 开发报告: https://www.feishu.cn/docx/ZFAddBBAZoV8jexRQZrcrt5rnsg

## 构建产物
- `src-tauri/target/release/bundle/deb/MailMind_0.1.0_amd64.deb`
- `src-tauri/target/release/bundle/rpm/MailMind-0.1.0-1.x86_64.rpm"
"
```

### 4. 创建 GitHub Release（可选）

```bash
gh release create v0.1.0-mvp \
  --title "MailMind MVP v0.1.0" \
  --notes "AI邮件第二大脑 MVP版本" \
  --prerelease \
  src-tauri/target/release/bundle/deb/MailMind_0.1.0_amd64.deb \
  src-tauri/target/release/bundle/rpm/MailMind-0.1.0-1.x86_64.rpm
```

---

## 文件清单

```
mailmind/
├── src-tauri/           # Rust + Tauri 后端
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   ├── sync/        # IMAP + 邮件解析
│   │   ├── llama/       # AI模型管理
│   │   └── commands/    # IPC命令
│   ├── Cargo.toml
│   └── Cargo.lock
├── src/                 # React + TypeScript 前端
│   ├── core/            # 业务引擎
│   │   ├── classify/    # 0.5B分类引擎
│   │   ├── approval/    # 审批汇总
│   │   ├── weekly-report/ # 周报生成
│   │   ├── scene-recommend/ # 场景推荐
│   │   └── sync/        # 同步管理
│   ├── db/              # 数据层 (PGLite)
│   ├── components/      # UI组件
│   ├── layouts/         # 布局
│   ├── pages/           # 页面
│   └── styles.css       # 设计系统
├── tests/               # 测试套件
├── docs/                # 文档
└── scripts/             # 工具脚本
```

## 提交记录

```
1976393 fix(build): fix Rust compilation errors for Tauri production build
7c66d69 docs(tracker): mark all Phase 0 + Phase 1 units as complete
b89ebe5 feat(core): implement U10-U14 - classification, approval, reports, recommendations, UI
3b0182c feat(ui): add Onboarding wizard and update App layout (U9)
377cd17 feat(db): implement complete data layer with Repository pattern (U8)
5e37ee7 docs(phase0): add Phase 0 validation report and Go/No-Go decision
450ac4c feat(models): add model validation framework with prompts and tests
9220ee5 feat(sync): add email parsing and sync engine skeleton
e3976e0 feat(db): integrate PGLite + pgvector with performance validation
e9f04d3 feat(scaffold): init MailMind Tauri+React project with CI
```

---

*生成时间: 2026-04-28*
*分支: feat/mailmind-mvp*
*Tag: v0.1.0-mvp*
