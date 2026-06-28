/**
 * SealService — SEAL encryption/decryption using @mysten/seal SDK.
 *
 * SEAL (Secure Encrypted Aggregation Layer) provides TSS-based encryption
 * where decryption requires on-chain approval via a seal_approve call.
 *
 * Testnet config (from official SEAL docs):
 *   Package ID:  0xdccbeb87767be2b2346af5575eb139807205e4c23ec53dc616f951fe1d814112
 *   Key Server:  0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98
 *   Aggregator:  https://seal-aggregator-testnet.mystenlabs.com
 */

import {
  SealClient,
  SessionKey,
  type KeyServerConfig,
  type SealClientOptions,
} from "@mysten/seal";
import type { SuiClient } from "@mysten/sui/client";
import type { Signer } from "@mysten/sui/cryptography";
import { fromB64 } from "@mysten/sui/utils";
import {
  SEAL_PACKAGE_ID,
  SEAL_KEY_SERVER_OBJECT_ID,
  SEAL_AGGREGATOR_URL,
} from "@/lib/constants";

// ── Well-known SEAL configs ──────────────────────────────────────────────

const TESTNET_SEAL_PACKAGE_ID = SEAL_PACKAGE_ID;

const TESTNET_KEY_SERVERS: KeyServerConfig[] = [
  {
    objectId: SEAL_KEY_SERVER_OBJECT_ID,
    weight: 1,
    aggregatorUrl: SEAL_AGGREGATOR_URL,
  },
];

interface SealServiceConfig {
  suiClient: SuiClient;
  packageId?: string;
  keyServers?: KeyServerConfig[];
}

/**
 * Builds a SEAL identity string from a policy object ID.
 *
 * The SEAL SDK automatically prepends the package ID, so we only need
 * to provide the 32-byte (64-character) inner identity (e.g., agentId).
 *
 * @param policyObjectId - The on-chain policy/allowlist object ID
 */
export function buildSealId(policyObjectId: string): string {
  const objHex = policyObjectId.startsWith("0x") ? policyObjectId.slice(2) : policyObjectId;
  return objHex.padStart(64, "0");
}

/**
 * Encrypts data using SEAL.
 *
 * @param data          - Plaintext bytes
 * @param policyObjectId - The on-chain policy/allowlist object ID that gates decryption
 */
export async function encryptWithSeal(
  config: SealServiceConfig,
  data: Uint8Array,
  policyObjectId: string,
): Promise<{
  encryptedObject: Uint8Array;
  key: Uint8Array;
}> {
  const client = createSealClient(config);
  const servers = config.keyServers ?? TESTNET_KEY_SERVERS;
  const packageId = config.packageId ?? TESTNET_SEAL_PACKAGE_ID;

  // Build correct SEAL identity: JUST the policyObjectId, as the SDK handles packageId internally
  const sealId = buildSealId(policyObjectId);

  const result = await client.encrypt({
    threshold: Math.ceil(servers.length / 2) || 1,
    packageId,
    id: sealId,
    data,
  });

  return result;
}

/**
 * Decrypts data that was encrypted with SEAL.
 *
 * Requires a SessionKey and txBytes from a transaction that includes a
 * seal_approve call.
 *
 * @param encryptedObject - The BCS bytes of the encrypted object
 * @param sessionKey - A SEAL session key instance
 * @param txBytes - Transaction bytes that include a seal_approve call
 * @returns The decrypted plaintext bytes
 */
export async function decryptWithSeal(
  config: SealServiceConfig,
  encryptedObject: Uint8Array,
  sessionKey: SessionKey,
  txBytes: Uint8Array,
): Promise<Uint8Array> {
  const client = createSealClient(config);

  try {
    return await client.decrypt({
      data: encryptedObject,
      sessionKey,
      txBytes,
    });
  } catch (err: any) {
    throw new Error(`[SealService] Decryption failed: ${err?.message ?? String(err)}`);
  }
}

// ── Internal helpers ─────────────────────────────────────────────────────

/**
 * @mysten/seal 1.2.1 expects `suiClient.core.getObject({ objectId: ... })`
 * @mysten/sui 1.24.0 doesn't have `.core` and expects `.getObject({ id: ... })`.
 */
const clientCache = new WeakMap<object, any>();

