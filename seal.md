Seal Design
For a comprehensive technical analysis and formal security proofs, see the Seal Whitepaper. The latest version (v2) incorporates the design and analysis of MPC committees for the decentralized mode key server.

Overview
Seal uses a cryptographic primitive called Identity-Based Encryption (IBE) to encrypt stored data. This design detail is abstracted away from both developers and users, as Seal does not have visibility into the data it helps secure.

An IBE scheme consists of the following algorithms:

Setup: Generates a master secret key msk and a master public key mpk.
Derive(msk, id): Given a master secret key and an identity id (string or byte array), generates a derived secret key sk for that identity.
Encrypt(mpk, id, m): Given a public key, an identity, and a message, returns an encryption c.
Decrypt(sk, c): Given a derived secret key and a ciphertext, compute the message m.
Such a scheme is correct if for any id and m, (msk, mpk) ← Setup() and c ← Encrypt(mpk, id, m) we have Decrypt(Derive(msk, id), c) = m.

The domain of identities is not fixed and can be any string or byte array. Seal uses this property to bound onchain strings to IBE identities.

Seal consists of two main components:

Access policies defined on Sui: A Move package at address PkgId controls the subdomain of IBE identities that starts with [PkgId] (that is, all strings of the form [PkgId]*). You can think of [PkgId] as an identity namespace. The package defines, through Move code, who is authorized to access the keys associated with its identity subdomain.
Off-chain key servers: Key servers are off-chain services that validate onchain access policies and return derived secret keys to authorized users. A key server can be independent, where a single operator holds the master secret key, or decentralized (committee mode), where a multi-party computation (MPC) committee splits the master secret across participants so no single party holds it alone.
Consider the following basic example for realizing time-lock encryption:

module patterns::tle;

use sui::bcs;
use sui::clock;

const ENoAccess : u64 = 1;

/////////////////////////////////////////////
/// Access control
/// The IBE identity being used: [pkg id][bcs::to_bytes(time)]
/// The following function accepts only the inner identity, i.e., [bcs::to_bytes(time)], and Seal extends it with the namespace.
entry fun seal_approve(id: vector<u8>, c: &clock::Clock) {
    // Convert the identity to u64.
    let mut prepared: BCS = bcs::new(id);
    let t = prepared.peel_u64();
    let leftovers = prepared.into_remainder_bytes();

    // Check that the time has passed and the entire identity is consumed.
    assert!((leftovers.length() == 0) && (c.timestamp_ms() >= t), ENoAccess);
}



Use an Agent
The module controls all IBE identities that begin with its package ID PkgId. To encrypt data with a time-lock T, a user selects a key server and encrypts the data using the identity [PkgId][bcs::to_bytes(T)] and the server's IBE master public key. Once the onchain time on Sui exceeds T, anyone can request the decryption key for the identity [PkgId][bcs::to_bytes(T)] from the Seal key server. Access control is enforced by the seal_approve function defined in the module. This function receives the requested identity (excluding the PkgId prefix) and a Clock as arguments. It returns success only if the current time is greater than or equal to T. The key server evaluates seal_approve to determine whether the derived key can be returned.

Time-lock encryption can be applied to a variety of onchain use cases, including MEV-resistant trading, secure voting, and more. For additional examples and useful implementation patterns, see Example patterns.

The framework is fully generic. Developers can define custom authorization logic within seal_approve* functions and choose which key servers to use based on their application's needs. For example, they can use a fixed set of trusted key servers or allow users to select their preferred servers.

When you upgrade a package, it retains the same identity subdomain. To support secure upgrades, follow the recommended best practices for versioned shared objects. Specifically, version your shared objects, or create a global versioned shared object for your package. For examples, see the allowlist and subscription patterns. Keep in mind that if a package is upgradeable, the access control policy can be changed at any time by the package owner. These changes are transparent and publicly visible onchain.

Decentralization and trust model
Seal is designed to reduce centralization using a couple of mechanisms.

First, users can choose any combination of one or more key servers and use their master public keys to encrypt data. This setup supports t-out-of-n threshold encryption, which ensures:

