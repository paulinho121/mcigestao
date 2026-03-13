
async function checkItemFilter() {
  const code = '4303';
  const c = '05502390000200';
  const baseUrl = `http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=${c}`;
  
  const parameters = [
    `&item=${code}`,
    `&codigoItem=${code}`,
    `&referencia=${code}`,
    `&codigoExterno=${code}`
  ];

  for (const p of parameters) {
    const url = baseUrl + p;
    console.log(`Trying: ${url}`);
    const r = await fetch(url);
    const d = await r.json() as any;
    const items = d.EstoqueMercadoria || [];
    console.log(`  Count: ${items.length}`);
    if (items.length > 0) {
      items.forEach((it:any) => {
         console.log(`  - Item: ${it.Item}, Qty: ${it.SaldoDisponivel?.Quantidade}, Serie: ${it.Serie}, Lote: ${it.Lote}, Endereco: ${it.Endereco}`);
      });
    }
  }
}
checkItemFilter();
