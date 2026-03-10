
async function countCNPJItems() {
  const cnpjs = ['05502390000100', '05502390000200', '05502390000300', '05502390000400', '05502390000500'];
  for (const c of cnpjs) {
    const url = `http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=${c}`;
    try {
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const data = await resp.json() as any;
      console.log(`CNPJ ${c}: ${data.EstoqueMercadoria?.length || 0} items found.`);
    } catch(e) {}
  }
}
countCNPJItems();
