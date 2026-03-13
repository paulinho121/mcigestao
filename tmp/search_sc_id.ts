
async function searchId() {
  const url = 'http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=05502390000200';
  const resp = await fetch(url);
  const data = await resp.json() as any;
  const items = data.EstoqueMercadoria || [];
  
  const m = items.filter((i:any) => JSON.stringify(i).includes('560017'));
  console.log(`Found ${m.length} items containing "560017".`);
}
searchId();
