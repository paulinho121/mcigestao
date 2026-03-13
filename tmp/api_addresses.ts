
async function checkAddresses() {
  const url = 'http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=05502390000200';
  const resp = await fetch(url);
  const data = await resp.json() as any;
  const items = data.EstoqueMercadoria || [];
  
  const addrs = new Set(items.map((i:any) => i.Endereco));
  console.log('Unique Addresses in this API:');
  addrs.forEach(a => console.log(`- ${a}`));
  
  const in6A340 = items.filter((i:any) => i.Endereco === '6A340');
  console.log(`Units in adress 6A340: ${in6A340.length}`);
}
checkAddresses();
