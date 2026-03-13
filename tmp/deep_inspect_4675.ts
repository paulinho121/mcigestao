
async function deepInspect4675() {
  const url = 'http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=05502390000200';
  const resp = await fetch(url);
  const data = await resp.json() as any;
  const items = data.EstoqueMercadoria || [];
  
  const m = items.filter((i:any) => i.Item && i.Item.includes('4675'));
  console.log('Result for 4675:', JSON.stringify(m, null, 2));
}
deepInspect4675();
