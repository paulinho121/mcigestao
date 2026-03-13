
async function searchDeep() {
  const url = 'http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=05502390000200';
  const resp = await fetch(url);
  const data = await resp.json() as any;
  const items = data.EstoqueMercadoria || [];
  
  console.log(`Total items in API: ${items.length}`);
  
  // Search for 4303
  const byCode = items.filter((i:any) => i.Item && i.Item.includes('4303'));
  console.log(`Items with "4303" in description: ${byCode.length}`);
  byCode.forEach((it:any) => {
    console.log(`- Item: ${it.Item}, Qty: ${it.SaldoDisponivel?.Quantidade}, Serie: "${it.Serie}", Endereco: ${it.Endereco}`);
  });

  // Search for the specific serial numbers the user provided
  const serials = ['7audbh1029df', '7audbh102999', '7audbh1029a1', '7audbh1029a9']; 
  console.log('--- Searching for serials ---');
  items.forEach((it:any) => {
    const s = JSON.stringify(it);
    if (s.includes('7audbh')) {
       console.log(`FOUND serial fragment in: ${it.Item}, Serie: ${it.Serie}, Qty: ${it.SaldoDisponivel?.Quantidade}`);
    }
  });

  // Check if there are other items that might be the 300C but with different code or format
  const byName = items.filter((i:any) => i.Item && i.Item.toUpperCase().includes('AMARAN 300C') && !i.Item.includes('4303'));
  if (byName.length > 0) {
    console.log(`--- Found ${byName.length} items with "AMARAN 300C" but WITHOUT "4303" code ---`);
    byName.forEach((it:any) => console.log(`- ${it.Item}: ${it.SaldoDisponivel?.Quantidade}`));
  }
}
searchDeep();
