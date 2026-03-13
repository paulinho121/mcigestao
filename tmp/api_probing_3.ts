
async function tryVariations() {
  const c = '05502390000200';
  const prefix = 'http://170.82.192.22:9999/escalasoft/armazem/producao';
  
  const endpts = [
     '/items', 
     '/estoque',
     '/saldos',
     '/lista'
  ];

  for(const e of endpts) {
    const url = `${prefix}${e}?cnpj=${c}`;
    console.log(`Trying: ${url}`);
    try {
      const resp = await fetch(url);
      console.log(`  Status: ${resp.status}`);
      if (resp.status === 200) {
        const d = await resp.json();
        console.log(`  Keys: ${Object.keys(d).join(',')}`);
      }
    } catch(e) {}
  }
}
tryVariations();
