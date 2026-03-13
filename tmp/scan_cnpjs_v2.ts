
async function scanMoreCNPJs() {
  const code = '4303';
  const base = '05502390';
  for(let i = 100; i <= 2000; i += 100) {
    const s = String(i).padStart(6, '0');
    const cnpj = base + s;
    const url = `http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=${cnpj}`;
    try {
      const resp = await fetch(url);
      if (resp.status === 200) {
        const d = await resp.json() as any;
        const items = d.EstoqueMercadoria || [];
        if (items.length > 0) {
          console.log(`CNPJ ${cnpj} has ${items.length} items. Client: ${items[0].Cliente}`);
          const match = items.filter((it:any) => it.Item && it.Item.includes(code));
          if (match.length > 0) {
             console.log(`  MATCH! Found 4303 in ${cnpj}`);
          }
        }
      }
    } catch(e) {}
  }
}
scanMoreCNPJs();