Privacy as long as fewer than t key servers are compromised.
Liveness as long as at least t key servers are available.
Seal does not mandate the use of any specific key server. Instead, users can select key servers based on their own trust assumptions. Key servers can vary in security characteristics, such as running within secure enclaves or being air-gapped, and can operate across different locations and jurisdictions.

info
The set of key servers is not dynamic once the data is encrypted, and encrypted data cannot be changed to use a different set of servers.

Second, a decentralized key server can also be implemented using an MPC committee in a t-out-of-n configuration. This committee can consist of Sui validators or any other group of participants. Users can choose to use decentralized key servers in addition to independent key servers. In this setup, the participants in the MPC committee can change over time, allowing for dynamic membership.

The security of encrypted data relies on the following assumptions:

Key server integrity: The Seal key servers are not compromised, or, in the case of threshold encryption, fewer than the required threshold are compromised. This includes both the Seal key servers and the Sui full nodes they depend on to evaluate the access policies.
Correct access control policy: The access control policy associated with the encrypted data is accurate and appropriately configured. If package upgrades are enabled, the package owner can modify the policy at any time.
Key server
A light server is initialized with an identity-based encryption (IBE) master secret key and has access to a trusted full node. In simple deployments, the server runs as a backend service with the secret key stored in protected storage, optionally secured using a software or hardware vault. More advanced deployments can use secure enclaves, MPC committees, or even air-gapped environments to enhance security.

The server exposes only two APIs:

/v1/service - Returns information about the service's onchain registered information.
/v1/fetch_key - Handles a request for one or more derived keys and returns them if access is permitted by the associated package or policies. Each request must meet the following requirements:
Be signed by the user's address using signPersonalMessage. For details, see the signed_message format.
Include a valid PTB, which is evaluated against the seal_approve* rules. For PTB construction guidelines, see valid_ptb.
Provide an ephemeral encryption key to encrypt the response. Encrypting the response ensures that only the requester (the initiator) can decrypt and access the returned keys.
See crates/key-server for the implementation of the key server.

User confirmation and sessions
Decryption keys returned from the key server are returned directly to the caller, which is typically the dApp's web page. To ensure that dApps can access only keys explicitly approved by the user, the user must approve the key access request in their wallet. This approval is granted once per package and authorizes a session key. The session key allows the dApp to retrieve associated decryption keys for a limited time without requiring repeated user confirmations.

Cryptographic primitives
Seal is designed to support multiple identity-based encryption (IBE) schemes as Key Encapsulation Mechanisms (KEMs) and various symmetric encryption schemes as Data Encapsulation Mechanisms (DEMs). Currently supported primitives include:

KEM: Boneh-Franklin IBE with the BLS12-381 curve.
DEM: AES-256-GCM, HMAC based CTR mode.
Prefer AES-256-GCM for most use cases as it is faster. Use HMAC-CTR only when you require onchain decryption.

Post-quantum primitives are planned to be added in the future.

For advanced encryption schemes, use Seal as a KMS to protect the scheme's secret key. This approach enables streaming, hardware-assisted, or chunked decryption while keeping keys out of application code.



Using Seal
Use this guide to learn how to protect your app and user data with Seal.

tip
Read the Seal Design document first to understand the underlying architecture and concepts before using this guide.

Access control management
Packages should define seal_approve* functions in their modules to control access to the keys associated with their identity namespace. Guidelines for defining seal_approve* functions:

A package can include multiple seal_approve* functions, each implementing different access control logic and accepting different input parameters.
The first parameter must be the requested identity, excluding the package ID prefix. For example: id: vector<u8>.
If access is not granted, the function should abort without returning a value.
To support future upgrades and maintain backward compatibility, define seal_approve* functions as non-public entry functions when possible, and either version your shared objects or use a versioned shared global object with the latest version (see allowlist and subscription examples).
See Example patterns for additional examples and high-level patterns.

As seal_approve* functions are standard Move functions, they can be tested locally using Move tests. Building and publishing the code can be done using the Sui CLI, for example:

cd examples/move
sui move build
sui client publish


