import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

const client = new ImapFlow({
  host: 'imap.qiye.163.com', port: 993, secure: true,
  auth: { user: process.env.IMAP_USER || 'test@example.com', pass: process.env.IMAP_PASS || 'PLACEHOLDER' }, logger: false,
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
  console.log('✅ IMAP连接成功');

  const lock = await client.getMailboxLock('INBOX');
  try {
    const status = await client.status('INBOX', { messages: true });
    const total = status.messages || 0;
    console.log(`📨 INBOX: ${total}封`);

    // Use search to get recent UIDs, then fetch those
    console.log('🔍 搜索最近邮件...');
    
    // Search for emails from last 30 days
    const since = new Date();
    since.setDate(since.getDate() - 60);
    const uids = await client.search({ since, uid: true });
    console.log(`   最近60天: ${uids.length}封邮件`);

    // Take last 50 UIDs
    const fetchUids = uids.slice(-50);
    if (fetchUids.length === 0) {
      console.log('⚠️ 无最近邮件，尝试全部...');
      // Fallback: get all UIDs and take last 30
      const allUids = await client.search({ all: true, uid: true });
      const last30 = allUids.slice(-30);
      const range = last30.length > 0 ? last30.join(',') : '1';
      console.log(`   下载最后30封: UID ${last30[0]}-${last30[last30.length-1]}`);
      
      const emails: any[] = [];
      for await (const msg of client.fetch(range, { source: true })) {
        try {
          const p = await simpleParser(msg.source);
          const bodyText = p.text || p.html?.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() || '';
          emails.push({
            from: p.from?.value?.[0]?.name || p.from?.value?.[0]?.address || '?',
            fromEmail: p.from?.value?.[0]?.address || '?',
            subject: p.subject || '(无主题)',
            bodyText: bodyText.slice(0, 800),
            date: p.date, hasAttachment: (p.attachments?.length || 0) > 0,
          });
        } catch {}
      }
      
      console.log(`✅ 解析 ${emails.length} 封\n`);
      emails.forEach((e, i) => {
        const s = e.subject.length > 55 ? e.subject.slice(0, 55) + '...' : e.subject;
        console.log(`${String(i+1).padStart(2)}. ${s} [${e.from}]`);
      });
      
      // Quick classify
      const counts = [0,0,0,0,0];
      emails.forEach(e => {
        const t = `${e.subject} ${e.bodyText}`.toLowerCase();
        const scores = KWS.map(kws => kws.filter(k => t.includes(k.toLowerCase())).length);
        const max = Math.max(...scores, 0);
        const cat = max > 0 ? scores.indexOf(max) : 4;
        counts[cat]++;
      });
      console.log('\n分类:');
      CAT.forEach((n,i) => console.log(`  ${n}: ${counts[i]}封`));
      console.log(`  无法分类: ${counts[4]}封 (${(counts[4]/emails.length*100).toFixed(0)}%)`);
      return;
    }

    const range = fetchUids.join(',');
    console.log(`📥 下载 ${fetchUids.length} 封...\n`);

    const emails: any[] = [];
    for await (const msg of client.fetch(range, { source: true })) {
      try {
        const p = await simpleParser(msg.source);
        const bodyText = p.text || p.html?.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() || '';
        emails.push({
          from: p.from?.value?.[0]?.name || p.from?.value?.[0]?.address || '?',
          fromEmail: p.from?.value?.[0]?.address || '?',
          subject: p.subject || '(无主题)',
          bodyText: bodyText.slice(0, 800),
          date: p.date, hasAttachment: (p.attachments?.length || 0) > 0,
        });
      } catch {}
    }

    console.log(`✅ 解析 ${emails.length} 封\n`);
    emails.forEach((e, i) => {
      const s = e.subject.length > 55 ? e.subject.slice(0, 55) + '...' : e.subject;
      console.log(`${String(i+1).padStart(2)}. ${s} [${e.from}]`);
    });

    // Quick classify
    const counts = [0,0,0,0,0];
    const approval: string[] = [];
    emails.forEach((e, i) => {
      const t = `${e.subject} ${e.bodyText}`.toLowerCase();
      const scores = KWS.map(kws => kws.filter(k => t.includes(k.toLowerCase())).length);
      const max = Math.max(...scores, 0);
      const cat = max > 0 ? scores.indexOf(max) : 4;
      counts[cat]++;
      if (cat === 0) approval.push(`  ${i+1}. ${e.subject}`);
    });

    console.log('\n分类:');
    CAT.forEach((n,i) => console.log(`  ${n}: ${counts[i]}封`));
    console.log(`  无法分类: ${counts[4]}封 (${(counts[4]/emails.length*100).toFixed(0)}%)`);
    if (approval.length > 0) { console.log('\n审批命中:'); approval.forEach(a => console.log(a)); }

  } finally { lock.release(); }
  await client.logout();
}
main().catch(e => { console.error('❌', e.message); process.exit(1); });
