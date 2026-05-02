import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

const client = new ImapFlow({
  host: 'imap.qiye.163.com',
  port: 993,
  secure: true,
  auth: { user: process.env.IMAP_USER || 'test@example.com', pass: process.env.IMAP_PASS || 'PLACEHOLDER' },
  logger: false,
});

// If qiye fails, try standard
async function main() {
  console.log('🔗 连接 imap.qiye.163.com (企业版)...');
  try {
    await client.connect();
  } catch (e: any) {
    console.log(`⚠️ 企业版连接失败: ${e.message}`);
    console.log('🔗 尝试标准 imap.163.com...');
    // Reconnect with standard host
    const client2 = new ImapFlow({
      host: 'imap.163.com', port: 993, secure: true,
      auth: { user: process.env.IMAP_USER || 'test@example.com', pass: process.env.IMAP_PASS || 'PLACEHOLDER' }, logger: false,
    });
    await client2.connect();
    // Replace client
    Object.assign(client, client2);
  }
  console.log('✅ IMAP连接成功！');

  const lock = await client.getMailboxLock('INBOX');

  try {
    const status = await client.status('INBOX', { messages: true, unseen: true });
    const total = status.messages || 0;
    console.log(`📨 INBOX: ${total}封邮件, ${status.unseen}未读`);

    // List folders
    const mailboxes = await client.list();
    console.log('📁 文件夹:');
    mailboxes.forEach(m => { if (!m.path.includes('.')) console.log(`   ${m.path} (${m.specialUse || '普通'})`); });

    if (total === 0) { console.log('邮箱为空'); return; }

    console.log(`\n📥 下载全部 ${total} 封邮件...\n`);

    const emails: any[] = [];
    for await (const msg of client.fetch('1:*', { source: true })) {
      try {
        const p = await simpleParser(msg.source);
        const bodyText = p.text || p.html?.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() || '';
        emails.push({
          uid: msg.uid,
          messageId: p.messageId || '',
          from: p.from?.value?.[0]?.name || p.from?.value?.[0]?.address || '?',
          fromEmail: p.from?.value?.[0]?.address || '?',
          subject: p.subject || '(无主题)',
          bodyText: bodyText.slice(0, 1000),
          date: p.date,
          hasAttachment: (p.attachments?.length || 0) > 0,
          size: msg.source.length,
        });
      } catch (e: any) {
        console.log(`  ⚠️ UID=${msg.uid} 解析失败: ${e.message?.slice(0, 60)}`);
      }
    }

    console.log(`✅ 解析 ${emails.length} 封\n`);

    // Print all
    emails.forEach((e, i) => {
      const s = e.subject.length > 55 ? e.subject.slice(0, 55) + '...' : e.subject;
      const f = e.from.length > 18 ? e.from.slice(0, 18) + '..' : e.from;
      console.log(`${String(i+1).padStart(2)}. [${f.padEnd(20)}] ${s}`);
      console.log(`    ${e.date?.toLocaleString('zh-CN')} | 正文${e.bodyText.length}字 | 附件${e.hasAttachment?'✓':'✗'} | ${e.size}B`);
    });

    // Dedup check
    const msgIds = new Map<string, number>();
    let dupes = 0;
    emails.forEach(e => {
      if (e.messageId) {
        const cnt = msgIds.get(e.messageId) || 0;
        if (cnt > 0) dupes++;
        msgIds.set(e.messageId, cnt + 1);
      }
    });
    if (dupes > 0) console.log(`\n⚠️ 发现 ${dupes} 封重复邮件`);

    // Classify with expanded keywords
    const CAT = ['审批','通知','讨论','汇报','其他'];
    const KWS = [
      ['审批','批复','审核','批准','请批示','请审批','核准','同意','申请','报批','签批','签核','额度提升','续签','签署','合同','变更','退回','催办'],
      ['通知','公告','温馨提醒','提醒','维护','更新','活动','放假','安排','安全提醒','登录提醒'],
      ['讨论','回复','Re:','Fwd:','转发','确认','疑问','意见','建议','帮忙','帮忙看','需求'],
      ['汇报','报告','总结','周报','月报','进展','进度','权益报告'],
    ];

    console.log('\n🏷️ 分类结果:');
    console.log('─'.repeat(90));
    const counts = [0,0,0,0,0];
    const classified: Map<number, string[]> = new Map();
    const unknown: string[] = [];

    emails.forEach((e, i) => {
      const t = `${e.subject} ${e.bodyText}`.toLowerCase();
      const scores = KWS.map(kws => kws.filter(k => t.includes(k.toLowerCase())).length);
      const max = Math.max(...scores, 0);
      const cat = max > 0 ? scores.indexOf(max) : 4;
      counts[cat]++;

      if (!classified.has(cat)) classified.set(cat, []);
      classified.get(cat)!.push(`   ${i+1}. ${e.subject}`);

      if (cat === 4) unknown.push(`   ${i+1}. "${e.subject}" (正文前50字: "${e.bodyText.slice(0, 50)}")`);
    });

    CAT.forEach((n, i) => {
      const pct = emails.length > 0 ? (counts[i] / emails.length * 100).toFixed(0) : '0';
      console.log(`  ${n}: ${'█'.repeat(counts[i])} ${counts[i]}封 (${pct}%)`);
      if (classified.has(i)) {
        classified.get(i)!.slice(0, 5).forEach(s => console.log(s));
        if (classified.get(i)!.length > 5) console.log(`   ...还有 ${classified.get(i)!.length - 5} 封`);
      }
    });

    if (unknown.length > 0) {
      console.log(`\n  ⚠️ 无法分类 ${unknown.length}封:`);
      unknown.slice(0, 8).forEach(u => console.log(u));
      if (unknown.length > 8) console.log(`  ...还有 ${unknown.length - 8} 封`);
    }

    // Approval recall
    console.log('\n✅ 审批召回测试:');
    console.log('─'.repeat(90));
    const approvalKw = KWS[0];
    const approvalMatches = emails.filter((e, i) => {
      const t = `${e.subject} ${e.bodyText}`.toLowerCase();
      const matched = approvalKw.filter(k => t.includes(k.toLowerCase()));
      if (matched.length > 0) {
        console.log(`   ${i+1}. ${e.subject} [命中: ${matched.join(', ')}]`);
        return true;
      }
      return false;
    });
    if (approvalMatches.length === 0) console.log('   ⚠️ 无审批类邮件命中');

    // Content quality
    console.log('\n📊 邮件质量:');
    console.log('─'.repeat(90));
    const emptyBody = emails.filter(e => e.bodyText.trim().length < 10).length;
    const htmlResidual = emails.filter(e => /<(?:div|span|table|font|a)\b/i.test(e.bodyText)).length;
    const garbled = emails.filter(e => /[ï¿½\u00ef\u00bf\u00bd]/.test(e.bodyText)).length;
    const avgLen = emails.length > 0 ? Math.round(emails.reduce((s, e) => s + e.bodyText.length, 0) / emails.length) : 0;
    console.log(`  正文为空: ${emptyBody}封 | HTML残留: ${htmlResidual}封 | 乱码: ${garbled}封 | 平均正文: ${avgLen}字`);

    // Body samples
    console.log('\n📝 正文样本(各分类取1封):');
    console.log('─'.repeat(90));
    const seen = new Set<number>();
    emails.forEach((e, i) => {
      const t = `${e.subject} ${e.bodyText}`.toLowerCase();
      const scores = KWS.map(kws => kws.filter(k => t.includes(k.toLowerCase())).length);
      const max = Math.max(...scores, 0);
      const cat = max > 0 ? scores.indexOf(max) : 4;
      if (!seen.has(cat) && e.bodyText.length > 10) {
        seen.add(cat);
        console.log(`  [${CAT[cat]}] ${e.subject}`);
        console.log(`  "${e.bodyText.slice(0, 150)}"\n`);
      }
    });

    // Summary
    const unclassPct = emails.length > 0 ? (unknown.length / emails.length * 100).toFixed(0) : '0';
    console.log('═══════════════════════════════════════════════════');
    console.log(`  IMAP连接: ✅ | 下载: ${emails.length}封 | 解析: ${emails.length - emptyBody}/${emails.length} 正文OK`);
    console.log(`  分类: ${Number(unclassPct) < 30 ? '✅' : Number(unclassPct) < 50 ? '⚠️' : '❌'} ${unclassPct}%无法分类 | 审批: ${approvalMatches.length}封命中`);
    console.log(`  质量: HTML残留${htmlResidual}封 | 乱码${garbled}封 | 去重需处理${dupes}封`);
    console.log('═══════════════════════════════════════════════════');

  } finally {
    lock.release();
  }
  await client.logout();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
