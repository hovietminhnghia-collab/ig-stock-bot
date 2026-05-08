const { chromium } = require('playwright');

(async() => {

  const browser = await chromium.launch({
    headless: true
  });

  const page = await browser.newPage();

  await page.goto(
    'https://www.instagram.com/p/C_iZnT_vqgI/?igsh=NTNpcnl3bDB6bXlp',
    {
      waitUntil: 'networkidle'
    }
  );

  const content = await page.content();

  if(content.includes('❌SOLD❌')) {

    console.log('HET HANG');

  } else {

    console.log('CON HANG');
  }

  await browser.close();

})();
