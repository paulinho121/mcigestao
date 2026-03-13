
async function trySeriesEndp() {
  const c = '05502390000200';
  const prefix = 'http://170.82.192.22:9999/escalasoft/armazem/producao';
  const routes = ['/serie', '/numserie', '/saldoserie', '/lote', '/saldolote'];
  
  for(const r of routes) {
    const url = `${prefix}${r}?cnpj=${c}`;
    console.log(`Trying: ${url}`);
    try {
      const resp = await fetch(url);
      console.log(`  Path ${r} -> ${resp.status}`);
    } catch(e) {}
  }
}
trySeriesEndp();
