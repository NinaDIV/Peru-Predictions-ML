import fs from 'fs';

async function run() {
  const url = 'https://resultadosegundavuelta.onpe.gob.pe/main-SYE35Y34.js';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const code = await res.text();
  
  // Find all http urls or domains
  const regex = /https?:\/\/[^\s"'`]+/g;
  const urls = Array.from(new Set(code.match(regex) || []));
  console.log("URLs starting with HTTP:");
  console.log(urls.filter(u => u.includes('onpe') || u.includes('gob.pe') || u.includes('amazon') || u.includes('api')).slice(0, 50));
}
run();
