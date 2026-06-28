const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { getCompatSuiClient } = require('./lib/SealService.js');
// Wait, lib/SealService is in TS. Let's just use ts-node to run it.
