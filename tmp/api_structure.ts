
async function checkStructure() {
  const url = 'http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria?cnpj=05502390000200';
  const resp = await fetch(url);
  const data = await resp.json() as any;
  
  const keys = Object.keys(data);
  console.log(`Top level keys: ${keys.join(', ')}`);
  
  if (data.TotalRegistros) console.log(`TotalRegistros claimed: ${data.TotalRegistros}`);
  if (data.TotalPaginas) console.log(`TotalPaginas: ${data.TotalPaginas}`);
  if (data.PaginaAtual) console.log(`PaginaAtual: ${data.PaginaAtual}`);
  
  if (data.EstoqueMercadoria) {
    console.log(`Items in this array: ${data.EstoqueMercadoria.length}`);
  }
}
checkStructure();
