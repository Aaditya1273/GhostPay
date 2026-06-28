const { SuiClient } = require('@mysten/sui/client');
const client = new SuiClient({ url: 'http://foo' });
console.log(client.getDynamicFieldObject.toString());
