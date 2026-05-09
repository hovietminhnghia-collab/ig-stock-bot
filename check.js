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

  const meta =
    document.querySelector(
      'meta[property="og:description"]'
    );

  return meta ? meta.content : '';
});
    const shortContent = content.slice(0, 3000);

let stock = 'Còn';

let votes = 0;

// ===== RULE ENGINE =====

const hardKeywords = [
  '❌sold❌',
  'sold out',
  'đã có chủ',
  'bán hết',
  'hết hàng',
  'taken',
  'pass',
  'bay rồi',
  'không còn'
];

const lowerText = shortContent.toLowerCase();

const matchedKeyword = hardKeywords.some(
  keyword => lowerText.includes(keyword)
);

if(matchedKeyword) {
  votes += 2;
}

// ===== AI =====

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
  &&
  result.scores[0] > 0.85
) {
  votes++;
}

// ===== FINAL DECISION =====

if(votes >= 2) {
  stock = 'Không';
}
else if(votes === 1) {
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
