
async function trySearchParam() {
  const code = '4303';
  const c = '05502390000200';
  const baseUrl = `http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=${c}`;
  
  const parameters = [
    `&codigo=${code}`,
    `&id=${code}`,
    `&referencia=${code}`,
    `&filtro=${code}`,
    `&busca=${code}`,
    `&termo=${code}`,
    `&item_id=${code}`
  ];

  for (const p of parameters) {
    const url = baseUrl + p;
    console.log(`Trying: ${url}`);
    const r = await fetch(url);
    const d = await r.json() as any;
    const items = d.EstoqueMercadoria || [];
    console.log(`  Count: ${items.length}`);
    if (items.length > 0 && items.length < 727) {
      console.log(`  Filtered! Found ${items.length} items.`);
      items.forEach((it:any) => {
         if (JSON.stringify(it).includes(code)) {
            console.log(`  - Match: ${it.Item}, Qty: ${it.SaldoDisponivel?.Quantidade}, End: ${it.Endereco}`);
         }
      });
    }
  }
}
trySearchParam();
