async function run() {
  const url = 'https://resultadosegundavuelta.onpe.gob.pe/presentacion-backend/resumen-general/totales';
  
  // Let's test a few combinations of params
  const testPayloads = [
    {
      idAmbitoGeografico: 1, // 1 is usually domestic, 2 is foreign, or 0 for total
      idEleccion: 10,       // 2021 presidential runoff election ID might be 10, 11, etc.
      tipoFiltro: "eleccion",
      idDistritoElectoral: null,
      idUbigeoDepartamento: null,
      idUbigeoProvincia: null,
      idUbigeoDistrito: null
    },
    {
      idAmbitoGeografico: 1,
      idEleccion: 1,
      tipoFiltro: "eleccion",
      idDistritoElectoral: null,
      idUbigeoDepartamento: null,
      idUbigeoProvincia: null,
      idUbigeoDistrito: null
    },
    {
      idAmbitoGeografico: 0,
      idEleccion: 10,
      tipoFiltro: "eleccion",
      idDistritoElectoral: null,
      idUbigeoDepartamento: null,
      idUbigeoProvincia: null,
      idUbigeoDistrito: null
    }
  ];

  for (let i = 0; i < testPayloads.length; i++) {
    const payload = testPayloads[i];
    console.log(`Sending Payload ${i + 1}:`, payload);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        body: JSON.stringify(payload)
      });
      console.log("Status:", res.status);
      const data = await res.json();
      console.log("Response Data:", JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("Error for payload:", err.message);
    }
  }
}
run();
