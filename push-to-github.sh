#!/bin/bash
# MailMind GitHub 推送脚本
# 用法: ./push-to-github.sh <your-github-username>

set -e

USERNAME=${1:-}
REPO_NAME="mailmind"
BRANCH="feat/mailmind-mvp"

if [ -z "$USERNAME" ]; then
    echo "用法: ./push-to-github.sh <your-github-username>"
    echo "示例: ./push-to-github.sh john-doe"
    exit 1
fi

echo "=========================================="
echo "MailMind GitHub 推送脚本"
echo "=========================================="
echo ""

# 检查 git
if ! command -v git &> /dev/null; then
    echo "错误: git 未安装"
    exit 1
fi

# 检查 gh CLI（可选）
if command -v gh &> /dev/null; then
    echo "✓ GitHub CLI (gh) 已安装"
    GH_INSTALLED=true
else
    echo "⚠ GitHub CLI (gh) 未安装，建议安装: https://cli.github.com/"
    GH_INSTALLED=false
fi

echo ""
echo "步骤 1: 配置远程仓库..."
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/${USERNAME}/${REPO_NAME}.git"
echo "✓ 远程仓库已配置: https://github.com/${USERNAME}/${REPO_NAME}"

echo ""
echo "步骤 2: 推送分支..."
git push -u origin ${BRANCH}
echo "✓ 分支 ${BRANCH} 已推送"

echo ""
echo "步骤 3: 推送标签..."
git push origin v0.1.0-mvp
echo "✓ 标签 v0.1.0-mvp 已推送"

echo ""
echo "=========================================="
echo "推送完成！"
echo "=========================================="
echo ""
echo "仓库地址: https://github.com/${USERNAME}/${REPO_NAME}"
echo "分支: ${BRANCH}"
echo "标签: v0.1.0-mvp"
echo ""

if [ "$GH_INSTALLED" = true ]; then
    echo "是否创建 Pull Request? (y/n)"
    read -r CREATE_PR
    if [ "$CREATE_PR" = "y" ] || [ "$CREATE_PR" = "Y" ]; then
        gh pr create \
            --title "feat: MailMind MVP v0.1.0 - AI Email Second Brain" \
            --body "## 概述
MailMind MVP 完整实现，AI驱动的本地邮件管理工具。

## 完成内容
- Phase 0 (7/7): 技术验证全部通过 ✅
- Phase 1 (7/7): MVP功能完整实现 ✅
- 33/33 测试通过 ✅
- TypeScript严格模式 ✅
- 生产构建: deb/rpm/AppImage ✅

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
- Linux deb: 4.2MB
- Linux rpm: 4.2MB
- Linux binary: 13MB
- Windows/macOS: 通过 GitHub Actions 自动构建
" \
            --base main \
            --head ${BRANCH}
    fi
    
    echo ""
    echo "是否创建 Release? (y/n)"
    read -r CREATE_RELEASE
    if [ "$CREATE_RELEASE" = "y" ] || [ "$CREATE_RELEASE" = "Y" ]; then
        gh release create v0.1.0-mvp \
            --title "MailMind MVP v0.1.0" \
            --notes "AI邮件第二大脑 MVP版本

## 安装包
- Windows: 通过 Actions 自动构建 (.exe / .msi)
- macOS: 通过 Actions 自动构建 (.dmg)
- Linux: 已包含 deb / rpm / binary

## 快速开始
1. 下载对应平台安装包
2. 安装并运行 MailMind
3. 按照 Onboarding 向导配置邮箱
4. 开始体验 AI 邮件管理
" \
            --prerelease \
            mailmind-artifacts.tar.gz \
            mailmind-source.tar.gz
    fi
fi

echo ""
echo "=========================================="
echo "GitHub Actions 会自动构建 Windows/macOS 安装包"
echo "查看进度: https://github.com/${USERNAME}/${REPO_NAME}/actions"
echo "=========================================="