Use an Agent
Limitations
The seal_approve* functions are evaluated on full nodes using the dry_run_transaction_block RPC call. This call executes the associated Move code using the full node's local view of the chain state. Because full nodes operate asynchronously, the result of dry_run_transaction_block can vary across nodes based on differences in their internal state.

When using seal_approve* functions, keep the following in mind:

Changes to onchain state can take time to propagate. As a result, full nodes might not always reflect the latest state.
seal_approve* functions are not evaluated atomically across all key servers. Avoid relying on frequently changing state to determine access, as different full nodes can observe different versions of the chain.
Do not rely on invariants that depend on the relative order of transactions within a checkpoint. For example, the following code assumes a specific ordering of increment operations, but full nodes can observe different intermediate counter values due to interleaved execution.
struct Counter {
    id: UID,
    count: u64,
}

public fun increment(counter: &mut Counter) {
    counter.count = counter.count + 1;
}

entry fun seal_approve(id: vector<u8>, cnt1: &Counter, cnt2: &Counter) {
    assert!(cnt1.count == cnt2.count, ENoAccess);
    ...
}


Use an Agent
seal_approve* functions must be side-effect free and cannot modify onchain state.
Although the Random module is available, its output is not secure and not deterministic across full nodes. Avoid using it within seal_approve* functions.
During Seal evaluation, only seal_approve* functions can be invoked directly. These functions should not assume composition with other PTB (Programmable Transaction Block) commands.
SealClient setup
The recommended way to encrypt and decrypt the data is to use the Seal SDK.

First, the app must select the set of key servers it intends to use. Each key server registers its name, public key, and URL onchain by creating a KeyServer object. To reference a key server, use the object ID of its corresponding KeyServer. A common approach for app developers is to use a fixed, preconfigured set of key servers within their app. Alternatively, the app can support a dynamic selection of key servers, for example, allowing users to choose which servers to use. In this case, the app should display a list of available key servers along with their URLs. After the user selects one or more servers, the app must verify that each provided URL corresponds to the claimed key server (see verifyKeyServers in the following section).

A key server can be used multiple times to enable weighting, which allows the app to specify how many times a key server can contribute towards reaching the decryption threshold. This is useful for scenarios where some key servers are more reliable or trusted than others, or when the app wants to ensure that certain key servers are always included in the decryption process.

info
Anyone can create an onchain KeyServer object that references a known URL (such as seal.mystenlabs.com) but uses a different public key. To prevent impersonation, the SDK can perform a verification step: it fetches the object ID from the server's /v1/service endpoint and compares it with the object ID registered onchain.

Choosing key servers
Select key server object IDs from the verified key servers available in each environment.

Seal supports two server types, independent and decentralized (committee mode), which you can use individually or in combination. To understand the differences of server types and use cases, see Seal Server Overview.

info
Each key server (whether independent or decentralized) counts as one server in your threshold configuration and integrates through the same SealClient interface.

Option 1: Decentralized-only
Use a single decentralized server to get built-in distributed trust and rotation support.

const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

const client = new SealClient({
  suiClient,
  serverConfigs: [
    // Decentralized server object ID and aggregator URL from https://seal-docs.wal.app/Pricing#verified-decentralized-key-servers
    {
      objectId: "0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98",
      aggregatorUrl: "https://seal-aggregator-testnet.mystenlabs.com",
      weight: 1,
      // Add apiKeyName and apiKey if the server requires authentication (see "API key authentication" below).
    },
  ],
  verifyKeyServers: false,
});



Use an Agent
Option 2: Independent-only
Direct operator model with simpler infrastructure relationships.

const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

const client = new SealClient({
  suiClient,
  serverConfigs: [
    // Independent servers from https://seal-docs.wal.app/Pricing#verified-independent-server-type-key-servers
    {
      objectId: "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75",
      weight: 1,
      // Add apiKeyName and apiKey if the server requires authentication (see "API key authentication" below).
    },
    {
      objectId: "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8",
      weight: 1,
      // Add apiKeyName and apiKey if the server requires authentication (see "API key authentication" below).
    }
  ],
  verifyKeyServers: false,
});



