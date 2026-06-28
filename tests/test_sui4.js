const { SuiClient } = require('@mysten/sui/client');
const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
console.log(typeof client.getDynamicField);
console.log(typeof client.getDynamicFieldObject);
