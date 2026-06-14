// Descubre el endpoint REAL de datos de la ONPE interceptando el tráfico de red.
// Carga la SPA en un navegador real y registra cada request XHR/fetch + su respuesta JSON.
import puppeteer from 'puppeteer';

const ONPE_URL = process.env.ONPE_URL || 'https://resultadosegundavuelta.onpe.gob.pe/main/resumen';

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const apiCalls = [];

  page.on('response', async (res) => {
    try {
      const req = res.request();
      const url = res.url();
      const type = res.headers()['content-type'] || '';
      // Solo nos interesan respuestas JSON de tipo API (no assets)
      if (!type.includes('application/json')) return;
      if (/gtm|google|analytics|fonts/.test(url)) return;
      let bodySample = null;
      try {
        const text = await res.text();
        bodySample = text.length > 1200 ? text.slice(0, 1200) + '…[truncado]' : text;
      } catch { /* ignore */ }
      apiCalls.push({
        method: req.method(),
        url,
        status: res.status(),
        postData: req.postData() || null,
        bodySample
      });
    } catch { /* ignore */ }
  });

  console.log('Cargando', ONPE_URL, '…');
  await page.goto(ONPE_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 8000)); // dejar que disparen los XHR diferidos

  await browser.close();

  console.log(`\n=== ${apiCalls.length} llamadas JSON detectadas ===\n`);
  apiCalls.forEach((c, i) => {
    console.log(`[${i + 1}] ${c.method} ${c.status} ${c.url}`);
    if (c.postData) console.log('    payload:', c.postData);
    if (c.bodySample) console.log('    respuesta:', c.bodySample.replace(/\n/g, ' ').slice(0, 600));
    console.log('');
  });
}

run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
