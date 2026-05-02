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
  console.log('✅ IMAP连接成功 (企业邮箱 11098封)');

  // Try "已发送" folder too for work emails
  for (const folder of ['INBOX']) {
    const lock = await client.getMailboxLock(folder);
    try {
      // Get UID range
      const status = await client.status(folder, { messages: true, uidNext: true });
      console.log(`\n📁 ${folder}: ${status.messages}封`);

      // Fetch last 30 by trying highest sequence numbers
      // With 11098 msgs, fetch the last 30 sequence numbers
      const total = status.messages || 11098;
      const start = Math.max(1, total - 29);
      const range = `${start}:${total}`;
      console.log(`📥 Fetch seq ${range}...\n`);

      const emails: any[] = [];
      let errors = 0;
      for await (const msg of client.fetch(range, { source: true })) {
        try {
          const p = await simpleParser(msg.source);
          const bodyText = p.text || p.html?.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() || '';
          emails.push({
            from: p.from?.value?.[0]?.name || p.from?.value?.[0]?.address || '?',
            fromEmail: p.from?.value?.[0]?.address || '?',
            subject: p.subject || '(无主题)',
            bodyText: bodyText.slice(0, 800),
            bodyLen: bodyText.length,
            date: p.date,
            hasAttachment: (p.attachments?.length || 0) > 0,
          });
        } catch { errors++; }
      }
      console.log(`✅ ${emails.length}封解析成功, ${errors}封失败\n`);

      // Print all
      emails.forEach((e, i) => {
        const s = e.subject.length > 55 ? e.subject.slice(0, 55) + '...' : e.subject;
        const d = e.date?.toLocaleDateString('zh-CN') || '?';
        console.log(`${String(i+1).padStart(2)}. [${d}] ${s}`);
        console.log(`     来自:${e.from} | 正文:${e.bodyLen}字 | 附件:${e.hasAttachment?'✓':'✗'}`);
      });

      // Classify
      console.log('\n🏷️ 分类结果:');
      const counts = [0,0,0,0,0];
      const byCat: string[][] = [[],[],[],[],[]];
      const unknown: string[] = [];

      emails.forEach((e, i) => {
        const t = `${e.subject} ${e.bodyText}`.toLowerCase();
        const scores = KWS.map(kws => kws.filter(k => t.includes(k.toLowerCase())).length);
        const max = Math.max(...scores, 0);
        const cat = max > 0 ? scores.indexOf(max) : 4;
        counts[cat]++;
        const matchedKw = max > 0 ? KWS[cat].filter(k => t.includes(k.toLowerCase())) : [];
        byCat[cat].push(`${i+1}. ${e.subject} [${matchedKw.join(',')}]`);
        if (cat === 4) unknown.push(`   ${i+1}. "${e.subject}" | 正文:"${e.bodyText.slice(0,60)}"`);
      });

      CAT.forEach((n, i) => {
        console.log(`  ${n}: ${counts[i]}封`);
        byCat[i].slice(0, 5).forEach(s => console.log(`     ${s}`));
        if (byCat[i].length > 5) console.log(`     ...+${byCat[i].length-5}`);
      });

      if (unknown.length > 0) {
        console.log(`\n  ⚠️ 无法分类 ${unknown.length}封 (${(unknown.length/emails.length*100).toFixed(0)}%):`);
        unknown.slice(0, 8).forEach(s => console.log(s));
      }

      // Quality
      const empty = emails.filter(e => e.bodyLen < 10).length;
      const html = emails.filter(e => /<(?:div|span|table)\b/i.test(e.bodyText)).length;
      const garbled = emails.filter(e => /[ï¿½]/.test(e.bodyText)).length;
      console.log(`\n📊 质量: 正文空${empty}封 | HTML残留${html}封 | 乱码${garbled}封`);

      // Samples
      console.log('\n📝 正文样本:');
      const seen = new Set<number>();
      for (const e of emails) {
        const t = `${e.subject} ${e.bodyText}`.toLowerCase();
        const scores = KWS.map(kws => kws.filter(k => t.includes(k.toLowerCase())).length);
        const max = Math.max(...scores, 0);
        const cat = max > 0 ? scores.indexOf(max) : 4;
        if (!seen.has(cat) && e.bodyLen > 20) {
          seen.add(cat);
          console.log(`  [${CAT[cat]}] ${e.subject}`);
          console.log(`  "${e.bodyText.slice(0, 200)}"\n`);
        }
      }

    } finally { lock.release(); }
  }

  await client.logout();
  console.log('🔌 完成');
}
main().catch(e => { console.error('❌', e.message); process.exit(1); });
