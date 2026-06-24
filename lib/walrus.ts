/**
 * Walrus Integration for GhostPay Agent Memory
 * 
 * GhostPay uses Walrus to store encrypted payslips, KYC data, and autonomous 
 * agent decisions. By storing large unstructured blobs on Walrus, we keep 
 * the on-chain Sui footprint extremely lightweight while retaining 
 * cryptographically verifiable memory for compliance and auditing.
 */

export const WALRUS_PUBLISHER_URL = 'https://publisher.walrus-testnet.walrus.space';
export const WALRUS_AGGREGATOR_URL = 'https://aggregator.walrus-testnet.walrus.space';

export interface WalrusStoreResponse {
  newlyCreated?: { blobObject: { blobId: string } };
  alreadyCertified?: { blobId: string };
}

/**
 * Stores arbitrary encrypted agent data on Walrus.
 * @param data The payload (string, Blob, or Buffer)
 * @param epochs Number of Sui epochs to persist the blob for
 * @returns The unique Walrus blobId
 */
export async function storeAgentMemory(data: string | Blob | ArrayBuffer, epochs = 5): Promise<string> {
  const response = await fetch(`${WALRUS_PUBLISHER_URL}/v1/store?epochs=${epochs}`, {
    method: 'PUT',
    body: data,
  });

  if (!response.ok) {
    throw new Error(`Walrus store failed: ${response.statusText}`);
  }

  const result: WalrusStoreResponse = await response.json();
  const blobId = result.newlyCreated?.blobObject.blobId || result.alreadyCertified?.blobId;

  if (!blobId) {
    throw new Error('Failed to parse Walrus blobId from response');
  }

  return blobId;
}

/**
 * Retrieves an agent's encrypted memory payload from Walrus.
 * @param blobId The unique Walrus blob identifier
 * @returns The raw data buffer
 */
export async function retrieveAgentMemory(blobId: string): Promise<ArrayBuffer> {
  const response = await fetch(`${WALRUS_AGGREGATOR_URL}/v1/${blobId}`);
  
  if (!response.ok) {
    throw new Error(`Walrus read failed: ${response.statusText}`);
  }

  return await response.arrayBuffer();
}
