
async function findFullMetaData() {
  const url = 'http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=05502390000200';
  const resp = await fetch(url);
  const data = await resp.json() as any;
  const items = data.EstoqueMercadoria || [];
  
  const clientes = new Set(items.map((i:any) => i.Cliente));
  const filiais = new Set(items.map((i:any) => i.Filial));
  
  console.log('--- ALL CLIENTES ---');
  clientes.forEach(c => console.log(`- ${c}`));
  console.log('--- ALL FILIAIS ---');
  filiais.forEach(f => console.log(`- ${f}`));

  // Check if any item has code 4303 in OTHER fields or different formats
  const rawMatched = items.filter((i:any) => JSON.stringify(i).includes('4303'));
  console.log(`Total rows containing string "4303" anywhere: ${rawMatched.length}`);
}
findFullMetaData();
