
async function tryFilialE1() {
  const c = '05502390000200';
  const url = `http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=${c}&filial=E1`;
  console.log(`Trying filial E1: ${url}`);
  try {
    const resp = await fetch(url);
    const data = await resp.json() as any;
    const items = data.EstoqueMercadoria || [];
    console.log(`  Count for E1: ${items.length}`);
    if (items.length > 0) {
      const match = items.filter((it:any) => i.Item && it.Item.includes('4303'));
      if (match.length > 0) {
         console.log(`  Found 4303 in E1!`);
         match.forEach((m:any) => console.log(`  - ${m.Item}: ${m.SaldoDisponivel?.Quantidade} at ${m.Endereco}`));
      }
    }
  } catch(e) {}
}
tryFilialE1();
