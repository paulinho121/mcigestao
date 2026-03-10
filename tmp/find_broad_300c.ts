
async function findAny300C() {
  const url = 'http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=05502390000200';
  console.log(`Analyzing full API response for anything related to "300C"...`);
  
  try {
    const response = await fetch(url);
    const apiData = await response.json() as any;
    const items = apiData.EstoqueMercadoria || [];
    
    const results = items.filter((i: any) => {
        const str = JSON.stringify(i).toUpperCase();
        return str.includes('300C') || str.includes('4303');
    });
    
    console.log(`Found ${results.length} total entries containing "300C" or "4303".`);
    results.forEach((item: any) => {
        console.log(`Item: "${item.Item}"`);
        console.log(`Qtde: ${item.SaldoDisponivel?.Quantidade}`);
        console.log(`Preço/Valor: ${item.SaldoDisponivel?.Valor}`);
        console.log(`Local: ${item.Almoxarifado || 'N/A'}`);
        console.log('---');
    });

  } catch (e: any) {
    console.error('API Error:', e.message);
  }
}

findAny300C();
