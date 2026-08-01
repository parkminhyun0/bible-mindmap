import pw from 'playwright';
const { chromium, devices } = pw;
const b=await chromium.launch();
const ctx=await b.newContext({...devices['iPhone 14 Pro']});
const p=await ctx.newPage();
p.on('pageerror',e=>console.log('PAGEERR',e.message));
try{
  await p.goto('http://localhost:4336/bible-mindmap/app/',{waitUntil:'networkidle',timeout:60000});
  await p.waitForTimeout(1200);
  await p.locator('text=📖 문맥 성경').first().click({timeout:8000});
  await p.waitForTimeout(700);
  await p.evaluate(()=>document.querySelectorAll('[data-context-onboarding]').forEach(e=>e.remove()));
  await p.waitForTimeout(2000);
  await p.screenshot({path:'m_peek.png'});
  // tap center handle
  const clicked = await p.evaluate(()=>{const h=[...document.querySelectorAll('span')].find(d=>d.textContent==='펼치기 ▲');if(h){h.parentElement.click();return true}return false;});
  console.log('handle clicked:', clicked);
  await p.waitForTimeout(700);
  await p.screenshot({path:'m_full.png'});
}catch(e){console.log('ERR',e.message)}
await b.close();
