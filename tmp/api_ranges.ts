
async function tryRanges() {
  const c = '05502390000200';
  const baseUrl = `http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=${c}`;
  
  const ranges = [
    `&deCodigo=4000&ateCodigo=5000`,
    `&inicio=4000&fim=5000`,
    `&de=4000&ate=5000`
  ];

  for (const r of ranges) {
    const url = baseUrl + r;
    console.log(`Trying: ${url}`);
    const res = await fetch(url);
    const data = await res.json() as any;
    const items = data.EstoqueMercadoria || [];
    console.log(`  Count for range: ${items.length}`);
    if (items.length > 0 && items.length < 727) {
       console.log(`  FILTERED! Found ${items.length} items in range.`);
    }
  }
}
tryRanges();
