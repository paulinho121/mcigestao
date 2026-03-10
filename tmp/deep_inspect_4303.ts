
async function deepInspect4303() {
  const url = 'http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=05502390000200';
  const resp = await fetch(url);
  const data = await resp.json() as any;
  const items = data.EstoqueMercadoria || [];
  
  const m = items.filter((i:any) => i.Item && i.Item.toUpperCase().includes('4303'));
  console.log('Result for 4303:', JSON.stringify(m, null, 2));
}
deepInspect4303();
