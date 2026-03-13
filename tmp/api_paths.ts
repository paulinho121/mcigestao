
async function tryPaths() {
  const c = '05502390000200';
  const prefix = 'http://170.82.192.22:9999/escalasoft';
  
  const paths = [
    '/armazem/producao',
    '/estoquemercadoria',
    '/materialSuprimento/produto/consultar',
    '/estoque/v1/saldos'
  ];

  for (const p of paths) {
    const url = `${prefix}${p}/estoquemercadoria?cnpj=${c}`;
    console.log(`Trying: ${url}`);
    try {
      const resp = await fetch(url);
      console.log(`  Path ${p} -> ${resp.status}`);
      if (resp.status === 200) console.log('  Found something!');
    } catch(e) {}
  }
}
tryPaths();