Use an Agent
Option 3: Hybrid (decentralized + independent)
Flexible trust distribution and cost control.

const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

const client = new SealClient({
  suiClient,
  serverConfigs: [
    // Decentralized server object ID and aggregator URL from https://seal-docs.wal.app/Pricing#verified-decentralized-key-servers
    {
      objectId: "0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98",
      aggregatorUrl: "https://seal-aggregator-testnet.mystenlabs.com",
      weight: 1,
      // Add apiKeyName and apiKey if the server requires authentication (see "API key authentication" below).
    },
    // Independent server from https://seal-docs.wal.app/Pricing#verified-independent-server-type-key-servers
    {
      objectId: "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75",
      weight: 1,
      // Add apiKeyName and apiKey if the server requires authentication (see "API key authentication" below).
    }
  ],
  verifyKeyServers: false,
});



Use an Agent
The serverConfigs is a list of objects, where each object contains:

objectId (required): The key server object ID
weight (required): How many times the key server can contribute towards reaching the decryption threshold
aggregatorUrl (required for decentralized servers): The aggregator endpoint URL
apiKeyName and apiKey (optional): Required if the server requires API key authentication
For decentralized servers: Include if the aggregator is configured to require API keys
For independent servers: Include if using Permissioned mode
Set verifyKeyServers to true if the app or user needs to confirm that the provided URLs correctly correspond to the claimed key servers, as described in the preceding section. Enabling verification introduces additional round-trip requests to the key servers. For best performance, use this option primarily when verifying key servers at app startup. Set verifyKeyServers to false when verification is not required.

tip
API key authentication
Some servers require API keys for authentication:

Decentralized servers: If the aggregator is configured to require API keys (check with the committee operator)
Independent servers (Permissioned mode): Always require API keys (contact the provider)
Include the fields apiKeyName and apiKey in the server configuration object when required. The SDK sends these as an HTTP header in the format apiKeyName: apiKey.

You can obtain an API key from Enoki. The header name is always X-API-Key.

For example, if a server expects the header X-API-Key: my123api456key, configure the server object as follows:

{
  objectId: id, // See the Pricing page for verified key server object IDs
  weight: 1,
  apiKeyName: "X-API-Key",
  apiKey: "my123api456key",
  // aggregatorUrl: "...", // Include for decentralized servers; see the Pricing page for the aggregator URL
}



Use an Agent
See the Pricing page for the verified key server object IDs and aggregator URLs.

Confirm the API key value with your provider before including it in your threshold configuration.

Encryption
The app can call the encrypt method on the client instance. This function requires the following parameters:

The encryption threshold
The package ID of the deployed contract containing the seal_approve* functions
The ID associated with the access control policy (without the prefix of the package ID discussed in Seal Design)
The data to encrypt
The encrypt function returns two values: the encrypted object, and the symmetric key used for encryption (that is, the key from the DEM component of the KEM/DEM scheme). The symmetric key can either be ignored or returned to the user as a backup for disaster recovery. If retained, the user can decrypt the data manually using the CLI and the symmetric-decrypt command.

const { encryptedObject: encryptedBytes, key: backupKey } = await client.encrypt({
    threshold: 2,
    packageId,
    id,
    data,
});


Use an Agent
The encryption does not conceal the size of the message. If message size is considered sensitive, pad the message with zeros until its length no longer reveals meaningful information.

note
Seal supports encrypting an ephemeral symmetric key, which you can use to encrypt your actual content. This approach is useful when storing encrypted data immutably on Walrus while keeping the encrypted key separately on Sui. By managing the key separately, you can update access policies or rotate key servers without modifying the stored content.

tip
The encryptedBytes returned from the encryption call can be parsed using EncryptedObject.parse(encryptedBytes). It returns an EncryptedObject instance that includes metadata such as the ID and other associated fields.

Decryption
Decryption involves a few additional steps:

The app must create a SessionKey object to access the decryption keys for a specific package.
The user must approve the request by signing it in their wallet. This grants time-limited access to the associated keys.
The app stores the resulting signature in the SessionKey to complete its initialization.
Once initialized, the session key can be used to retrieve multiple decryption keys for the specified package without requiring further user confirmation.

