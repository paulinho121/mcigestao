
async function scanCNPJs() {
  const code = '4303';
  const base = '05502390';
  const suffixes = ['000100', '000200', '000300', '000400', '000500'];
  
  for (const s of suffixes) {
    const cnpj = base + s;
    const url = `http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=${cnpj}`;
    console.log(`Scanning CNPJ: ${cnpj}...`);
    try {
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const data = await resp.json() as any;
      const items = data.EstoqueMercadoria || [];
      const match = items.filter((i:any) => i.Item && i.Item.includes(code));
      if (match.length > 0) {
        console.log(`  MATCH! Found ${match.length} items in ${cnpj}`);
        match.forEach((m:any) => console.log(`  - ${m.Item}: ${m.SaldoDisponivel?.Quantidade}`));
      }
    } catch(e) {}
  }
}
scanCNPJs();
