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
await page.route('**/*', route => {

  const type = route.request().resourceType();

  if (
    type === 'image'
    ||
    type === 'media'
    ||
    type === 'font'
  ) {
    route.abort();
  }
  else {
    route.continue();
  }
});
  for(let i = 0; i < rows.length; i++) {

    const url = rows[i][0];

    console.log('Checking:', url);

await page.goto(url, {
  waitUntil: 'networkidle',
  timeout: 60000
});
await page.waitForSelector('body');
await page.waitForTimeout(1500);
const content = await page.evaluate(() => {

  const title =
    document.querySelector(
      'meta[property="og:title"]'
    )?.content || '';

  const description =
    document.querySelector(
      'meta[property="og:description"]'
    )?.content || '';

  return `
    ${title}
    ${description}
    ${document.body.innerText}
  `;
});
const shortContent = content
  .slice(0, 3000);
    const lowerText = shortContent.toLowerCase();
    if(!shortContent.trim()) {

  console.log('NO CONTENT');

  continue;
}

let stock = 'Còn';
let price = '_';
// ===== MAIN PRICE =====

const lines = shortContent
  .split('\n')
  .map(line => line.trim());

for(let j = 0; j < lines.length; j++) {

  const line = lines[j].toLowerCase();

  if(
    line === 'giá:'
    ||
    line === 'giá'
  ) {

    const nextLine = lines[j + 1] || '';

const match = nextLine.match(
  /\d+[.,]?\d*\s?(k|tr|đ|vnđ)/i
);
if(
  nextLine.includes('mp')
  ||
  nextLine.includes('mah')
  ||
  nextLine.includes('hz')
  ||
  nextLine.includes('gb')
) {

  continue;
}
    if(match) {

      price = match[0];
    }

    break;
  }
}

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

// UPDATE STOCK

await sheets.spreadsheets.values.update({
  spreadsheetId,
  range: `C${rowNumber}`,
  valueInputOption: 'RAW',
  requestBody: {
    values: [[stock]]
  }
});

// UPDATE PRICE

await sheets.spreadsheets.values.update({
  spreadsheetId,
  range: `D${rowNumber}`,
  valueInputOption: 'RAW',
  requestBody: {
    values: [[price]]
  }
});

console.log(`Row ${rowNumber} => ${stock} | ${price}`);
  }

  await browser.close();
}

run();
