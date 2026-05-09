const { chromium } = require('playwright');
const { google } = require('googleapis');

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

  for(let i = 0; i < rows.length; i++) {

    const url = rows[i][0];

    console.log('Checking:', url);

await page.goto(url, {
  waitUntil: 'domcontentloaded',
  timeout: 60000
});

await page.waitForTimeout(5000);

const content = await page.evaluate(() => {

  const scripts = Array.from(
    document.querySelectorAll('script')
  );

  return scripts
    .map(s => s.innerText)
    .join(' ');
});
const shortContent = content
  .replace(/\s+/g, ' ')
  .slice(0, 500);
    const lowerText = shortContent.toLowerCase();
    console.log(lowerText);
if(!shortContent.trim()) {

  console.log('NO CONTENT');

  continue;
}
let stock = 'Còn';

const positiveKeywords = [
  'còn',
  'available',
  'instock',
  'in stock',
  'ready'
];

const negativeKeywords = [
  '❌sold❌',
  'sold',
  'sold out',
  'đã có chủ',
  'bán hết',
  'hết hàng',
  'taken',
  'pass',
  'bay rồi',
  'không còn',
  'no longer available'
];

let positiveScore = 0;
let negativeScore = 0;

positiveKeywords.forEach(keyword => {

  if(lowerText.includes(keyword)) {
    positiveScore++;
  }
});

negativeKeywords.forEach(keyword => {

  if(lowerText.includes(keyword)) {
    negativeScore++;
  }
});

console.log('Positive:', positiveScore);
console.log('Negative:', negativeScore);

if(negativeScore > positiveScore) {
  stock = 'Không';
}
else if(
  negativeScore === positiveScore
  &&
  negativeScore > 0
) {
  stock = 'CHECK';
}
else {
  stock = 'Còn';
}
const rowNumber = i + 2;
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
