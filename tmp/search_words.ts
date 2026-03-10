
async function searchByWords() {
  const url = 'http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=05502390000200';
  const resp = await fetch(url);
  const data = await resp.json() as any;
  const items = data.EstoqueMercadoria || [];
  
  const matches = items.filter((i:any) => {
    const s = (i.Item || '').toUpperCase();
    return s.includes('AMARAN') && s.includes('300C');
  });
  
  console.log(`Found ${matches.length} items with "AMARAN" and "300C":`);
  matches.forEach(m => console.log(`- Code/Desc: ${m.Item}, Qty: ${m.SaldoDisponivel?.Quantidade}`));
}
searchByWords();