function getCompatSuiClient(suiClient: any): any {
  if (clientCache.has(suiClient)) return clientCache.get(suiClient)!;

  const proxied = new Proxy(suiClient, {
    get(target, prop) {
      if (prop === "core") {
        return new Proxy(target, {
          get(coreTarget, coreProp) {
            if (coreProp === "getObject") {
              return async (args: any) => {
                if (args && args.objectId && !args.id) {
                  args.id = args.objectId;
                }
                
                // Always ensure showContent and showBcs are enabled
                args.options = {
                  ...args.options,
                  showContent: true,
                  showBcs: true,
                };

                const result = await (coreTarget as any).getObject(args);
                
                if (result && result.data) {
                  const objectData: any = {
                    ...result.data,
                    // version must be a numeric string — never use digest here
                    version: result.data.version ?? "1",
                  };
                  
                  // Map bcsBytes back to `content` property as a Uint8Array if requested
                  if (result.data.bcs?.bcsBytes) {
                    objectData.content = fromB64(result.data.bcs.bcsBytes);
                  }
                  
                  return {
                    ...result,
                    object: objectData,
                  };
                }
                return result;
              };
            }
            if (coreProp === "getDynamicField") {
              return async (args: any) => {
                // @mysten/seal expects `getDynamicField` but new SDK uses `getDynamicFieldObject`
                const res = await (coreTarget as any).getDynamicFieldObject(args);
                if (res && res.data) {
                  const bcsBytes = res.data.bcs?.bcsBytes;
                  // Preserve decoding here because SEAL SDK parses it via BCS library directly
                  return {
                    ...res,
                    dynamicField: {
                      value: {
                        bcs: bcsBytes ? fromB64(bcsBytes) : undefined,
                      }
                    }
                  };
                }
                return res;
              };
            }
            return (coreTarget as any)[coreProp];
          }
        });
      }
      return (target as any)[prop];
    },
  });

  clientCache.set(suiClient, proxied);
  return proxied;
}

/**
 * Create a SEAL SessionKey for the current user.
 *
 * The session key authorizes the user to request decryption keys from
 * the SEAL key servers for a specific package.
 *
 * @param address - The user's Sui address
 * @param packageId - The SEAL package ID (or app's package ID for namespace)
 * @param signer - Optional signer (e.g., EnokiSigner) for personal message signing
 * @param ttlMin - Session TTL in minutes (default 60)
 * @returns A SessionKey instance
 */
export async function createSessionKey(
  config: SealServiceConfig,
  address: string,
  packageId?: string,
  signer?: Signer,
  ttlMin: number = 60,
): Promise<SessionKey> {
  if (!signer) {
    throw new Error("[SealService] A signer is required to create a SessionKey.");
  }

  const suiClient = getCompatSuiClient(config.suiClient);

  const sessionKey = await SessionKey.create({
    address,
    packageId: packageId ?? TESTNET_SEAL_PACKAGE_ID,
    ttlMin,
    signer,
    suiClient,
  });

  return sessionKey;
}

/**
 * Fetch SEAL keys from the key servers to prepare for decryption.
 * Call this once before decrypting multiple encrypted objects.
 */
export async function fetchSealKeys(
  config: SealServiceConfig,
  ids: string[],
  txBytes: Uint8Array,
  sessionKey: SessionKey,
  threshold: number = 1,
): Promise<void> {
  if (!ids.length) {
    throw new Error("[SealService] fetchSealKeys: ids array must not be empty.");
  }
  
  // Validate format
  // SEAL inner ids are raw 64-char hex (no 0x prefix)
  if (!ids.every(id => typeof id === "string" && /^[0-9a-f]{64}$/i.test(id))) {
    throw new Error(
      "[SealService] fetchSealKeys: ids must be 64-char raw hex strings from buildSealId()."
    );
  }

  const client = createSealClient(config);

  await client.fetchKeys({
    ids,
    txBytes,
    sessionKey,
    threshold,
  });
}

function createSealClient(config: SealServiceConfig): SealClient {
  const compatSuiClient = getCompatSuiClient(config.suiClient);

  const options: SealClientOptions = {
    suiClient: compatSuiClient as any,
    serverConfigs: config.keyServers ?? TESTNET_KEY_SERVERS,
    verifyKeyServers: false, // testnet servers don't pass strict verification
  };

  return new SealClient(options);
}
