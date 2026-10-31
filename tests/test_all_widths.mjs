
import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // Set fake logged in user so pages render their main authenticated views
  await page.goto('http://127.0.0.1:3210/robots.txt');
  await page.evaluate(() => {
    localStorage.setItem('jlpt_cached_user', JSON.stringify({
      id: 'student_123',
      name: 'Verified Student',
      email: 'student@example.com',
      role: 'student'
    }));
  });

  const routes = [
    '/',
    '/de-thi',
    '/luyen-tap',
    '/so-tay',
    '/tu-vung',
    '/ngu-phap',
    '/lich-thi',
    '/ke-hoach',
    '/lop-hoc',
    '/thao-luan',
    '/su-kien',
    '/thong-ke',
    '/lich-su',
    '/tai-khoan'
  ];

  for (const r of routes) {
    await page.goto('http://127.0.0.1:3210' + r, { waitUntil: 'domcontentloaded' });
    const rect = await page.evaluate(() => {
      const el = document.querySelector('.container');
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { width: Math.round(b.width), left: Math.round(b.left), right: Math.round(b.right) };
    });
    console.log(`${r.padEnd(15)}:`, rect);
  }

  await browser.close();
})();