const sessionKey = await SessionKey.create({
    address: suiAddress,
    packageId,
    ttlMin: 10, // TTL of 10 minutes
    suiClient: new SuiClient({ url: getFullnodeUrl('testnet') }),
});
const message = sessionKey.getPersonalMessage();
const { signature } = await keypair.signPersonalMessage(message); // User confirms in wallet
sessionKey.setPersonalMessageSignature(signature); // Initialization complete


Use an Agent
Notes on Session Key
You can also optionally initialize a SessionKey with a passed in Signer in the constructor. This is useful for classes that extend Signer, for example, EnokiSigner.
You can optionally set an mvrName value in the SessionKey. This should be the Move Package Registry name for the package. Seal requires the MVR name to be registered to the first version of the package for this to work. If this is set, the message shown to the user in the wallet would use the much more readable MVR package name instead of packageId.
You can optionally store the SessionKey object in IndexedDB instead of localStorage if you would like to persist the SessionKey across tabs. See usage for import and export methods in the SessionKey class.
The simplest way to perform decryption is to call the client's decrypt function. This function expects a Transaction object that invokes the relevant seal_approve* functions. The transaction must meet the following requirements:

It can only call seal_approve* functions.
All calls must be to the same package.
// Create the Transaction for evaluating the seal_approve function.
const tx = new Transaction();
tx.moveCall({
    target: `${packageId}::${moduleName}::seal_approve`, 
    arguments: [
        tx.pure.vector("u8", fromHEX(id)),
        // other arguments
   ]
 });  
const txBytes = tx.build( { client: suiClient, onlyTransactionKind: true })
const decryptedBytes = await client.decrypt({
    data: encryptedBytes,
    sessionKey,
    txBytes,
});


Use an Agent
Seal evaluates the transaction as if the user sent it. In Move, TxContext::sender() returns the account that signed with the session key.

The Seal policy is always checked against the current onchain state of the objects: the key server ignores the version and digest of object inputs in the PTB and resolves each to its latest onchain version.

tip
To debug a transaction, call dryRunTransactionBlock directly with the transaction block.

The SealClient caches keys retrieved from Seal key servers to optimize performance during subsequent decryptions, especially when the same ID is used across multiple encryptions. Reusing the same client instance helps reduce backend calls and improve latency. Refer to overall Performance Recommendations.

To retrieve multiple keys more efficiently, use the fetchKeys function with a multi-command PTB. This approach is recommended when multiple keys are required, as it reduces the number of requests to the key servers. Because key servers can apply rate limiting, developers should design their applications and access policies to minimize the frequency of key retrieval requests.

await client.fetchKeys({
    ids: [id1, id2],
    txBytes: txBytesWithTwoSealApproveCalls,
    sessionKey,
    threshold: 2,
});


Use an Agent
Check out the integration tests for a full end-to-end example. You can also explore the example app to see how to implement allowlist and NFT-gated content access in practice.

tip
If a key server request fails with an InvalidParameter error, the cause can be a recently created onchain object in the PTB input. The key server's full node might not have indexed it yet. Wait a few seconds and retry the request, as subsequent attempts should succeed once the node is in sync.

Onchain decryption
Seal supports onchain HMAC-CTR decryption in Move through the seal::bf_hmac_encryption package. This enables Move packages to decrypt Seal-encrypted objects and use the results in onchain logic such as auctions, secure voting (see voting.move), or other verifiable workflows.

Use one of the published Seal package IDs as the SEAL_PACKAGE_ID:

Network	Package ID
Testnet	0xdccbeb87767be2b2346af5575eb139807205e4c23ec53dc616f951fe1d814112
Mainnet	0x931739224160073d8e391c9aa6e7ade9818e9814b4907066b7efa058636c4e45
To decrypt an encrypted object in a Move package, follow these steps:

