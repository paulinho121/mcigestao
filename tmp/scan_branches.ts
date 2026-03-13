
async function scanBranches() {
  const code = '4303';
  const base = '05502390';
  for(let b = 1; b <= 20; b++) {
    const s = String(b).padStart(4, '0') + '00';
    const cnpj = base + s;
    const url = `http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=${cnpj}`;
    try {
      const resp = await fetch(url);
      if (resp.status === 200) {
        const d = await resp.json() as any;
        const items = d.EstoqueMercadoria || [];
        if (items.length > 0) {
           console.log(`Branch ${s} (${cnpj}) found: ${items.length} items. Client: ${items[0].Cliente}`);
           const m = items.filter((it:any) => it.Item && it.Item.includes(code));
           if (m.length > 0) console.log(`  MATCH! Found 4303 in ${cnpj}`);
        }
      }
    } catch(e) {}
  }
}
scanBranches();
