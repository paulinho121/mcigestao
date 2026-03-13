
async function tryAlmoxarifados() {
  const c = '05502390000200';
  const prefix = 'http://170.82.192.22:9999/escalasoft/armazem';
  const contexts = ['producao', 'vendas', 'geral', 'estoque', 'qualidade', 'transferencia'];
  
  for(const ct of contexts) {
    const url = `${prefix}/${ct}/estoquemercadoria?cnpj=${c}`;
    console.log(`Trying context ${ct}: ${url}`);
    try {
       const resp = await fetch(url);
       console.log(`  Context ${ct} -> ${resp.status}`);
       if (resp.status === 200) {
          const d = await resp.json() as any;
          console.log(`  Items in ${ct}: ${d.EstoqueMercadoria?.length || 0}`);
       }
    } catch(e) {}
  }
}
tryAlmoxarifados();
