
async function tryOffset() {
  const urlBase = 'http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=05502390000200';
  const offsets = [700, 727, 800];
  
  for (const o of offsets) {
    const url = `${urlBase}&offset=${o}`;
    console.log(`Trying offset ${o}: ${url}`);
    const resp = await fetch(url);
    const data = await resp.json() as any;
    const items = data.EstoqueMercadoria || [];
    console.log(`  Count for offset ${o}: ${items.length}`);
    if (items.length > 0) {
      const match = items.filter((i:any) => i.Item && i.Item.includes('4303'));
      if (match.length > 0) console.log(`  Found 4303 with offset ${o}!`);
    }
  }
}
tryOffset();
