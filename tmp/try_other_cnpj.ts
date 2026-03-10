
async function tryHQCNPJ() {
  const code = '4303';
  const hqCnpj = '05502390000100';
  const scCnpj = '05502390000200';
  
  const urls = [
    `http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=${hqCnpj}`,
    `http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=${scCnpj}`
  ];

  for (const url of urls) {
    console.log(`Checking URL: ${url}`);
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        console.log(`Failed for this CNPJ: ${resp.status}`);
        continue;
      }
      const data = await resp.json() as any;
      const items = data.EstoqueMercadoria || [];
      const matching = items.filter((i:any) => i.Item && i.Item.includes(code));
      if (matching.length > 0) {
        console.log(`FOUND ${matching.length} items for ${code} in this CNPJ!`);
        matching.forEach((m:any) => console.log(`- Qty: ${m.SaldoDisponivel?.Quantidade}, Item: ${m.Item}`));
      } else {
        console.log(`No 4303 found for this CNPJ.`);
      }
    } catch (e: any) {
      console.error(`Error for ${url}: ${e.message}`);
    }
  }
}
tryHQCNPJ();
