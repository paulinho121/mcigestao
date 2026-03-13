
async function tryFiliais() {
  const code = '4303';
  const c = '05502390000200';
  const baseUrl = `http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=${c}`;
  
  const branches = [
    'SANCO ARMAZENS LTDA - AZ1',
    'SANCO ARMAZENS LTDA - AZ2',
    'SANCO ARMAZENS LTDA - AZ3',
    'SANCO ARMAZENS LTDA - AZ4',
    'SANCO ARMAZENS LTDA - AZ5'
  ];

  for (const b of branches) {
    const url = baseUrl + `&filial=${encodeURIComponent(b)}`;
    console.log(`Trying filial: ${b}`);
    try {
      const resp = await fetch(url);
      const data = await resp.json() as any;
      const items = data.EstoqueMercadoria || [];
      console.log(`  Count for ${b}: ${items.length}`);
      if (items.length > 0) {
        const match = items.filter((it:any) => it.Item && it.Item.includes(code));
        if (match.length > 0) {
           console.log(`  Found 4303 in ${b}!`);
           match.forEach((m:any) => console.log(`  - ${m.Item}: ${m.SaldoDisponivel?.Quantidade} at ${m.Endereco}`));
        }
      }
    } catch(e) {}
  }
}
tryFiliais();
