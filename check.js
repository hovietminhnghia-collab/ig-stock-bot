const { chromium } = require('playwright');
const { google } = require('googleapis');
const { pipeline } = require('@xenova/transformers');

const creds = JSON.parse(process.env.GOOGLE_KEY);

async function run() {

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const sheets = google.sheets({
    version: 'v4',
    auth
  });

  const spreadsheetId = '1IGMiGLr-JvE0I_KaWgR-oY_520UJ1i6E662b1JAfDcc';

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'B2:B'
  });

  const rows = response.data.values;

  const browser = await chromium.launch({
    headless: true
  });

  const page = await browser.newPage();
  const classifier = await pipeline(
  'zero-shot-classification',
'Xenova/mobilebert-uncased-mnli'
);

  for(let i = 0; i < rows.length; i++) {

    const url = rows[i][0];

    console.log('Checking:', url);

    await page.goto(url, {
      waitUntil: 'networkidle'
    });

    const content = await page.evaluate(() => {
  return document.body.innerText;
});
    const shortContent = content.slice(0, 3000);

let stock = 'Còn';

const result = await classifier(
  shortContent,
  [
    'Sản phẩm còn hàng',
    'Sản phẩm đã hết hàng'
  ]
);

console.log(result);

if (
  result.labels[0] === 'Sản phẩm đã hết hàng'
) {
  stock = 'Không';
}

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `C${rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[stock]]
      }
    });

    console.log(`Row ${rowNumber} => ${stock}`);
  }

  await browser.close();
}

run();
