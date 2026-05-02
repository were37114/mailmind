/**
 * MailMind 真实IMAP连接测试 v2
 * 用UID方式fetch，适配163邮箱
 */

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

const client = new ImapFlow({
  host: 'imap.163.com',
  port: 993,
  secure: true,
  auth: {
    user: 'wyz9527110@163.com',
    pass: 'EZT5GHbr3XqFGhJD',
  },
  logger: false,
});

interface ParsedEmail {
  uid: number;
  messageId: string;
  from: string;
  fromEmail: string;
  subject: string;
  bodyText: string;
  date: Date;
  hasAttachment: boolean;
  size: number;
}

const CAT_NAMES = ['审批', '通知', '讨论', '汇报', '其他'];
const APPROVAL_KW = ['审批', '批复', '审核', '批准', '请批示', '请审批', '核准', '同意', '申请', '报批', '签批', '请确认'];
const NOTIFY_KW = ['通知', '公告', '提醒', '维护', '更新', '活动', '放假', '安排'];
const DISCUSS_KW = ['讨论', '回复', 'Re:', 'Fwd:', '确认', '疑问', '意见', '建议', '帮忙'];
const REPORT_KW = ['汇报', '报告', '周报', '月报', '总结', '进展', '进度'];
const HIGH_URG_KW = ['紧急', 'urgent', 'asap', '截止', '严重', '故障', '立即', '务必'];
const MED_URG_KW = ['重要', '请尽快', '请处理', '需确认', '请回复', '尽快'];

function classifyReal(subject: string, body: string) {
  const text = `${subject} ${body}`.toLowerCase();
  const allKw = [
    ...APPROVAL_KW.map(k => ({ k, cat: 0 })),
    ...NOTIFY_KW.map(k => ({ k, cat: 1 })),
    ...DISCUSS_KW.map(k => ({ k, cat: 2 })),
    ...REPORT_KW.map(k => ({ k, cat: 3 })),
  ];
  const matched = allKw.filter(item => text.includes(item.k.toLowerCase()));
  const matchedKeywords = matched.map(m => m.k);
  const scores = [0, 0, 0, 0];
  matched.forEach(m => scores[m.cat]++);
  let category = 4, maxScore = 0;
  scores.forEach((s, i) => { if (s > maxScore) { maxScore = s; category = i; } });
  let urgency = 0;
  if (HIGH_URG_KW.some(k => text.includes(k.toLowerCase()))) urgency = 2;
  else if (MED_URG_KW.some(k => text.includes(k.toLowerCase()))) urgency = 1;
  const confidence = maxScore === 0 ? 0.3 : Math.min(0.5 + maxScore * 0.15, 0.98);
  return { category, urgency, confidence, matchedKeywords };
}

