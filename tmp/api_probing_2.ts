
async function moreProbing() {
  const c = '05502390000200';
  const endpoints = [
    'http://170.82.192.22:9999/escalasoft/materialsuprimento/estoque/consultar',
    'http://170.82.192.22:9999/escalasoft/materialsuprimento/produto/consultar',
    'http://170.82.192.22:9999/escalasoft/armazem/movimentacao/estoquemercadoria',
    'http://170.82.192.22:9999/escalasoft/armazem/estoque/saldo'
  ];

  for (const url of endpoints) {
    const fullUrl = `${url}?cnpj=${c}`;
    console.log(`Trying: ${fullUrl}`);
    try {
      const resp = await fetch(fullUrl);
      console.log(`  Status: ${resp.status}`);
      if (resp.status === 200) {
        const d = await resp.json();
        console.log(`  Keys: ${Object.keys(d).join(', ')}`);
      }
    } catch(e) {}
  }
}
moreProbing();
