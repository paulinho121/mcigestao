
async function checkAnySeries() {
  const url = 'http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=05502390000200';
  const resp = await fetch(url);
  const data = await resp.json() as any;
  const items = data.EstoqueMercadoria || [];
  
  const withSeries = items.filter((i:any) => i.Serie && i.Serie.trim() !== '');
  console.log(`Units with Serie in API: ${withSeries.length}`);
  if (withSeries.length > 0) {
     console.log('Sample of units with series:');
     withSeries.slice(0, 5).forEach(m => console.log(`- Item: ${m.Item}, Serie: ${m.Serie}, Qty: ${m.SaldoDisponivel?.Quantidade}`));
  }
}
checkAnySeries();
