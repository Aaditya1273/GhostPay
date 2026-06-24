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

// ── Well-known SEAL configs ──────────────────────────────────────────────

const TESTNET_SEAL_PACKAGE_ID =
  "0xdccbeb87767be2b2346af5575eb139807205e4c23ec53dc616f951fe1d814112";

const TESTNET_KEY_SERVERS: KeyServerConfig[] = [
  {
    objectId:
      "0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98",
    weight: 1,
    aggregatorUrl: "https://seal-aggregator-testnet.mystenlabs.com",
  },
];

interface SealServiceConfig {
  suiClient: SuiClient;
  packageId?: string;
  keyServers?: KeyServerConfig[];
}

/**
 * Encrypts data using SEAL under a given identity (e.g., the user's address).
 *
 * The data is encrypted such that only transactions authorized by the identity
 * can decrypt it (via a seal_approve call in a Move contract).
 *
 * @param data - The plaintext bytes to encrypt
 * @param id - The identity to encrypt under (typically the user's Sui address)
 * @returns The encrypted object (BCS bytes) and the 256-bit symmetric key
 */
export async function encryptWithSeal(
  config: SealServiceConfig,
  data: Uint8Array,
  id: string,
): Promise<{
  encryptedObject: Uint8Array;
  key: Uint8Array;
}> {
  const client = createSealClient(config);

  const result = await client.encrypt({
    threshold: 1,
    packageId: config.packageId ?? TESTNET_SEAL_PACKAGE_ID,
    id,
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

  const result = await client.decrypt({
    data: encryptedObject,
    sessionKey,
    txBytes,
  });

  return result;
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
  const suiClient = config.suiClient as any;

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
  const client = createSealClient(config);

  await client.fetchKeys({
    ids,
    txBytes,
    sessionKey,
    threshold,
  });
}

// ── Internal helpers ─────────────────────────────────────────────────────

function createSealClient(config: SealServiceConfig): SealClient {
  const options: SealClientOptions = {
    suiClient: config.suiClient as any,
    serverConfigs: config.keyServers ?? TESTNET_KEY_SERVERS,
    verifyKeyServers: false,
  };

  return new SealClient(options);
}
