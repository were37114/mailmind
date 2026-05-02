import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

const client = new ImapFlow({
  host: 'imap.163.com',
  port: 993,
  secure: true,
  auth: { user: process.env.IMAP_USER || 'test@example.com', pass: process.env.IMAP_PASS || 'PLACEHOLDER' },
  logger: false,
});

async function main() {
  await client.connect();
  console.log('✅ IMAP连接成功');

  const lock = await client.getMailboxLock('INBOX');
  
  try {
    const status = await client.status('INBOX', { messages: true, unseen: true });
    const total = status.messages || 0;
    console.log(`📨 INBOX: ${total}封邮件, ${status.unseen}未读`);

    if (total === 0) { console.log('邮箱为空'); return; }

    // Fetch ALL emails using sequence numbers
    console.log(`\n📥 下载全部 ${total} 封邮件...\n`);

    const emails: any[] = [];
    for await (const msg of client.fetch('1:*', { source: true })) {
      try {
        const p = await simpleParser(msg.source);
        const bodyText = p.text || p.html?.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim() || '';
        emails.push({
          uid: msg.uid,
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

    // Print all emails
    emails.forEach((e, i) => {
      const s = e.subject.length > 50 ? e.subject.slice(0, 50) + '...' : e.subject;
      const f = e.from.length > 15 ? e.from.slice(0, 15) + '..' : e.from;
      console.log(`${String(i+1).padStart(2)}. [${f.padEnd(17)}] ${s}`);
      console.log(`    ${e.date?.toLocaleString('zh-CN')} | 正文${e.bodyText.length}字 | 附件${e.hasAttachment?'✓':'✗'}`);
    });

    // Quick classify
    const CAT = ['审批','通知','讨论','汇报','其他'];
    const KWS = [
      ['审批','批复','审核','批准','请批示','请审批','核准','同意','申请','报批'],
      ['通知','公告','提醒','维护','更新','活动','放假','安排'],
      ['讨论','回复','Re:','Fwd:','确认','疑问','意见','建议','帮忙'],
      ['汇报','报告','周报','月报','总结','进展','进度'],
    ];
    
    console.log('\n🏷️ 分类:');
    const counts = [0,0,0,0,0];
    const unknown: string[] = [];
    emails.forEach((e, i) => {
      const t = `${e.subject} ${e.bodyText}`.toLowerCase();
      const scores = KWS.map(kws => kws.filter(k => t.includes(k.toLowerCase())).length);
      const max = Math.max(...scores);
      const cat = max > 0 ? scores.indexOf(max) : 4;
      counts[cat]++;
      if (cat === 4) unknown.push(`  ${i+1}. "${e.subject}"`);
    });
    CAT.forEach((n,i) => console.log(`  ${n}: ${counts[i]}封`));
    if (unknown.length > 0) {
      console.log(`\n  ⚠️ 无法分类 ${unknown.length}封:`);
      unknown.forEach(u => console.log(u));
    }

  } finally {
    lock.release();
  }

  await client.logout();
  console.log('\n🔌 断开连接');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
