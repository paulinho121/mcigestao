
async function searchByDescription() {
  const url = 'http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=05502390000200';
  console.log(`Searching API for "AMARAN 300C"...`);
  
  try {
    const response = await fetch(url);
    const apiData = await response.json() as any;
    const items = apiData.EstoqueMercadoria || [];
    
    const relevantItems = items.filter((i: any) => i.Item && i.Item.toUpperCase().includes('AMARAN 300C'));
    
    if (relevantItems.length > 0) {
      console.log(`Found ${relevantItems.length} items for "AMARAN 300C":`);
      relevantItems.forEach((item: any) => {
        console.log(`Item String: "${item.Item}"`);
        console.log(`Quantidade: ${item.SaldoDisponivel?.Quantidade}`);
        console.log(`Valor: ${item.SaldoDisponivel?.Valor}`);
        console.log('---');
      });
    } else {
      console.log(`No items for "AMARAN 300C" found in SC API.`);
    }
    
    // Check if there are other items starting with digits near 4303
    console.log(`Checking items near 4303 specifically...`);
    const codesNear = items.filter((i:any) => i.Item && /^(430[0-9])/.test(i.Item));
    codesNear.forEach((item: any) => {
        console.log(`Item near: "${item.Item}" (Qty: ${item.SaldoDisponivel?.Quantidade})`);
    });

  } catch (e: any) {
    console.error('API Error:', e.message);
  }
}

searchByDescription();
