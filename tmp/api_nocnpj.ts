
async function checkNoCNPJ() {
  const url = 'http://170.82.192.22:9999/escalasoft/armazem/producao/estoquemercadoria';
  console.log(`Trying without CNPJ: ${url}`);
  try {
    const resp = await fetch(url);
    console.log(`  Status: ${resp.status}`);
    const data = await resp.json() as any;
    console.log(`  Items: ${data.EstoqueMercadoria?.length || 0}`);
  } catch(e: any) {
    console.log(`  Error: ${e.message}`);
  }
}
checkNoCNPJ();
