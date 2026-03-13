
async function findParents() {
  const parents = ['/armazem', '/comercial', '/logistica', '/materialsuprimento'];
  const c = '05502390000200';
  
  for(const p of parents) {
    const url = `http://170.82.192.22:9999/escalasoft${p}/producao/estoquemercadoria?cnpj=${c}`;
    console.log(`Trying: ${url}`);
    try {
      const resp = await fetch(url);
      console.log(`  Path ${p} -> ${resp.status}`);
      if (resp.status === 200) console.log('  Found it!');
    } catch(e) {}
  }
}
findParents();
