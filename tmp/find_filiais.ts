
async function findFiliais() {
  const url = 'http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=05502390000200';
  const resp = await fetch(url);
  const data = await resp.json() as any;
  const items = data.EstoqueMercadoria || [];
  
  const filiais = new Set(items.map((i:any) => i.Filial));
  console.log('Available Filiais in this account:');
  filiais.forEach(f => console.log(`- ${f}`));
}
findFiliais();
