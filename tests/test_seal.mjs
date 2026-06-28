import { SealClient } from '@mysten/seal';
import { SuiClient } from '@mysten/sui/client';
const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });

const compatSuiClient = new Proxy(client, {
  get(target, prop) {
    if (prop === "core") {
      return new Proxy(target, {
        get(coreTarget, coreProp) {
          if (coreProp === "getObject") {
            return async (args) => {
              if (args && args.objectId && !args.id) args.id = args.objectId;
              if (args && args.include) {
                args.options = {};
                if (args.include.content) args.options.showContent = true;
                if (args.include.bcs) args.options.showBcs = true;
              }
              const result = await coreTarget.getObject(args);
              if (result && result.data) {
                return { ...result, object: { ...result.data, version: "1" } };
              }
              return result;
            };
          }
          if (coreProp === "getDynamicField") {
            return async (args) => {
              const res = await coreTarget.getDynamicFieldObject(args);
              if (res && res.data) {
                 return { ...res, dynamicField: { value: { bcs: res.data.bcs.bcsBytes } } };
              }
              return res;
            }
          }
          return coreTarget[coreProp];
        }
      });
    }
    return target[prop];
  }
});

const sealClient = new SealClient({
  suiClient: compatSuiClient,
  serverConfigs: [
    { objectId: "0xccce1f9aee31e7cc27173e91129be0ecf6b645b206771d99fb3ba73e2cb5cf06", weight: 1 }
  ]
});

async function run() {
  try {
    await sealClient.encrypt({
      packageId: "0xdccbeb87767be2b2346af5575eb139807205e4c23ec53dc616f951fe1d814112",
      id: "0xsomeid",
      data: new Uint8Array([1, 2, 3]),
      threshold: 1
    });
    console.log("Success");
  } catch (e) {
    console.error(e);
  }
}
run();
