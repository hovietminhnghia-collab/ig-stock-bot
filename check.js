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
  waitUntil: 'domcontentloaded',
  timeout: 60000
});

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
  .replace(/\s+/g, ' ')
  .slice(0, 500);
    const lowerText = shortContent.toLowerCase();
let price = '_';
    const pricePatterns = [

  /\b\d+\s?k\b/gi,
  /\b\d+[.,]?\d*\s?tr\b/gi,
  /\b\d{2,3}[.,]\d{3}\b/g,
  /\$\s?\d+\b/g
];

for (const pattern of pricePatterns) {

  const match = lowerText.match(pattern);

  if(match) {

    price = match[0];
    break;
  }
}

console.log('PRICE:', price);
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
