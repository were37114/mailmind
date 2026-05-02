import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

const client = new ImapFlow({
  host: 'imap.qiye.163.com', port: 993, secure: true,
  auth: { user: 'zzzzzz@qzwy.club', pass: 'Wangyi163!' }, logger: false,
});

const CAT = ['审批','通知','讨论','汇报','其他'];
const KWS = [
  ['审批','批复','审核','批准','请批示','请审批','核准','同意','申请','报批','签批','签核','额度提升','续签','签署','合同','变更','退回','催办'],
  ['通知','公告','温馨提醒','提醒','维护','更新','活动','放假','安排','安全提醒','登录提醒'],
  ['讨论','回复','Re:','Fwd:','转发','确认','疑问','意见','建议','帮忙','帮忙看','需求'],
  ['汇报','报告','总结','周报','月报','进展','进度','权益报告'],
];

async function main() {
  await client.connect();
  console.log('✅ IMAP连接成功 (企业邮箱)');

  const lock = await client.getMailboxLock('INBOX');
  try {
    const status = await client.status('INBOX', { messages: true, unseen: true });
    const total = status.messages || 0;
    console.log(`📨 INBOX: ${total}封邮件`);

    // Only fetch last 100 by sequence
    const start = Math.max(1, total - 99);
    const range = `${start}:${total}`;
    console.log(`📥 下载最近100封 (${range})...\n`);

    const emails: any[] = [];
    for await (const msg of client.fetch(range, { source: true })) {
      try {
        const p = await simpleParser(msg.source);
        const bodyText = p.text || p.html?.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() || '';
        emails.push({
          uid: msg.uid, messageId: p.messageId || '',
          from: p.from?.value?.[0]?.name || p.from?.value?.[0]?.address || '?',
          fromEmail: p.from?.value?.[0]?.address || '?',
          subject: p.subject || '(无主题)',
          bodyText: bodyText.slice(0, 1000),
          date: p.date, hasAttachment: (p.attachments?.length || 0) > 0,
          size: msg.source.length,
        });
      } catch (e: any) {}
    }
    console.log(`✅ 解析 ${emails.length} 封\n`);

    // List
    emails.forEach((e, i) => {
      const s = e.subject.length > 50 ? e.subject.slice(0, 50) + '...' : e.subject;
      const f = e.from.length > 15 ? e.from.slice(0, 15) + '..' : e.from;
      console.log(`${String(i+1).padStart(3)}. [${f.padEnd(17)}] ${s}`);
    });

    // Dedup
    const msgIds = new Map<string, number>();
    let dupes = 0;
    emails.forEach(e => {
      if (e.messageId) { const c = msgIds.get(e.messageId) || 0; if (c > 0) dupes++; msgIds.set(e.messageId, c + 1); }
    });
    if (dupes > 0) console.log(`\n⚠️ ${dupes}封重复`);

    // Classify
    console.log('\n🏷️ 分类:');
    console.log('─'.repeat(90));
    const counts = [0,0,0,0,0];
    const byCat: Map<number, any[]> = new Map();
    const unknown: string[] = [];

    emails.forEach((e, i) => {
      const t = `${e.subject} ${e.bodyText}`.toLowerCase();
      const scores = KWS.map(kws => kws.filter(k => t.includes(k.toLowerCase())).length);
      const max = Math.max(...scores, 0);
      const cat = max > 0 ? scores.indexOf(max) : 4;
      counts[cat]++;
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat)!.push({ ...e, idx: i+1, matchedKw: max > 0 ? KWS[cat].filter(k => t.includes(k.toLowerCase())) : [] });
      if (cat === 4) unknown.push(`   ${i+1}. "${e.subject}"`);
    });

    CAT.forEach((n, i) => {
      const pct = emails.length > 0 ? (counts[i]/emails.length*100).toFixed(0) : '0';
      console.log(`  ${n}: ${'█'.repeat(Math.min(counts[i], 50))} ${counts[i]}封 (${pct}%)`);
      const items = byCat.get(i) || [];
      items.slice(0, 3).forEach(e => console.log(`     ${e.idx}. ${e.subject} [${e.matchedKw?.join(',')}]`));
      if (items.length > 3) console.log(`     ...还有 ${items.length - 3} 封`);
    });

    if (unknown.length > 0) {
      console.log(`\n  ⚠️ 无法分类 ${unknown.length}封 (${(unknown.length/emails.length*100).toFixed(0)}%):`);
      unknown.slice(0, 10).forEach(u => console.log(u));
    }

    // Approval detail
    console.log('\n✅ 审批召回:');
    const approvalItems = byCat.get(0) || [];
    console.log(`   命中 ${approvalItems.length} 封`);
    approvalItems.forEach(e => console.log(`   ${e.idx}. ${e.subject} [${e.matchedKw?.join(',')}]`));

    // Content quality
    const emptyBody = emails.filter(e => e.bodyText.trim().length < 10).length;
    const htmlRes = emails.filter(e => /<(?:div|span|table|font|a)\b/i.test(e.bodyText)).length;
    const garbled = emails.filter(e => /[ï¿½]/.test(e.bodyText)).length;
    const avgLen = emails.length > 0 ? Math.round(emails.reduce((s,e) => s+e.bodyText.length, 0)/emails.length) : 0;
    console.log(`\n📊 质量: 正文空${emptyBody}封 | HTML残留${htmlRes}封 | 乱码${garbled}封 | 平均${avgLen}字`);

    // Sample bodies per category
    console.log('\n📝 正文样本(每类1封):');
    byCat.forEach((items, cat) => {
      if (cat === 4 && items.length === 0) return;
      const sample = items.find(e => e.bodyText.length > 20);
      if (sample) {
        console.log(`  [${CAT[cat]}] ${sample.subject}`);
        console.log(`  "${sample.bodyText.slice(0, 150)}"\n`);
      }
    });

    // Summary
    const unclassPct = emails.length > 0 ? (unknown.length/emails.length*100).toFixed(0) : '0';
    console.log('═══════════════════════════════════════════════════');
    console.log(`  ✅ IMAP连接 | ✅ 下载${emails.length}封 | ✅ 解析`);
    console.log(`  分类: ${Number(unclassPct)<30?'✅':Number(unclassPct)<50?'⚠️':'❌'} ${unclassPct}%无法分类 | 审批: ${approvalItems.length}封命中`);
    console.log(`  质量: HTML${htmlRes} | 乱码${garbled} | 去重${dupes}封`);
    console.log('═══════════════════════════════════════════════════');

  } finally { lock.release(); }
  await client.logout();
}
main().catch(e => { console.error('❌', e.message); process.exit(1); });
