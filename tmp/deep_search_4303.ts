
async function findSpecific4303() {
  const url = 'http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=05502390000200';
  console.log(`Deep searching for "4303" in API response...`);
  
  try {
    const response = await fetch(url);
    const apiData = await response.json() as any;
    const items = apiData.EstoqueMercadoria || [];
    
    // Exact code search, but also any containing it
    const results = items.filter((i: any) => {
        const itemStr = (i.Item || '').toUpperCase();
        return itemStr.includes('4303');
    });
    
    console.log(`Total entries containing "4303": ${results.length}`);
    results.forEach((item: any, index: number) => {
        console.log(`[${index}] Item: "${item.Item}"`);
        console.log(`    Qtde: ${item.SaldoDisponivel?.Quantidade}`);
        // Log all fields to see if there is any "Almoxarifado" or similar that explains why it might be split
        console.log(`    Fields: ${JSON.stringify(item)}`);
        console.log('---');
    });

  } catch (e: any) {
    console.error('API Error:', e.message);
  }
}

findSpecific4303();
