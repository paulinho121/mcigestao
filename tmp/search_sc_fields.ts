
async function searchByFields() {
  const url = 'http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=05502390000200';
  const resp = await fetch(url);
  const data = await resp.json() as any;
  const items = data.EstoqueMercadoria || [];
  
  const matches = items.filter((i:any) => JSON.stringify(i).includes('2671'));
  console.log(`Found ${matches.length} items containing "2671".`);
  if (matches.length > 0) {
    matches.forEach(m => console.log(`- Item: ${m.Item}, Qty: ${m.SaldoDisponivel?.Quantidade}, Link: ${JSON.stringify(m)}`));
  }
}
searchByFields();
