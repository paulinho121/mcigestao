
async function findAny4303InCNPJs() {
  const code = '4303';
  const cnpjs = ['05502390000100', '05502390000200', '05502390000300', '05502390000400', '05502390000500'];
  
  for (const cnpj of cnpjs) {
    const url = `http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=${cnpj}`;
    console.log(`Searching CNPJ ${cnpj}...`);
    try {
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const data = await resp.json() as any;
      const items = data.EstoqueMercadoria || [];
      const m = items.filter((i:any) => i.Item && i.Item.includes(code));
      if (m.length > 0) {
        m.forEach((it:any) => console.log(`  - CNPJ ${cnpj}: ${it.Item}, Qty: ${it.SaldoDisponivel?.Quantidade}, Filial: ${it.Filial}`));
      }
    } catch(e) {}
  }
}
findAny4303InCNPJs();
