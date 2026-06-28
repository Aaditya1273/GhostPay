const { SuiClient } = require('@mysten/sui/client');
const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
async function test() {
  const result = await client.getObject({ id: '0xdccbeb87767be2b2346af5575eb139807205e4c23ec53dc616f951fe1d814112' });
  console.log(JSON.stringify(result, null, 2));
}
test();
