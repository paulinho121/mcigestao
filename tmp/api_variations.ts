
async function tryParams() {
  const code = '4303';
  const baseUrl = 'http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=05502390000200';
  
  const variations = [
    '&incluirSeries=true',
    '&detalhado=true',
    '&limite=2000',
    '&registrosPorPagina=2000'
  ];

  for (const v of variations) {
    const url = baseUrl + v;
    console.log(`Trying variation: ${url}`);
    try {
      const resp = await fetch(url);
      const data = await resp.json() as any;
      const items = data.EstoqueMercadoria || [];
      console.log(`  Count: ${items.length}`);
      const matches = items.filter((i:any) => i.Item && i.Item.includes(code));
      if (matches.length > 0) {
         console.log(`  Found ${matches.length} matches for 4303!`);
         matches.forEach((m:any) => console.log(`  - ${m.Item}: Qty ${m.SaldoDisponivel?.Quantidade}, Serie: ${m.Serie}, Endereco: ${m.Endereco}`));
      }
    } catch(e) {}
  }
}
tryParams();