on-chain app initialization
Retrieve public keys with client.getPublicKeys and convert them with bf_hmac_encryption::new_public_key.
Store the key server public keys onchain.
The dapp or users should verify the correctness of those public keys before uploading their encryptions.
Verify derived keys
Use the Seal SDK client to fetch derived keys through client.getDerivedKeys, which returns a map of key server object IDs to their derived keys.
Convert bytes to Element<G1> or Element<G2> with from_bytes.
Call bf_hmac_encryption::verify_derived_keys with the raw keys, package ID, identity, and the vector of key server public keys.
The function returns a vector of VerifiedDerivedKey objects.
Perform decryption
Call bf_hmac_encryption::decrypt with the encrypted object, the verified derived keys, and the vector of public keys.
The function returns an Option<vector<u8>>. If decryption fails, the return value will be None.
Onchain decryption with the TypeScript SDK
You can use the TypeScript SDK to build a transaction that calls Seal's onchain decryption functions.

Before you decrypt (see Decryption), gather the following:

encryptedBytes: BCS-serialized encrypted object.
txBytes: a valid transaction block that calls the relevant seal_approve* policy function.
client: an initialized SealClient.
sessionKey: an initialized SessionKey.
SEAL_PACKAGE_ID: the Seal package ID for the network.
// 1. Parse the encrypted object.
const encryptedObject = EncryptedObject.parse(encryptedBytes);

// 2. Get derived keys from key servers for the encrypted object's ID. 
const derivedKeys = await client.getDerivedKeys({
  id: encryptedObject.id,
  txBytes,
  sessionKey,
  threshold: encryptedObject.threshold,
});

// 3. Get the public keys corresponding to the derived keys.
// In practice, this should be done only during the app initialization.
const publicKeys = await client.getPublicKeys(encryptedObject.services.map(([service, _]) => service));
const correspondingPublicKeys = derivedKeys.keys().map((objectId) => {
  const index = encryptedObject.services.findIndex(([s, _]) => s === objectId);
  return tx.moveCall({
    target: `${seal_package_id}::bf_hmac_encryption::new_public_key`,
    arguments: [
      tx.pure.address(objectId),
      tx.pure.vector("u8", publicKeys[index].toBytes())
    ],
  });
}).toArray();

// 4. Convert the derived keys to G1 elements.
const derivedKeysAsG1Elements = Array.from(derivedKeys).map(([_, value]) =>
tx.moveCall({
  target: `0x2::bls12381::g1_from_bytes`,
  arguments: [ tx.pure.vector("u8", fromHex(value.toString())) ],
})
);

// 5. Call the Move function verify_derived_keys. This should be cached if decryption for the same ID is performed again. 
const verifiedDerivedKeys = tx.moveCall({
  target: `${seal_package_id}::bf_hmac_encryption::verify_derived_keys`,
  arguments: [
  tx.makeMoveVec({ elements: derivedKeysAsG1Elements, type: '0x2::group_ops::Element<0x2::bls12381::G1>' }),
  tx.pure.address(encryptedObject.packageId),
  tx.pure.vector("u8", fromHex(encryptedObject.id)),
    tx.makeMoveVec({ elements: correspondingPublicKeys, type: `${SEAL_PACKAGE_ID}::bf_hmac_encryption::PublicKey` }),
  ],
});

// 6. Construct the parsed encrypted object onchain.
const parsedEncryptedObject = tx.moveCall({
  target: `${seal_package_id}::bf_hmac_encryption::parse_encrypted_object`,
  arguments: [tx.pure.vector("u8", encryptedBytes)],
});

// 7. Construct a list of public key objects. 
const allPublicKeys = publicKeys.map((publicKey, i) => tx.moveCall({
  target: `${seal_package_id}::bf_hmac_encryption::new_public_key`,
  arguments: [
    tx.pure.address(encryptedObject.services[i][0]),
    tx.pure.vector("u8", publicKey.toBytes())
  ],
}));

// 8. Perform decryption with verified derived keys. 
const decrypted = tx.moveCall({
  target: `${seal_package_id}::bf_hmac_encryption::decrypt`,
  arguments: [
    parsedEncryptedObject,
    verifiedDerivedKeys,
    tx.makeMoveVec({ elements: allPublicKeys, type: `${SEAL_PACKAGE_ID}::bf_hmac_encryption::PublicKey` }),
  ],
});

