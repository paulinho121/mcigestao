
async function tryEndpoints() {
  const c = '05502390000200';
  const prefix = 'http://170.82.192.22:9999/escalasoft/armazem/producao';
  
  const endpoints = [
    '/estoquemercadoria',
    '/estoquedetalhado',
    '/estoqueseriado',
    '/movimentacaomercadoria',
    '/saldoserie'
  ];

  for (const e of endpoints) {
    const url = `${prefix}${e}?cnpj=${c}`;
    console.log(`Trying: ${url}`);
    try {
      const resp = await fetch(url);
      console.log(`  Status: ${resp.status}`);
      if (resp.status === 200) {
        const d = await resp.json() as any;
        console.log(`  Success! Keys: ${Object.keys(d).join(', ')}`);
        // If it's a list, check one
        const key = Object.keys(d)[0];
        if (Array.isArray(d[key])) {
           console.log(`  Found array with ${d[key].length} entries.`);
        }
      }
    } catch(e: any) {
       console.log(`  Error: ${e.message}`);
    }
  }
}
tryEndpoints();
