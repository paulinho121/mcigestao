
async function findAll300C() {
  const url = 'http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=05502390000200';
  const resp = await fetch(url);
  const data = await resp.json() as any;
  const items = data.EstoqueMercadoria || [];
  
  const matches = items.filter((i:any) => (i.Item || '').toUpperCase().includes('300C'));
  console.log(`Units found for "300C": ${matches.length}`);
  matches.forEach(m => console.log(`- ${m.Item}: Qty ${m.SaldoDisponivel?.Quantidade}`));
}
findAll300C();