// The decryption result is in an option to be consumed if successful, `none` otherwise. 



Use an Agent
Optimizing performance
To reduce latency and improve efficiency when using the Seal SDK, apply the following strategies based on your use case:

Reuse the SealClient instance: The client caches retrieved keys and fetches necessary onchain objects during initialization. Reusing it prevents redundant setup work.
Reuse the SessionKey: You can keep a session key active for a fixed duration to avoid prompting users multiple times. This also reuses previously fetched objects.
Disable key server verification when not required: Set verifyKeyServers: false unless you explicitly need to validate key server URLs. Skipping verification saves round-trip latency during initialization. This is irrelevant for decentralized key servers.
Include fully specified objects in PTBs: When creating programmable transaction blocks, pass complete object references (with versions). This reduces object resolution calls by a key server to the Sui full node.
Avoid unnecessary key retrievals: Reuse existing encrypted keys whenever possible and rely on the SDK's internal caching to reduce overhead.
[Advanced] Use fetchKeys() for batch decryption: Call fetchKeys() when retrieving multiple decryption keys. This groups requests and minimizes interactions with key servers.
Other performance recommendations
Choose AES for speed, and reserve HMAC-CTR for onchain decryptions

Use AES for most app data. It is significantly faster and more memory-efficient than HMAC-CTR. Use HMAC_CTR only when you need onchain decryption of small-sized data.

Use envelope (layered) encryption for large payloads

For big files (videos, large datasets), treat Seal as a KMS:

Generate a symmetric key and encrypt the data with AES.
Encrypt the symmetric key using Seal.
Store the ciphertext (for example, on Walrus) and keep a reference to the Seal-encrypted symmetric key.
tip
Hardware, runtime (browser vs. Node.js), and object size vary. Try both direct AES and envelope encryption to find the best balance of performance, scalability, and manageability for your workload.

Envelope encryption is also recommended for highly sensitive data and enables safer key rotation and updates without re-encrypting large blobs. See Use layered encryption for critical or large data.


Access policy example patterns
This page summarizes common Seal patterns from the Move patterns repository. It is not exhaustive. For additional patterns and the latest updates, see the repository directly.

Private data
Move source

Use this pattern when a single owner should control encrypted content. You store the ciphertext as an owned object. Only the current owner can decrypt, and ownership transfer moves custody without exposing the data. This pattern is a good fit for personal key storage, private NFTs, or user-held credentials that must remain private yet portable.

Allowlist
Move source

Use this pattern to share encrypted content with a defined group or list of approved users. You manage access by adding or removing members on the list, and those changes apply to future decryptions without touching the encrypted data. This pattern works well for subscriptions, partner-only data rooms, or early-access drops, and can optionally switch to public access after a set time.

Subscription
Move source

Use this pattern to offer time-limited access to encrypted content or services. You define a service with a price and duration. When someone subscribes, their identity gets a pass that lets them decrypt the service's content until it expires. There is no need to re-encrypt or move data. This pattern is ideal for premium media, data feeds, or paid API and AI model access.

Time-lock encryption
Move source

Use this pattern to publish encrypted content that unlocks automatically at a specific time. You encrypt once with an unlock timestamp. Before that moment, no one can open it, and after it passes, anyone (or your intended audience) can. No re-encryption or per-user distribution is needed. This pattern is ideal for coordinated reveals (drops, auctions), MEV-resilient trading, and secure voting. An optional variant lets an authorized party extend the unlock time before it expires.

Variation - pre-signed URLs
Apply the same time-based logic to gate a specific Walrus blob behind a time-limited link that expires. Encrypt once (optionally bind the blob ID in the key ID), include an expiry parameter, and let the policy authorize decrypts only before the deadline, not after. To emulate cloud "signed URLs" more closely, combine the time check with an access rule (for example, an allowlist or subscription check).

