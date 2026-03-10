
async function searchAllAmaran() {
  const url = 'http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=05502390000200';
  const resp = await fetch(url);
  const data = await resp.json() as any;
  const items = data.EstoqueMercadoria || [];
  
  const matches = items.filter((i:any) => (i.Item || '').toUpperCase().includes('AMARAN'));
  console.log(`Units found for "AMARAN": ${matches.length}`);
  matches.forEach(m => console.log(`- Item: ${m.Item}, Qty: ${m.SaldoDisponivel?.Quantidade}`));
}
searchAllAmaran();
