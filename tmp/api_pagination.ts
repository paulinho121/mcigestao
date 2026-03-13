
async function checkPagination() {
  const urlBase = 'http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=05502390000200';
  
  for (let p = 1; p <= 3; p++) {
    const url = `${urlBase}&pagina=${p}`;
    console.log(`Checking page ${p}: ${url}`);
    const resp = await fetch(url);
    const data = await resp.json() as any;
    const items = data.EstoqueMercadoria || [];
    console.log(`Page ${p} has ${items.length} items.`);
    if (items.length > 0) {
      const match = items.filter((i:any) => i.Item && i.Item.includes('4303'));
      if (match.length > 0) {
        console.log(`  Found 4303 on page ${p}!`);
        match.forEach((m:any) => console.log(`  - ${m.Item}: ${m.SaldoDisponivel?.Quantidade} at ${m.Endereco}`));
      }
    }
  }
}
checkPagination();