This section covers access control, not link generation. You can generate and distribute the URL off-chain, or add a helper function in the same access policy package to produce or validate link parameters if you prefer to keep it onchain. This enables limited-time downloads without re-encrypting content or managing per-user copies.

Secure voting
Move source

Use this pattern to run a vote where ballots stay encrypted until completion. You define eligible voters and each submits an encrypted choice. When all votes are in, anyone can fetch the required threshold keys from Seal and use the onchain decryption to produce a verifiable tally. Invalid or tampered ballots are ignored. This pattern is useful for governance, sealed-bid auctions, or time-locked voting.



Security best practices and risk mitigations
When using Seal to manage encrypted data and access policies, it's important to understand and mitigate certain risks associated with key management, data availability, and operational trust. This section outlines recommendations for developers to follow when integrating Seal into production systems, especially for use cases involving sensitive or long-lived data.

Choose an appropriate threshold configuration
Seal supports threshold encryption using multiple independent key servers. When encrypting data, developers must select a threshold configuration (for example, 2-of-3 or 3-of-5) based on the sensitivity of the data and how long it needs to remain accessible.

A poorly chosen threshold can result in unintended data loss. If too many key servers in a configuration go offline or become unavailable in the future, users might not be able to obtain enough decryption shares to recover their keys. Always ensure that the configuration balances fault tolerance with desired security guarantees.

note
Choosing a specific threshold configuration does not apply to decentralized (committee mode) key servers, as one is defined for each such key server during its setup.

Vet and establish relationships with key server providers
Each key server in a Seal threshold configuration plays a critical role in data availability. As Seal is permissionless, anyone can run a key server. However, developers should treat key server selection as a trust decision.

This is applicable to decentralized key servers only if you are planning to set up [your own aggregator](/Aggregator) and need API keys from key server providers.



Use an Agent
To reduce operational risk, you should:

Choose key servers operated by organizations or parties that you can trust.
Establish a clear business or legal agreement with each provider, if possible.
Ensure that terms of service specify obligations around availability, incident response, and service continuity.
Legal agreements can serve as a deterrent to unilateral service disruptions and provide a recourse mechanism if a provider fails to meet expectations.

tip
Confirm the full node dependency behind the key server - whether it's self-managed, third-party-managed, or a public-good full node. Ask for relevant details on redundancy and failover, upgrade cadence, and SLAs. Factor these dependencies into your security and availability assumptions when selecting providers.

Use layered encryption for critical or large data
If you're handling data that is highly sensitive, large in size, or difficult to re-encrypt frequently, consider using envelope encryption.

In this approach:

You generate your own symmetric encryption key for the data.
Encrypt the data with that key.
Use Seal to encrypt and manage access to that key.
This setup gives you the ability to rotate or update the Seal key servers in your threshold configuration, without needing to re-encrypt the data itself. You only need to re-encrypt the small, symmetric key. This is particularly useful for data that must remain accessible for years, or that is stored immutably on systems like Walrus.

Use the symmetric key from the encrypt API with care
The Seal SDK's encrypt API returns a symmetric key used to encrypt your data. If you decide to keep this key - for example, to support disaster recovery - store it securely and follow strict security practices. Alternatively, you can return the key to the user instead of storing it yourself. In that case, the user must take responsibility for securely managing the key to prevent any leaks.

Anyone who retains this key is responsible for keeping it secure. If the key is leaked, unauthorized parties can gain access to the encrypted data.

note
This symmetric key is distinct from the one used in the layered encryption pattern.

Understand the risks of leaked decryption keys
Seal uses client-side encryption by default. That means applications or users retrieve the decryption key from Seal's key servers and use it locally to decrypt the data.

If a user or application leaks the decryption key - intentionally or not - the encrypted data could be decrypted by unauthorized parties. Because Seal key servers do not emit onchain logs of key delivery events, there is no onchain audit trail showing which user or wallet obtained the key.

To help detect or respond to such incidents:

Implement audit logging or telemetry in your application.
Log key access attempts, decryption events, and user behavior.
Store logs in a tamper-evident system such as Walrus, or anchor them to the chain if required.
This can support transparency, internal review, or regulatory compliance in high-trust scenarios.