async function main() {
  const emails: ParsedEmail[] = [];

  console.log('🔗 连接 imap.163.com ...');
  await client.connect();
  console.log('✅ IMAP连接成功！');

  const lock = await client.getMailboxLock('INBOX');
  console.log('📨 进入INBOX');

  try {
    const status = await client.status('INBOX', { messages: true, unseen: true, uidNext: true });
    console.log(`   总邮件: ${status.messages}, 未读: ${status.unseen}, UID Next: ${status.uidNext}`);

    // Use UID range to fetch
    const uidNext = status.uidNext || 1;
    const fetchStart = Math.max(1, uidNext - 50);
    const uidRange = `${fetchStart}:${uidNext - 1}`;
    
    console.log(`\n📥 下载 UID ${uidRange} 的邮件...\n`);

    let count = 0;
    let parseErrors = 0;
    for await (const msg of client.fetch(uidRange, { source: true })) {
      try {
        const parsed = await simpleParser(msg.source);
        const bodyText = parsed.text || parsed.html?.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() || '';
        
        emails.push({
          uid: msg.uid,
          messageId: parsed.messageId || `uid-${msg.uid}`,
          from: parsed.from?.value?.[0]?.name || parsed.from?.value?.[0]?.address || 'Unknown',
          fromEmail: parsed.from?.value?.[0]?.address || 'unknown',
          subject: parsed.subject || '(无主题)',
          bodyText: bodyText.slice(0, 1000),
          date: parsed.date || new Date(),
          hasAttachment: (parsed.attachments?.length || 0) > 0,
          size: msg.source.length,
        });
        count++;
      } catch (parseErr: any) {
        console.log(`   ⚠️ 解析失败 UID=${msg.uid}: ${parseErr.message?.slice(0, 80)}`);
        parseErrors++;
      }
    }
    
    console.log(`✅ 成功解析 ${emails.length} 封邮件, ${parseErrors} 封解析失败\n`);

    // If still 0, try sequence-based fetch
    if (emails.length === 0 && status.messages > 0) {
      console.log('⚠️ UID方式无结果，尝试sequence number方式...\n');
      const seqRange = `1:${Math.min(status.messages, 50)}`;
      
      for await (const msg of client.fetch(seqRange, { source: true })) {
        try {
          const parsed = await simpleParser(msg.source);
          const bodyText = parsed.text || parsed.html?.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() || '';
          
          emails.push({
            uid: msg.uid,
            messageId: parsed.messageId || `uid-${msg.uid}`,
            from: parsed.from?.value?.[0]?.name || parsed.from?.value?.[0]?.address || 'Unknown',
            fromEmail: parsed.from?.value?.[0]?.address || 'unknown',
            subject: parsed.subject || '(无主题)',
            bodyText: bodyText.slice(0, 1000),
            date: parsed.date || new Date(),
            hasAttachment: (parsed.attachments?.length || 0) > 0,
            size: msg.source.length,
          });
        } catch (parseErr: any) {
          parseErrors++;
        }
      }
      console.log(`✅ sequence方式解析 ${emails.length} 封邮件\n`);
    }
  } finally {
    lock.release();
  }

  await client.logout();

  if (emails.length === 0) {
    console.log('❌ 没有获取到任何邮件。可能邮箱为空或fetch方式不兼容。');
    return;
  }

  // ============ 分析报告 ============
  console.log('═══════════════════════════════════════════════════');
  console.log('  MailMind 真实IMAP测试报告');
  console.log('═══════════════════════════════════════════════════\n');

  console.log('📧 邮件列表:');
  console.log('─'.repeat(90));
  emails.forEach((e, i) => {
    const subject = e.subject.length > 45 ? e.subject.slice(0, 45) + '...' : e.subject;
    const from = e.from.length > 12 ? e.from.slice(0, 12) + '..' : e.from;
    console.log(`   ${String(i + 1).padStart(2)}. [${from.padEnd(14)}] ${subject}`);
    console.log(`       ${e.date.toLocaleString('zh-CN')} | 正文${e.bodyText.length}字 | 附件${e.hasAttachment ? '✓' : '✗'} | ${e.size}B`);
  });

  // Classification
  console.log('\n🏷️ 规则分类结果:');
  console.log('─'.repeat(90));
  const catCounts = [0, 0, 0, 0, 0];
  const unclassified: string[] = [];
  
  emails.forEach((e, i) => {
    const r = classifyReal(e.subject, e.bodyText);
    catCounts[r.category]++;
    if (r.category === 4) unclassified.push(`   ${i + 1}. "${e.subject}" → 无关键词命中 (conf=${r.confidence.toFixed(2)})`);
  });

  CAT_NAMES.forEach((name, i) => {
    const pct = emails.length > 0 ? (catCounts[i] / emails.length * 100).toFixed(0) : '0';
    console.log(`   ${name}: ${'█'.repeat(catCounts[i])} ${catCounts[i]}封 (${pct}%)`);
  });

  if (unclassified.length > 0) {
    console.log(`\n   ⚠️ 无法分类: ${unclassified.length}封 (${(unclassified.length / emails.length * 100).toFixed(0)}%)`);
    unclassified.forEach(s => console.log(s));
  }

  // Approval recall
  console.log('\n✅ 审批召回:');
  console.log('─'.repeat(90));
  const approvalMatches = emails.filter(e => {
    const text = `${e.subject} ${e.bodyText}`.toLowerCase();
    return APPROVAL_KW.some(kw => text.includes(kw.toLowerCase()));
  });
  console.log(`   命中: ${approvalMatches.length}封`);
  approvalMatches.forEach((e, i) => {
    const r = classifyReal(e.subject, e.bodyText);
    console.log(`   ${i + 1}. ${e.subject} [${r.matchedKeywords.join(', ')}]`);
  });

  // Content quality
  console.log('\n📊 邮件内容质量:');
  console.log('─'.repeat(90));
  const emptyBody = emails.filter(e => e.bodyText.trim().length < 10).length;
  const htmlResidual = emails.filter(e => /<(?:div|span|table|font|br|p|a)\b/i.test(e.bodyText)).length;
  const cssResidual = emails.filter(e => /style=|class=/.test(e.bodyText)).length;
  const garbled = emails.filter(e => /[ï¿½\u00ef\u00bf\u00bd]/.test(e.bodyText)).length;
  const avgLen = emails.length > 0 ? Math.round(emails.reduce((s, e) => s + e.bodyText.length, 0) / emails.length) : 0;

  console.log(`   正文为空(<10字): ${emptyBody}封`);
  console.log(`   HTML标签残留: ${htmlResidual}封`);
  console.log(`   CSS样式残留: ${cssResidual}封`);
  console.log(`   编码乱码: ${garbled}封`);
  console.log(`   平均正文长度: ${avgLen}字`);

  // Body samples
  console.log('\n📝 正文样本(前3封,各前200字):');
  console.log('─'.repeat(90));
  emails.slice(0, 3).forEach((e, i) => {
    console.log(`   邮件${i + 1}: ${e.subject}`);
    console.log(`   "${e.bodyText.slice(0, 200)}"`);
    console.log('');
  });

  // Summary
  console.log('═══════════════════════════════════════════════════');
  console.log('  总结');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  IMAP连接: ✅ 成功`);
  console.log(`  邮件下载: ✅ ${emails.length}封`);
  console.log(`  邮件解析: ${emptyBody < emails.length ? '✅' : '❌'} ${emails.length - emptyBody}/${emails.length} 正文提取成功`);
  console.log(`  规则分类: ${unclassified.length < emails.length * 0.5 ? '⚠️' : '❌'} ${unclassified.length}封无法分类 (${emails.length > 0 ? (unclassified.length / emails.length * 100).toFixed(0) : 0}%)`);
  console.log(`  审批召回: ${approvalMatches.length > 0 ? '✅' : '⚠️'} ${approvalMatches.length}封命中`);
  console.log(`  HTML残留: ${htmlResidual > 0 ? '⚠️' : '✅'} ${htmlResidual}封`);
  console.log(`  编码问题: ${garbled > 0 ? '⚠️' : '✅'} ${garbled}封`);
}

main().catch(err => {
  console.error('❌ 测试失败:', err.message);
  console.error(err.stack);
  process.exit(1);
});
