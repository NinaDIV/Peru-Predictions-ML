// Fuentes de datos REALES (sin simulación, sin Puppeteer).
// - ONPE: conteo oficial de actas/votos (fetch directo con headers de navegador).
// - Polymarket: probabilidad implícita del mercado de predicción.
//
// Importante: estos dos números NO son lo mismo.
//   * ONPE = resultado oficial en conteo.
//   * Polymarket = especulación de apostadores (probabilidad), NO un resultado.

const ONPE_ORIGIN = 'https://resultadosegundavuelta.onpe.gob.pe';
const ONPE_BASE = `${ONPE_ORIGIN}/presentacion-backend`;

// Headers que la web de ONPE exige para devolver JSON (si faltan, responde el HTML del SPA).
const ONPE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'es-PE,es;q=0.9',
  'Referer': `${ONPE_ORIGIN}/main/resumen`,
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'X-Requested-With': 'XMLHttpRequest'
};

const POLYMARKET_EVENT_SLUG = 'peru-presidential-election-winner';

async function fetchJson(url, { headers = {}, timeoutMs = 12000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ctype = res.headers.get('content-type') || '';
    if (!ctype.includes('application/json')) {
      const sample = (await res.text()).slice(0, 60);
      throw new Error(`Respuesta no-JSON (¿bloqueo/SPA?): ${sample}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Determina el idEleccion activo dinámicamente (fallback 10 = presidencial 2026).
async function getActiveEleccionId() {
  try {
    const r = await fetchJson(`${ONPE_BASE}/proceso/proceso-electoral-activo`, { headers: ONPE_HEADERS });
    return r?.data?.idEleccionPrincipal || 10;
  } catch {
    return 10;
  }
}

/**
 * Conteo OFICIAL de la ONPE. Devuelve null si no se pudo obtener
 * (NUNCA inventa números: si falla, el llamador debe mostrar "No disponible").
 */
export async function fetchOnpe() {
  const idEleccion = await getActiveEleccionId();
  const q = `idEleccion=${idEleccion}&tipoFiltro=eleccion`;

  const [totales, participantes] = await Promise.all([
    fetchJson(`${ONPE_BASE}/resumen-general/totales?${q}`, { headers: ONPE_HEADERS }),
    fetchJson(`${ONPE_BASE}/resumen-general/participantes?${q}`, { headers: ONPE_HEADERS })
  ]);

  const t = totales?.data;
  const lista = participantes?.data;
  if (!t || !Array.isArray(lista) || lista.length === 0) {
    throw new Error('Estructura de datos ONPE inesperada');
  }

  const candidatos = lista
    .map(c => ({
      candidato: c.nombreCandidato,
      partido: c.nombreAgrupacionPolitica,
      votos: c.totalVotosValidos,
      pct: c.porcentajeVotosValidos
    }))
    .sort((a, b) => b.votos - a.votos);

  const lider = candidatos[0];
  const segundo = candidatos[1] || { votos: 0 };
  const diferenciaVotos = Math.abs((lider.votos || 0) - (segundo.votos || 0));

  return {
    fuente: 'ONPE (oficial)',
    actasContabilizadas: t.actasContabilizadas,      // % de actas procesadas
    actasPendientesJee: t.pendientesJee,             // actas observadas pendientes de JEE
    totalVotosEmitidos: t.totalVotosEmitidos,
    participacionCiudadana: t.participacionCiudadana,
    fechaActualizacion: t.fechaActualizacion,        // epoch ms del último dato oficial
    candidatos,
    lider,
    diferenciaVotos
  };
}

/**
 * Probabilidad implícita en Polymarket (mercado de predicción).
 * Devuelve { fujimori, sanchez } como fracciones 0..1.
 */
export async function fetchPolymarket() {
  const data = await fetchJson(
    `https://gamma-api.polymarket.com/events?slug=${POLYMARKET_EVENT_SLUG}`,
    { timeoutMs: 12000 }
  );
  const ev = Array.isArray(data) ? data[0] : (data?.events ? data.events[0] : data);
  const markets = ev?.markets || [];
  if (markets.length === 0) throw new Error('Sin mercados en el evento de Polymarket');

  const priceOf = (m) => {
    try {
      return parseFloat(JSON.parse(m.outcomePrices)[0]);
    } catch {
      return m.lastTradePrice != null ? parseFloat(m.lastTradePrice) : null;
    }
  };

  const find = (pred) => markets.find(m => pred((m.slug || '').toLowerCase(), (m.groupItemTitle || '').toLowerCase()));
  const kMkt = find((slug, title) => slug.includes('keiko') || slug.includes('fujimori') || title.includes('fujimori'));
  const sMkt = find((slug, title) => (slug.includes('roberto') && (slug.includes('snchez') || slug.includes('sanchez'))) || title.includes('sánchez') || title.includes('sanchez'));

  return {
    fuente: 'Polymarket (mercado de predicción)',
    fujimori: kMkt ? priceOf(kMkt) : null,
    sanchez: sMkt ? priceOf(sMkt) : null,
    volumen: ev?.volume != null ? Number(ev.volume) : null,
    fechaActualizacion: Date.now()
  };
}

/** Trae ambas fuentes en paralelo; cada una falla de forma independiente. */
export async function fetchAll() {
  const [onpeRes, polyRes] = await Promise.allSettled([fetchOnpe(), fetchPolymarket()]);
  return {
    onpe: onpeRes.status === 'fulfilled' ? onpeRes.value : null,
    onpeError: onpeRes.status === 'rejected' ? onpeRes.reason?.message || String(onpeRes.reason) : null,
    polymarket: polyRes.status === 'fulfilled' ? polyRes.value : null,
    polymarketError: polyRes.status === 'rejected' ? polyRes.reason?.message || String(polyRes.reason) : null,
    timestamp: Date.now()
  };
}

const fmtN = (n) => (n == null ? 'N/D' : Number(n).toLocaleString('es-PE'));
const fmtPct = (n) => (n == null ? 'N/D' : `${Number(n).toFixed(3)}%`);
const fmtProb = (n) => (n == null ? 'N/D' : `${(Number(n) * 100).toFixed(1)}%`);

/** Construye el mensaje de WhatsApp con etiquetado HONESTO de cada fuente. */
export function buildReport(snapshot) {
  const { onpe, onpeError, polymarket, polymarketError } = snapshot;
  const lines = ['🗳️ *REPORTE ELECTORAL PERÚ 2026*', '-----------------------------------'];

  if (onpe) {
    const fecha = new Date(onpe.fechaActualizacion).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
    lines.push('📊 *CONTEO OFICIAL ONPE*');
    lines.push(`📈 Actas contabilizadas: *${fmtPct(onpe.actasContabilizadas)}*`);
    lines.push(`📑 Actas pendientes (JEE): *${fmtN(onpe.actasPendientesJee)}*`);
    lines.push('');
    onpe.candidatos.forEach((c, i) => {
      const emoji = i === 0 ? '👑' : '▫️';
      lines.push(`${emoji} *${c.candidato}* (${c.partido})`);
      lines.push(`   ${fmtPct(c.pct)} — ${fmtN(c.votos)} votos`);
    });
    lines.push('');
    lines.push(`⚖️ Diferencia: *${fmtN(onpe.diferenciaVotos)} votos*`);
    lines.push(`🕒 Dato ONPE al: ${fecha}`);
  } else {
    lines.push('📊 *CONTEO OFICIAL ONPE:* No disponible ahora.');
    if (onpeError) lines.push(`   (motivo: ${onpeError})`);
  }

  return lines.join('\n');
}

/** ¿Hay un cambio significativo entre dos snapshots? (para enviar fuera del heartbeat) */
export function hasSignificantChange(prev, curr) {
  if (!prev) return true;
  const o1 = prev.onpe, o2 = curr.onpe;
  if (o1 && o2) {
    if (o1.lider?.candidato !== o2.lider?.candidato) return true;            // cambió el líder
    if (Math.abs((o1.actasContabilizadas || 0) - (o2.actasContabilizadas || 0)) >= 0.5) return true; // +0.5pp actas
    const pct1 = o1.candidatos?.[0]?.pct || 0, pct2 = o2.candidatos?.[0]?.pct || 0;
    if (Math.abs(pct1 - pct2) >= 0.05) return true;                          // +0.05pp en el líder
  } else if (!!o1 !== !!o2) {
    return true; // ONPE pasó de disponible a no disponible o viceversa
  }
  const p1 = prev.polymarket, p2 = curr.polymarket;
  if (p1 && p2 && p1.fujimori != null && p2.fujimori != null) {
    if (Math.abs(p1.fujimori - p2.fujimori) >= 0.02) return true;            // +2pp en Polymarket
  }
  return false;
}
