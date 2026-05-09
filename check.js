const { chromium } = require('playwright');
const { google } = require('googleapis');
const {
  GoogleGenerativeAI
} = require('@google/generative-ai');

const creds = JSON.parse(process.env.GOOGLE_KEY);

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);

async function run() {

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets'
    ]
  });

  const sheets = google.sheets({
    version: 'v4',
    auth
  });

  const spreadsheetId =
    '1IGMiGLr-JvE0I_KaWgR-oY_520UJ1i6E662b1JAfDcc';

  const response =
    await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'B2:B'
    });

  const rows = response.data.values || [];

  const browser = await chromium.launch({
    headless: true
  });

  const page = await browser.newPage();

  // block images
  await page.route('**/*', route => {

    const type =
      route.request().resourceType();

    if(
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

  const posts = [];

  // ===== GET CAPTIONS =====

  for(let i = 0; i < rows.length; i++) {

    const url = rows[i][0];

    console.log('Checking:', url);

    try {

      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 60000
      });

      await page.waitForTimeout(2000);

      const caption =
        await page.evaluate(() => {

          return document
            .querySelector(
              'meta[property="og:description"]'
            )
            ?.content || '';

        });

      posts.push({
        row: i + 2,
        caption
      });

    }
    catch(err) {

      console.log(err.message);

      posts.push({
        row: i + 2,
        caption: ''
      });
    }
  }

  // ===== BUILD PROMPT =====

  let prompt = `
Analyze these Instagram sale captions.

Return ONLY valid JSON array.

Rules:
- stock = "Không" if sold out
- stock = "Còn" if still available
- price = main product price only
- if no clear price, use "_"

Example:

[
  {
    "row": 2,
    "stock": "Không",
    "price": "_"
  }
]

`;

  posts.forEach(post => {

    prompt += `
ROW ${post.row}:

${post.caption}

-------------------
`;
  });

  // ===== GEMINI =====

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash'
  });

  const result = await model.generateContent(
    prompt
  );

  const text =
    result.response.text();

  console.log(text);

  let parsed = [];

  try {

    parsed = JSON.parse(
      text.replace(/```json|```/g, '')
    );

  }
  catch(err) {

    console.log('JSON ERROR');

    console.log(err.message);

    await browser.close();

    return;
  }

  // ===== UPDATE SHEETS =====

  for(const item of parsed) {

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `C${item.row}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[item.stock]]
      }
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `D${item.row}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[item.price]]
      }
    });

    console.log(
      `ROW ${item.row} => ${item.stock} | ${item.price}`
    );
  }

  await browser.close();
}

run();
