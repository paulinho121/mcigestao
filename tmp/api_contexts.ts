
async function tryContexts() {
  const contexts = ['armazem', 'materialSuprimento', 'estoque', 'producao'];
  const c = '05502390000200';
  for(const ct of contexts) {
    const url = `http://170.82.192.22:9999/escalasoft/${ct}/estoquemercadoria?cnpj=${c}`;
    console.log(`Trying context ${ct}: ${url}`);
    try {
       const resp = await fetch(url);
       console.log(`  Context ${ct} -> ${resp.status}`);
       if (resp.status === 200) {
          const d = await resp.json() as any;
          console.log(`  Items: ${d.EstoqueMercadoria?.length || 0}`);
       }
    } catch(e) {}
  }
}
tryContexts();
