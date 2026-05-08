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
      waitUntil: 'networkidle'
    });

    const content = await page.content();

    let stock = 'Còn';

    if(content.includes('❌SOLD❌')) {

      stock = 'Không';
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
