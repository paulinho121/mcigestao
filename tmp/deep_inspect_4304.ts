
async function deepInspect4304() {
  const url = 'http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=05502390000200';
  const resp = await fetch(url);
  const data = await resp.json() as any;
  const items = data.EstoqueMercadoria || [];
  
  const m = items.filter((i:any) => i.Item && i.Item.toUpperCase().includes('4304'));
  console.log(`Units found for "4304": ${m.length}`);
  m.forEach(it => console.log(`- Qty: ${it.SaldoDisponivel?.Quantidade}`));
}
deepInspect4304();
