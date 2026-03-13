
async function tryEnv() {
  const envs = ['/producao', '/E1', '/AZ1', '/SANCO'];
  const c = '05502390000200';
  for(const e of envs) {
    const url = `http://170.82.192.22:9999/escalasoft/armazem${e}/estoquemercadoria?cnpj=${c}`;
    console.log(`Trying: ${url}`);
    try {
      const resp = await fetch(url);
      console.log(`  Env ${e} -> ${resp.status}`);
    } catch(e) {}
  }
}
tryEnv();
