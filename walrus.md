https://docs.wal.app/







Skip to main content
GitHub
Discord
Ask Walrus AI
Get Started →
A verifiable data platform for high-stakes systems that require provable, programmable, always-available data with no performance tradeoffs.

Modern financial systems and AI agents depend on fast, reliable, and verifiable data. Traditional storage assumes integrity and pushes trust outside the data layer. Walrus embeds availability, integrity, and programmability directly into storage itself.

Highly available
Cryptographically verifiable
Programmable through smart contracts
Data Storage
CLI tools, environment setup, and core storage operations for developers.

Get started
Walrus Sites
Deploy decentralized static websites with true decentralization.

Learn more
Service Providers
Operate storage nodes, aggregators, and publishers on the network.

View guide
Examples
Reference applications and integration patterns using Walrus.

Explore
01
Core capabilities
Storage & retrieval
Walrus supports writing and reading large blobs of unstructured data. Data is content-addressed. Any change to the data produces a new identifier. This makes integrity tamper-evident and enables independent verification of stored content. Walrus also enables anyone to prove that a blob has been stored and remains available for retrieval.

Data availability and fault tolerance
Walrus uses erasure coding and high redundancy (~4.5x) to maintain availability even under partial node failure.

Reads remain available with up to 2/3 responsive nodes.
Writes tolerate up to 1/3 unavailable nodes.
This model is more robust than partial-replication systems and more cost-efficient than full replication.

Cost efficiency
Through erasure coding, Walrus maintains storage overhead at approximately 5x the size of stored data while delivering strong durability and Byzantine fault tolerance. This enables production-grade availability without full replication costs.

Integration with Sui
Walrus leverages Sui for coordination, attesting availability, and payments. Storage space is represented as a resource on Sui, which can be owned, split, merged, and transferred. Stored blobs are also represented by objects on Sui, which means that smart contracts can check whether a blob is available and for how long, extend its lifetime, or optionally delete it.

Epochs & WAL
Walrus is operated by a committee of storage nodes that evolve between epochs. A native token, WAL (and its subdivision FROST, where 1 WAL is equal to 1 billion FROST), is used to delegate stake to storage nodes, and those with high stake become part of the epoch committee. The WAL token is also used for payments for storage. At the end of each epoch, rewards for selecting storage nodes, storing, and serving blobs are distributed to storage nodes and those that stake with them. All these processes are mediated by smart contracts on the Sui platform.

Flexible access
You can interact with Walrus through a command-line interface (CLI), software development kits (SDKs), and Web2 HTTP technologies. Walrus is designed to work well with traditional caches and content distribution networks (CDNs), while ensuring all operations can also be run using local tools to maximize decentralization.

Interfaces: CLI · SDK · HTTP API
02
When to use Walrus
Independently verifiable
You need to prove where data came from, confirm it has not been altered, or anchor workflows to specific dataset versions.

AI model artifacts & agent memory
Execution logs for exchanges
Onchain governance data
Audit trails for financial systems
Highly available under failure
Your system cannot tolerate downtime, partial node failure, or data loss.

Market infrastructure
Autonomous agents coordinating state
Financial protocols with real risk
Programmable at the data layer
You need smart contracts to manage, verify, or automate around stored data.

Versioned datasets in AI workflows
Contract-controlled storage lifetimes
Onchain verification of offchain artifacts
Cost-efficient at scale
You require strong durability and Byzantine fault tolerance without full-replication overhead.

03
When not to use Walrus
Walrus is not optimized for:

Small, ephemeral application state better suited for direct onchain storage
Ultra-low-latency in-memory databases
Pure archival storage without verification requirements
Walrus is designed for high-stakes systems where availability, integrity, and programmability are structural requirements, not optional features.

© 2026 Walrus Foundation
GitHub
Discord
X
Privacy
Terms






























# Getting Started with Walrus

URL: https://docs.wal.app/docs/getting-started

Walrus is a verifiable data platform for high-stakes systems like AI and onchain finance, where data is stored asblobs.

Walrus uses an object storage architecture, whereblobsare stored in a flat namespace rather than a hierarchy. There are no folders or directories. Each piece of data in an object storage model contains the data itself, metadata describing the data, and a unique identifier.

Sui is a blockchain that supports programmability at a [fundamental level](https://docs.sui.io/concepts/transactions/prog-txn-blocks) . Walrus binds allblobsto objects on the Sui blockchain.

## Walrus and Sui

Walrus depends on Sui, as it leverages Sui to trackblobs, their respective owners, and their lifetimes.

Sui and Walrus are both decentralized, distributed systems made up of many independent servers that communicate and collectively establish shared state. A group of servers together is a network.

### Available networks

Sui and Walrus each have the following available [networks](/docs/system-overview/available-networks) :

- **Testnet:** A sandbox-like network where you can receive test tokens for free to use for the network fees. You can build, test, and debug software packages on Testnet. Testnet does not guarantee data persistence and might wipe data at any time without warning.
- **Mainnet:** A production environment where you use real tokens and users or other applications rely on consistent functionality.
When you are getting started, you should use Testnet.

## Choose your upload path

Walrus supports several upload paths. Choose the best path for your use case based on where the upload runs, who manages signing, and who operates the payment and authentication boundary.

| **Upload path** | **Use case** | **Start here** 
| Walrus CLI | Local development, scripts, and operator workflows | Continue with this guide, then see [Store blobs with the Walrus client](/docs/walrus-client/storing-blobs) 
| HTTP APIpublisher | Quick Testnet uploads or services that already use HTTP | [Storing Blobs with the HTTP API](/docs/http-api/storing-blobs) 
| TypeScript SDK | Applications that integrate Walrus directly in code | [Software Development Kits (SDKs) and Other Tools](/docs/typescript-sdk/sdks) 
| Upload Relay | Browser or mobile clients that need a relay-managed upload path | [Operate an Upload Relay](/docs/operator-guide/upload-relay) 
| Private authenticatedpublisher | Controlled Mainnet clients that need an HTTP upload interface | [Mainnet Publisher Production Guide](/docs/operator-guide/publishers/mainnet-production-guide) 

Mainnet publisher availability
Walrus does not provide a public unauthenticatedpublisheron Mainnet. For production Mainnet uploads, run a private authenticatedpublisher, use an upload relay, or integrate directly with the TypeScript SDK.

The rest of this guide uses the Walrus CLI on Testnet because it shows the full setup flow: installing tools, configuring a wallet, getting Testnet tokens, storing ablob, and reading it back.

## Step 1: Install tooling

To install Walrus and Sui, use the Mysten Labs `suiup` tool.

Install `suiup` :

```sh
$ curl -sSfL https://raw.githubusercontent.com/Mystenlabs/suiup/main/install.sh | sh
```

Install `sui` and `walrus` :

```sh
$ suiup install sui
$ suiup install walrus
```

## Step 2: Configure tooling for Walrus Testnet

After installing Walrus, configure theWalrus client. Theclientconfiguration tells Walrus which RPC URLs to use to access Testnet or Mainnet and which Sui objects track the state of the Walrus network. The easiest way to configure Walrus is to download the following pre-filled configuration file.

Download the configuration file:

```sh
$ curl --create-dirs https://docs.wal.app/setup/client_config.yaml -o ~/.config/walrus/client_config.yaml
```

This pre-filled file includes both the Mainnet and Testnet contexts. For the canonical endpoints, RPC URLs, object IDs, and configuration snippets, see the [Network Reference](/docs/network-reference) .

Configure the Suiclientto connect to Testnet.

The Suiclientconfiguration is separate from theWalrus clientconfiguration. [Learn more about the Sui client configuration.](https://docs.sui.io/guides/developer/getting-started/configure-sui-client)

Initialize the Suiclient:

```sh
$ sui client
```

When prompted, enter the following:

- Connect to a Sui Full Node server? Enter `Y` .
- Full node server URL: Enter `https://fullnode.testnet.sui.io:443` .
- Environment alias: Enter `testnet` .
- Select key scheme: Enter `0` (for ed25519).
This creates your Suiclientconfiguration file with a Testnet environment and generates your first address.

To confirm the Walrus configuration also uses Testnet, run the following command:

```sh
$ walrus info
```

Make sure that the output of this command includes `Epoch duration: 1day` to indicate connection to Testnet. The same output also includes current storage pricing information. For interactive cost estimates, use the [Walrus Cost Calculator](https://costcalculator.wal.app/) .

For detailed information about the `walrus` CLI, use `walrus --help` . Append `--help` to any `walrus` subcommand to get details about that specific command.

## Step 3: Understand your Sui account

When you ran `sui client` during setup, the system automatically created a Sui account for you. Sui uses addresses and accounts. When you storeblobson Walrus, Walrus binds them to an object on Sui that an address owns.

An address is a unique location on the blockchain. A 32-byte identifier (displayed as 64 hex characters with a `0x` prefix) identifies the address, which can own objects. The system derives the address from a public key using a hash function.

Anyone can see addresses, and they are valid on all networks (Testnet, Mainnet, and others), but networks do not share data and assets.

An account is an address plus the key to access it. If you have the private key for an address, you have privileged access and control over what the address owns, such as tokens and objects.

To view your active address, run the following command:

```sh
$ sui client active-address
```

To see all your addresses and their key schemes, run the following command:

```sh
$ sui client addresses
```

Store your keys securely
You must store your private key and recovery passphrase securely, otherwise you might lose access to your address.

[Learn more about addresses, available key pair options, and key storage.](https://docs.sui.io/guides/developer/getting-started/get-address)

#### Creating additional addresses

You can create additional addresses if needed:

```sh
$ sui client new-address ed25519
```

The argument `ed25519` specifies the key pair scheme to be of type ed25519.

## Step 4: Fund Sui account with tokens

Before you can upload a file to Walrus and store it as ablob, you need SUI tokens to pay transaction fees andWALtokens to pay for storage on the network. Walrus Testnet uses TestnetWALtokens that have no value. You can exchange them at a 1:1 rate for Testnet SUI tokens. For more information about storage costs, see [Storage Costs](/docs/system-overview/storage-costs) .

Navigate to the SUI Testnet faucet: [https://faucet.sui.io/](https://faucet.sui.io/)

Ensure you select Testnet.

Then, insert your Sui address. To print your Sui address, use the following command:

```sh
$ sui client active-address
```

After you insert your address on the faucet and receive a message confirming you received SUI tokens, check your balance with the following command:

```sh
$ sui client balance
```

Faucet alternatives
The Sui faucet is rate limited. If you encounter errors or have questions, you can request tokens from the Discord faucet or a third-party faucet. [Learn more about the Sui faucet.](https://docs.sui.io/guides/developer/getting-started/get-coins)

Convert some of those SUI tokens intoWALwith the following command:

```sh
$ walrus get-wal --context testnet
```

Check your balance again with `sui client balance` to confirm you now haveWAL:

```sh
╭─────────────────────────────────────────╮
│ Balance of coins owned by this address  │
├─────────────────────────────────────────┤
│ ╭─────────────────────────────────────╮ │
│ │ coin  balance (raw)     balance     │ │
│ ├─────────────────────────────────────┤ │
│ │ Sui        497664604      0.49 SUI  │ │
│ │ WAL Token  500000000      0.50 WAL  │ │
│ ╰─────────────────────────────────────╯ │
╰─────────────────────────────────────────╯
```

## Step 5: Store ablob

Changes to objects on Sui happen through transactions. Accounts sign these transactions on behalf of addresses, and the transactions result in the system creating, updating, transferring, and sometimes destroying objects. Learn more about [transactions](https://docs.sui.io/concepts/transactions) .

To upload a file to Walrus and store it as ablob, run the following command:

```sh
$ walrus store file.txt --epochs 2 --context testnet
```

Replace `file.txt` with the file you want to store on Walrus. You can store any file type on Walrus.

You must specify the `--epochs` flag, because the system storesblobsfor a certain number of epochs. An epoch is a defined period of time on the network. On Testnet, epochs are 1 day, and on Mainnet, epochs are 2 weeks. You can extend the number of epochs the system stores ablobindefinitely.

The system uploads ablobin slivers, which are small pieces of the file the system stores on different servers through erasure coding. [Learn more](/docs/system-overview/red-stuff) about the Walrus architecture and how the system implements erasure coding.

After you upload ablobto Walrus, it has 2 identifiers:

```sh
Blob ID: oehkoh0352bRGNPjuwcy0nye3OLKT649K62imdNAlXg
Sui object ID: 0x1c086e216c4d35bf4c1ea493aea701260ffa5b0070622b17271e4495a030fe83
```

- Blob ID: A way to reference theblobon Walrus. The system generates theblob IDbased on theblob's contents, meaning any file you upload to the network twice results in the sameblob ID.
- Sui Object ID: Theblob's corresponding newly created Sui object identifier, as the system binds allblobsto one or more Sui objects.
You useblobIDs to readblobdata, while you use Sui object IDs to make modifications to theblob's metadata, such as its storage duration. You might also use them to readblobdata.

You can use [Walrus Explorer](https://walruscan.com/) to view more information about ablob ID.

## Step 6: Retrieve ablob

To retrieve abloband save it on your local machine, run the following command:

```sh
$ walrus read <blob-id> --out file.txt --context testnet
```

Replace `<blob-id>` with theblobidentifier the `walrus store` command returns in its output, and replace `file.txt` with the name and file extension for storing the file locally.

## Step 7: Extend ablobstorage duration

To extend ablobstorage duration, you must reference the Sui object ID and indicate how many epochs you want to extend theblobstorage for.

Run the following command to extend ablobstorage duration by 3 epochs. You must use the Sui object ID, not theblob ID:

```sh
$ walrus extend --blob-obj-id <blob-object-id> --epochs-extended 3 --context testnet
```

Replace `<blob-object-id>` with theblobSui object ID the `walrus store` command returns in its output.

## Step 8: Delete ablob

Allblobsstored in Walrus are public and discoverable by anyone. The `delete` command does not deleteblobsfrom caches, slivers from paststorage nodes, or copies that other users might have made before theblobwas deleted.

To delete ablob, run the following command:

```sh
$ walrus delete --blob-id <blob-id> --context testnet
```

Replace `<blob-id>` with theblobidentifier the `walrus store` command returns in its output.

## Next steps

[Build your first Walrus application](/docs/getting-started) . Explore working examples:

- [Python examples](https://github.com/MystenLabs/walrus/tree/main/docs/examples/python)
- [JavaScript web form](https://github.com/MystenLabs/walrus/tree/main/docs/examples/javascript)
- [Move smart contracts](https://github.com/MystenLabs/walrus/tree/main/docs/examples/move)

## Need help?

- [Troubleshooting guide](/docs/troubleshooting)
- [Discord community](https://discord.com/invite/walrusprotocol)

















# Advanced Installation

URL: https://docs.wal.app/docs/getting-started/advanced-setup

This page covers advanced setup options for Walrus, including building from source, installing from binaries, or using Cargo. For standard setup instructions, see [Getting Started](/docs/getting-started) .

Walrus is open source under an Apache 2 license. You can download and install it through [`suiup`](https://github.com/MystenLabs/suiup) on GitHub, or you can build and install it from the Rust source code through Cargo.

## Walrus binaries

The `walrus`client **Client** Entity interacting directly with the storage nodes; this can be an aggregator or cache, a publisher, or an end user. binary is currently provided for macOS (Intel and Apple CPUs), Ubuntu, and Windows. The Ubuntu version most likely works on other Linux distributions as well.

| **OS** | **CPU** | **Architecture** 
| Ubuntu | Intel 64bit | [`ubuntu-x86_64`](https://storage.googleapis.com/mysten-walrus-binaries/walrus-mainnet-latest-ubuntu-x86_64) 
| Ubuntu | Intel 64bit (generic) | [`ubuntu-x86_64-generic`](https://storage.googleapis.com/mysten-walrus-binaries/walrus-mainnet-latest-ubuntu-x86_64-generic) 
| Ubuntu | ARM 64bit | [`ubuntu-aarch64`](https://storage.googleapis.com/mysten-walrus-binaries/walrus-mainnet-latest-ubuntu-aarch64) 
| macOS | Apple Silicon | [`macos-arm64`](https://storage.googleapis.com/mysten-walrus-binaries/walrus-mainnet-latest-macos-arm64) 
| macOS | Intel 64bit | [`macos-x86_64`](https://storage.googleapis.com/mysten-walrus-binaries/walrus-mainnet-latest-macos-x86_64) 
| Windows | Intel 64bit | [`windows-x86_64.exe`](https://storage.googleapis.com/mysten-walrus-binaries/walrus-mainnet-latest-windows-x86_64.exe) 

tip
The latest Walrus binaries are also available on Walrus itself at [https://bin.wal.app](https://bin.wal.app) (for example, [https://bin.wal.app/walrus-mainnet-latest-ubuntu-x86_64](https://bin.wal.app/walrus-mainnet-latest-ubuntu-x86_64) ). Because of DoS protection, downloading the binaries with `curl` or `wget` might not work.

You can also find all releases including release notes on [GitHub](https://github.com/MystenLabs/walrus/releases) . Download the archive for your system and extract the `walrus` binary.

## Install through script

To download and install `walrus` to your `"$HOME"/.local/bin` directory, run one of the following commands in your terminal, then follow the on-screen instructions. If you use Windows, see the Windows-specific instructions or the [`suiup` installation](https://github.com/MystenLabs/suiup) on GitHub.

```bash
# Run a first-time install using the latest Mainnet version.
$ curl -sSf https://install.wal.app | sh

# Install the latest Testnet version instead.
$ curl -sSf https://install.wal.app | sh -s -- -n testnet

# Update an existing installation (overwrites prior version of walrus).
$ curl -sSf https://install.wal.app | sh -s -- -f
```

Make sure that the `"$HOME"/.local/bin` directory is in your `$PATH` .

After installation completes, you can run Walrus by using the `walrus` command in your terminal.

```console
$ walrus --help
```

## Install on Windows

To download `walrus` to your Microsoft Windows computer, run the following in PowerShell:

```powershell
(New-Object System.Net.WebClient).DownloadFile(
  "https://storage.googleapis.com/mysten-walrus-binaries/walrus-testnet-latest-windows-x86_64.exe",
  "walrus.exe"
)
```

From there, place `walrus.exe` somewhere in your `PATH` .

info
Most of the remaining instructions assume a UNIX-based system for the directory structure and commands. If you use Windows, you might need to adapt most of those instructions.

## Install through Cargo

You can also install Walrus through Cargo. For example, to install the latest Mainnet version:

```sh
$ cargo install --git https://github.com/MystenLabs/walrus --branch mainnet walrus-service --locked
```

In place of `--branch mainnet` , you can also specify specific tags (for example, `--tag mainnet-v1.18.2` ) or commits (for example, `--rev b2009ac73388705f379ddad48515e1c1503fc8fc` ).

## Build from source

Walrus is open source software published under the Apache 2 license. The code is developed in a `git` repository at [https://github.com/MystenLabs/walrus](https://github.com/MystenLabs/walrus) .

The latest version of Mainnet and Testnet are available under the `mainnet` and `testnet` branches respectively, and the latest development version under the `main` branch. Reports of issues and bug fixes are welcome. Follow the instructions in the `README.md` file to build and use Walrus from source.

## Configure Walrus

After downloading, the Walrus binary must have a configuration file that defines the development environment parameters. [Learn more about configuring the Walrus client.](/docs/walrus-client/walrus-cli)

























# System Overview

URL: https://docs.wal.app/docs/system-overview

[#### Walrus Fundamentals

Technical reference for Walrus fundamentals, including architecture, data storage, and data retrieval.

→](/docs/system-overview/core-concepts)
[#### RedStuff Encoding Algorithm

Learn how the RedStuff encoding algorithm works in Walrus, including erasure coding, RaptorQ fountain codes, sliver encoding, recovery, and blob metadata.

→](/docs/system-overview/red-stuff)
[#### Operations

Developer guide to Walrus operations for blob management.

→](/docs/system-overview/operations)
[#### System Constraints & Considerations

Storage limits, cost considerations, memory requirements, and other constraints to consider when building on Walrus.

→](/docs/system-overview/system-constraints)
[#### Available Networks

Overview of Walrus networks including Mainnet and Testnet configurations, parameters, and setup instructions.

→](/docs/system-overview/available-networks)
[#### Storage Costs

Comprehensive guide to Walrus storage costs including fixed USD-denominated pricing, WAL tokens, SUI gas fees, and cost optimization strategies.

→](/docs/system-overview/storage-costs)
[#### Public Aggregators and Publishers

The Walrus client offers a daemon mode that runs a simple web server that provides HTTP interfaces you can use to store and read blobs in an aggregator or publisher role respectively. Walrus also offers HTTP APIs through public aggregator and publisher services that you can use without running a local client.

→](/docs/system-overview/public-aggregators-and-publishers)
[#### View System Information

Use the walrus info command to view Walrus system parameters, storage node details, epoch information, and current storage costs.

→](/docs/system-overview/view-system-info)
[#### Batch Storage with Quilt

Comprehensive guide to Walrus Quilt for batch storage of multiple small blobs with cost optimization and metadata management.

→](/docs/system-overview/quilt)



















# Walrus Fundamentals

URL: https://docs.wal.app/docs/system-overview/core-concepts

Data is stored on Walrus asblobs **Blob** Single unstructured data object stored on Walrus. . Eachblob is an immutable array of bytes. Any type of file, such as text, video, or source code, can be stored on Walrus. Allblobs uploaded to Walrus are publicly available. To secure data on Walrus, consider an [encryption service like Seal](https://seal-docs.wal.app/) .

Sui is a blockchain that supports [programmable transactions](https://docs.sui.io/concepts/transactions/prog-txn-blocks) . Walrus binds allblobs to objects on Sui. Walrusblobs are represented as Sui objects of type `Blob` .

## Walrus architecture

The Walrus architecture is built on the following key actors:

- **Users:** Clients that store and retrieve datablobs .
- **Storage nodes **Storage node** Entity storing data for Walrus; holds one or several *shards*. :** Distributedstorage nodes that hold erasure-coded data.
- **Blockchain coordination:** The [Sui blockchain](https://docs.sui.io/) manages payments, metadata, and system orchestration.

#### Users

Users [interact with Walrus](/docs/walrus-client/storing-blobs) through clients to store and readblobs , which are identified by theirblob ID **Blob ID** Cryptographic ID computed from a blob's slivers. . Users engage with the system in 2 primary ways:

- Storage: Users store newblobs and pay [required costs](/docs/system-overview/storage-costs) for [write](/docs/system-overview/operations#store) and [non-best-effort read](/docs/system-overview/operations#read) operations.
- Availability: Users can [prove a blob's availability to third parties](/docs/system-overview/operations#certify-availability) without the cost of transmitting the fullblob .
Users might also exhibit malicious behavior, such as refusing to pay for services, modifying or deletingblobs without authorization, or exhaustingstorage node resources.

#### Storage nodes

Storage nodes manage the actual data storage on Walrus. Eachstorage node holds 1 or more shards during astorage epoch **Storage epoch** The epoch for Walrus as distinct to the epoch for Sui. . At any givenstorage epoch , astorage node associates with 1 or more shards.

Everyblob undergoes [erasure encoding](/docs/system-overview/red-stuff) , which splits it into many **slivers** . The slivers from each storedblob are distributed across all shards in the system. A node stores all slivers belonging to its assigned shards and serves them upon request.

A smart contract on Sui controls how shards are assigned tostorage nodes . These assignments occur within storage epochs, which last 2 weeks on Mainnet. Walrus assumes that more than 2/3 of shards are managed by honeststorage nodes within eachstorage epoch . The system tolerates up to 1/3 of shards being controlled by malicious or faultystorage nodes . This tolerance level applies both within individual storage epochs and across transitions between epochs.

Some assurance properties ensure the correct internal processes of Walrusstorage nodes . For the purposes of defining these, an **inconsistency proof **Inconsistency proof** Set of several recovery symbols with their Merkle proofs such that the decoded sliver does not match the corresponding hash; this proves an incorrect/inconsistent encoding by the client.** proves that ablob ID was stored by auser **User** Any entity or person that wants to store or read blobs on or from Walrus; can act as a Walrus client itself or use the simple interface exposed by publishers and caches. that incorrectly encoded ablob :

- **Sliver recovery **Shard recovery** Process of a storage node recovering a sliver or full shard by obtaining recovery symbols from other storage nodes. :** After thePoA **Point of availability** Point in time when a certificate of availability is submitted to Sui and the corresponding blob is guaranteed to be available until its expiration. , for ablob ID stored by a correctuser , astorage node can always recover the correct slivers for its shards for thisblob ID .
- **Inconsistency detection:** After thePoA , if a correctstorage node cannot recover asliver **Sliver** Erasure-encoded data of one shard corresponding to a single blob for one of the two encodings; this contains several erasure-encoded symbols of that blob but not the blob metadata. , it can produce aninconsistency proof for theblob ID .
- **Encoding protection:** If ablob ID is stored by a correctuser , aninconsistency proof cannot be derived for it.
- **Inconsistentblob handling:** A read by a correctuser for ablob ID for which aninconsistency proof might exist returns `None` .

#### Blockchain coordination

All clients andstorage nodes run an instance of the Suiclient **Client** Entity interacting directly with the storage nodes; this can be an aggregator or cache, a publisher, or an end user. , which provides the coordination layer for the entire system. The Sui network manages several operations, including:

- **Payments:** Processing storage fees and service payments.
- **Resource management:** Allocating and tracking storage capacity.
- **Shard **Shard** (Disjoint) Subset of erasure-encoded data of all blobs; at every point in time, a shard is assigned to and stored on a single storage node. assignment:** Mapping shards tostorage nodes .
- **Metadata management:** Storingblob certificates and system state.
Walrus defines a number of objects and smart contracts on Sui:

- A shared system object records and manages the current committee ofstorage nodes .
- Storage resources represent empty storage space that you can use to storeblobs .
- Blob resources representblobs being registered and certified as stored.
Changes to these objects emit Walrus-related events .

You can find the Walrus system object ID in the Walrus [`client_config.yaml` file](/docs/getting-started/advanced-setup#configuration) . You can use any [Sui explorer](https://suivision.xyz/) to view its content.

#### Events

Storage nodes monitor blockchain events to coordinate their operations and respond to system changes. Walrus uses [custom Sui events](https://github.com/MystenLabs/walrus/blob/main/contracts/walrus/sources/system/events.move) to notifystorage nodes of updates concerning storedblobs and the state of the network. Applications can also use [Sui RPC facilities](https://docs.sui.io/references/sui-api) to observe Walrus-related events.

When ablob is first registered, a [`BlobRegistered`](https://github.com/MystenLabs/walrus/blob/main/contracts/walrus/sources/system/events.move#L12-L23) event is emitted that informsstorage nodes that they should expect slivers associated with itsblob ID . When theblob is certified, a [`BlobCertified`](https://github.com/MystenLabs/walrus/blob/main/contracts/walrus/sources/system/events.move#L25-L35) event is emitted containing information about theblob ID and the epoch after which theblob is deleted. Before that epoch, theblob is guaranteed to be available.

The [`BlobCertified`](https://github.com/MystenLabs/walrus/blob/main/contracts/walrus/sources/system/events.move#L25-L35) event with `deletable` set to false and an `end_epoch` in the future indicates that theblob is available until this epoch. A lightclient proof that this event was emitted for ablob ID constitutes a proof of availability for the data with thisblob ID . When adeletable blob **Deletable blob** Blob that can be deleted by its owner at any time to reuse the storage resource. is deleted, a [`BlobDeleted`](https://github.com/MystenLabs/walrus/blob/main/contracts/walrus/sources/system/events.move#L37-L46) event is emitted.

The [`InvalidBlobID`](https://github.com/MystenLabs/walrus/blob/main/contracts/walrus/sources/system/events.move#L48-L52) event is emitted whenstorage nodes detect an incorrectly encodedblob . Anyone attempting a read on such ablob also detects it as invalid.

System-level events such as [`EpochChangeStart`](https://github.com/MystenLabs/walrus/blob/main/contracts/walrus/sources/system/events.move#L54-L57) and [`EpochChangeDone`](https://github.com/MystenLabs/walrus/blob/main/contracts/walrus/sources/system/events.move#L59-L63) indicate transitions between epochs. Associated events such as [`ShardsReceived`](https://github.com/MystenLabs/walrus/blob/main/contracts/walrus/sources/system/events.move#L65-L69) , [`EpochParametersSelected`](https://github.com/MystenLabs/walrus/blob/main/contracts/walrus/sources/system/events.move#L71-L74) , and [`ShardRecoveryStart`](https://github.com/MystenLabs/walrus/blob/main/contracts/walrus/sources/system/events.move#L76-L80) indicatestorage node -level events related to epoch transitions,shard migrations, and epoch parameters.

## Additional infrastructure

Walrus supports additional infrastructure actors that can operate in a permissionless way. These infrastructure components are optional.

#### Aggregators

Aggregators are clients that reconstructblobs from individual slivers and serve them to users through protocols like HTTP. Aggregators are optional because end users can reconstructblobs directly fromstorage nodes or run an instance of a localaggregator **Aggregator** Service that reconstructs blobs by interacting with storage nodes and exposes a basic `HTTP GET` endpoint to end users. themselves.

**Caches** are aggregators with additional caching functionality to decrease latency and reduce load onstorage nodes .Cache **Cache** An aggregator with additional caching capabilities. infrastructures can also act as CDNs, split the cost ofblob reconstruction **Reconstruction** Decoding of the primary slivers to obtain the blob; includes re-encoding the blob and checking the Merkle proofs. over many requests, and provide better network connectivity. Aclient can always verify that reads fromcache infrastructures are correct.

#### Publishers

Publishers are clients that help end users storeblobs through protocols like HTTP while using less bandwidth and offering custom logic. Publishers are optional because users can directly interact with Sui andstorage nodes to storeblobs . End users can verify that apublisher **Publisher** Service interacting with Sui and the storage nodes to store blobs on Walrus; offers a basic `HTTP POST` endpoint to end users. performed correctly by checking for an onchain event associated with theblob 's **[point of availability](/docs/system-overview/core-concepts)** . Users can then either read theblob from Walrus to confirm it is accessible, or encode theblob themselves and compare the result to theblob ID in the certificate. Publishers streamline the storage process by:

- Receiving ablob through protocols like HTTP
- Encoding theblob into slivers
- Distributing slivers tostorage nodes
- Collectingstorage node signatures
- Aggregating signatures into a certificate
- Performing all required onchain actions

## Data storage process

When data is uploaded to Walrus, the following process occurs:

1. Auser sends a request to upload data to Walrus through aWalrus client . Aclient binary can be run locally and provides the following tools to perform Walrus operations:

- A [command line interface (CLI)](/docs/walrus-client/storing-blobs) .
- A [JSON API](/docs/walrus-client/json-mode) .
- An [HTTP API](/docs/http-api/storing-blobs) .
Alternatively, you can use apublisher service.
2. A [command line interface (CLI)](/docs/walrus-client/storing-blobs) .
3. A [JSON API](/docs/walrus-client/json-mode) .
4. An [HTTP API](/docs/http-api/storing-blobs) .
5. Theclient orpublisher service determines the required storage space for the data and purchases a `Storage` object on Sui to reserve that space for the configured storage duration. A `Blob` object is always associated with a `Storage` object.

The `Blob` and `Storage` objects have the following fields, which you can query using the [Sui SDKs](https://sdk.mystenlabs.com/typescript) :

```move
/// Reservation for storage for a given period, which is inclusive start, exclusive end.
    public struct Storage has key, store {
        id: UID,
        start_epoch: u32,
        end_epoch: u32,
        storage_size: u64,
    }

    /// The blob structure represents a blob that has been registered to with some storage,
    /// and then may eventually be certified as being available in the system.
    public struct Blob has key, store {
        id: UID,
        registered_epoch: u32,
        blob_id: u256,
        size: u64,
        encoding_type: u8,
        // Stores the epoch first certified if any.
        certified_epoch: option::Option<u32>,
        storage: Storage,
        // Marks if this blob can be deleted.
        deletable: bool,
    }
```

Public functions associated with these objects can be found in the respective [`storage_resource`](https://github.com/MystenLabs/walrus/tree/main/contracts/walrus/sources/system/storage_resource.move) and [`blob`](https://github.com/MystenLabs/walrus/tree/main/contracts/walrus/sources/system/blob.move) Move modules. Storage resources can be split and merged in time and data capacity, and can be transferred between users, which allows complex contracts to be created.

1. Theblob is encoded using the [RedStuff](/docs/system-overview/red-stuff) erasure code, producing slivers and ablob ID . The same content always yields the sameblob ID .
2. Theblob is registered, indicating to thestorage nodes that they should expect slivers to be stored. The storage resource on Sui is updated with theblob 's ID, size, and storage duration. This emits an event.
3. Slivers are distributed to each node. When a node receives asliver , it signs a receipt.
4. 2/3 of the receipt signatures are aggregated into an availability certificate. Theblob is certified, indicating that a sufficient number of slivers have been stored to guarantee theblob 's availability. When ablob is certified, its `certified_epoch` field contains the epoch in which it was certified. A certifiedblob remains available for the duration specified by its associated storage resource.

## Data retrieval process

When data is retrieved from Walrus, the following process occurs:

1. Theclient or anaggregator reads theblob ID of theblob to fetch.
2. Theclient oraggregator queries Sui or astorage node to get theblob 's metadata. The metadata includes the authenticated signatures for eachsliver .
3. Theclient sends read requests tostorage nodes for the slivers corresponding to thatblob ID .
4. Each returnedsliver is checked against its authenticated signature from the metadata to ensure integrity.
5. Once enough valid slivers are collected (>1/3 quorum), theclient runs the [RedStuff](/docs/system-overview/red-stuff) decoding algorithm to reconstruct the originalblob .
6. Theclient verifies the reconstructed data by checking hashes of a subset of primary slivers (at least the first 334) against the metadata.
7. If verification passes, theclient returns theblob bytes to the caller. If verification fails or aninconsistency proof exists, the read returns an error or `None` .

## Content addressing and versioning

Ablob 's ID is derived from its contents, so the same data always produces the sameblob ID and different data produces a different ID. Because the identifier comes from the content rather than from a location or a mutable name, ablob is effectively immutable: you cannot change its bytes without changing its ID. This gives you immutable versioning without any extra machinery. Every version of a piece of data is its ownblob with its own ID, and storing a new version never overwrites an earlier one. The history of a value is an ordered list ofblob IDs, from the first version to the most recent. Storing the same content twice produces the sameblob ID , so identical data deduplicates automatically and you do not pay to store a second copy.

Because theblob ID commits to the exact bytes, it also serves as tamper-evident proof of content. Anyone who holds ablob ID can read the data and confirm that it matches, and any change to the content is detectable as a different ID. This makesblob IDs a convenient basis for provenance and reproducibility, for example pinning the exact version of a training dataset, model checkpoint, or agent memory that produced a given result.

### Version with a manifestblob

Blob IDs identify content, but they are not human-readable names, and they do not by themselves record which version is current. A common pattern is to keep a small manifestblob that maps your logical names to theblob IDs of their current content. Readers fetch the manifest first, then resolve the names they need to concreteblob IDs.

To update a value, store the new content as a newblob , append an entry to the manifest that points the logical name at the newblob ID , and store the updated manifest as its ownblob . The previous manifest and the content it referenced remain available under their own IDs, so each manifest version captures a complete, immutable snapshot of what the names resolved to at that point. Keeping an ordered list of manifestblob IDs gives you the full lineage of your dataset or memory store, and lets you reproduce any earlier state by reading the manifest for that version.













# RedStuff Encoding Algorithm

URL: https://docs.wal.app/docs/system-overview/red-stuff

TheRedStuff **RedStuff** Erasure-encoding approach, which uses two different encodings (primary and secondary) to enable shard recovery; details are available in the [whitepaper](./walrus.pdf). encoding algorithm used in Walrus is an adaptation of the Twin-Code framework presented by Rashmi et al. [[1]](https://doi.org/10.1109/ISIT.2011.6033732) .

## Goals and overview

The goal of the Walrus system is to provide a distributed storage infrastructure, where a decentralized set of entities—thestorage nodes **Storage node** Entity storing data for Walrus; holds one or several *shards*. —collaborate to store and serve files ( blobs **Blob** Single unstructured data object stored on Walrus. of data). When it comes to storage properties, Walrus has 3 key goals:

1. To support extremely high availability and durability of the data.
2. To have low storage overhead compared to full replication, meaning you do not store eachblob on everystorage node .
3. To gracefully support node failures, and in particular to allow for efficient node recovery (more on this later).
Given these requirements, one good option is to erasure encode theblobs across thestorage nodes . At a high level, erasure encoding (or erasure coding) allows you to encode the data into N N N parts, such that the aggregate size of the N N Nblobs is a small multiple of the originalblob size, and a subset k k k of these parts is sufficient to recover the originalblob . The next section formalizes these concepts, but note that erasure coding already allows you to achieve goals 1 and 2 above, because:

1. Erasure coding allows you to recover ablob even if N − k N - k N− kstorage nodes fail, providing high availability and durability.
2. The overall storage overhead is much smaller than for full replication. For ablob of size S S S , the total storage used in the system is S ⋅ c S \cdot c S⋅ c instead of S ⋅ N S \cdot N S⋅ N , where c ≪ N c \ll N c≪ N is a small constant (4.5 in Walrus's case).
To achieve the third requirement, however, simple erasure coding is insufficient. A failed node that wants to reconstruct its part of the encoding needs to first fetch at least k k k other parts, reconstruct theblob , and then re-encode its own part. Therefore, the communication overhead for recovery is on the order of the size of the wholeblob , S S S . WithRedStuff , you can instead reconstruct the encoded part of a failed node by fetching only O ( S / N ) O(S/N) O ( S / N ) data, meaning only in the order of the size of the lost part. This achieves goal 3.

## Background

This section provides the essential background on the coding schemes used inRedStuff .

### Erasure codes

Erasure coding addresses the problem of error correction in the case of bit erasures, where some bits in the message are lost, as in the case of a lossy channel. An erasure code divides ablob (or message) of S S S bytes into k k k symbols (bitstrings of fixed length ∼ S / k \sim S/k ∼ S / k ), which are then encoded to form a longer message of N N N symbols, such that the originalblob can be recovered from any subset k ′ k' k ′ of the N N N symbols. The ratio k / N k/N k / N is called the code rate.

### Fountain codes

Fountain codes are a class of erasure codes. The key property of fountain codes is that the encoding process is rateless, meaning the encoder can produce an arbitrary number of encoded parts without knowing the total number of parts that will be produced. This is useful for theRedStuff use case, as it allows you to specify the rate of the encoder. For example, by encoding f + 1 f+1 f+ 1 source symbols into N N N recovery symbols, you guarantee that any subset of f + 1 f+1 f+ 1 symbols can reconstruct the source. Fountain codes are also extremely efficient as they typically require only XOR operations to encode and decode data.

### RaptorQ

RedStuff is based on the RaptorQ fountain code. RaptorQ is one of the fastest and most efficient fountain codes, and has the following properties:

1. It is systematic, meaning the first k k k symbols of the encoded message correspond to the original message.
2. It is a linear code, meaning the encoding process is a linear transformation of the input symbols, or in other words, the encoded symbols are linear combinations of the input symbols.
3. It is almost optimal, meaning that k ′ ≈ k k' \approx k k ′≈ k . Specifically, the probability of decoding failure for k ′ = k + H k' = k + H k ′= k+ H symbols received is < 1 / 256 H + 1 \lt 1/256^{H+1} < 1/25 6 H + 1 .

## RedStuff encoding

An established approach in distributed storage is to use an erasure code to encodeblobs of data across multiplestorage nodes . By using a k / N k/N k / N rate erasure code for N N N nodes and k k k source symbols, the system can tolerate N − k N - k N− k node failures, with just an N / k N/k N / k factor of storage overhead. However, in the case of a node failure, the recovery process is inefficient: the failed node needs to fetch k k k other parts, reconstruct theblob , and then re-encode its own part. Therefore, the communication overhead for recovery is on the order of the size of the wholeblob , S S S .

The Twin-Code framework aims to solve this issue by allowing for efficient node recovery. This section briefly describes how the framework is used inRedStuff . For specific details, refer to the original paper. TheRedStuff encoding algorithm is an adaptation of the Twin-Code framework, which allows for efficient node recovery in erasure-coded storage systems.

Consider a scenario in which ablob of data is encoded and stored across N N N shards—multiple shards can be mapped to the samestorage node —in a Byzantine setting. Up to f f f of the shards can be corrupted by an adversary, with f < 1 / 3 N f \lt 1/3 N f< 1/3 N , and the remaining N − f N - f N− f shards are honest.

### Encoding and recovery

TheRedStuff encoding and recovery process works as follows:

- First, the datablob of size S S S is divided into symbols and arranged in a rectangular message matrix of up to N − 2 f N - 2f N− 2 f rows and N − f N - f N− f columns of symbols. The number of rows ( n R n_R n R ) and columns ( n C n_C n C ) is fixed, and determines the symbol size s s s as follows:
s = ⌈ S / ( n R ⋅ n C ) ⌉ s = \left\lceil S / (n_R \cdot n_C) \right\rceil s= ⌈ S / ( n R⋅n C ) ⌉
- Then, the columns and the rows of the message matrix are encoded separately with RaptorQ.
- The primary encoding, performed on columns, expands the n R n_R n R symbols of each column to N N N symbols. The rateless nature of RaptorQ allows you to choose the number of encoded symbols.
- The secondary encoding, performed on rows, expands the n C n_C n C symbols of each row to N N N symbols.
- n R n_R n R is also called the number of primary source symbols, and n C n_C n C the number of secondary source symbols. The primary encoding has rate n R / N n_R / N n R / N , and the secondary encoding has rate n C / N n_C / N n C / N .
- The encoded rows and columns are then used to obtain primary and secondary slivers, which are distributed to shards and used forblob reconstruction **Reconstruction** Decoding of the primary slivers to obtain the blob; includes re-encoding the blob and checking the Merkle proofs. andsliver recovery **Shard recovery** Process of a storage node recovering a sliver or full shard by obtaining recovery symbols from other storage nodes. :
- Primary slivers are the rows of the matrix of size N × n C N \times n_C N× n C obtained with the primary encoding of the message matrix. Each primarysliver **Sliver** Erasure-encoded data of one shard corresponding to a single blob for one of the two encodings; this contains several erasure-encoded symbols of that blob but not the blob metadata. is therefore composed of n C n_C n C symbols.
- Secondary slivers are the columns of the matrix of size n R × N n_R \times N n R× N obtained with the primary encoding of the message matrix. Each secondarysliver is therefore composed of n R n_R n R symbols.
- Eachshard **Shard** (Disjoint) Subset of erasure-encoded data of all blobs; at every point in time, a shard is assigned to and stored on a single storage node. receives a primary and a secondarysliver , based on theshard number and the row and column numbers of the slivers. See the section on sliver-to-shard mapping for more details.
- The fundamental property achieved with this construction, thanks to the linearity of RaptorQ, is that encoding the primary slivers (as rows) with the secondary encoding and the secondary slivers (as columns) with the primary encoding results in the same N × N N \times N N× N expanded message matrix. This property enables lostsliver recovery :
- To reconstruct a lost primarysliver , ashard can request N − f N-f N− f symbols from the encodings of the secondary slivers of other shards. Because the primary encoding of secondary slivers results in the symbols for primary slivers, and the secondary encoding has n C n_C n C source symbols where n C ≤ N − 2 f n_C \leq N-2f n C≤ N− 2 f , theshard can decode the original primarysliver from the obtained recovery symbols with high probability. See the discussion on recovery probability for more details.
- Thereconstruction of secondary slivers is identical, but with the roles of primary and secondary slivers and encodings inverted.
The following example concretely shows this process.

### Worked example

#### Encoding

Consider a Walrus instance with N = 7 = 3 f + 1 N = 7 = 3f + 1 N= 7= 3 f+ 1 shards. This means the number of primary source symbols is N − 2 f = 3 N - 2f = 3 N− 2 f= 3 , and secondary N − f = 5 N - f = 5 N− f= 5 . Ablob of size S = 15 ⋅ s S = 15 \cdot s S= 15⋅ s can therefore be divided into 15 symbols of size s s s , and arranged in the matrix as follows.

[ s 0 , 0 s 0 , 1 s 0 , 2 s 0 , 3 s 0 , 4 s 1 , 0 s 1 , 1 s 1 , 2 s 1 , 3 s 1 , 4 s 2 , 0 s 2 , 1 s 2 , 2 s 2 , 3 s 2 , 4 ] \left[ \begin{array}{ccccc} s_{0,0} & s_{0,1} & s_{0,2} & s_{0,3} & s_{0,4} \\ s_{1,0} & s_{1,1} & s_{1,2} & s_{1,3} & s_{1,4} \\ s_{2,0} & s_{2,1} & s_{2,2} & s_{2,3} & s_{2,4} \\ \end{array} \right] s 0 , 0 s 1 , 0 s 2 , 0s 0 , 1 s 1 , 1 s 2 , 1s 0 , 2 s 1 , 2 s 2 , 2s 0 , 3 s 1 , 3 s 2 , 3s 0 , 4 s 1 , 4 s 2 , 4Then, the primary encoding acts on the columns of the matrix, expanding them such that each column is composed of 4 source symbols and 6 recovery symbols ( s i , j s_{i,j} s i , j indicates source symbols, while r i , j r_{i,j} r i , j indicates recovery symbols).

[ s 0 , 0 s 0 , 1 s 0 , 2 s 0 , 3 s 0 , 4 s 1 , 0 s 1 , 1 s 1 , 2 s 1 , 3 s 1 , 4 s 2 , 0 s 2 , 1 s 2 , 2 s 2 , 3 s 2 , 4 r 3 , 0 r 3 , 1 r 3 , 2 r 3 , 3 r 3 , 4 r 4 , 0 r 4 , 1 r 4 , 2 r 4 , 3 r 4 , 4 r 5 , 0 r 5 , 1 r 5 , 2 r 5 , 3 r 5 , 4 r 6 , 0 r 6 , 1 r 6 , 2 r 6 , 3 r 6 , 4 ] \left[ \begin{array}{c|c|c|c|c} s_{0,0} & s_{0,1} & s_{0,2} & s_{0,3} & s_{0,4} \\ s_{1,0} & s_{1,1} & s_{1,2} & s_{1,3} & s_{1,4} \\ s_{2,0} & s_{2,1} & s_{2,2} & s_{2,3} & s_{2,4} \\ \color{blue} r_{3,0} & \color{blue} r_{3,1} & \color{blue} r_{3,2} & \color{blue} r_{3,3} & \color{blue} r_{3,4} \\ \color{blue} r_{4,0} & \color{blue} r_{4,1} & \color{blue} r_{4,2} & \color{blue} r_{4,3} & \color{blue} r_{4,4} \\ \color{blue} r_{5,0} & \color{blue} r_{5,1} & \color{blue} r_{5,2} & \color{blue} r_{5,3} & \color{blue} r_{5,4} \\ \color{blue} r_{6,0} & \color{blue} r_{6,1} & \color{blue} r_{6,2} & \color{blue} r_{6,3} & \color{blue} r_{6,4} \\ \end{array} \right] s 0 , 0 s 1 , 0 s 2 , 0 r 3 , 0 r 4 , 0 r 5 , 0 r 6 , 0s 0 , 1 s 1 , 1 s 2 , 1 r 3 , 1 r 4 , 1 r 5 , 1 r 6 , 1s 0 , 2 s 1 , 2 s 2 , 2 r 3 , 2 r 4 , 2 r 5 , 2 r 6 , 2s 0 , 3 s 1 , 3 s 2 , 3 r 3 , 3 r 4 , 3 r 5 , 3 r 6 , 3s 0 , 4 s 1 , 4 s 2 , 4 r 3 , 4 r 4 , 4 r 5 , 4 r 6 , 4Each of the rows of this column expansion is a primarysliver . For example, [ r 5 , 0 , r 5 , 1 , r 5 , 2 , r 5 , 3 , r 5 , 4 , r 5 , 5 , r 5 , 6 ] [r_{5,0}, r_{5,1}, r_{5,2}, r_{5,3}, r_{5,4}, r_{5,5}, r_{5,6}] [ r 5 , 0 ,r 5 , 1 ,r 5 , 2 ,r 5 , 3 ,r 5 , 4 ,r 5 , 5 ,r 5 , 6 ] .

Similarly, the secondary encoding on the rows of the matrix produces the expanded rows.

[ s 0 , 0 s 0 , 1 s 0 , 2 s 0 , 3 s 0 , 4 r 0 , 5 r 0 , 6 s 1 , 0 s 1 , 1 s 1 , 2 s 1 , 3 s 1 , 4 r 1 , 5 r 1 , 6 s 2 , 0 s 2 , 1 s 2 , 2 s 2 , 3 s 2 , 4 r 2 , 5 r 2 , 6 ] \left[ \begin{array}{ccccccc} s_{0,0} & s_{0,1} & s_{0,2} & s_{0,3} & s_{0,4} & \color{blue} r_{0,5} & \color{blue} r_{0,6} \\ \hline s_{1,0} & s_{1,1} & s_{1,2} & s_{1,3} & s_{1,4} & \color{blue} r_{1,5} & \color{blue} r_{1,6} \\ \hline s_{2,0} & s_{2,1} & s_{2,2} & s_{2,3} & s_{2,4} & \color{blue} r_{2,5} & \color{blue} r_{2,6} \\ \end{array} \right] s 0 , 0 s 1 , 0 s 2 , 0s 0 , 1 s 1 , 1 s 2 , 1s 0 , 2 s 1 , 2 s 2 , 2s 0 , 3 s 1 , 3 s 2 , 3s 0 , 4 s 1 , 4 s 2 , 4r 0 , 5 r 1 , 5 r 2 , 5r 0 , 6 r 1 , 6 r 2 , 6Each of the columns of this row expansion is a secondarysliver . For example, [ r 0 , 6 , r 1 , 6 , r 2 , 6 ] [r_{0,6}, r_{1,6}, r_{2,6}] [ r 0 , 6 ,r 1 , 6 ,r 2 , 6 ] .

The i i i thsliver pair **Sliver pair** The combination of a shard's primary and secondary sliver. is composed of the i i i th primary and i i i th secondary slivers. For simplicity, consider that the i i i thsliver pair is stored onshardi i i . The sliver-pair-to-shard mapping section discusses the full mapping.

Thanks to the linearity of RaptorQ, the expansion of:

- the recovery secondary slivers (columns 5 and 6) with the primary encoding, and
- the recovery primary slivers (rows 3, 4, 5, and 6) with the secondary encoding,
results in the same set of symbols, which is essential for recovery. These symbols can be represented as the lower-right quadrant of what is called the fully expanded message matrix.

[ s 0 , 0 s 0 , 1 s 0 , 2 s 0 , 3 s 0 , 4 r 0 , 5 r 0 , 6 s 1 , 0 s 1 , 1 s 1 , 2 s 1 , 3 s 1 , 4 r 1 , 5 r 1 , 6 s 2 , 0 s 2 , 1 s 2 , 2 s 2 , 3 s 2 , 4 r 2 , 5 r 2 , 6 r 3 , 0 r 3 , 1 r 3 , 2 r 3 , 3 r 3 , 4 r 3 , 5 r 3 , 6 r 4 , 0 r 4 , 1 r 4 , 2 r 4 , 3 r 4 , 4 r 4 , 5 r 4 , 6 r 5 , 0 r 5 , 1 r 5 , 2 r 5 , 3 r 5 , 4 r 5 , 5 r 5 , 6 r 6 , 0 r 6 , 1 r 6 , 2 r 6 , 3 r 6 , 4 r 6 , 5 r 6 , 6 ] \left[ \begin{array}{ccccc|cc} s_{0,0} & s_{0,1} & s_{0,2} & s_{0,3} & s_{0,4} & r_{0,5} & r_{0,6} \\ s_{1,0} & s_{1,1} & s_{1,2} & s_{1,3} & s_{1,4} & r_{1,5} & r_{1,6} \\ s_{2,0} & s_{2,1} & s_{2,2} & s_{2,3} & s_{2,4} & r_{2,5} & r_{2,6} \\ \hline r_{3,0} & r_{3,1} & r_{3,2} & r_{3,3} & r_{3,4} & \color{blue} r_{3,5} & \color{blue} r_{3,6} \\ r_{4,0} & r_{4,1} & r_{4,2} & r_{4,3} & r_{4,4} & \color{blue} r_{4,5} & \color{blue} r_{4,6} \\ r_{5,0} & r_{5,1} & r_{5,2} & r_{5,3} & r_{5,4} & \color{blue} r_{5,5} & \color{blue} r_{5,6} \\ r_{6,0} & r_{6,1} & r_{6,2} & r_{6,3} & r_{6,4} & \color{blue} r_{6,5} & \color{blue} r_{6,6} \\ \end{array} \right] s 0 , 0 s 1 , 0 s 2 , 0 r 3 , 0 r 4 , 0 r 5 , 0 r 6 , 0s 0 , 1 s 1 , 1 s 2 , 1 r 3 , 1 r 4 , 1 r 5 , 1 r 6 , 1s 0 , 2 s 1 , 2 s 2 , 2 r 3 , 2 r 4 , 2 r 5 , 2 r 6 , 2s 0 , 3 s 1 , 3 s 2 , 3 r 3 , 3 r 4 , 3 r 5 , 3 r 6 , 3s 0 , 4 s 1 , 4 s 2 , 4 r 3 , 4 r 4 , 4 r 5 , 4 r 6 , 4r 0 , 5 r 1 , 5 r 2 , 5 r 3 , 5 r 4 , 5 r 5 , 5 r 6 , 5r 0 , 6 r 1 , 6 r 2 , 6 r 3 , 6 r 4 , 6 r 5 , 6 r 6 , 6These symbols do not need to be stored on any node because they can always be recomputed by expanding either a primary or secondary symbol. For example, r 4 , 5 r_{4,5} r 4 , 5 can be obtained by:

- the secondary-encoding expansion of the 4th primarysliver : [ r 4 , 0 , r 4 , 1 , r 4 , 2 , r 4 , 3 , r 4 , 4 , r 4 , 5 , r 4 , 6 ] [r_{4,0}, r_{4,1}, r_{4,2}, r_{4,3}, r_{4,4}, \color{blue} r_{4,5}, r_{4,6}] [ r 4 , 0 ,r 4 , 1 ,r 4 , 2 ,r 4 , 3 ,r 4 , 4 ,r 4 , 5 ,r 4 , 6 ] , or
- the primary-encoding expansion of the 5th secondarysliver : [ r 0 , 5 , r 1 , 5 , r 2 , 5 , r 3 , 5 , r 4 , 5 , r 5 , 5 , r 6 , 5 ] [r_{0,5}, r_{1,5}, r_{2,5}, r_{3,5}, \color{blue} r_{4,5}, r_{5,5}, r_{6,5}] [ r 0 , 5 ,r 1 , 5 ,r 2 , 5 ,r 3 , 5 ,r 4 , 5 ,r 5 , 5 ,r 6 , 5 ] .

#### Recovery

Consider thatshard 3 fails, losing its slivers, and needs to recover them. In the following, the symbols of the lost slivers are highlighted in red (the lower quadrant is never stored).

[ s 0 , 0 s 0 , 1 s 0 , 2 s 0 , 3 s 0 , 4 r 0 , 5 r 0 , 6 s 1 , 0 s 1 , 1 s 1 , 2 s 1 , 3 s 1 , 4 r 1 , 5 r 1 , 6 s 2 , 0 s 2 , 1 s 2 , 2 s 2 , 3 s 2 , 4 r 2 , 5 r 2 , 6 r 3 , 0 r 3 , 1 r 3 , 2 r 3 , 3 r 3 , 4 r 4 , 0 r 4 , 1 r 4 , 2 r 4 , 3 r 4 , 4 r 5 , 0 r 5 , 1 r 5 , 2 r 5 , 3 r 5 , 4 r 6 , 0 r 6 , 1 r 6 , 2 r 6 , 3 r 6 , 4 ] \left[ \begin{array}{ccccc|cc} s_{0,0} & s_{0,1} & s_{0,2} & \color{red} s_{0,3} & s_{0,4} & r_{0,5} & r_{0,6} \\ s_{1,0} & s_{1,1} & s_{1,2} & \color{red} s_{1,3} & s_{1,4} & r_{1,5} & r_{1,6} \\ s_{2,0} & s_{2,1} & s_{2,2} & \color{red} s_{2,3} & s_{2,4} & r_{2,5} & r_{2,6} \\ \hline \color{red} r_{3,0} & \color{red} r_{3,1} & \color{red} r_{3,2} & \color{red} r_{3,3} & \color{red} r_{3,4} & & \\ r_{4,0} & r_{4,1} & r_{4,2} & r_{4,3} & r_{4,4} & & \\ r_{5,0} & r_{5,1} & r_{5,2} & r_{5,3} & r_{5,4} & & \\ r_{6,0} & r_{6,1} & r_{6,2} & r_{6,3} & r_{6,4} & & \\ \end{array} \right] s 0 , 0 s 1 , 0 s 2 , 0 r 3 , 0 r 4 , 0 r 5 , 0 r 6 , 0s 0 , 1 s 1 , 1 s 2 , 1 r 3 , 1 r 4 , 1 r 5 , 1 r 6 , 1s 0 , 2 s 1 , 2 s 2 , 2 r 3 , 2 r 4 , 2 r 5 , 2 r 6 , 2s 0 , 3 s 1 , 3 s 2 , 3 r 3 , 3 r 4 , 3 r 5 , 3 r 6 , 3s 0 , 4 s 1 , 4 s 2 , 4 r 3 , 4 r 4 , 4 r 5 , 4 r 6 , 4r 0 , 5 r 1 , 5 r 2 , 5r 0 , 6 r 1 , 6 r 2 , 6To recover the primarysliver , the node contacts 5 other shards and requests the recovery symbols for the 3rd primary slivers. Because the symbols of thesliver are recovery symbols, the shards need to encode their secondary slivers (highlighted as columns) to obtain them. For example, shards 0, 1, 2, 4, and 6 provide the symbols:

[ s 0 , 0 s 0 , 1 s 0 , 2 s 0 , 3 s 0 , 4 r 0 , 5 r 0 , 6 s 1 , 0 s 1 , 1 s 1 , 2 s 1 , 3 s 1 , 4 r 1 , 5 r 1 , 6 s 2 , 0 s 2 , 1 s 2 , 2 s 2 , 3 s 2 , 4 r 2 , 5 r 2 , 6 r 3 , 0 r 3 , 1 r 3 , 2r 3 , 4r 3 , 6 ] \left[ \begin{array}{c|c|c|c|c|c|c} s_{0,0} & s_{0,1} & s_{0,2} & \color{red} s_{0,3} & s_{0,4} & r_{0,5} & r_{0,6} \\ s_{1,0} & s_{1,1} & s_{1,2} & \color{red} s_{1,3} & s_{1,4} & r_{1,5} & r_{1,6} \\ s_{2,0} & s_{2,1} & s_{2,2} & \color{red} s_{2,3} & s_{2,4} & r_{2,5} & r_{2,6} \\ \color{green} r_{3,0} & \color{green} r_{3,1} & \color{green} r_{3,2} & & \color{green} r_{3,4} & & \color{green} r_{3,6}\\ \end{array} \right] s 0 , 0 s 1 , 0 s 2 , 0 r 3 , 0s 0 , 1 s 1 , 1 s 2 , 1 r 3 , 1s 0 , 2 s 1 , 2 s 2 , 2 r 3 , 2s 0 , 3 s 1 , 3 s 2 , 3s 0 , 4 s 1 , 4 s 2 , 4 r 3 , 4r 0 , 5 r 1 , 5 r 2 , 5r 0 , 6 r 1 , 6 r 2 , 6 r 3 , 6To recover the secondarysliver , the node contacts at least 3 other shards to obtain recovery symbols. In this case, the recovery symbols are already part of the primary slivers (highlighted as rows) stored by the other shards, so no re-encoding is necessary. For example, shards 0, 1, and 5 provide the recovery symbols:

[ s 0 , 0 s 0 , 1 s 0 , 2 s 0 , 3 s 0 , 4 s 1 , 0 s 1 , 1 s 1 , 2 s 1 , 3 s 1 , 4 s 2 , 0 s 2 , 1 s 2 , 2 s 2 , 3 s 2 , 4 r 3 , 0 r 3 , 1 r 3 , 2 r 3 , 3 r 3 , 4 r 4 , 0 r 4 , 1 r 4 , 2 r 4 , 3 r 4 , 4 r 5 , 0 r 5 , 1 r 5 , 2 r 5 , 3 r 5 , 4 r 6 , 0 r 6 , 1 r 6 , 2 r 6 , 3 r 6 , 4 ] \left[ \begin{array}{ccccc} s_{0,0} & s_{0,1} & s_{0,2} & \color{green} s_{0,3} & s_{0,4} \\ \hline s_{1,0} & s_{1,1} & s_{1,2} & \color{green} s_{1,3} & s_{1,4} \\ \hline s_{2,0} & s_{2,1} & s_{2,2} & s_{2,3} & s_{2,4} \\ \hline \color{red} r_{3,0} & \color{red} r_{3,1} & \color{red} r_{3,2} & \color{red} r_{3,3} & \color{red} r_{3,4} \\ \hline r_{4,0} & r_{4,1} & r_{4,2} & r_{4,3} & r_{4,4} \\ \hline r_{5,0} & r_{5,1} & r_{5,2} & \color{green} r_{5,3} & r_{5,4} \\ \hline r_{6,0} & r_{6,1} & r_{6,2} & r_{6,3} & r_{6,4} \\ \end{array} \right] s 0 , 0 s 1 , 0 s 2 , 0 r 3 , 0 r 4 , 0 r 5 , 0 r 6 , 0s 0 , 1 s 1 , 1 s 2 , 1 r 3 , 1 r 4 , 1 r 5 , 1 r 6 , 1s 0 , 2 s 1 , 2 s 2 , 2 r 3 , 2 r 4 , 2 r 5 , 2 r 6 , 2s 0 , 3 s 1 , 3 s 2 , 3 r 3 , 3 r 4 , 3 r 5 , 3 r 6 , 3s 0 , 4 s 1 , 4 s 2 , 4 r 3 , 4 r 4 , 4 r 5 , 4 r 6 , 4In this case, the symbols s 0 , 3 s_{0,3} s 0 , 3 , s 1 , 3 s_{1,3} s 1 , 3 , and s 2 , 3 s_{2,3} s 2 , 3 are already stored in the primary slivers of shards 0, 1, and 2 directly. Therefore, by requesting these from those shards,shard 3 does not need to decode the symbols to recover its secondarysliver .

### Properties and observations

#### Why the rectangular layout?

The rectangular layout of the message matrix is an optimization for the Byzantine setting. When storing theblob , aclient **Client** Entity interacting directly with the storage nodes; this can be an aggregator or cache, a publisher, or an end user. can only await N − f N - f N− f responses, as the remaining f f f shards might be Byzantine. Yet, f f f of these N − f N-f N− f might be the Byzantine ones, and the f f f that did not reply were only slow due to network asynchrony. Therefore, theblob needs to be encoded such that N − 2 f N-2f N− 2 f symbols are sufficient to recover the originalblob . This is achieved by the primary encoding.

After the initial sharing phase, the honest shards share and reconstruct the missing slivers from each other. At a steady state, you can always assume that N − f N - f N− f honest shards are in possession of their slivers. The secondary encoding can therefore have a higher rate, ( N − f ) / N (N-f)/N ( N− f ) / N , decreasing the storage overhead while maintaining the same fault tolerance properties.

#### Worst case initial sharing

The following describes how the N − f N-f N− f honest shards can obtain theirsliver pairs in the worst case outlined above, where theclient shares the slivers with N − f N-f N− f shards, f f f of which are Byzantine and drop them.

1. The N − 2 f N-2f N− 2 f honest shards receive thesliver pairs.
2. The remaining f f f honest shards are notified of the storedblob , such as through the chain, and start the process to recover theirsliver pairs.
3. First, they recover their secondary slivers, as they can be decoded from N − 2 f N-2f N− 2 f recovery symbols.
4. Then, once all N − f N-f N− f honest shards have their secondary slivers, they can start recovering the primary slivers, which require N − f N-f N− f recovery symbols.
5. All honest shards have theirsliver pairs.

#### Storage overhead

Assume for simplicity that N = 3 f + 1 N=3f+1 N= 3 f+ 1 . Then, the originalblob is divided into roughly f ⋅ 2 f = 2 f 2 f \cdot 2f = 2f^2 f⋅ 2 f= 2 f 2 symbols. The system stores N ⋅ 2 f N \cdot 2f N⋅ 2 f primarysliver symbols and N ⋅ f N \cdot f N⋅ f secondarysliver symbols, for a total storage of about 9 f 2 9f^2 9 f 2 symbols.

Therefore, the storage overhead due toRedStuff encoding is about 9 f 2 / 2 f 2 = 4.5 9f^2 / 2f^2 = 4.5 9 f 2 /2 f 2= 4.5 times the originalblob size.

#### Differences with the Twin-Code framework

The key modifications inRedStuff , compared to the original Twin-Code framework, are the following:

- RedStuff uses the RaptorQ fountain code for both the Type 0 and Type 1 encoding, as they are called in the paper. The rates are about ( N − 2 f ) / N (N-2f)/N ( N− 2 f ) / N and ( N − f ) / N (N-f)/N ( N− f ) / N respectively. The Type 0 encoding is called the primary encoding, and the Type 1 encoding the secondary encoding.
- Theblob is not laid out in a square message matrix, but in a rectangular one. This is an optimization for the specific BFT setting described here.
- Both Type 0 and Type 1 encodings are stored on eachshard . These are called slivers, and the 2 together form asliver pair .

## Walrus-specific parameters and considerations

### Sliver -pair-to - shard mapping

The previous sections assumed thatsliver pairi i i is stored onshardi i i . In practice,sliver pairs are mapped to shards in a pseudo-random fashion to ensure that the systematic slivers, which contain the original data, are not always stored on the sameshard .

This is important because systematic slivers are the most frequently accessed, as they allow you to access the data without any decoding.

The mapping works as follows: each encodedblob is assigned a 32-byte pseudo-randomblob ID **Blob ID** Cryptographic ID computed from a blob's slivers. . This ID is interpreted as an unsigned big-endian integer, and its remainder modulo N N N is used as a rotation offset, such thatsliver pairi i i is stored onshard( i + offset )m o dN (i + \text{offset}) \mod N ( i+ offset ) modN .

### Decoding probability and decoding safety limit

As mentioned above, thereconstruction failure probability of the RaptorQ code is O ( 256 − ( H + 1 ) ) O(256^{-(H+1)}) O ( 25 6 − ( H + 1 ) ) , where H H H is the number of extra symbols received. Therefore, in a system with f f f Byzantine shards, the number of source symbols for the primary encoding should be slightly below N − 2 f N-2f N− 2 f , and for the secondary encoding slightly below N − f N-f N− f . This ensures that whenever a validity or quorum threshold of messages is received, there is always a positive H H H for a low failure probability.

The following parameters are used in the encoding configuration:

- f f f , the maximum number of Byzantine shards, is ⌊ ( N − 1 ) / 3 ⌋ \lfloor (N-1) / 3 \rfloor ⌊( N− 1 ) /3 ⌋ .
- The safety limit for the encoding, σ \sigma σ , is set as a function of N N N to ensure highreconstruction probability (see table below).
- The number of primary source symbols (equivalent to the number of symbols in a secondarysliver ) is N − 2 f − σ N - 2f -\sigma N− 2 f− σ .
- The number of secondary source symbols (equivalent to the number of symbols in a primarysliver ) is N − f − σ N - f -\sigma N− f− σ .
Currently, σ \sigma σ is selected depending on the number of shards as follows:

| N shards from | N shards to (incl) | σ \sigma σ | Prob. failure 
| 0 | 15 | 0 | 0.00391 
| 16 | 30 | 1 | 1.53e-05 
| 31 | 45 | 2 | 5.96e-08 
| 46 | 60 | 3 | 2.33e-10 
| 61 | 75 | 4 | 9.09e-13 
| 76 | inf | 5 | 3.55e-15 

For example, the following settings apply:

| N shards | f | σ \sigma σ | Num primary | Num secondary 
| 7 | 2 | 0 | 3 | 5 
| 10 | 3 | 0 | 4 | 7 
| 31 | 10 | 2 | 9 | 19 
| 100 | 33 | 5 | 29 | 62 
| 300 | 99 | 5 | 97 | 196 
| 1000 | 333 | 5 | 329 | 662 

## Blob size limits

In RaptorQ, the size of a symbol is encoded as a 16-bit integer. Therefore, the maximum size of ablob that can be encoded is 2 16 − 1 = 65535 2^{16} - 1 = 65535 2 16− 1= 65535 bytes. At a minimum, a symbol must be at least 1 byte.

Because theblob is encoded in the rectangular message matrix, theblob size is upperbound by `source_symbols_primary * source_symbols_secondary * u16::MAX` and lowerbound by `source_symbols_primary * source_symbols_secondary` . A few examples for the same configurations as above:

| N shards | Minblob size | Maxblob size | Min encodedblob size | Max encodedblob size 
| 7 | 15.0 B | 983 KiB | 56.0 B | 3.67 MiB 
| 10 | 28.0 B | 1.83 MiB | 110 B | 7.21 MiB 
| 31 | 171 B | 11.2 MiB | 868 B | 56.9 MiB 
| 100 | 1.80 KiB | 118 MiB | 9.10 KiB | 596 MiB 
| 300 | 19.0 KiB | 1.25 GiB | 87.9 KiB | 5.76 GiB 
| 1000 | 218 KiB | 14.3 GiB | 991 KiB | 64.9 GiB 

## Sliver authentication,blob metadata **Blob metadata** Metadata of one blob; in particular, this contains a hash per shard to enable the authentication of slivers and recovery symbols. , and theblob ID

Alongside the efficient encoding performed byRedStuff , shards need to be able to authenticate that the slivers and encoding symbols they receive belong to theblob they requested. This section briefly outlines how this is achieved.

For eachsliver , primary or secondary, a Merkle tree is constructed.

![](/assets/images/sliver-hash-6d973d803fb53b8e651c35f84bb99eb3.png)

The tree is constructed over all N N N symbols of the fully expandedsliver . The root node of the Merkle tree (thesliver hash) is included in the metadata for theblob . To prove that a symbol is part of asliver , the prover supplies the symbol alongside the Merkle path to the root hash, which every node has as part of the metadata.

A Merkle tree over thesliver hashes is then computed to obtain ablob hash. This is computed by concatenating primary and secondarysliver hashes for eachsliver pair , and then constructing the Merkle tree over the concatenations ( c i c_i c i in the figure). This construction reduces the number of hashing operations compared to hashing eachsliver Merkle root individually.

![](/assets/images/blob-hash-1bf0308cea2f205b30e0ad80e008de47.png)

To prove that asliver is part of ablob , it is sufficient to provide the Merkle path to the root.

Finally, the encoding type tag (representing theRedStuff version or alternative encoding), the length of theblob before encoding, and the Merkle root of the tree over the slivers are hashed together to obtain theblob ID .

### Metadata overhead

Eachstorage node stores the full metadata for theblob . The metadata consists of:

- A `32 B` Merkle root hash for each primary and secondarysliver .
- The `32 B`blob ID , computed as above.
- The erasure code type ( `1 B` ).
- The length of the unencodedblob size ( `8 B` ).
The hashes for the primary and secondary slivers can be a considerable overhead when the number of shards is high. The following table shows the cumulative size of the hashes stored on the system, depending on the number of nodes and shards.

| N shards | One node | floor(N/floor(log2(N))) nodes | N nodes 
| 7 | 448 B | 1.34 KiB | 3.14 KiB 
| 10 | 640 B | 1.92 KiB | 6.40 KiB 
| 31 | 1.98 KiB | 13.9 KiB | 61.5 KiB 
| 100 | 6.40 KiB | 102 KiB | 640 KiB 
| 300 | 19.2 KiB | 710 KiB | 5.76 MiB 
| 1000 | 64.0 KiB | 7.10 MiB | 64.0 MiB 

The cumulative size of the hashes in the case of 1000 nodes (1 node pershard ) is 64 KiB per node, or 64 MiB for a system of 1000 nodes. The number of shards is fixed and constant, while the number of nodes might vary—each node has 1 or more shards—potentially lowering the overhead on the system. The following table shows the ratio between the size of the hashes stored on the system to the minimum and maximumblob sizes, for `N=1000` shards and different numbers of nodes (1 node, floor(N/floor(log2(N))) = 111, and 1000).

| N = 1000 | Total metadata size | Factor minblob | Factor maxblob | Factor min encodedblob | Factor max encodedblob 
| Single node | 64.0 KiB | 0.294 | 4.48e-06 | 0.0646 | 9.85e-07 
| floor(N/floor(log2(N))) nodes | 7.10 MiB | 32.6 | 0.000498 | 7.17 | 0.000109 
| N nodes | 64.0 MiB | 294 | 0.00448 | 64.6 | 0.000985 

For realistic node counts and smallblob sizes, the total metadata overhead can be a multiple of the size of the initial unencodedblob . For largerblob sizes, the overhead is negligible.

**Reference**

[1] K. V. Rashmi, N. B. Shah and P. V. Kumar, "Enabling node repair in any erasure code for distributed storage," 2011 IEEE International Symposium on Information Theory Proceedings, St. Petersburg, Russia, 2011, pp. 1235-1239, doi: [10.1109/ISIT.2011.6033732](https://doi.org/10.1109/ISIT.2011.6033732) .














# Operations

URL: https://docs.wal.app/docs/system-overview/operations

Blobs **Blob** Single unstructured data object stored on Walrus. can be interacted with through familiar file system operations such as uploading, reading, downloading, and deleting.

## Upload

Use the following command to upload a file to Walrus

```sh
$ walrus store file.txt --epochs 2 --context testnet
```

danger
Allblobs stored in Walrus are public and discoverable by all. Do not store secrets or private data without additional confidentiality measures, such as encrypting with [Seal](/docs/data-security) .

When you run this command, the steps executed by theclient **Client** Entity interacting directly with the storage nodes; this can be an aggregator or cache, a publisher, or an end user. are:

1. Acquire a storage resource of appropriate size and duration onchain, either directly from the Walrus system object or a secondary market. Storage resources can be split, merged, and transferred.
2. Apply erasure coding to theblob , then compute theblob ID **Blob ID** Cryptographic ID computed from a blob's slivers. from the encoded data. Theblob ID is a `u256` value typically encoded as a URL-safe base64 string. You can perform the remaining steps yourself or delegate them to apublisher **Publisher** Service interacting with Sui and the storage nodes to store blobs on Walrus; offers a basic `HTTP POST` endpoint to end users. .
3. Interact with Sui to update a storage resource and register theblob ID with the desired size and lifetime. This emits an event thatstorage nodes **Storage node** Entity storing data for Walrus; holds one or several *shards*. receive; the upload continues after event confirmation. Metadata is the onlyblob element ever exposed to Sui or [its validators](https://docs.sui.io/guides/operator/validator-index) , as the content ofblobs is always stored off-chain on Walrusstorage nodes and caches. Thestorage nodes or caches do not need to overlap with any Sui infrastructure components (such as validators), and the [storage epochs](/blog/04_testnet_update#epochs) can have different lengths and timing than [Sui epochs](https://docs.sui.io/concepts/sui-architecture/epochs) .
4. Sendblob metadata **Blob metadata** Metadata of one blob; in particular, this contains a hash per shard to enable the authentication of slivers and recovery symbols. to allstorage nodes . Eachsliver **Sliver** Erasure-encoded data of one shard corresponding to a single blob for one of the two encodings; this contains several erasure-encoded symbols of that blob but not the blob metadata. is sent to thestorage node managing its correspondingshard **Shard** (Disjoint) Subset of erasure-encoded data of all blobs; at every point in time, a shard is assigned to and stored on a single storage node. .
5. Eachstorage node receives itssliver , verifies it against theblob ID , and checks that a validblob resource authorizes the store. If correct, it signs a statement confirming it holds thesliver . Collect these signatures and aggregate them into an availability certificate.
6. Submit the availability certificate to the chain. Successful onchain verification emits an availability event (thepoint of availability (PoA) **Point of availability** Point in time when a certificate of availability is submitted to Sui and the corresponding blob is guaranteed to be available until its expiration. ) and triggers allstorage nodes to download any missing shards. After thePoA ,storage nodes sync and recover missing metadata and slivers without your involvement.
Thecertificate of availability **Certificate of availability** A blob ID with signatures of storage nodes holding at least \(2f+1\) shards in a specific epoch. is created from 2/3 of the returnedshard signatures. The erasure code rate is below 1/3, meaning thatreconstruction **Reconstruction** Decoding of the primary slivers to obtain the blob; includes re-encoding the blob and checking the Merkle proofs. is possible even if only 1/3 of shards return thesliver for a read. Because at most 1/3 of thestorage nodes can fail, this ensuresreconstruction if you request slivers from allstorage nodes . Apublisher can mediate the full process by receiving ablob and driving the process to completion.

- **Read completion:** After thePoA for ablob ID , any correctuser **User** Any entity or person that wants to store or read blobs on or from Walrus; can act as a Walrus client itself or use the simple interface exposed by publishers and caches. performing a read within theavailability period **Availability period** The period specified in storage epochs for which a blob is certified to be available on Walrus. eventually terminates and receives a value (V). This value is either theblob contents (F) or `None` .
- **Read consistency:** After thePoA , if 2 correct users perform reads and receive values (V) and (V') respectively, then (V = V'). All correct readers see the same value.
- **Correct storage guarantee:** A correctuser with an appropriate storage resource can always perform a store operation for ablob (F) with ablob ID and advance the protocol until thePoA .
- **Correctblob retrieval:** A read after thePoA for ablob (F) stored by a correctuser returns (F). Correctly storedblobs are always retrievable.
These steps are also performed by apublisher that accepts and publishesblobs through HTTP.

![Write paths of Walrus](/assets/images/WriteFlow-a5c02d29e5afa38d8ef342e961f7404c.png)

#### Maximumblob size

The maximumblob size can be queried through the [`walrus info`](/docs/walrus-client/storing-blobs#walrus-system-information) CLI command. The maximumblob size is currently 13.3 GiB. You can store largerblobs by splitting them into smaller chunks.

Blobs are stored for the number of epochs specified at the time they are stored. Walrusstorage nodes ensure theblob is available through the number of epochs specified. Mainnet uses an epoch duration of 2 weeks.

## Read

To read ablob after it has been stored on Walrus, use the `walrus read` command and provide theblob ID :

```sh
$ walrus read <blob-id> --context testnet
```

Reading ablob does not save it to a local storage location. See download for more information.

Read operations are performed by theclient or theaggregator **Aggregator** Service that reconstructs blobs by interacting with storage nodes and exposes a basic `HTTP GET` endpoint to end users. service that exposes an HTTP interface to readblobs . Reads are resilient and succeed in recovering theblob if up to 1/3 ofstorage nodes are unavailable. In most cases, after synchronization is complete,blobs can be read even if 2/3 ofstorage nodes are down.

Readingblobs from Walrus can occur directly or through aggregators and caches. The operations are identical whether performed by end users, aggregators, or caches experiencingcache **Cache** An aggregator with additional caching capabilities. misses. In practice, most reads occur through caches for frequently accessedblobs and do not require requests tostorage nodes .

The read flow uses the following steps:

1. The network uses theblob ID to obtain the metadata for theblob ID from anystorage node and authenticate it using theblob ID .
2. The system object on Sui is queried to determine thestorage nodes that store thatblob 's metadata and slivers.
3. A request is sent to thestorage nodes for the shards corresponding to theblob ID . The request waits for (f+1) responses. Sufficient requests are sent in parallel to ensure low latency for reads.
4. The returned slivers are authenticated with theblob ID , theblob is reconstructed, and the contents are determined to be either valid or inconsistent.
5. Optionally, the result is cached and can be served withoutreconstruction until it is evicted from thecache . Requests to thecache for theblob return theblob contents or aninconsistency proof **Inconsistency proof** Set of several recovery symbols with their Merkle proofs such that the decoded sliver does not match the corresponding hash; this proves an incorrect/inconsistent encoding by the client. .

## Download

To download ablob and save it on your local machine, run the following command:

```sh
$ walrus read <blob-id> --out file.txt --context testnet
```

Replace `<blob-id>` with theblob 's identifier that the `walrus store` command returns in its output, and replace `file.txt` with the name and file extension for storing the file locally.

## Certify availability

Once ablob is certified, Walrus ensures that sufficient slivers are always available onstorage nodes to recover it within the specified epochs.

You can verifyblob availability in 3 ways:

1. **Using the certifiedblob event:** Use a Sui SDK read to authenticate the certifiedblob event emitted when theblob ID was certified on Sui. The `walrus blob-status` command identifies the event ID to check.
2. **Using theblob object:** Use a Sui SDK read to authenticate the Suiblob object corresponding to theblob ID , verify it is certified, before theexpiry **Expiry** The end epoch at which a blob is no longer available and can be deleted; the end epoch is always exclusive. epoch, and not deletable.
3. **Using a smart contract:** A Sui smart contract can read theblob object on Sui to verify it is certified, before theexpiry epoch, and not deletable.
The underlying protocol of the [Sui light client](https://github.com/MystenLabs/sui/tree/main/crates/sui-light-client) returns digitally signed evidence for emitted events or objects, and can be used by offline or non-interactive applications as a proof of availability for theblob ID for a certain number of epochs.

## Delete

To delete ablob , run the following command:

```sh
$ walrus delete --blob-id <blob-id> --context testnet
```

Replace `<blob-id>` with theblob 's identifier that the `walrus store` command returns in its output.

Storedblobs can be set as deletable by theuser that creates them. This metadata is stored in the Suiblob object, and whether ablob is deletable is included in certifiedblob events. Adeletable blob **Deletable blob** Blob that can be deleted by its owner at any time to reuse the storage resource. can be deleted by the owner of theblob object to reclaim and reuse the storage resource associated with it.

If no other copies of theblob exist on Walrus, deleting ablob eventually makes it unrecoverable using read commands. However, if other copies of theblob exist on Walrus, a delete command reclaims storage space for theuser that invoked it but does not make theblob unavailable until all other copies have been deleted or expire.

## Use Sui object andblob ID utilities

The command `walrus blob-id <FILE>` derives theblob ID of any file. Theblob ID is a commitment to the file, and anyblob with the same ID decodes to the same content. Theblob ID is a 256-bit number and represented on some Sui explorers as a large decimal number. The command `walrus convert-blob-id <BLOB_ID_DECIMAL>` converts it to a base64 URL for use by the command line tools and other APIs.

The `walrus list-blobs` command lists all non-expired Sui objects that the current account owns, including theirblob ID , object ID, and metadata about expiration and deletable status. The `--include-expired` option also lists expired Sui objects.

The Sui storage cost associated with Sui objects can be reclaimed by burning the Sui object. This does not cause the Walrusblob to be deleted, but means that operations such as extending its lifetime, deleting it, or modifying attributes are no longer available. The `walrus burn-blobs --object-ids <SUI_OBJ_IDS>` command burns a specific list of Sui object IDs. The `--all` flag burns the Sui objects for allblobs under theuser account, and `--all-expired` burns all expiredblobs under theuser account.

## Extend ablob 's storage duration

Because noblob content is involved, refresh operations are conducted entirely through the Sui protocol. To extend ablob 's storage duration, you must reference the Sui object ID and indicate how many epochs you want to extend theblob 's storage for.

Run the following command to extend ablob 's storage duration by 3 epochs. You must use the Sui object ID, not theblob ID :

```sh
$ walrus extend --blob-obj-id <blob-object-id> --epochs-extended 3 --context testnet
```

Replace `<blob-object-id>` with theblob 's Sui object ID that the `walrus store` command returns in its output. Upon success,storage nodes receive an emitted event to extend the storage duration for eachsliver .

## Manageblob attributes

Walrus allows a set of key-value attribute pairs to be associated with a Sui object. While the keys and their values can be arbitrary strings to accommodate any needs, specific keys are converted to HTTP headers when servingblobs through aggregators. Eachaggregator can decide which headers it allows through the `--allowed-headers` CLI option. You can view the defaults through `walrus aggregator --help` .

The following command sets attributes `key1` and `key2` to values `value1` and `value2` , respectively. The command `walrus get-blob-attribute <blob-object-id>` returns all attributes associated with ablob ID .

```sh
$ walrus set-blob-attribute <blob-object-id> --attr "key1" "value1" --attr "key2" "value2"
```

The following command deletes the attributes with keys listed, separated by commas or spaces. All attributes of a Sui object can be deleted by the command `walrus remove-blob-attribute <blob-object-id>` .

```sh
$ walrus remove-blob-attribute-fields <blob-object-id> --keys "key1,key2"
```

Attributes are associated with Sui object IDs rather than theblobs themselves on Walrus. This means that gas for storage is reclaimed by deleting attributes and that the sameblob contents can have different attributes for different Sui objects with the sameblob ID .

## Inconsistency handling

After thePoA , a correctstorage node attempting to reconstruct asliver might fail ifblob encoding was incorrect. In this case, the node can extract aninconsistency proof for theblob ID . It then uses the proof to create aninconsistency certificate **Inconsistency certificate** An aggregated signature from 2/3 of storage nodes (weighted by their number of shards) that they have seen and stored an inconsistency proof for a blob ID. and uploads it onchain.

Inconsistency handling uses the following process:

1. Astorage node fails to reconstruct asliver and computes aninconsistency proof .
2. Thestorage node sends theblob ID andinconsistency proof to allstorage nodes of the Walrus epoch. Thestorage nodes verify the proof and sign it.
3. Thestorage node that found the inconsistency aggregates the signatures into aninconsistency certificate and sends it to the [Sui smart contract](https://docs.sui.io/guides/developer/sui-101/move-package-management) , which verifies it and emits an inconsistent resource event.
4. Upon receiving an inconsistent resource event, correctstorage nodes deletesliver data for theblob ID and record in the metadata to return `None` for theblob during theavailability period . Nostorage attestation **Storage attestation** Process where storage nodes exchange challenges and responses to demonstrate that they are storing their currently assigned shards. challenges are issued for thisblob ID .

#### Reading inconsistentblobs

Ablob ID marked as inconsistent always resolves to `None` upon reading. This occurs because the read process re-encodes the receivedblob to verify that theblob ID was derived from consistent encoding.

Aninconsistency proof reveals only a true fact tostorage nodes (which do not otherwise run decoding) and does not change read output in any case.

However, partial reads that use the systematic nature of the encoding might successfully return partial data for inconsistently encoded files. If consistency and availability of reads is important, perform full reads rather than partial reads.

## Challenge mechanism forstorage attestation

During an epoch, a correctstorage node challenges all shards to provide symbols forblob slivers pastPoA :

- The list of availableblobs for the epoch is determined by the sequence of Sui events up to the past epoch. Inconsistentblobs are not challenged, and a record proving this status can be returned instead.
- A challenge sequence is determined by providing a seed to the challengedshard . The sequence is then computed based on the seed and the content of each challengedblob ID . This creates a sequential read dependency.
- The response to the challenge provides the sequence ofshard contents for theblob IDs in a timely manner.
- The challenger node uses thresholds to determine whether the challenge was passed and reports the result onchain.
- The challenge and response communication is authenticated.
Challenges provide reassurance that thestorage node can actually recovershard data in a probabilistic manner, preventingstorage nodes from receiving payment without any evidence they can retrieveshard data. The sequential nature of the challenge and a reasonable timeout also ensure that the process is timely.



















# System Constraints & Considerations

URL: https://docs.wal.app/docs/system-overview/system-constraints

This page describes the practical limits and constraints you should consider when designing applications on Walrus. For current values, run `walrus info` .

## Blob **Blob** Single unstructured data object stored on Walrus. size

Walrus supportsblobs up to approximately 13.6 GiB. Check the current limit with `walrus info` under "Maximumblob size."

When using [quilts](/docs/system-overview/quilt) for batch storage, each individualblob within the quilt is limited to approximately 4 GiB. This per - blob limit is imposed by the quilt's internal header format. Check the current limit with `walrus info` under "Maximumblob size in quilt." If you need to store data larger than 4 GiB, store it as a regularblob instead of within a quilt.

If your data exceeds this limit, learn more about [best practices for large data uploads](/docs/large-uploads) .

## Memory requirements

Encoding and decodingblobs requires significant memory.

- **Encoding (upload):** Requires approximately 2-3x theblob size in available RAM.
- **Decoding (retrieval):** Requires approximately 1.5-2x theblob size in available RAM.
For example, encoding a 5 GiBblob requires 10 to 15 GiB of available RAM.

If the system runs out of memory during encoding, the operation fails with an error such as `Out of memory` or `Failed to allocate buffer` . Split largeblobs into smaller chunks to reduce memory requirements, or run the CLI on a machine with more RAM.

Aggregator **Aggregator** Service that reconstructs blobs by interacting with storage nodes and exposes a basic `HTTP GET` endpoint to end users. operators should provision aggregators with enough memory to handle the largestblobs they are expected to reconstruct.

## Rate limiting

### Storage node **Storage node** Entity storing data for Walrus; holds one or several *shards*. rate limits

Storage nodes might rate-limit requests to prevent abuse. If you encounter `HTTP 429` or `Too many requests` errors, implement exponential backoff in your retry logic. Using publishers and aggregators avoids direct interaction withstorage nodes and handles rate limiting internally.

### Sui RPC rate limits

Public Sui RPC endpoints have request quotas. If you encounter `RPC rate limit exceeded` errors, configure multiple RPC endpoints for failover,cache **Cache** An aggregator with additional caching capabilities. blockchain queries where possible, or use a paid RPC service for production workloads.

## Network bandwidth

Upload and download times are proportional toblob size and network speed. Walrus encodes data with approximately 4.5x expansion, so uploading a 1 GiBblob transmits roughly 4.5 GiB of encoded data across the network.

To reduce upload latency:

- Compress data before uploading if your use case allows it. Compression reduces the stored size, which reduces both storage cost and upload time.
For downloads, aggregatorscache frequently accessedblobs . If your application serves the sameblobs to many users, place anaggregator with caching closer to your users to reduce latency.

If you are using a machine with limited resources, consider using apublisher **Publisher** Service interacting with Sui and the storage nodes to store blobs on Walrus; offers a basic `HTTP POST` endpoint to end users. to offload encoding. Theclient **Client** Entity interacting directly with the storage nodes; this can be an aggregator or cache, a publisher, or an end user. uploads the rawblob once, and thepublisher handles encoding andsliver **Sliver** Erasure-encoded data of one shard corresponding to a single blob for one of the two encodings; this contains several erasure-encoded symbols of that blob but not the blob metadata. distribution.

## Epoch transitions

Storage nodeshard **Shard** (Disjoint) Subset of erasure-encoded data of all blobs; at every point in time, a shard is assigned to and stored on a single storage node. assignments change every epoch. During transitions, nodes migrate data to newshard owners. This process is automatic but can briefly affect retrieval latency. In rare cases, some slivers might be temporarily unavailable until migration completes.

Applications should implement retry logic to handle transient failures during epoch transitions.

## Byzantine fault tolerance assumptions

Walrus guarantees hold as long as more than 2/3 of storage shards (by stake weight) are managed by honeststorage nodes . The system tolerates up to 1/3 of shards being controlled by faulty or malicious nodes.

This assumption applies both within individual storage epochs and across epoch transitions. Under normal operation, the Sui staking mechanism and economic incentives maintain this property.

For data with extreme durability requirements, consider maintaining additional off-Walrus backups.

## Public infrastructure availability

Public publishers and aggregators do not have formal availability guarantees. They might go offline, experience performance issues, or enforce rate limits.

For production applications:

- Do not rely on a singlepublisher oraggregator .
- Run your ownpublisher andaggregator infrastructure.
- Implement failover across multiple endpoints.
- Maintain the ability to fall back to direct CLI or SDK usage.














Available Networks
Walrus Mainnet operates a production-quality storage network using corresponding resources on the Sui Mainnet. The Walrus Testnet operates in conjunction with the Sui Testnet and is used to test new features before they graduate to Mainnet. Alternatively, developers can operate a local instance of both Walrus and Sui for personalized testing.

info
The Network Reference is the canonical source for Walrus endpoints, package IDs, system and staking object IDs, token units, and configuration snippets. This page summarizes the same values with setup context. If a value here differs, the Network Reference is authoritative.

Network parameters
Important fixed system parameters for Mainnet and Testnet are summarized in the following table:

Parameter	Mainnet	Testnet
Sui network	Mainnet	Testnet
Number of shards	1000	1000
Epoch duration	2 weeks	1 day
Maximum number of epochs for which storage can be bought	53	53
Many other parameters, including the system capacity and prices, are dynamic. These parameters are stored in the system object and you can view them with tools like the Walruscan explorer.

Mainnet configuration
The client
 parameters for the Walrus Mainnet are:

setup/client_config_mainnet.yaml
# NOTE: walrus-service uses these IDs to detect network defaults. Changing them changes node
# behavior and must be coordinated.
system_object: 0x2134d52768ea07e8c43570ef975eb3e4c27a39fa6396bef985b5abc58d03ddd2
staking_object: 0x10b9d30c28448939ce6c4d6c6e0ffce4a7f8a4ada8248bdad09ef8b70e4a3904
n_shards: 1000
max_epochs_ahead: 53
rpc_urls:
  - https://fullnode.mainnet.sui.io:443
Wrap

 Copy

Use an Agent
To explore the Walrus contracts, their package IDs are:

WAL
 package: 0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59

Walrus package: 0xfdc88f7d7cf30afab2f82e8380d11ee8f70efb90e863d1de8616fae1bb09ea77

Subsidies package: 0xd843c37d213ea683ec3519abe4646fd618f52d7fce1c4e9875a4144d53e21ebc

The Walrus client infers these package IDs automatically from the object IDs above, so you do not need to enter them manually in the configuration file. You can also find the latest published package IDs in the Move.lock files in the subdirectories of the contracts directory on GitHub.

The configuration file described on the setup page includes both Mainnet and Testnet configuration.

Testnet configuration
All transactions run on the Sui Testnet and use Testnet WAL and SUI, which have no value.

danger
The state of the network can be wiped at any point and possibly without warning. Do not use this Testnet for any production purposes, as it comes with no availability or persistence guarantees. New features on Testnet might break deployed Testnet apps.

See the Testnet terms of service under which this Testnet is made available.

The configuration parameters for the Walrus Testnet are included in the configuration file described on the getting started guide. If you want only the Testnet configuration, you can get the Testnet-only configuration file. The parameters are:

setup/client_config_testnet.yaml
# NOTE: walrus-service uses these IDs to detect network defaults. Changing them changes node
# behavior and must be coordinated.
system_object: 0x6c2547cbbc38025cf3adac45f63cb0a8d12ecf777cdc75a4971612bf97fdf6af
staking_object: 0xbe46180321c30aab2f8b3501e24048377287fa708018a5b7c2792b35fe339ee3
exchange_objects:
  - 0xf4d164ea2def5fe07dc573992a029e010dba09b1a8dcbc44c5c2e79567f39073
  - 0x19825121c52080bb1073662231cfea5c0e4d905fd13e95f21e9a018f2ef41862
  - 0x83b454e524c71f30803f4d6c302a86fb6a39e96cdfb873c2d1e93bc1c26a3bc5
  - 0x8d63209cf8589ce7aef8f262437163c67577ed09f3e636a9d8e0813843fb8bf1
n_shards: 1000
max_epochs_ahead: 53
rpc_urls:
  - https://fullnode.testnet.sui.io:443
communication_config:
  tail_handling: detached
  upload_mode: aggressive
  data_in_flight_auto_tune:
    enabled: true
Wrap

 Copy

Use an Agent
You can find the current Testnet package IDs in the Move.lock files in the subdirectories of the testnet-contracts directory on GitHub.

Exchange Testnet SUI for WAL
The Walrus Testnet uses Testnet WAL tokens for buying storage and staking. Testnet WAL tokens have no value and can be exchanged at a 1:1 rate for Testnet SUI tokens, which also have no value.

Use the official WAL exchange flow on this page for Testnet WAL. Third-party faucets can distribute WAL from a package the Walrus client does not accept.

Prerequisites: Sui wallet and Testnet SUI
Prerequisites
 Download and install the Sui CLI.

 Create a Sui account.

 Obtain Testnet SUI.

 Download and install Walrus.

After completing the prerequisites, run the following command to exchange SUI for WAL:

walrus get-wal

 Copy

Use an Agent
You can verify that you received Testnet WAL by checking the Sui balances:

sui client balance

 Copy

Use an Agent
If successful, the console responds:

╭─────────────────────────────────────────╮
│ Balance of coins owned by this address  │
├─────────────────────────────────────────┤
│ ╭─────────────────────────────────────╮ │
│ │ coin  balance (raw)     balance     │ │
│ ├─────────────────────────────────────┤ │
│ │ Sui   8869252670        8.86 SUI    │ │
│ │ WAL   500000000         0.50 WAL    │ │
│ ╰─────────────────────────────────────╯ │
╰─────────────────────────────────────────╯

 Copy

Use an Agent
By default, 0.5 SUI are exchanged for 0.5 WAL. To exchange a different amount of SUI, use the --amount option. The value is in MIST/FROST
. To use a specific SUI/WAL exchange object, use the --exchange-id option. Run walrus get-wal --help for more information about these options.

Run a local Walrus network
You can deploy an instance of the Walrus network on your local machine for local testing. Run the script scripts/local-testbed.sh found in the Walrus GitHub repository. Run scripts/local-testbed.sh -h for further usage information. The script generates a configuration file that you can use when running the Walrus client.

You can also spin up a local Grafana instance to visualize the metrics collected by the storage nodes
 through cd docker/grafana-local; docker compose up. This works with the default storage node configuration.

The Walrus storage nodes of this local network run on your local machine. By default, the Sui Devnet deploys and interacts with the contracts. To run the local network fully locally, start a local network with sui start --with-faucet --force-regenesis (requires sui version v1.28.0 or higher) and specify localnet when starting the Walrus testbed.













Storage Costs
When choosing a platform to store and verify data, you should consider reliability, uptime, availability, programmability, and price predictability. Walrus offers a fixed, USD-denominated storage cost of $0.023/GB/month, allowing you to budget and scale with confidence.

Estimate storage costs
Use the embedded Walrus Cost Calculator to estimate storage costs before you upload. The calculator models storage size, duration, encoding overhead, WAL
 storage costs, and SUI transaction costs together.


If the calculator does not load, open the Walrus Cost Calculator in a new tab.

For command-line estimates, run walrus info to view current storage prices and upload fees. You can also run walrus store --dry-run ... to see the encoded size used in WAL cost calculations without submitting transactions.

How pricing works
Storage on Walrus is paid in WAL but priced at a fixed rate of $0.023/GB/month. The amount of WAL required adjusts automatically as the WAL token price changes.

For Testnet, you can exchange Testnet SUI for Testnet WAL from Exchange Testnet SUI for WAL. Use the official exchange flow so the WAL package matches what the Walrus client
 expects.

Behind the scenes, Walrus storage nodes
 track WAL prices from multiple sources and periodically update their onchain price vote to keep costs aligned with USD.

You also pay SUI for executing transactions on Sui Mainnet. Each operation that interacts with the Sui blockchain (registering a blob
, posting a certificate, extending storage) incurs a gas fee in SUI. See SUI tokenomics and SUI gas fee calculation for more details.

tip
Walrus uses erasure coding with approximately 5x expansion. The cost calculator and walrus info account for this. You do not need to calculate the expansion yourself.

What you get for $0.023/GB/month
At $0.023 per GB per month, Walrus is in line with centralized storage providers but includes additional capabilities and lower configuration requirements.

Built-in redundancy
Data is encoded using erasure coding with approximately 4.5x redundancy across independent storage nodes. Achieving similar redundancy in a centralized provider typically requires storing additional copies in multiple regions.

Portability
Data is not tied to a single provider and can be accessed across environments efficiently without migration overhead. Moving data across centralized cloud storage can be costly (egress fees) and operationally complex.

Verifiability
Data is content-addressed and cryptographically verifiable, so you can prove it has not been altered. Cloud storage providers rely on internal checksums to maintain integrity but do not provide independent verification.

Programmable access control
Access is enforced through onchain policies, enabling fine-grained, dynamic permissioning reusable across systems. Cloud storage providers manage access through centralized policies outside application logic, often requiring additional infrastructure for dynamic behavior.

Storage resources
You need a storage resource with adequate capacity and epoch duration to store a blob. You can purchase storage resources from the Walrus system contract by paying WAL, which is used by the client and aggregators while free space is available, or you can receive them from other parties.

The cost of a storage resource is based on the blob's encoded size: the erasure-coded size of the blob (roughly 5x the original) plus fixed per-blob metadata
 of up to ~64 MB. For blobs smaller than 10 MB, this fixed metadata cost dominates. See Reducing costs for small blobs for optimization strategies.

tip
Small blobs still pay fixed metadata overhead. If you store many small files, use Walrus Quilt to batch them and amortize the overhead.

Storage fund
The storage fund holds WAL for storing blobs across 1 or more epochs. When you purchase storage space from the system object, payments are allocated across the relevant epochs. At the end of each epoch, funds are distributed to storage nodes based on performance, which is determined through light audits that nodes conduct on each other.

Upload fees
Registering a blob costs WAL to cover upload costs. This ensures that deleting blobs and reusing storage resources remains sustainable for the system.

Sui transaction fees
Storing a blob involves up to 3 onchain Sui transactions, each of which incurs SUI gas fees.

Acquiring a storage resource (reserve_space)

Registering the blob

Certifying the blob as available

Sui object storage
Walrus blobs are represented as Sui objects onchain. Creating these objects deposits SUI into the Sui storage fund, most of which is refunded when you delete the objects.

Measuring costs
The most accurate way to measure costs is to upload a blob and observe SUI and WAL costs in a Sui explorer or through Sui RPC calls. Blob contents do not affect cost.

For example, the following command results in 2 transactions:

walrus store <FILENAME> --epochs 1

 Copy

Use an Agent
The first transaction calls reserve_space (if no appropriately sized storage resource already exists) and register_blob. This affects both SUI and WAL balances. The SUI cost of register_blob is independent of blob size or epoch lifetime. WAL costs are linear in encoded size (both erasure coding and metadata). The SUI cost of reserve_space grows with epoch count, and WAL costs scale with both encoded size and epoch count.

The second transaction calls certify_blob and only affects the SUI balance. Its SUI cost is independent of blob size or epoch lifetime.

To observe the storage rebate, burn the resulting blob object:

walrus burn-blobs --object-ids <BLOB_OBJECT_ID>

 Copy

Use an Agent
Burning a blob's corresponding object on Sui does not delete the blob data on Walrus.

Estimating costs without submitting transactions
Use the Walrus Cost Calculator for interactive planning. These commands help estimate costs locally without submitting transactions:

walrus info displays current costs for buying storage resources and uploads.

walrus store --dry-run ... outputs the encoded size used in WAL cost calculations without submitting any transactions.

Storage resource lifecycle
Acquiring storage
Purchase storage space from the system object by paying into the storage fund for a specified duration of 1 or more epochs. You can split, merge, or transfer storage resources. The maximum duration you can purchase in advance is approximately 2 years.

Assigning a blob ID
After acquiring storage, assign a blob ID to indicate intent to store. This emits a Move resource event, signaling storage nodes to expect and authorize off-chain storage operations.

Certifying availability
After uploading blob data off-chain, certify availability onchain:

Upload blob slivers to storage nodes off-chain.
Receive an availability certificate from storage nodes.
Upload the certificate onchain.
The system checks the certificate against the current Walrus committee.
If valid, the system emits an availability event for the blob ID.
The availability event marks the point of availability for the blob, after which Walrus guarantees its availability for the specified duration.

Extending storage
You can extend a certified blob's storage at any time by attaching a storage object with a longer expiry
 period. Smart contracts can use this mechanism to extend blob availability indefinitely, as long as funds are available.

Handling inconsistent blobs
If a blob ID is not correctly encoded, an inconsistency proof certificate can be submitted onchain. This emits an inconsistent blob event, signaling that reads for that blob ID always return None and that storage nodes can delete its slivers (except for an indicator to return None).

Acquiring storage resources
You can acquire storage resources through 3 methods:

Purchase from the system contract: Pay WAL to buy a storage resource for a specific size and duration. Run walrus info to see current prices.

Reuse existing resources: The CLI automatically uses any user
-owned storage resource of appropriate size and duration before purchasing new storage.

Transfer or trade: Storage resources can be transferred between users or acquired through marketplace implementations.

Optimizing costs
Reducing costs for small blobs with Quilt
Walrus Quilt is a batch storage tool that amortizes metadata costs across multiple blobs stored together. It can also significantly reduce Sui computation and storage costs.

Use Quilt when you are storing many small files such as JSON metadata, thumbnails, or configuration files. The savings come from amortizing a single transaction fee and storage reservation across all items in the batch.

Trade-offs to consider:

Quilt adds complexity to your application's storage and retrieval logic.
For details, see Batch Storage with Quilt.

Buy storage resources in bulk
Purchasing larger storage resources at once, both in size and duration, minimizes SUI gas costs per unit. You can split and merge these resources as needed for smaller blobs or shorter durations.

Use Sui PTBs efficiently
Pack multiple smart contract calls into a single Sui programmable transaction block (PTB) to manage resource acquisition, splitting, and merging. This reduces both latency and costs.

Reclaim and reuse storage
You can reclaim storage resources by deleting non-expired blobs that were created as deletable. If your app only needs to store data for less than 1 epoch (2 weeks on Mainnet), actively deleting blobs and reusing storage space reduces costs.

Batch blob operations
You can register or certify multiple blobs in a single Sui PTB to reduce latency and gas costs. The CLI uses this approach when uploading multiple blobs at once.

Manage blob object lifecycle
Each stored blob creates a small Sui object. Once a blob expires, burn the object to reclaim most of its Sui storage cost through a storage rebate. Burning the object does not delete the blob data on Walrus.

If you no longer need lifecycle operations (extending lifetime, deleting, or adding attributes), burn the blob object through the CLI or a smart contract call to save on Sui storage costs. Depending on the relative costs of SUI and WAL, it might be cheaper to burn a long-lived blob object and re-register and re-certify it near expiration than to hold the object for the full duration.












# Public Aggregators and Publishers

URL: https://docs.wal.app/docs/system-overview/public-aggregators-and-publishers

TheWalrus client **Client** Entity interacting directly with the storage nodes; this can be an aggregator or cache, a publisher, or an end user. offers a daemon mode that runs a simple web server that provides HTTP interfaces you can use to store and readblobs **Blob** Single unstructured data object stored on Walrus. in an [aggregator](/docs/operator-guide/aggregators/operating-aggregator) or [publisher](/docs/operator-guide/publishers/operating-publisher) role respectively. Walrus also offers HTTP APIs through public aggregator and publisher services that you can use without running a localclient .

Walrus aggregators and publishers expose their API specifications at the path `/v1/api` . View this path in a browser, for example, at [https://aggregator.walrus-testnet.walrus.space/v1/api](https://aggregator.walrus-testnet.walrus.space/v1/api) . The latest version of these specifications is available [on GitHub](https://github.com/MystenLabs/walrus/tree/main/crates/walrus-service) in HTML and YAML format.

## Using a publicaggregator **Aggregator** Service that reconstructs blobs by interacting with storage nodes and exposes a basic `HTTP GET` endpoint to end users. orpublisher **Publisher** Service interacting with Sui and the storage nodes to store blobs on Walrus; offers a basic `HTTP POST` endpoint to end users.

On Walrus Testnet, many entities run public aggregators and publishers. On Mainnet, there are no public publishers without authentication, as they consume both SUI andWAL **WAL** The native token of Walrus. . For production upload options, see [Choose your upload path](/docs/getting-started#choose-your-upload-path) and [Mainnet Publisher Production Guide](/docs/operator-guide/publishers/mainnet-production-guide) .

See the aggregators and publishers list for public services on Mainnet and Testnet. Walrus also provides the [operator lists in JSON format](/operators.json) . The [Network Reference](/docs/network-reference#aggregators-and-publishers) lists the Mysten Labs reference endpoints alongside this community list.

The operator list in JSON format includes additional info about aggregators, namely whether they are deployed with caching functionality and whether they are found to be functional. The list is updated once per week.

Most aggregators and publishers limit requests to 10 MiB by default. If you want to upload larger files, you need to [run your own publisher](/docs/operator-guide/publishers/operating-publisher#local-daemon) or use the [CLI](/docs/walrus-client/storing-blobs) .

### Aggregators and publishers list

Loading operators...

















# View System Information

URL: https://docs.wal.app/docs/system-overview/view-system-info

The [Walrus system object](https://github.com/MystenLabs/walrus/blob/main/contracts/walrus/sources/system/system_state_inner.move) contains metadata about available and used storage and the price of storage per KiB in [FROST](/docs/walrus-client/storing-blobs) . These values are determined by 2/3 agreement betweenstorage nodes **Storage node** Entity storing data for Walrus; holds one or several *shards*. for eachstorage epoch **Storage epoch** The epoch for Walrus as distinct to the epoch for Sui. . You can pay to purchase storage space for specified durations. These space resources can be split, merged, and transferred, and can later be used to place ablob ID **Blob ID** Cryptographic ID computed from a blob's slivers. into Walrus.

Each Walrusstorage epoch is represented by the Walrus system object, which contains astorage committee **Storage committee** The set of storage nodes for a storage epoch, including metadata about the shards they are responsible for and other metadata. and various metadata aboutstorage nodes , including the mapping between shards andstorage nodes , available space, and current costs. Committee changes between epochs are managed by a set of [staking contracts](https://github.com/MystenLabs/walrus/tree/main/contracts/walrus/sources/staking) that implement a full delegated proof-of-stake system based on theWAL **WAL** The native token of Walrus. token.

## `walrus info`

You can view information about the Walrus system through the `walrus info` command. It provides an overview of current system parameters, such as the current epoch, the number ofstorage nodes and shards in the system, the maximumblob **Blob** Single unstructured data object stored on Walrus. size, and the current cost inWAL for storingblobs :

```sh
$ walrus info
```

The console responds:

```sh
Walrus system information

Epochs and storage duration
Current epoch: 1
Start time: 2025-03-25 15:00:24.408 UTC
End time: 2025-04-08 15:00:24.408 UTC
Epoch duration: 14days
Blobs can be stored for at most 53 epochs in the future.

Storage nodes
Number of storage nodes: 103
Number of shards: 1000

Blob size
Maximum blob size: 13.6 GiB (14,599,533,452 B)
Storage unit: 1.00 MiB

Storage prices per epoch
(Conversion rate: 1 WAL = 1,000,000,000 FROST)
Price per encoded storage unit: 0.0001 WAL
Additional price for each write: 20,000 FROST

...
```

You can view additional information with various subcommands:

| Command | Description 
| `all` | Print all information listed below 
| `epoch` | Print epoch information 
| `storage` | Print storage information 
| `size` | Print size information 
| `price` | Print price information 
| `bft` | Print byzantine fault tolerance (BFT) information 
| `committee` | Print committee information 
| `help` | Print help for the given subcommand 

| Parameter | Required/Optional | Description 
| `--config <CONFIG>` | Optional | Path to the Walrus configuration file. Defaults to `client_config.yaml` / `client_config.yml` in the current directory, `$XDG_CONFIG_HOME/walrus/` , `~/.config/walrus/` , or `~/.walrus/` 
| `--rpc-url <RPC_URL>` | Optional | URL of the Sui RPC node. Defaults to `rpc_url` inclient **Client** Entity interacting directly with the storage nodes; this can be an aggregator or cache, a publisher, or an end user. config or wallet config 
| `--context <CONTEXT>` | Optional | Configuration context to use; defaults to `default_context` 
| `--wallet <WALLET>` | Optional | Path to the Sui wallet configuration file. Defaults through config parameter, Walrus config path, `./sui_config.yaml` , then `~/.sui/sui_config/client.yaml` 
| `--gas-budget <GAS_BUDGET>` | Optional | Gas budget for transactions. Estimated automatically if not specified 
| `--json` | Optional | Write output as JSON 
| `--trace-cli <TRACE_CLI>` | Optional | Enable tracing output. Values: `otlp` (sends to OTLP collector) or `file=path` (writes gzipped JSON traces to file) 
| `-h` , `--help` | Optional | Print help 

## `walrus health`

You can check the health ofstorage nodes with the `walrus health` command. This command accepts different options to select which nodes to check.

| Parameter | Required or optional | Description 
| `--node-ids <NODE_IDS>...` | Required | The IDs of thestorage nodes to be selected 
| `--node-urls <NODE_URLS>...` | Required | The URLs of thestorage nodes to be selected 
| `--committee` | Required | Select allstorage nodes in the current committee 
| `--active-set` | Required | Select allstorage nodes in the active set 
| `--config <CONFIG>` | Optional | Path to the Walrus configuration file. Defaults to `client_config.yaml` in the current directory, `$XDG_CONFIG_HOME/walrus/` , `~/.config/walrus/` , or `~/.walrus/` 
| `--rpc-url <RPC_URL>` | Optional | URL of the Sui RPC node. Defaults to `rpc_url` inclient config or wallet config 
| `--context <CONTEXT>` | Optional | Configuration context to use; defaults to `default_context` 
| `--wallet <WALLET>` | Optional | Path to the Sui wallet configuration file. Defaults through config parameter, Walrus config path, `./sui_config.yaml` , then `~/.sui/sui_config/client.yaml` 
| `--gas-budget <GAS_BUDGET>` | Optional | Gas budget for transactions. Estimated automatically if not specified 
| `--json` | Optional | Write output as JSON 
| `--detail` | Optional | Print detailed health information 
| `--sort-by <SORT_BY>` | Optional | Field to sort by. Possible values: `status` , `id` , `name` , `url` 
| `--desc` | Optional | Sort in descending order 
| `--concurrent-requests <CONCURRENT_REQUESTS>` | Optional | Number of concurrent requests to send tostorage nodes . Default: `60` 
| `--trace-cli <TRACE_CLI>` | Optional | Enable tracing output. Values: `otlp` (sends to OTLP collector) or `file=path` (writes gzipped JSON traces to file) 
| `-h` , `--help` | Optional | Print help













# Batch Storage with Quilt

URL: https://docs.wal.app/docs/system-overview/quilt

Quilt is a batch storage feature designed to optimize the storage cost and efficiency of large numbers of smallblobs **Blob** Single unstructured data object stored on Walrus. . Before Quilt, storing smallblobs (less than 10 MB) on Walrus involved higher per-byte costs due to internal system data overhead. Quilt addresses this by encoding multipleblobs (up to 666 for QuiltV1) into a single unit called a **quilt** , significantly reducing Walrus storage overhead and lowering costs to purchase Walrus and Sui storage, as well as Sui computation gas fees.

Eachblob within a quilt can be accessed and retrieved individually without downloading the entire quilt. Theblob boundaries in a quilt align with Walrus internal structures and Walrusstorage nodes **Storage node** Entity storing data for Walrus; holds one or several *shards*. , allowing for retrieval latency that is comparable to, or lower than, that of a regularblob .

Quilt introduces custom, immutable Walrus-nativeblob metadata **Blob metadata** Metadata of one blob; in particular, this contains a hash per shard to enable the authentication of slivers and recovery symbols. , allowing you to assign different types of metadata to eachblob in a quilt, for example, unique identifiers and tags of key-value pairs. This metadata is functionally similar to the existingblob metadata store onchain, but there are some fundamental distinctions. Walrus-native metadata is stored alongside theblob data, which reduces costs and simplifies management. This metadata can also be used for efficient lookup ofblobs within a quilt, for example, readingblobs with a particular tag. When storing a quilt, you can set the Walrus-native metadata using the Quilt APIs.

warning
An identifier must start with an alphanumeric character, contain no trailing whitespace, and not exceed 64 KiB in length.

The total size of all tags combined must not exceed 64 KB.

## Important considerations

### Per - blob size limit

Each individualblob within a quilt is limited to approximately 4 GiB. This limit is separate from the maximumblob size shown by `walrus info` , which applies to regularblobs and to the quilt as a whole. The per - blob limit comes from the quilt's internal header format, which uses a 4-byte field to store eachblob 's length. A small amount of this space is used for per - blob metadata (identifier and tags), so the usable data capacity is slightly less. You can check this limit by running `walrus info` and looking for the "Maximumblob size in quilt" field.

If you need to store data larger than 4 GiB, store it as a regularblob instead of within a quilt.

### Quilt patch IDs

Blobs stored in a quilt are assigned a unique ID called `QuiltPatchId` , which differs from the `BlobId` used for regular Walrusblobs . A `QuiltPatchId` is determined by the composition of the entire quilt rather than the singleblob , so it can change if theblob is stored in a different quilt. Individualblobs cannot be deleted, extended, or shared separately. These operations can only be applied to the entire quilt.

## Target use cases

Using Quilt requires minimal additional effort beyond standard procedures. The primary consideration is that the unique ID assigned to eachblob within a quilt cannot be directly derived from its contents.

### Lower cost

Quilt is especially advantageous for managing large volumes of smallblobs , as long as they can be grouped together. The cost savings come from 2 sources:

- **Walrus storage and write fees:** By consolidating multiple smallblobs into a single quilt, storage costs can be reduced dramatically — more than 400x for files around 10 KiB — making it an efficient solution for cost-sensitive applications.
- **Sui computation and object storage fees:** Storing manyblobs as a single quilt significantly reduces Sui gas costs. In test runs with 600 files stored in a quilt, 238x savings in Sui fees were observed compared to storing them as individualblobs . Sui cost savings depend only on the number of files per quilt rather than the individual file sizes.
The following table demonstrates the potential cost savings inWAL **WAL** The native token of Walrus. when storing 600 smallblobs for 1 epoch as a quilt compared to storing them as separateblobs .

| Blob size | Regularblob storage cost | Quilt storage cost | Cost saving factor 
| 10KiB | 2.088WAL | 0.005WAL | 409x 
| 50KiB | 2.088WAL | 0.011WAL | 190x 
| 100KiB | 2.088WAL | 0.020WAL | 104x 
| 200KiB | 2.088WAL | 0.036WAL | 58x 
| 500KiB | 2.136WAL | 0.084WAL | 25x 
| 1MiB | 2.208WAL | 0.170WAL | 13x 

info
The costs shown in this table are for illustrative purposes only and were obtained from test runs on Walrus Testnet. Actual costs can vary due to changes in smart contract parameters, networks, and other factors. The comparison is between storing 600 files as a single quilt versus storing them as individualblobs in batches of 25.

### Store agent memory

AI agents tend to produce a steady stream of small, independent writes: individual conversation turns, tool call outputs, embedding vectors, and periodic state checkpoints. Each item is small on its own, but an agent can generate them continuously, so the count grows quickly.

Storing each item as its own Walrusblob means every item pays the same fixed overhead regardless of its size: onchain registration on Sui,blob metadata , and the minimum overhead of erasure coding. For tinyblobs , this fixed per - blob cost dominates the cost of the data itself, so writing many smallblobs individually means paying that overhead over and over.

Quilt addresses this by batching many small items into a single Walrusblob , so the per - blob overhead is paid once for the batch rather than once for each item. Each item remains individually retrievable by its identifier or `QuiltPatchId` , so the agent can still read back a single turn, output, or checkpoint without reconstructing the whole batch. This makes Quilt a good fit for accumulating agent memory in batches, for example flushing a buffer of recent turns or a group of embeddings as one quilt.

### Organize collections

Quilt provides a straightforward way to organize and manage collections of smallblobs within a single unit. This can simplify data handling and improve operational efficiency when working with related small files, such as NFT image collections.

### Walrus-nativeblob metadata

Quilt supports immutable, custom metadata stored directly in Walrus, including identifiers and tags. These features facilitate better organization, enable flexible lookup, and assist in managingblobs within each quilt, improving retrieval and management.

For details on how to use the CLI to interact with Quilt, see the [Batch-storing blobs with quilts](/docs/walrus-client/storing-blobs#batch-store) section.

## When to use Quilt

Quilt fits workloads that generate many smallblobs you can group and write together. Whether Quilt is the right choice depends on how each item is written, retrieved, and retired.

Use Quilt when:

- You write many smallblobs that you can group into batches, such as agent memory or other collections of related small files.
- The items in a batch share a lifetime, so you can store, extend, and eventually retire them together.
- You want individual retrieval and Walrus-native metadata (identifiers and tags) without paying per - blob overhead for every item.
Use a regularblob instead when:

- A single item is large on its own. Store data that approaches or exceeds the per - blob size limit as a regularblob . For more information, see Important considerations .
- Items need independent, one-at-a-time lifetimes. The `delete` , `extend` , and `share` operations apply to the whole quilt rather than to individual items within it, so an item you need to delete, extend, or share on its own schedule should be a regularblob .
- You need each item addressed by a content-derivedblob ID **Blob ID** Cryptographic ID computed from a blob's slivers. . An item inside a quilt is retrieved by its `QuiltPatchId` , which depends on the composition of the whole quilt and is not derived from the item's contents.









# Walrus Client

URL: https://docs.wal.app/docs/walrus-client

[#### Walrus Client

Use the Walrus client through the command line to store and retrieve blobs.

→](/docs/walrus-client/walrus-cli)
[#### Storing Blobs

Use the Walrus client to store blobs and set lifetimes.

→](/docs/walrus-client/storing-blobs)
[#### Reading Blobs

Use the Walrus client to check blob status, read blob data, and verify consistency.

→](/docs/walrus-client/reading-blobs)
[#### Managing Blobs

Use the Walrus client to extend, delete, burn, share, and set attributes on blobs.

→](/docs/walrus-client/managing-blobs)
[#### JSON Mode

Use JSON mode for programmatic access to all Walrus CLI commands with JSON-formatted input and output.

→](/docs/walrus-client/json-mode)
[#### Quilts

Use the Walrus client to batch multiple blobs into quilts for efficient storage and retrieval.

→](/docs/walrus-client/quilts)












# Walrus Client

URL: https://docs.wal.app/docs/walrus-client/walrus-cli

Use the command-line interface (CLI) to interact with theWalrus client **Client** Entity interacting directly with the storage nodes; this can be an aggregator or cache, a publisher, or an end user. . The CLI is available by installing the `walrus` binary. To install Walrus, use the Mysten Labs [`suiup` tool](https://github.com/MystenLabs/suiup?tab=readme-ov-file#installation) :

```sh
$ curl -sSfL https://raw.githubusercontent.com/Mystenlabs/suiup/main/install.sh | sh
```

Then install `sui` and `walrus` :

```sh
$ suiup install sui
$ suiup install walrus
```

View detailed usage information including a full list of available commands using the following command:

```sh
$ walrus --help
```

Each subcommand of `walrus` can also be called with `--help` to print its specific arguments and their meaning.

### Switching contexts

If you have multiple contexts in your configuration file, you can specify the context for each command using the `--context` option. Generate a `bash` , `zsh` , or `fish` completion script with `walrus completion` and place it in an appropriate directory like `~/.local/share/bash-completion/completions` .

## Configuration

TheWalrus client needs to know about the Sui objects that store the Walrus system and staking information. Configure these in the `client_config.yaml` file.

By default, theWalrus client looks for the `client_config.yaml` (or `client_config.yml` ) configuration file in the current directory, `$XDG_CONFIG_HOME/walrus/` , `~/.config/walrus/` , or `~/.walrus/` .

Obtain the latest configuration file by downloading it directly from Walrus and placing it in one of the default configuration file locations:

```sh
$ curl --create-dirs https://docs.wal.app/setup/client_config.yaml -o ~/.config/walrus/client_config.yaml
```

You can place the file anywhere and name it anything you like. In that case, use the `--config` option when running the `walrus` binary.

### Specify a wallet

Use the `--wallet <WALLET>` argument to specify a non-standard Sui wallet configuration file. The wallet configuration is taken from the path specified in the Walrus configuration, `./sui_config.yaml` , or `~/.sui/sui_config/client.yaml` .

### Set a gas budget

Use the `--gas-budget <GAS_BUDGET>` argument to change the maximum amount of Sui (in MIST) that the command is allowed to use. If not specified, the gas budget is estimated automatically.

### Print output as JSON

Use the `--json` flag to write a command's output as JSON. This is the default in [JSON mode](/docs/walrus-client/json-mode) .

### Example

You can access Testnet and Mainnet through the following configuration. This example Walrus CLI configuration refers to the standard location for Sui configuration ( `~/.sui/sui_config/client.yaml` ).

[setup/client_config.yaml](https://github.com/MystenLabs/walrus/blob/main/setup/client_config.yaml)

```yaml
contexts:
  mainnet:
    system_object: 0x2134d52768ea07e8c43570ef975eb3e4c27a39fa6396bef985b5abc58d03ddd2
    staking_object: 0x10b9d30c28448939ce6c4d6c6e0ffce4a7f8a4ada8248bdad09ef8b70e4a3904
    n_shards: 1000
    max_epochs_ahead: 53
    wallet_config:
      # Optional path to the wallet config file.
      # path: ~/.sui/sui_config/client.yaml
      # Sui environment to use.
      active_env: mainnet
      # Optional override for the Sui address to use.
      # active_address: 0x0000000000000000000000000000000000000000000000000000000000000000
    rpc_urls:
      - https://fullnode.mainnet.sui.io:443
  testnet:
    system_object: 0x6c2547cbbc38025cf3adac45f63cb0a8d12ecf777cdc75a4971612bf97fdf6af
    staking_object: 0xbe46180321c30aab2f8b3501e24048377287fa708018a5b7c2792b35fe339ee3
    exchange_objects:
      - 0xf4d164ea2def5fe07dc573992a029e010dba09b1a8dcbc44c5c2e79567f39073
      - 0x19825121c52080bb1073662231cfea5c0e4d905fd13e95f21e9a018f2ef41862
      - 0x83b454e524c71f30803f4d6c302a86fb6a39e96cdfb873c2d1e93bc1c26a3bc5
      - 0x8d63209cf8589ce7aef8f262437163c67577ed09f3e636a9d8e0813843fb8bf1
    n_shards: 1000
    max_epochs_ahead: 53
    wallet_config:
      # Optional path to the wallet config file.
      # path: ~/.sui/sui_config/client.yaml
      # Sui environment to use.
      active_env: testnet
      # Optional override for the Sui address to use.
      # active_address: 0x0000000000000000000000000000000000000000000000000000000000000000
    rpc_urls:
      - https://fullnode.testnet.sui.io:443
default_context: testnet
```

## Logging and metrics

The `walrus` CLI supports multiple levels of logging, which you can toggle through an environment variable:

```sh
$ RUST_LOG=walrus=trace walrus info
```

By default, `info` level logs are enabled. The `debug` and `trace` levels can give a more in-depth understanding of what a command does or how it fails.












# Storing Blobs

URL: https://docs.wal.app/docs/walrus-client/storing-blobs

Allblobs **Blob** Single unstructured data object stored on Walrus. stored in Walrus are public and discoverable by all. To store sensitive data, use [Seal](/docs/data-security#seal-data-confidentiality-and-access-control) or [Nautilus](/docs/data-security#nautilus-secure-and-verifiable-off-chain-computation) to encrypt the data before storing it on Walrus. For a worked example, see [Encrypting data with Seal](/docs/seal-encryption-tutorial) .

Storeblobs on Walrus with the following command:

```sh
$ walrus store <FILES> --epochs <EPOCHS>
```

After you upload ablob **Blob** Single unstructured data object stored on Walrus. to Walrus, it has 2 identifiers:

```sh
Blob ID: oehkoh0352bRGNPjuwcy0nye3OLKT649K62imdNAlXg
Sui object ID: 0x1c086e216c4d35bf4c1ea493aea701260ffa5b0070622b17271e4495a030fe83
```

- Blob ID **Blob ID** Cryptographic ID computed from a blob's slivers. : A way to reference theblob on Walrus. The system generates theblob ID based on theblob 's contents, meaning any file you upload to the network twice results in the sameblob ID .
- Sui Object ID: Theblob 's corresponding newly created Sui object identifier, as the system binds allblobs to one or more Sui objects.
You useblob IDs to readblob data, while you use Sui object IDs to make modifications to theblob 's metadata, such as its storage duration. You might also use them to readblob data.

You can store a single file or multiple files, separated by spaces. This is compatible with glob patterns:

```sh
$ walrus store *.png --epochs <EPOCHS>
```

This example stores all PNG files in the current directory.

## Blob lifetimes

You must set a mandatory CLI argument to specify the lifetime for theblob . There are currently 3 methods for setting ablob 's lifetime:

1. The `--epochs <EPOCHS>` option indicates the number of epochs theblob should be stored for. There is an upper limit on the number of epochs ablob can be stored for, which is 53 and corresponds to 2 years. In addition to a positive integer, you can also use `--epochs max` to store theblob for the maximum number of epochs. The end epoch is defined as the current epoch plus the specified number of epochs.
2. The `--earliest-expiry-time <EARLIEST_EXPIRY_TIME>` option takes a date in either RFC 3339 format (for example, `2024-03-20T15:00:00Z` ) or a more relaxed format (for example, `2024-03-20 15:00:00` ). It ensures theblob expires after the specified date if possible.
3. The `--end-epoch <END_EPOCH>` option takes a specific end epoch for theblob .
Ablob expires at the beginning of its end epoch. For example, ablob with end epoch `314` becomes unavailable at the beginning of epoch `314` . One consequence of this is that when you store ablob with `--epochs 1` immediately before an epoch change, it expires and becomes unavailable almost immediately. You can [extend](/docs/walrus-client/managing-blobs#extend-the-lifetime-of-a-blob)blobs only if they have not expired.

## Blob permanence

You can specify whether a newly storedblob is deletable or permanent through the `--deletable` and `--permanent` options:

- **Permanent:** Theblob remains available until itsexpiry **Expiry** The end epoch at which a blob is no longer available and can be deleted; the end epoch is always exclusive. epoch. Not even the uploader can delete it beforehand.
- **Deletable:** Theblob can be deleted at any point during its lifetime by the owner of the corresponding Sui object. See [deletable blobs](/docs/walrus-client/managing-blobs#delete-blobs) for more details.
Newly storedblobs are deletable by default.

## Automatic optimizations

When storing ablob , theclient **Client** Entity interacting directly with the storage nodes; this can be an aggregator or cache, a publisher, or an end user. performs a number of automatic optimizations, including the following:

- If theblob is already stored as apermanent blob **Permanent blob** Blob that cannot be deleted by its owner and is guaranteed to be available until at least its expiry epoch (assuming it is valid). on Walrus for a sufficient number of epochs, the command does not store it again. You can override this behavior with the `--force` CLI option, which stores theblob again and creates a fresh Sui object belonging to the wallet address.
- If your wallet has a storage resource of suitable size and duration, it is used instead of buying a new one.
- If theblob is already certified on Walrus but is adeletable blob **Deletable blob** Blob that can be deleted by its owner at any time to reuse the storage resource. or is not stored for a sufficient number of epochs, the command skips sending encodedblob data to thestorage nodes **Storage node** Entity storing data for Walrus; holds one or several *shards*. and just collects the availability certificate.

## Use a Walrus upload relay

A Walrus upload relay is a third-party service that helps clients with limited bandwidth and networking capabilities, such as a browser, storeblobs on Walrus.

Asset management onchain still happens on theclient . The upload relay takes the unencodedblob , encodes it, and sends the slivers to thestorage nodes before returning the certificate. See in-depth details in the [Walrus upload relay](/docs/operator-guide/upload-relay) documentation.

When storingblobs with the `walrus store` command or when storing quilts, you can use the `--upload-relay` flag with a URL to specify an upload relay server for the CLI to use.

The Walrus upload relay functionality is only available in Walrus CLI version v1.29 or higher.

The upload relay is a third-party service that might require a fee or tip. This tip might be a constant SUI amount perblob stored, or it might depend on the size of theblob being stored. The Walrus CLI shows you how much tip the upload relay requires and asks for confirmation before continuing.

View technical details on how the tip is [computed and paid](/docs/operator-guide/upload-relay) .

















# Reading Blobs

URL: https://docs.wal.app/docs/walrus-client/reading-blobs

You can query the status of ablob **Blob** Single unstructured data object stored on Walrus. through one of the following commands:

```sh
$ walrus blob-status --blob-id <BLOB_ID>
$ walrus blob-status --file <FILE>
```

Each command returns output that indicates whether the specifiedblob is stored and itsavailability period **Availability period** The period specified in storage epochs for which a blob is certified to be available on Walrus. . If you specify a file with the `--file` option, the CLI re-encodes the content of the file and derives theblob ID **Blob ID** Cryptographic ID computed from a blob's slivers. before checking the status.

When ablob is available, the `blob-status` command also returns the `BlobCertified` Sui event ID, which consists of a transaction ID and a sequence number in the events emitted by the transaction. The existence of this event certifies the availability of theblob .

## Readblobs

Readblobs from Walrus using the following command:

```sh
$ walrus read <BLOB_ID>
```

By default,blob data is written to the standard output. Use the `--out <OUT>` CLI option to specify an output file name. Use `--rpc-url <URL>` to specify a Sui RPC node instead of the currently configured RPC node set in the CLI configuration file or wallet configuration.

## Check consistency

Walrus performs integrity and consistency checks to ensure that any data read from Walrus is what the writer intended, and that the writer encoded theblob correctly. See the [data consistency](/docs/system-overview/red-stuff) documentation for further details.

Prior to `v1.37` , the Walrus CLI andaggregator **Aggregator** Service that reconstructs blobs by interacting with storage nodes and exposes a basic `HTTP GET` endpoint to end users. always performed the [strict consistency check](/docs/system-overview/red-stuff) . Starting with `v1.37` , the default is a [more performant consistency check](/docs/system-overview/red-stuff) , which is sufficient for most cases. You can enable the strict consistency check through the `--strict-consistency-check` flag.

You can disable consistency checks completely with the `--skip-consistency-check` flag. Only use this if the writer of theblob is known and trusted.












# Managing Blobs

URL: https://docs.wal.app/docs/walrus-client/managing-blobs

Use theWalrus client **Client** Entity interacting directly with the storage nodes; this can be an aggregator or cache, a publisher, or an end user. to manageblobs **Blob** Single unstructured data object stored on Walrus. and their metadata.

## Extend the lifetime of ablob

You can extend Walrusblob lifetimes using the following command:

```sh
$ walrus extend --blob-obj-id <BLOB_OBJECT_ID>
```

Theblob cannot be expired when you run this command. Both address-ownedblobs and shared blobs can have their lifetime extended. Anyone can extend sharedblobs , but only the owner can extend ownedblobs . When extending a sharedblob , supply the `--shared` flag to inform the command that theblob is shared.

You need theblob 's object ID to extend it. Theblob ID **Blob ID** Cryptographic ID computed from a blob's slivers. is not needed. Run `walrus extend --help` for more information onblob extension.

## Deleteblobs

You can delete ablob that was set as deletable upon creation before itsexpiry **Expiry** The end epoch at which a blob is no longer available and can be deleted; the end epoch is always exclusive. , but only the owner of the Sui object corresponding to theblob can do so. Deletableblobs are indicated as such in the Sui events that certify them, and other users should not rely on them for availability.

Delete ablob with the following command:

```sh
$ walrus delete --blob-id <BLOB_ID>
```

You can also invoke the delete command by specifying a `--file <PATH>` option to derive theblob ID from a file, or by using `--object-id <SUI_ID>` . Before deleting ablob , the `walrus delete` command asks for confirmation unless you specify the `--yes` option.

The `delete` command reclaims the storage object associated with the deletedblob , which is reused to store newblobs automatically. The delete operation provides flexibility around managing [storage costs](/docs/system-overview/storage-costs) and reusing storage.

The delete operation has limited utility for privacy. It only deletes slivers from the current epochstorage nodes **Storage node** Entity storing data for Walrus; holds one or several *shards*. and subsequent epochstorage nodes if no otheruser **User** Any entity or person that wants to store or read blobs on or from Walrus; can act as a Walrus client itself or use the simple interface exposed by publishers and caches. has uploaded a copy of the sameblob . If another copy of the sameblob exists in Walrus, the delete operation does not make theblob unavailable for download, and `walrus read` invocations still download it. After the deletion finishes, the CLI checks the updated status of theblob to see if it is still accessible in Walrus, unless you specified the `--no-status-check` option. However, even if theblob is not accessible, copies of the publicblob might be cached or downloaded by users, and those copies are not deleted.

danger
Allblobs stored in Walrus are public and discoverable by all. The `delete` command does not delete slivers if other copies of theblob are stored on Walrus, possibly by other users. It does not deleteblobs from caches, slivers from paststorage nodes , or copies that users might have made before theblob was deleted.

## Burnblobs

Burn ablob to remove theblob 's corresponding object on Sui without deleting the data from Walrus and without refunding the storage. Burning ablob 's corresponding Sui object forfeits control of thatblob and the data it represents. After burning, you cannot extend permanentblobs and you cannot extend or delete deletableblobs .

You can only burnblobs owned by the current wallet.

To burn ablob , provide its Sui object ID:

```sh
$ walrus burn-blobs --object-ids <BLOB_OBJECT_ID>
```

Use the `--all` flag to burn allblob objects owned by the current wallet. Use the `--all-expired` flag to burn all expiredblob objects owned by the current wallet.

## Sharedblobs

Sharedblobs are shared Sui objects wrapping standard `Blob` objects that anyone can fund and extend. See the [shared blob contracts](https://github.com/MystenLabs/walrus/tree/main/contracts/walrus/sources/system/shared_blob.move) for further details.

Create a sharedblob from an existing `Blob` object you own with the `walrus share` command:

```sh
$ walrus share --blob-obj-id <SUI_OBJ_ID>
```

You can directly fund the resulting sharedblob by adding `--amount` , or fund an existing sharedblob with the `walrus fund-shared-blob` command. You can also immediately share a newly createdblob by adding the `--share` option to the `walrus store` command.

Sharedblobs can only contain permanentblobs and cannot be deleted before theirexpiry .

## Setblob attributes

Set attributes for ablob using the following command:

```sh
$ walrus set-blob-attribute <BLOB_OBJECT_ID> --attr "key" "value"
```

Attributes are key-value pairs. You can specify multiple pairs by repeating the flag: `--attr "key1" "value1" --attr "key2" "value2"` .

## Getblob attributes

Get ablob 's attributes using the following command:

```sh
$ walrus get-blob-attribute <BLOB_OBJECT_ID>
```

## Removeblob attributes

Remove all attributes from ablob using the following command:

```sh
$ walrus remove-blob-attribute <BLOB_OBJECT_ID>
```

Remove a specific key-value pair from ablob 's attributes using the following command:

```sh
$ walrus remove-blob-attribute-fields <BLOB_OBJECT_ID> --keys "key1"
```















# JSON Mode

URL: https://docs.wal.app/docs/walrus-client/json-mode

AllWalrus client **Client** Entity interacting directly with the storage nodes; this can be an aggregator or cache, a publisher, or an end user. commands are available in JSON mode, which simplifies programmatic access to the [CLI](/docs/walrus-client/storing-blobs) . You can specify all command-line flags of the original CLI command in JSON format.

To store ablob **Blob** Single unstructured data object stored on Walrus. , run the following command:

```sh
$ walrus json \
    '{
        "config": "path/to/client_config.yaml",
        "command": {
            "store": {
                "files": ["README.md", "LICENSE"],
                "epochs": 100
            }
        }
    }'
```

To read ablob using theblob ID **Blob ID** Cryptographic ID computed from a blob's slivers. :

```sh
$ walrus json \
    '{
        "config": "path/to/client_config.yaml",
        "command": {
            "read": {
                "blobId": "4BKcDC0Ih5RJ8R0tFMz3MZVNZV8b2goT6_JiEEwNHQo"
            }
        }
    }'
```

All options, default values, and commands are the same as those in the [standard CLI mode](/docs/walrus-client/storing-blobs) , except that they use camelCase instead of kebab-case.

The `json` command also accepts input from `stdin` .

The output of a `json` command is JSON-formatted to simplify parsing results programmatically. You can pipe the JSON output to the `jq` command to parse and extract relevant fields.




























# Using Quilts with the Walrus Client

URL: https://docs.wal.app/docs/walrus-client/quilts

For efficiently storing large numbers of smallblobs **Blob** Single unstructured data object stored on Walrus. , Walrus provides the quilt feature. A quilt batches multipleblobs into a single storage unit, significantly reducing overhead and cost. [Learn more about quilts](/docs/system-overview/quilt) .

You can interact with quilts using a dedicated set of `walrus` subcommands.

Blobs within a quilt are retrieved by a `QuiltPatchId` , not their standard `BlobId` . This ID is generated based on allblobs in the quilt, so ablob 's `QuiltPatchId` changes if it is moved to a different quilt.

Standardblob operations like `delete` , `extend` , or `share` cannot target individualblobs inside a quilt. You must apply them to the entire quilt.

## Store files as a quilt

To store all files from one or more directories recursively, use the `--paths` flag. The filename of each file is used as its unique identifier within the quilt. Regular expressions are supported for uploading from multiple paths.

Like the regular `store` command, you can specify the storage duration using `--epochs` , `--earliest-expiry-time` , or `--end-epoch` .

```sh
$ walrus store-quilt --epochs <EPOCHS> --paths <PATH_TO_DIRECTORY_1> <PATH_TO_DIRECTORY_2> <PATH_TO_BLOB>
```

All identifiers must be unique within a quilt. The operation fails otherwise. Identifiers are the unique names used to retrieve individualblobs from within the quilt.

To specify a list ofblobs as JSON objects, use the `--blobs` flag. This gives you more control, allowing you to set a custom `identifier` and `tags` for each file. If `identifier` is `null` or omitted, the file name is used instead.

```sh
$ walrus store-quilt \
    --blobs '{"path":"<PATH_TO_BLOB_1>","identifier":"walrus","tags":{"color":"grey","size":"medium"}}' \
            '{"path":"<PATH_TO_BLOB_2>","identifier":"seal","tags":{"color":"grey","size":"small"}}' \
    --epochs <EPOCHS>
```

## Readblobs from a quilt

You can retrieve individualblobs from a quilt without downloading the entire quilt. The `read-quilt` command allows you to query for specificblobs by their identifier, tags, or uniqueblob ID **Blob ID** Cryptographic ID computed from a blob's slivers. .

To readblobs by their identifiers, use the `--identifiers` flag:

```sh
$ walrus read-quilt --out <DOWNLOAD_DIR> \
    --quilt-id 057MX9PAaUIQLliItM_khR_cp5jPHzJWf-CuJr1z1ik --identifiers walrus.jpg another-walrus.jpg
```

You can access and filterblobs within a quilt based on their tags. If you have a collection of animal images stored in a quilt, each labeled with a species tag such as `species=cat` , you can download all images labeled as cats with the following command:

```sh
$ walrus read-quilt --out <DOWNLOAD_DIR> \
    --quilt-id 057MX9PAaUIQLliItM_khR_cp5jPHzJWf-CuJr1z1ik --tag species cat
```

You can also read ablob using its `QuiltPatchId` , which you can retrieve using `walrus list-patches-in-quilt` :

```sh
$ walrus read-quilt --out <DOWNLOAD_DIR> \
  --quilt-patch-ids GRSuRSQ_hLYR9nyo7mlBlS7MLQVSSXRrfPVOxF6n6XcBuQG8AQ \
  GRSuRSQ_hLYR9nyo7mlBlS7MLQVSSXRrfPVOxF6n6XcBwgHHAQ
```

To see all patches contained within a quilt along with their identifiers and `QuiltPatchIds` , use the `list-patches-in-quilt` command:

```sh
$ walrus list-patches-in-quilt 057MX9PAaUIQLliItM_khR_cp5jPHzJWf-CuJr1z1ik
```














# Storing Blobs

URL: https://docs.wal.app/docs/http-api/storing-blobs

No public Mainnet publisher
Walrus has no public unauthenticatedpublisher **Publisher** Service interacting with Sui and the storage nodes to store blobs on Walrus; offers a basic `HTTP POST` endpoint to end users. on Mainnet. There are no plans to create one. On Mainnet, run your own authenticatedpublisher (or use the [Upload Relay](/docs/operator-guide/upload-relay) or [TypeScript SDK](/docs/typescript-sdk/sdks) directly). The publicpublisher endpoints below are for Testnet, whereWAL **WAL** The native token of Walrus. has no monetary value.

You can store data using HTTP PUT requests. The following examples use `curl` to storeblobs **Blob** Single unstructured data object stored on Walrus. through apublisher . Set `$PUBLISHER` to apublisher endpoint from the [Network Reference](/docs/network-reference#aggregators-and-publishers) :

```sh
# Store the string `some string` for 1 storage epoch
$ curl -X PUT "$PUBLISHER/v1/blobs" -d "some string"
# Store file `some/file` for 1 storage epoch
$ curl -X PUT "$PUBLISHER/v1/blobs" --upload-file "some/file"
```

Reading a blob right after upload?
When you read through a CDN-frontedaggregator **Aggregator** Service that reconstructs blobs by interacting with storage nodes and exposes a basic `HTTP GET` endpoint to end users. immediately after certification, the CDN might brieflycache **Cache** An aggregator with additional caching capabilities. a `404` from before theblob propagated. If your app knows theblob was just certified, retry with backoff. See [Reading Blobs Right After Upload](/docs/troubleshooting/reading-blobs-after-upload) .

## Configuring storage options

Control how the newblob is created through a combination of query parameters as documented in the OpenAPI specification .

### Storage duration

Specify the lifetime of theblob through the `epochs` parameter. If you omit the parameter,blobs are stored for 1 epoch.

```sh
# Store file `some/file` for 5 storage epochs
$ curl -X PUT "$PUBLISHER/v1/blobs?epochs=5" --upload-file "some/file"
```

### Deletable and permanentblobs

Specify whether ablob is stored as permanent or deletable through a query parameter `permanent=true` or `deletable=true` :

```sh
# Store file `some/file` as a deletable blob:
$ curl -X PUT "$PUBLISHER/v1/blobs?deletable=true" --upload-file "some/file"
```

```sh
# Store file `some/file` as a permanent blob:
$ curl -X PUT "$PUBLISHER/v1/blobs?permanent=true" --upload-file "some/file"
```

caution
Newly storedblobs are deletable by default.

### Sending theblob object to another address

Specify an address to which the resulting `Blob` object is sent using the `send_object_to` parameter:

```sh
# Store file `some/file` and send the blob object to `$ADDRESS`:
$ curl -X PUT "$PUBLISHER/v1/blobs?send_object_to=$ADDRESS" --upload-file "some/file"
```

## Understanding the response

The store HTTP API endpoints return information about storedblobs in JSON format.

### Newly createdblobs

When ablob is stored for the first time, the response contains a `newlyCreated` field with information about it:

```sh
$ curl -X PUT "$PUBLISHER/v1/blobs" -d "some other string"
```

If successful, the response includes the content stored in theblob 's corresponding [Sui object](/docs/system-overview/core-concepts) :

```json
{
  "newlyCreated": {
    "blobObject": {
      "id": "0xe91eee8c5b6f35b9a250cfc29e30f0d9e5463a21fd8d1ddb0fc22d44db4eac50",
      "registeredEpoch": 34,
      "blobId": "M4hsZGQ1oCktdzegB6HnI6Mi28S2nqOPHxK-W7_4BUk",
      "size": 17,
      "encodingType": "RS2",
      "certifiedEpoch": 34,
      "storage": {
        "id": "0x4748cd83217b5ce7aa77e7f1ad6fc5f7f694e26a157381b9391ac65c47815faf",
        "startEpoch": 34,
        "endEpoch": 35,
        "storageSize": 66034000
      },
      "deletable": false
    },
    "resourceOperation": {
      "registerFromScratch": {
        "encodedLength": 66034000,
        "epochsAhead": 1
      }
    },
    "cost": 132300
  }
}
```

### Already certifiedblobs

When thepublisher finds a certifiedblob with the sameblob ID **Blob ID** Cryptographic ID computed from a blob's slivers. and a sufficient validity period, it returns an `alreadyCertified` structure:

```json
{
  "alreadyCertified": {
    "blobId": "M4hsZGQ1oCktdzegB6HnI6Mi28S2nqOPHxK-W7_4BUk",
    "event": {
      "txDigest": "4XQHFa9S324wTzYHF3vsBSwpUZuLpmwTHYMFv9nsttSs",
      "eventSeq": "0"
    },
    "endEpoch": 35
  }
}
```

The `event` field returns the [Sui event ID](/docs/system-overview/core-concepts) that you can use to find the object creation transaction through [Suiscan](https://suiscan.xyz/) or a [Sui SDK](https://docs.sui.io/references/sui-sdks) .






















# Reading Blobs

URL: https://docs.wal.app/docs/http-api/reading-blobs

You can readblobs **Blob** Single unstructured data object stored on Walrus. using HTTP GET requests with theirblob ID **Blob ID** Cryptographic ID computed from a blob's slivers. or object ID. Set `$AGGREGATOR` to anaggregator **Aggregator** Service that reconstructs blobs by interacting with storage nodes and exposes a basic `HTTP GET` endpoint to end users. endpoint from the [Network Reference](/docs/network-reference#aggregators-and-publishers) .

Reading a blob right after upload?
When you read through a CDN-frontedaggregator immediately after certification, the CDN might brieflycache **Cache** An aggregator with additional caching capabilities. a `404` from before theblob propagated. If your app knows theblob was just certified, retry with backoff. See [Reading Blobs Right After Upload](/docs/troubleshooting/reading-blobs-after-upload) .

## Reading byblob ID

The following `curl` command reads ablob and writes it to an output file:

```sh
$ curl "$AGGREGATOR/v1/blobs/<BLOB_ID>" -o <FILE_NAME>
```

To print the contents of ablob directly in the terminal:

```sh
$ curl "$AGGREGATOR/v1/blobs/<BLOB_ID>"
```

tip
Modern browsers attempt to sniff the content type for these resources and generally do a good job of inferring content types for media. Theaggregator intentionally prevents sniffing from inferring dangerous executable types such as JavaScript or style sheet types.

## Reading by object ID

You can also readblobs by using the object ID of a Suiblob object or a sharedblob . The following `curl` command downloads theblob corresponding to a Sui object ID:

```sh
$ curl "$AGGREGATOR/v1/blobs/by-object-id/<OBJECT_ID>" -o <FILE_NAME>
```

Downloadingblobs by object ID allows setting HTTP headers. Theaggregator recognizes the following attribute keys and returns the values in the corresponding HTTP headers when present: `content-disposition` , `content-encoding` , `content-language` , `content-location` , `content-type` , and `link` .

## Consistency checks

The consistency checks performed by theaggregator are the same as those [performed by the CLI](/docs/walrus-client/storing-blobs#consistency-checks) . For special use cases, you can enable the [strict consistency check](/docs/system-overview/red-stuff) by adding a query parameter `strict_consistency_check=true` (starting with `v1.35` ). If the writer of theblob is known and trusted, you can disable the consistency check by adding a query parameter `skip_consistency_check=true` (starting with `v1.36` ).





















# Quilt HTTP APIs

URL: https://docs.wal.app/docs/http-api/quilt-http-apis

Walrus supports storing and retrieving multipleblobs **Blob** Single unstructured data object stored on Walrus. as a single unit called a [quilt](/docs/system-overview/quilt) . Publishers and aggregators both support quilt operations. Set `$PUBLISHER` and `$AGGREGATOR` to endpoints from the [Network Reference](/docs/network-reference#aggregators-and-publishers) .

## Storing quilts

All query parameters available for storing regular blobs can also be used when storing quilts.

The following example stores 2 files as a quilt with custom identifiers:

```sh
# Store 2 files `document.pdf` and `image.png`, with custom identifiers `contract-v2` and `logo-2024`, respectively:
$ curl -X PUT "$PUBLISHER/v1/quilts?epochs=5" \
  -F "contract-v2=@document.pdf" \
  -F "logo-2024=@image.png"
```

Identifiers must be unique within a quilt and cannot start with `_` . The field name `_metadata` is reserved for Walrus native metadata and does not conflict withuser **User** Any entity or person that wants to store or read blobs on or from Walrus; can act as a Walrus client itself or use the simple interface exposed by publishers and caches. -defined identifiers. See the [Quilt documentation](/docs/system-overview/quilt) for complete identifier restrictions.

The following example stores 2 files with Walrus-native metadata tags:

```sh
# Store 2 files with Walrus-native metadata. `_metadata` must be used as the field name for Walrus native metadata
$ curl -X PUT "$PUBLISHER/v1/quilts?epochs=5" \
  -F "quilt-manual=@document.pdf" \
  -F "logo-2025=@image.png" \
  -F '_metadata=[
    {"identifier": "quilt-manual", "tags": {"creator": "walrus", "version": "1.0"}},
    {"identifier": "logo-2025", "tags": {"type": "logo", "format": "png"}}
  ]'
```

### Store response

The quilt store API returns a JSON response with information about the stored quilt, including the quilt ID ( `blobId` ) and individualblob patch IDs that you can use to retrieve specificblobs later. The actual JSON output is returned as a single line and is formatted here for readability.

```sh
$ curl -X PUT "http://127.0.0.1:31415/v1/quilts?epochs=1" \
  -F "walrus.jpg=@./walrus-33.jpg" \
  -F "another_walrus.jpg=@./walrus-46.jpg"
```

If successful, the response contains theblob object details and the stored quiltblobs :

```json
{
  "blobStoreResult": {
    "newlyCreated": {
      "blobObject": {
        "id": "0xe6ac1e1ac08a603aef73a34328b0b623ffba6be6586e159a1d79c5ef0357bc02",
        "registeredEpoch": 103,
        "blobId": "6XUOE-Q5-nAXHRifN6n9nomVDtHZQbGuAkW3PjlBuKo",
        "size": 1782224,
        "encodingType": "RS2",
        "certifiedEpoch": null,
        "storage": {
          "id": "0xbc8ff9b4071927689d59468f887f94a4a503d9c6c5ef4c4d97fcb475a257758f",
          "startEpoch": 103,
          "endEpoch": 104,
          "storageSize": 72040000
        },
        "deletable": false
      },
      "resourceOperation": {
        "registerFromScratch": {
          "encodedLength": 72040000,
          "epochsAhead": 1
        }
      },
      "cost": 12075000
    }
  },
  "storedQuiltBlobs": [
    {
      "identifier": "another_walrus.jpg",
      "quiltPatchId": "6XUOE-Q5-nAXHRifN6n9nomVDtHZQbGuAkW3PjlBuKoBAQDQAA"
    },
    {
      "identifier": "walrus.jpg",
      "quiltPatchId": "6XUOE-Q5-nAXHRifN6n9nomVDtHZQbGuAkW3PjlBuKoB0AB7Ag"
    }
  ]
}
```

## Reading quilts

You can retrieveblobs from a quilt through theaggregator **Aggregator** Service that reconstructs blobs by interacting with storage nodes and exposes a basic `HTTP GET` endpoint to end users. APIs using their quilt patch ID or their quilt ID and unique identifier. Currently, only 1blob can be retrieved per request. Bulk retrieval of multipleblobs from a quilt in a single request is not yet supported.

### Retrieving by quilt patch ID

test

Eachblob in a quilt has a unique patch ID. Retrieve a specificblob using its patch ID:

```sh
# Retrieve a blob using its quilt patch ID:
$ curl "$AGGREGATOR/v1/blobs/by-quilt-patch-id/6XUOE-Q5-nAXHRifN6n9nomVDtHZQbGuAkW3PjlBuKoBAQDQAA" \
```

You can obtain quilt patch IDs from the store quilt output or by using the [`list-patches-in-quilt`](/docs/walrus-client/storing-blobs#batch-store) CLI command.

### Retrieving by quilt ID and identifier

You can also retrieve ablob using the quilt ID and theblob 's identifier:

```sh
# Retrieve a blob with identifier `walrus.jpg` from the quilt:
$ curl "$AGGREGATOR/v1/blobs/by-quilt-id/6XUOE-Q5-nAXHRifN6n9nomVDtHZQbGuAkW3PjlBuKo/walrus.jpg" \
```

### Response headers

Both methods return the rawblob bytes in the response body. Metadata such as theblob ID **Blob ID** Cryptographic ID computed from a blob's slivers. and tags are returned as HTTP headers:

- `X-Quilt-Patch-Identifier` : The identifier of theblob within the quilt
- `ETag` : The patch ID or quilt ID for caching purposes
- Additional custom headers fromblob tags, if configured



















# Troubleshooting

URL: https://docs.wal.app/docs/troubleshooting

Resolve common issues with the Walrus CLI, configuration, and network connectivity.

## Use the latest binary

Before undertaking any other steps, make sure you have the [latest `walrus` binary](/docs/getting-started/advanced-setup) . If you have multiple versions in different locations, find the binary that is actually used with `which walrus` .

## Check for old hardware or incompatible VMs

The standard Ubuntu binary causes problems on certain old hardware and in certain virtualized environments. If you experience errors like `Illegal instruction (core dumped)` , [install](/docs/getting-started/advanced-setup) the `ubuntu-x86_64-generic` version instead, which is compiled to be compatible with almost all physical and virtual x86-64 CPUs.

## Verify correct Sui network configuration

If you get an error like `the specified Walrus system object does not exist` , make sure your wallet is set up for the correct Sui network (Mainnet or Testnet) and you use the latest [configuration](/docs/getting-started) .

## Update to latest Walrus configuration

Walrus Testnet is wiped periodically and requires updating to the latest binary and configuration. If you get an error like `could not retrieve enough confirmations to certify the blob` , you are probably using an outdated configuration pointing to an inactive Walrus system. Update your configuration file with the latest [configuration](/docs/getting-started) and make sure the CLI uses the intended configuration.

tip
When you set `RUST_LOG=info` , the `walrus`client **Client** Entity interacting directly with the storage nodes; this can be an aggregator or cache, a publisher, or an end user. binary prints information about the configuration it uses when starting execution, including the path to the Walrus configuration file and the Sui wallet.

## Enable debug logging

You can enable debug logging for Walrus by setting the environment variable `RUST_LOG=walrus=debug` . The `debug` and `trace` levels provide a more detailed understanding of what a command does or how it fails.

```text
$ RUST_LOG=walrus=debug walrus store file.txt --epochs 5
```

If a freshly uploadedblob **Blob** Single unstructured data object stored on Walrus. returns `404 Not Found` from a CDN-frontedaggregator **Aggregator** Service that reconstructs blobs by interacting with storage nodes and exposes a basic `HTTP GET` endpoint to end users. , you are likely hitting a cached `404` response from before theblob propagated. See [Reading Blobs Right After Upload](/docs/troubleshooting/reading-blobs-after-upload) for when to retry and when not to.

[#### Troubleshooting Common Errors

Common errors in the Walrus CLI and network, with causes and solutions.

→](/docs/troubleshooting/network-errors)
[#### Error Handling

Best practices for handling Walrus errors.

→](/docs/troubleshooting/error-handling)
[#### Reading Blobs Right After Upload

Why blobs might return 404 immediately after certification when using a cached aggregator, and how to handle the propagation window.

→](/docs/troubleshooting/reading-blobs-after-upload)















Troubleshooting Common Errors
This page covers common errors you might encounter when using Walrus. Each entry includes the error message, its cause, and how to troubleshoot it.

Configuration errors
Errors in this section occur when the Walrus CLI cannot load or parse its configuration.

could not find a valid Walrus configuration file
Cause: The CLI cannot find a configuration file in any of the default locations.

Solution: Create the configuration directory and download a fresh configuration file:

mkdir -p ~/.config/walrus
curl https://docs.wal.app/setup/client_config.yaml -o ~/.config/walrus/client_config.yaml
Wrap

 Copy

Use an Agent
If your configuration file is stored in a non-default location, you can specify a custom path:

walrus info --config /path/to/client_config.yaml

 Copy

Use an Agent
unable to parse the client config file
Cause: The configuration file has invalid YAML syntax, is missing required fields such as system_object or staking_object, or contains typos in field names.

Solution: Validate the YAML syntax and verify that all required fields are present.

Alternatively, download a fresh configuration file:

curl https://docs.wal.app/setup/client_config.yaml -o ~/.config/walrus/client_config.yaml
Wrap

 Copy

Use an Agent
If you download a fresh file, be aware that any custom configuration may be overwritten or lost. Take precaution to preserve necessary configuration parameters.

the specified Walrus system object does not exist
Cause: The configuration points to a Walrus system object that does not exist on the current Sui network. This happens when you use an outdated configuration, or you target the wrong network.

Solution: Download the latest configuration for your target network. Verify that your Sui wallet is configured for the correct network (Mainnet or Testnet).

Sui RPC url is not specified as a CLI argument or in the client configuration, and no valid Sui wallet was provided
Cause: The CLI cannot determine which Sui RPC endpoint to use. No RPC URL was provided through --rpc-url, the configuration file does not contain RPC URLs, and no valid wallet was found.

Solution: Specify an RPC URL directly:

walrus info --rpc-url https://fullnode.mainnet.sui.io:443

 Copy

Use an Agent
Alternatively, add RPC URLs to your configuration file or verify that your Sui wallet is properly configured.

cannot connect to Sui RPC nodes at URLS
Cause: The CLI cannot establish a connection to any of the specified Sui RPC endpoints.

Solution: Check your internet connection and verify the RPC URLs are correct. Try a different RPC endpoint:

walrus info --rpc-url https://fullnode.mainnet.sui.io:443

 Copy

Use an Agent
Storage duration errors
Errors in this section occur when specifying how long to store a blob
.

either epochs or earliest_expiry_time or end_epoch must be provided
Cause: No storage duration was specified when storing a blob.

Solution: Provide one duration option when storing:

walrus store file.txt --epochs 5

 Copy

Use an Agent
You can also use --earliest-expiry-time or --end-epoch instead.

exactly one of epochs, earliest-expiry-time, or end-epoch must be specified
Cause: Multiple storage duration options were provided. Only one is allowed per command.

Solution: Provide exactly one of --epochs, --earliest-expiry-time, or --end-epoch.

invalid epoch count; please a number >0 or max
Cause: An invalid value was provided for the --epochs flag.

Solution: Provide a positive integer or max for the --epochs flag.

blobs can only be stored for up to MAX_EPOCHS epochs ahead
Cause: The requested storage duration exceeds the maximum allowed. The current maximum is 53 epochs.

Solution: Reduce the number of epochs, or use --epochs max to store for the maximum allowed duration. Check the current maximum with walrus info.

expiry time is too far in the future
Cause: The specified --earliest-expiry-time value exceeds the maximum allowed duration.

Solution: Use a shorter duration. Check the maximum epochs allowed with walrus info.

end_epoch must be greater than the current epoch
Cause: The --end-epoch value is not greater than the current epoch.

Solution: Provide an --end-epoch value that is greater than the current epoch. Check the current epoch with walrus info epoch.

earliest_expiry_time must be greater than the current epoch start time and the current time
Cause: The --earliest-expiry-time value is in the past.

Solution: Provide a value that is in the future relative to both the current epoch start time and the current wall-clock time.

Input and validation errors
Errors in this section occur when command arguments are missing or invalid.

either the file or blob ID must be defined
Cause: A command requiring a blob identifier was called without providing one.

Solution: Provide either --file or --blob-id.

no files, blob IDs, or object IDs specified
Cause: A command such as delete or burn-blobs was called without providing any identifiers.

Solution: Provide at least one of --files, --blob-id, or --object-id.

deletable blobs cannot be shared
Cause: You attempted to share a deletable blob
. Only permanent blobs can be shared.

Solution: Create the blob with --permanent if you intend to share it.

exactly one of objectIds, all, or allExpired must be specified
Cause: Multiple or no selection options were provided to burn-blobs.

Solution: Provide exactly one of --object-ids, --all, or --all-expired.

cannot provide both paths and blob_inputs
Cause: Both --paths and --blobs options were provided to store-quilt.

Solution: Use either --paths or --blobs, not both.

either paths or blob_inputs must be provided
Cause: No input was provided to store-quilt.

Solution: Provide either --paths or --blobs.

exactly one of address or object must be set
Cause: A command requires either an address or object ID, but both or neither were provided.

Solution: Provide exactly one of the required options.

exactly one of nodeId, nodeUrl, committee, or activeSet must be specified
Cause: Multiple or no node selection options were provided to a command such as health.

Solution: Provide exactly one of --node-id, --node-url, --committee, or --active-set.

node URL URL not found in active set
Cause: The provided node URL does not match any node in the active set.

Solution: Verify the node URL is correct, or use --node-id instead.

Quilt query pattern errors
Error:

Exactly one query pattern must be specified. Valid query patterns are:
- quiltId + identifiers
- quiltId + tag
- quiltPatchIds
- quiltId only

 Copy

Use an Agent
Cause: An invalid combination of query options was provided to read-quilt or list-patches-in-quilt.

Solution: Use exactly one of the valid query patterns:

--quilt-id with --identifiers
--quilt-id with --tag
--quilt-patch-ids alone
--quilt-id alone
unrecognised trace exporter VALUE
Cause: An invalid value was provided for the --trace-cli flag.

Solution: Use either --trace-cli otlp or --trace-cli file=/path/to/file.

The object ID of an exchange object must be specified
Cause: The get-wal command requires an exchange object ID, but none was provided. This command is only available on Testnet.

Solution: Specify the exchange object ID:

walrus get-wal --exchange-id EXCHANGE_OBJECT_ID

 Copy

Use an Agent
operation cancelled by user
Cause: You declined a confirmation prompt, for example the upload relay tip confirmation.

Solution: Re-run the command and confirm when prompted, or use --skip-tip-confirmation for upload relay to bypass the prompt.

Blob ID
 errors
Errors in this section occur when a blob ID is missing, malformed, or refers to a blob that is unavailable.

you seem to be using a numeric value in decimal format corresponding to a Walrus blob ID
Cause: A decimal blob ID (often copied from a Sui explorer) was provided instead of the URL-safe base64 format that Walrus uses.

Solution: The error message includes the correct blob ID. You can also convert it manually:

walrus convert-blob-id DECIMAL_VALUE

 Copy

Use an Agent
info
Some on-chain representations and Sui explorers display blob IDs as large decimal numbers. These are not valid blob IDs for Walrus API calls. Always convert them to URL-safe base64 format before use.

the provided blob ID is invalid
Cause: The provided blob ID string cannot be parsed as either a base64-encoded blob ID or a decimal value.

Solution: Verify the blob ID is correct and is in URL-safe base64 format (43 characters). If you copied it from a Sui explorer, convert it with walrus convert-blob-id.

Blob not found
Error:

Error: Blob not found on Sui
HTTP 404: Blob ID not registered

 Copy

Use an Agent
Cause: The blob was never uploaded, has expired (past its storage epoch
), belongs to a different network, or was marked invalid on-chain.

Solution: Verify the blob ID is correct and that you are querying the correct network. Check the blob status:

walrus blob-status --blob-id BLOB_ID

 Copy

Use an Agent
If the blob expired, re-upload it. On Mainnet, each storage epoch is approximately 14 days. The maximum storage duration is 53 epochs.

the blob has not been registered or has already expired
Cause: It's possible to get this error when uploading for a single epoch right before an epoch change, or several storage nodes
 are lagging behind in processing network events during periods of heavy uploads.

Solution:

Retry the upload. If the error persists during high network activity, wait a few minutes and try again. Storage nodes might need time to process recent events.

Insufficient funds
Insufficient SUI for gas or Insufficient WAL for storage fees
Error (variants):

Error: could not find SUI coins with sufficient balance [requested_amount=Some(1000000000)]
Error: could not find WAL coins with sufficient balance
ClientError { kind: NoCompatiblePaymentCoin }
Wrap

 Copy

Use an Agent
Cause: Your wallet does not have enough SUI for gas fees or enough WAL
 for storage payments.

Solution: Check your wallet balance:

sui client gas

 Copy

Use an Agent
Add SUI or WAL to your wallet as needed. Use walrus info to check current storage costs per epoch. If you are using a publisher
 daemon, verify that the daemon wallet has sufficient funds for both SUI gas and WAL storage payments.

there is enough balance to cover the requested amount but cannot be achieved with less than the maximum number of coins allowed
Cause: Your balance is sufficient but spread across too many coin objects.

Solution: Merge your coins in the wallet and retry the operation.

Transaction errors
Transaction timeout
Error:

Error: Transaction not confirmed within timeout
Warning: Transaction pending...
Error: RPC timeout waiting for transaction

 Copy

Use an Agent
Cause: Network congestion on Sui, RPC node issues, or the transaction is stuck in the mempool.

Solution: Check whether the transaction succeeded on-chain before retrying:

sui client tx-block TRANSACTION_ID

 Copy

Use an Agent
If the transaction succeeded, proceed normally. If it failed or was not found, retry the operation.

caution
Do not assume a timed-out transaction failed. Always check the on-chain state first. Retrying a successful transaction can result in duplicate blob registrations and wasted funds.

Transaction conflict
Error:

Error: Transaction rejected: Invalid nonce
Error: Conflicting transaction

 Copy

Use an Agent
Cause: Multiple transactions from the same wallet were submitted simultaneously, or the wallet state is out of sync with the network.

Solution: Serialize transactions from the same wallet. Wait for each transaction to confirm before submitting the next one. If you are using a publisher, it should queue transactions internally to avoid conflicts.

Connectivity errors
Errors in this section occur when a client
, publisher, or aggregator
 cannot reach other components in the network.

Client cannot reach a publisher or aggregator
Error:

Error: Connection timeout
Error: Connection refused
Error: DNS resolution failed

 Copy

Use an Agent
Cause: The publisher or aggregator is down, a firewall is blocking the connection, or DNS is misconfigured.

Solution: Implement retry logic with exponential backoff in your application. If multiple publishers or aggregators are available, try an alternative endpoint. Set reasonable timeouts: 30 seconds for uploads and 10 seconds for reads.

See Error Handling for an example of retry logic in the TypeScript SDK.

Publisher cannot reach storage nodes
Error:

Error: Failed to distribute slivers
Warning: Storage node X unreachable
Error: Quorum not reached (received 1/2 of signatures)

 Copy

Use an Agent
Cause: One or more storage nodes are offline, overloaded, or unreachable due to a network partition.

Solution: Retry the upload. The publisher might reach different nodes on subsequent attempts. If 2/3 of storage nodes respond, the upload succeeds. If fewer than 2/3 respond, the upload fails. Check on-chain state to verify whether the blob was registered, then retry if necessary.

Aggregator cannot fetch enough slivers
Error:

Error: Failed to fetch slivers
Warning: Storage node Y unreachable
Error: Insufficient slivers

 Copy

Use an Agent
Cause: Most likely the aggregator is misconfigured.

Solution: Retry the read request. Only 1/3 of primary slivers are needed to reconstruct a blob, so the system tolerates many nodes being offline. Try a different aggregator if available, or wait and retry.

Storage node errors
Errors in this section relate to storage node data integrity.

Sliver
 not found
Error:

Error: Sliver not found on storage node
HTTP 404: Sliver ID not in database

 Copy

Use an Agent
Cause: The blob expired or was never stored.

Solution: Retry the read. Other nodes hold copies of the slivers through erasure coding. If fewer than 1/3 of nodes lost data, retrieval succeeds normally. If the error persists, check the on-chain blob status with walrus blob-status. Re-upload the blob if necessary.

Sliver hash mismatch
Error:

Error: Sliver hash mismatch
Error: Consistency check failed

 Copy

Use an Agent
Cause: Disk or memory corruption on the storage node, a Byzantine (malicious) node, or a network transmission error.

Solution: The aggregator automatically detects hash mismatches through Merkle tree verification and fetches replacement slivers from other nodes. No client-side action is required unless the error persists, in which case you can run a strict consistency check:

walrus read BLOB_ID --strict-consistency-check

 Copy

Use an Agent
Invalid signature from a storage node
Error:

Warning: Node X returned invalid signature
Error: Certificate verification failed

 Copy

Use an Agent
Cause: A compromised or malicious storage node, or a software bug in the node implementation.

Solution: The system handles this automatically. Walrus provides Byzantine Fault Tolerance (BFT) and functions correctly with up to 1/3 of nodes behaving maliciously. No client-side action is required.

Encoding errors
Out of memory during encoding
Error:

Error: Out of memory
Error: Failed to allocate encoding buffer

 Copy

Use an Agent
Cause: The blob is too large for available memory. The encoding needs at least 4.5x the blob size if the blob is to be stored. If the blob is only encoded to compute the metadata or blob ID, it's only ~1.5x.

Solution: Run the CLI on a machine with sufficient RAM. Split large blobs into smaller chunks in your application before uploading. If you are using a publisher, use one with more available memory.

insufficient balance despite holding WAL
Error:

Error: insufficient balance
Error: no WAL coins found for storage payment

 Copy

Use an Agent
Cause: Your WAL may be from a different package than the Walrus client expects. Some third-party Testnet faucets distribute WAL from a non-canonical package, and the client rejects it with an insufficient balance error even though a balance appears in your wallet.

Solution: Acquire WAL through the official path documented in Getting Started, not third-party faucets. On Testnet, use the WAL exchange (walrus get-wal); on Mainnet, swap SUI for WAL through a supported exchange. WAL from an unsupported package cannot be used for storage payments.


















# Error Handling

URL: https://docs.wal.app/docs/troubleshooting/error-handling

This page covers how to handle Walrus errors programmatically in your applications. For a reference of specific error messages and their solutions, see [Troubleshooting Common Errors](/docs/troubleshooting/network-errors) .

## Error categories

Not all errors are equal. Some are safe to retry, some require you to check on-chain state (an operation might have succeeded on-chain even though theclient **Client** Entity interacting directly with the storage nodes; this can be an aggregator or cache, a publisher, or an end user. did not receive a confirmation), and some require you to fix your input before trying again. The following table summarizes the most common failure types:

| **Failure type** | **Retryable** | **Check on-chain state** | **Recommended action** 
| Network timeout | Yes | Yes | Retry with exponential backoff 
| Publisher **Publisher** Service interacting with Sui and the storage nodes to store blobs on Walrus; offers a basic `HTTP POST` endpoint to end users. oraggregator **Aggregator** Service that reconstructs blobs by interacting with storage nodes and exposes a basic `HTTP GET` endpoint to end users. down | Yes | No | Try a different endpoint or use the CLI 
| Insufficient funds | No | No | Add SUI orWAL **WAL** The native token of Walrus. to your wallet 
| Blob **Blob** Single unstructured data object stored on Walrus. too large for memory | No | No | Split theblob into smaller chunks 
| Transaction timeout | Conditional | Yes (critical) | Verify the transaction succeeded before retrying 
| Invalidblob ID **Blob ID** Cryptographic ID computed from a blob's slivers. | No | No | Fix theblob ID format 
| Blob not found | No | Yes | Verify theblob exists and has not expired 

caution
For transaction timeouts, always check on-chain state before retrying. A timed-out transaction might have succeeded. Retrying without checking can result in duplicateblob registrations and wasted funds.

## Implement retry logic with exponential backoff

Transient errors such as network timeouts and temporary node unavailability are common in distributed systems. Use exponential backoff to avoid overwhelming the network with retries.

```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5,
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isRetryable =
        message.includes('timeout') || message.includes('network');

      if (isRetryable && attempt <= maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}
```

Use this wrapper for any Walrus operation that might encounter transient failures:

```typescript
const result = await retryWithBackoff(() =>
  client.walrus.writeBlob({ blob: data, epochs: 5, signer }),
);
```

Only retry errors that are transient. Errors such as insufficient funds, invalidblob IDs, orblobs that are too large do not benefit from retries.

## Verify on-chain state after timeouts

When an upload or transaction times out, the operation might have succeeded on-chain even though theclient did not receive a confirmation. Always check before retrying.

Using the CLI:

```text
$ sui client tx-block TRANSACTION_ID
```

Using the Walrus CLI:

```text
$ walrus blob-status --blob-id BLOB_ID
```

If the transaction succeeded, proceed normally. If it was not found, the transaction might have been dropped from the mempool and is safe to retry.

## Capturestorage node **Storage node** Entity storing data for Walrus; holds one or several *shards*. errors with the TypeScript SDK

When using the Walrus TypeScript SDK, you can capture individualstorage node errors during uploads by passing the `onError` option. This is useful for debugging partial failures where the overall operation succeeds (because 2/3 of nodes responded) but some nodes returned errors.

```typescript
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { walrus } from '@mysten/walrus';

const client = new SuiGrpcClient({
  network: 'testnet',
  baseUrl: 'https://fullnode.testnet.sui.io:443',
}).$extend(
  walrus({
    storageNodeClientOptions: {
      onError: (error) => console.log('Storage node error:', error),
    },
  }),
);
```

This does not change the behavior of the operation. Uploads still succeed if enough nodes respond. The `onError` callback provides visibility into which nodes are failing and why.

## Use strict consistency checks for critical data

By default, Walrus reads reconstruct theblob from slivers and verify theblob ID . For data where integrity is critical (for example, financial records or credentials), you can request a stricter consistency check that validates each individualsliver **Sliver** Erasure-encoded data of one shard corresponding to a single blob for one of the two encodings; this contains several erasure-encoded symbols of that blob but not the blob metadata. against the Merkle tree.

Using the CLI:

```text
$ walrus read BLOB_ID --strict-consistency-check
```

Using the HTTP API:

```text
$ curl "http://AGGREGATOR_URL:31415/BLOB_ID?consistency=strict"
```

Strict consistency checks are slower because they verify more data, but they provide stronger guarantees againstsliver -level corruption.

## Monitor errors in production

Enable verbose logging to capture detailed error information during uploads:

```text
$ RUST_LOG=walrus=debug walrus store file.txt --epochs 5 2>&1 | tee upload.log
```

To identify recurring error patterns:

```text
$ grep "Error" upload.log | sort | uniq -c
```

For production deployments using the TypeScript SDK, log errors from the `onError` callback and track metrics such as retry counts, timeout rates, andstorage node error rates.

## Debugging checklist

When you encounter an error, follow these steps in order:

1. Enable debug logging with `RUST_LOG=walrus=debug` and reproduce the error.
2. Check system status with `walrus info` and `walrus health --committee` .
3. Verify your configuration is up to date and points to the correct network.
4. Confirm your wallet has sufficient SUI andWAL balances.
5. Verify you are using the latest CLI version with `walrus --version` .
tip
When you set `RUST_LOG=info` , the `walrus` CLI prints the path to the configuration file and Sui wallet it uses at startup. This helps confirm you are using the intended configuration.


















# Reading Blobs Right After Upload

URL: https://docs.wal.app/docs/troubleshooting/reading-blobs-after-upload

Walrus itself is strongly consistent. Once ablob **Blob** Single unstructured data object stored on Walrus. is certified, anyaggregator **Aggregator** Service that reconstructs blobs by interacting with storage nodes and exposes a basic `HTTP GET` endpoint to end users. reading directly fromstorage nodes **Storage node** Entity storing data for Walrus; holds one or several *shards*. returns it immediately. Public aggregators often sit behind a content delivery network (CDN), which mightcache **Cache** An aggregator with additional caching capabilities. a `404 Not Found` response from before theaggregator sees theblob .

If your app readsblobs through a cachedaggregator immediately after upload, plan for this short window.

## When this applies

This propagation window only affects you when both conditions are true:

- You read through a publicaggregator with a CDN in front, such as the Mainnet or Testnet public aggregators.
- You read ablob within seconds of its certification.
The window does not apply in these cases:

- You read from a self-hostedaggregator with no CDN in front. Reads are strongly consistent.
- Theblob does not exist. A `404` in that case is correct and should not be retried.

## Retry only when you know theblob should exist

Because Walrus is strongly consistent, a `404` from an uncachedaggregator means theblob is not on the network. Retrying every `404` adds latency for missingblobs .

Retry with backoff only when your app knows theblob has just been certified. Treat other `404` responses as final.

## Example: retry after a known upload

The following helper is for the post-upload path: your app receives a successful certification, then immediately fetches theblob through a cachedaggregator . It surfaces non-404 errors immediately and only retries `404` .

[examples/typescript/retry_blob_with_backoff.ts](https://github.com/MystenLabs/walrus/blob/main/examples/typescript/retry_blob_with_backoff.ts)

```ts
// Copyright (c) Walrus Foundation
// SPDX-License-Identifier: Apache-2.0

/**
 * Fetch a blob immediately after upload from a CDN-fronted aggregator.
 *
 * Walrus is strongly consistent, but CDNs in front of public aggregators might
 * briefly cache a 404 from before the blob was visible. Use this helper only
 * when your app knows the blob has just been certified. For general reads,
 * treat 404 as final instead of retrying.
 */
async function fetchBlobWithRetry(
  blobId: string,
  aggregatorUrl: string,
  opts = { maxAttempts: 6, baseDelayMs: 500 },
): Promise<ArrayBuffer> {
  let lastError: unknown;
  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      const res = await fetch(`${aggregatorUrl}/v1/blobs/${blobId}`, { cache: "no-store" });
      if (res.ok) return await res.arrayBuffer();
      if (res.status !== 404) throw new Error(`Unexpected status ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    const delay = opts.baseDelayMs * 2 ** attempt;
    await new Promise((r) => setTimeout(r, delay));
  }
  throw lastError ?? new Error(`Blob ${blobId} not available after ${opts.maxAttempts} attempts`);
}
```

Tune `maxAttempts` and `baseDelayMs` to your latency budget. A few seconds of total retry time is usually sufficient. Do not use this pattern for general reads. For those reads, treat `404` as final.

#### Bypass the CDNcache if needed

Some CDNs might ignorecache control headers andcache the `404` response. If retries keep returning the cached `404` , append a unique query parameter:

```ts
fetch(`${aggregatorUrl}/v1/blobs/${blobId}?cb=${Date.now()}`);
```

Once theblob is reliably reachable, you can remove the query parameter.

#### Use multiple aggregators

If a singleaggregator is slow to surface theblob , try anotheraggregator . If oneaggregator returns `404` but another returns theblob , theblob is on the network.

#### Pre-warm the read path before demos

Before showing a freshly uploadedblob to an audience, retrieve it once from theaggregator you plan to use. This populates theaggregator and CDN caches before you need them.






















# Network Reference

URL: https://docs.wal.app/docs/network-reference

This page is the single canonical reference for the volatile values you need to integrate with Walrus:aggregator **Aggregator** Service that reconstructs blobs by interacting with storage nodes and exposes a basic `HTTP GET` endpoint to end users. andpublisher **Publisher** Service interacting with Sui and the storage nodes to store blobs on Walrus; offers a basic `HTTP POST` endpoint to end users. endpoints, upload relay endpoints, package IDs, system and staking object IDs, token units, and configuration snippets. Other documentation pages link here instead of repeating these values, so that you always read them from one place.

info
This page mirrors the canonical sources. The configuration snippets and the operator list on this page are imported directly from the Walrus repository and the maintained operator list, so they stay current. The authoritative sources are the [client configuration files](https://docs.wal.app/setup/client_config.yaml) , the operator list in [JSON format](/operators.json) , and the `Move.lock` files in the [`contracts`](https://github.com/MystenLabs/walrus/tree/main/contracts) and [`testnet-contracts`](https://github.com/MystenLabs/walrus/tree/main/testnet-contracts) directories on GitHub.

## Network parameters

Walrus operates a production Mainnet on Sui Mainnet and a Testnet on Sui Testnet. The following fixed system parameters apply to each network:

| **Parameter** | **Mainnet** | **Testnet** 
| Sui network | Mainnet | Testnet 
| Number of shards | 1000 | 1000 
| Epoch duration | 2 weeks | 1 day 
| Maximum number of epochs for which storage can be bought | 53 | 53 

Other parameters, including system capacity, storage price, and the per-write fee, are dynamic. Read the current values with `walrus info` , or view them in the [Walruscan explorer](https://walruscan.com/) . Do not hardcode dynamic values in integrations.

Walrus does not operate a public Devnet. Use Mainnet for production and Testnet for testing.

## Sui RPC endpoints

TheWalrus client **Client** Entity interacting directly with the storage nodes; this can be an aggregator or cache, a publisher, or an end user. and SDKs read Walrus state from a Sui full node. The default RPC URLs are:

| **Network** | **Sui RPC URL** 
| Mainnet | `https://fullnode.mainnet.sui.io:443` 
| Testnet | `https://fullnode.testnet.sui.io:443` 

## Package IDs

TheWalrus client and the TypeScript SDK infer package IDs automatically from the system and staking objects, so you do not need to set them manually in most configurations. The values below are provided for contract exploration and for advanced setups that pin a specific deployment.

### Walrus andWAL **WAL** The native token of Walrus. packages on Mainnet

| **Package** | **ID** 
| WAL token | [`0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59`](https://suiscan.xyz/mainnet/object/0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59/tx-blocks) 
| Walrus system | [`0xfdc88f7d7cf30afab2f82e8380d11ee8f70efb90e863d1de8616fae1bb09ea77`](https://suiscan.xyz/mainnet/object/0xfdc88f7d7cf30afab2f82e8380d11ee8f70efb90e863d1de8616fae1bb09ea77/tx-blocks) 
| Subsidies | [`0xd843c37d213ea683ec3519abe4646fd618f52d7fce1c4e9875a4144d53e21ebc`](https://suiscan.xyz/mainnet/object/0xd843c37d213ea683ec3519abe4646fd618f52d7fce1c4e9875a4144d53e21ebc/tx-blocks) 

Testnet package IDs change when contracts are redeployed. Read the current Testnet package IDs from the `Move.lock` files in the subdirectories of the [`testnet-contracts` directory on GitHub](https://github.com/MystenLabs/walrus/tree/main/testnet-contracts) rather than pinning a copied value.

### Walrus Sites packages

The `site-builder` tool uses these package IDs, which are set in the `sites-config.yaml` file:

| **Network** | **Walrus Sites package ID** 
| Mainnet | `0x5a0c509a659ba982f91ff1189872b8d528f8c02b5f6285a3931fc4c2869ccc9c` 
| Testnet | `0x22b8c1496650eb45fbcca0f8f37fae77ed33b7d4eaab4da5f0bb9b62a8708dcb` 

## System and staking object IDs

TheWalrus client configuration identifies the network through its system object and staking object. These objects track the state of the Walrus network on Sui.

| **Object** | **Network** | **ID** 
| System object | Mainnet | `0x2134d52768ea07e8c43570ef975eb3e4c27a39fa6396bef985b5abc58d03ddd2` 
| Staking object | Mainnet | `0x10b9d30c28448939ce6c4d6c6e0ffce4a7f8a4ada8248bdad09ef8b70e4a3904` 
| System object | Testnet | `0x6c2547cbbc38025cf3adac45f63cb0a8d12ecf777cdc75a4971612bf97fdf6af` 
| Staking object | Testnet | `0xbe46180321c30aab2f8b3501e24048377287fa708018a5b7c2792b35fe339ee3` 

On Testnet, the SUI / WAL exchange objects used by `walrus get-wal` are:

- `0xf4d164ea2def5fe07dc573992a029e010dba09b1a8dcbc44c5c2e79567f39073`
- `0x19825121c52080bb1073662231cfea5c0e4d905fd13e95f21e9a018f2ef41862`
- `0x83b454e524c71f30803f4d6c302a86fb6a39e96cdfb873c2d1e93bc1c26a3bc5`
- `0x8d63209cf8589ce7aef8f262437163c67577ed09f3e636a9d8e0813843fb8bf1`
These object IDs are pre-filled in the client configuration files . The configuration file is the authoritative source if a value here differs.

## Aggregators and publishers

Anaggregator exposes an HTTP interface to readblobs **Blob** Single unstructured data object stored on Walrus. . Apublisher exposes an HTTP interface to storeblobs . Both expose their API specification at the path `/v1/api` , for example at `https://aggregator.walrus-testnet.walrus.space/v1/api` .

The reference endpoints operated by Mysten Labs are:

| **Service** | **Network** | **Endpoint** 
| Aggregator | Mainnet | `https://aggregator.walrus-mainnet.walrus.space` 
| Aggregator | Testnet | `https://aggregator.walrus-testnet.walrus.space` 
| Publisher | Testnet | `https://publisher.walrus-testnet.walrus.space` 

caution
Walrus does not provide a public unauthenticatedpublisher on Mainnet, because apublisher consumes both SUI andWAL on the service side. For production Mainnet uploads, run a [private authenticated publisher](/docs/operator-guide/publishers/mainnet-production-guide) , use an upload relay , or integrate the TypeScript SDK directly.

Many community operators run public aggregators and publishers on Testnet, and public aggregators on Mainnet. The complete, maintained list follows. The list is updated weekly and is the canonical source for community endpoints.

Loading operators...
Most public aggregators and publishers limit requests to 10 MiB. To upload larger files, [run your own publisher](/docs/operator-guide/publishers/operating-publisher) or use the [CLI](/docs/walrus-client/storing-blobs) .

tip
Do not hardcode a single community endpoint in production code. Community endpoints change over time. Use the operator list above, run your own service, or use the Mysten Labs reference endpoints.

### HTTP API paths

These paths are stable across all aggregators and publishers. Set `PUBLISHER` and `AGGREGATOR` to an endpoint from the tables above.

| **Operation** | **Method and path** 
| Store ablob | `PUT $PUBLISHER/v1/blobs` 
| Read ablob | `GET $AGGREGATOR/v1/blobs/<BLOB_ID>` 
| Read by object | `GET $AGGREGATOR/v1/blobs/by-object-id/<OBJECT_ID>` 
| API spec | `GET <ENDPOINT>/v1/api` 

For the full request and response details, see [Storing Blobs with the HTTP API](/docs/http-api/storing-blobs) and [Reading Blobs with the HTTP API](/docs/http-api/reading-blobs) .

## Upload relays

An upload relay storesblob slivers on behalf of clients that cannot open many connections, such as browsers and mobile devices. Mysten Labs operates the following public upload relays:

| **Network** | **Upload relay endpoint** 
| Mainnet | `https://upload-relay.mainnet.walrus.space` 
| Testnet | `https://upload-relay.testnet.walrus.space` 

An upload relay exposes its tip configuration at `/v1/tip-config` and acceptsblobs at `/v1/blob-upload-relay` . For details, see [Operate an Upload Relay](/docs/operator-guide/upload-relay) .

## Token units

Walrus usesWAL for storage and Sui uses SUI for gas. Each token has a smallest indivisible unit:

| **Token** | **Smallest unit** | **Conversion** 
| WAL | FROST **FROST** The smallest unit of WAL (similar to MIST for SUI); 1 WAL is equal to 1 billion (1000000000) FROST. | 1WAL = 1,000,000,000FROST 
| SUI | MIST | 1 SUI = 1,000,000,000 MIST 

Storage is paid inWAL but priced at a fixed rate of $0.023/GB/month. The amount ofWAL adjusts automatically as theWAL price changes. CLI options that take a raw amount, such as `--amount` on `walrus get-wal` and `--gas-budget` , use the smallest unit ( FROST or MIST). For current prices and the per-write fee, run `walrus info` . For full cost details, see [Storage Costs](/docs/system-overview/storage-costs) .

## Configuration snippets

### Walrus CLI

Download the pre-filledclient configuration, which includes both the Mainnet and Testnet contexts, to a default location:

```sh
$ curl --create-dirs https://docs.wal.app/setup/client_config.yaml -o ~/.config/walrus/client_config.yaml
```

The configuration file contents are:

[setup/client_config.yaml](https://github.com/MystenLabs/walrus/blob/main/setup/client_config.yaml)

```yaml
contexts:
  mainnet:
    system_object: 0x2134d52768ea07e8c43570ef975eb3e4c27a39fa6396bef985b5abc58d03ddd2
    staking_object: 0x10b9d30c28448939ce6c4d6c6e0ffce4a7f8a4ada8248bdad09ef8b70e4a3904
    n_shards: 1000
    max_epochs_ahead: 53
    wallet_config:
      # Optional path to the wallet config file.
      # path: ~/.sui/sui_config/client.yaml
      # Sui environment to use.
      active_env: mainnet
      # Optional override for the Sui address to use.
      # active_address: 0x0000000000000000000000000000000000000000000000000000000000000000
    rpc_urls:
      - https://fullnode.mainnet.sui.io:443
  testnet:
    system_object: 0x6c2547cbbc38025cf3adac45f63cb0a8d12ecf777cdc75a4971612bf97fdf6af
    staking_object: 0xbe46180321c30aab2f8b3501e24048377287fa708018a5b7c2792b35fe339ee3
    exchange_objects:
      - 0xf4d164ea2def5fe07dc573992a029e010dba09b1a8dcbc44c5c2e79567f39073
      - 0x19825121c52080bb1073662231cfea5c0e4d905fd13e95f21e9a018f2ef41862
      - 0x83b454e524c71f30803f4d6c302a86fb6a39e96cdfb873c2d1e93bc1c26a3bc5
      - 0x8d63209cf8589ce7aef8f262437163c67577ed09f3e636a9d8e0813843fb8bf1
    n_shards: 1000
    max_epochs_ahead: 53
    wallet_config:
      # Optional path to the wallet config file.
      # path: ~/.sui/sui_config/client.yaml
      # Sui environment to use.
      active_env: testnet
      # Optional override for the Sui address to use.
      # active_address: 0x0000000000000000000000000000000000000000000000000000000000000000
    rpc_urls:
      - https://fullnode.testnet.sui.io:443
default_context: testnet
```

Mainnet-only and Testnet-only versions are available at `https://docs.wal.app/setup/client_config_mainnet.yaml` and `https://docs.wal.app/setup/client_config_testnet.yaml` . For more options, see the [Walrus Client](/docs/walrus-client/walrus-cli) page.

### Walrus Sites site-builder

The `site-builder` tool reads `sites-config.yaml` . Download the maintained configuration for both networks:

```sh
$ curl https://raw.githubusercontent.com/MystenLabs/walrus-sites/main/sites-config.yaml -o ~/.config/walrus/sites-config.yaml
```

For the full configuration reference, see the [Site Builder Reference](/docs/sites/getting-started/using-the-site-builder) .

### TypeScript SDK

The TypeScript SDK bundles the package and object IDs for each network. Select the network with the `network` option, and the SDK applies the correct values:

```ts
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { WalrusClient } from '@mysten/walrus';

const suiClient = new SuiClient({
  url: getFullnodeUrl('mainnet'),
});

const walrusClient = new WalrusClient({
  network: 'mainnet',
  suiClient,
});
```

To connect to a custom or updated deployment, pass an explicit package configuration using the system and staking object IDs from this page. For full details, see the [Walrus TypeScript SDK](https://sdk.mystenlabs.com/walrus) and the [SDKs](/docs/typescript-sdk/sdks) page.

## Deprecated and stale endpoint patterns

Stale endpoints and package IDs are a common cause of integration failures. Avoid the following patterns:

| **Pattern** | **Status** | **Use instead** 
| `docs.walrus.site` documentation domain | Retired | `docs.wal.app` 
| `mystenlabs.github.io/walrus-docs` and the `walrus-docs` repository | Retired | The [`MystenLabs/walrus`](https://github.com/MystenLabs/walrus) repository 
| Devnet endpoints and configuration | Discontinued | Mainnet or Testnet values on this page 
| A single hardcoded communityaggregator orpublisher | Unstable, endpoints change | The operator list above or a Mysten Labs reference endpoint 
| A Mainnetpublisher URL | No public unauthenticated Mainnetpublisher exists | A private authenticatedpublisher , an upload relay, or the TypeScript SDK 
| Copied Testnet package IDs pinned in code | Change when Testnet contracts are redeployed | IDs inferred from the system object, or read from `testnet-contracts``Move.lock` 
| Third-partyWAL faucets on Testnet | Might distributeWAL from a package theclient rejects | `walrus get-wal` 

danger
The Testnet state can be wiped at any point, possibly without warning. Testnet provides no availability or persistence guarantees, and Testnet package IDs change on redeployment. Do not use Testnet for production.























# Software Development Kits (SDKs) and Other Tools

URL: https://docs.wal.app/docs/typescript-sdk/sdks

## SDKs maintained by Mysten Labs

Mysten Labs has built and published a [Walrus TypeScript SDK](https://sdk.mystenlabs.com/walrus) , which supports a wide variety of operations. See also the related [examples](https://github.com/MystenLabs/ts-sdks/tree/main/packages/walrus/examples) .

The SDK bundles the package and object IDs for each network, so selecting a network applies the correct values automatically. To configure a custom or pinned deployment, pass the system and staking object IDs from the [Network Reference](/docs/network-reference#system-and-staking-object-ids) .

The Walrus core team is actively working on a Rust SDK for Walrus.

For data security, use the [TypeScript SDK](https://www.npmjs.com/package/@mysten/seal) for Seal. It provides threshold encryption and onchain access control for decentralized data protection. See the [Encrypting data with Seal](/docs/seal-encryption-tutorial) tutorial for a worked example, and [data security](/docs/data-security) for details.

## Community-maintained SDKs

Besides these official SDKs, there also exist a few unofficial third-party SDKs for interacting with the [HTTP API](/docs/http-api/storing-blobs#http-api-usage) exposed by Walrus aggregators and publishers:

- [Walrus Go SDK](https://github.com/namihq/walrus-go) (maintained by the Nami Cloud team)
- [Walrus PHP SDK](https://github.com/suicore/walrus-sdk-php) (maintained by the Suicore team)
- [Walrus Python SDK](https://github.com/standard-crypto/walrus-python) (maintained by the Standard Crypto team)

## Explorers

The [Walruscan](https://walruscan.com/)blob **Blob** Single unstructured data object stored on Walrus. explorer is built and maintained by the Staketab team, which supports exploringblobs ,blob events, operators, and more. It also supports staking operations.

See the [Awesome Walrus repository](https://github.com/MystenLabs/awesome-walrus?tab=readme-ov-file#visualization) for more visualization tools.

## Other tools

There are many other tools built by the community for visualization, monitoring, and more. For a full list, see the [Awesome Walrus repository](https://github.com/MystenLabs/awesome-walrus) .



















# Large Data Upload Workarounds

URL: https://docs.wal.app/docs/large-uploads

The maximumblob **Blob** Single unstructured data object stored on Walrus. size on Walrus is approximately 13.6 GiB. Uploading large data sets or individualblobs larger than 1 GiB require certain workarounds and planning for optimal performance and efficiency.

## Estimate storage duration and costs

After you plan your upload strategy, estimate the storage costs for your data. When you use the Walrus [cost calculator](https://costcalculator.wal.app/) or `walrus info` , calculate storage duration in months rather than epochs. An epoch on Mainnet is 14 days. Convert epoch counts to months using the current network epoch duration to avoid incorrect projections.

- Validate cost assumptions against the current output of `walrus info` , which shows the price per encoded storage unit and the write fee.
- When you plan for large datasets, include a cost buffer to account for potential changes in epoch duration or pricing.

## Tune uploads for largeblobs

Uploading files larger than 1 GiB might require adjustments toclient **Client** Entity interacting directly with the storage nodes; this can be an aggregator or cache, a publisher, or an end user. configuration and upload parameters to avoid stalled transfers.

- Test uploads with representative dataset sizes before running production workloads.
- Use batching or chunking strategies for datasets that approach or exceed the maximumblob size (approximately 13.6 GiB).
- Monitor upload throughput and adjustclient parameters based on observed performance.

## Use local tooling for upload observability

External publishers or managed upload paths might offer limited visibility into upload progress. Use local tooling when you need direct insight into what is happening during an upload.

- Use Walrus CLI or local SDK tooling when upload visibility is important for your workflow.
- Log upload state ( blob IDs, transaction digests, epoch information) for debugging large ingestion jobs.
- Prefer workflows that expose progress indicators when you build operational pipelines.

## Persist upload state in ingestion pipelines

Large ingestion workflows should tolerate failures and support retries. High-level workflows do not automatically support resumability.

- Persistblob IDs and transaction references between pipeline steps so that a failed step can resume without re-uploading data.
- Design pipelines with the assumption that any step might fail and need to be retried.
- Implement cleanup workflows that handle partial uploads, for example by deleting orphanedblob registrations that were never certified.
tip
Track thepoint of availability (PoA) **Point of availability** Point in time when a certificate of availability is submitted to Sui and the corresponding blob is guaranteed to be available until its expiration. for eachblob . Ablob is only guaranteed to be retrievable after its availability certificate is posted onchain. If your pipeline fails between registration and certification, theblob is not yet available and you need to retry the upload.

## Manage upload throughput

Very high ingestion rates can temporarily reduce throughput if recovery processes accumulate onstorage nodes **Storage node** Entity storing data for Walrus; holds one or several *shards*. . This behavior is similar to ingestion rate management in traditional cloud storage systems.

- Ramp upload traffic gradually instead of sending large bursts.
- Monitor throughput during large ingestion jobs and reduce the upload rate if you observe increased error rates or slower confirmations.
- Batch uploads where possible to reduce the number of individual transactions.
- For very large migrations (TiBor more), coordinate with the Walrus team through the [Walrus Discord](https://discord.gg/walrusprotocol) to plan the ingestion schedule.

## Manage memory for concurrent uploads

Erasure coding and upload processing add memory overhead perblob . Running too many concurrent uploads without sufficient RAM can cause instability or failed uploads. Each upload requires approximately 4.5x theblob size in memory because erasure coding expands the data into redundant shards that theclient must hold during encoding.

- Limit concurrent upload workers based on available RAM.
- Estimate total memory as: `blob_size × encoding_overhead × concurrent_uploads` .
- Scale horizontally across multiple machines rather than increasing concurrency on a single host.
















Data Security
Walrus provides decentralized storage for application and user
 data. All data stored on Walrus is public and can be accessed by anyone. While Walrus natively provides some data availability and integrity guarantees, use cases that require data confidentiality should use additional encryption mechanisms such as Seal and Nautilus.

caution
Blob
 IDs are not secrets. Anyone with a blob ID
 can fetch the blob, so encrypt private data before uploading it to Walrus.

Data availability
The encoding mechanisms applied by Walrus guarantee that blobs can be written and remain available as long as 2/3 of the shards are operated by storage nodes
 that act honestly. After data is written, reads are possible even if as few as 1/3 of the nodes are available.

Each blob has a point of availability (PoA)
 observable through an event on Sui. Before the PoA, you are responsible for ensuring blob availability and upload to Walrus. After the PoA, Walrus is responsible for maintaining blob availability for the full storage period.

If a blob is incorrectly encoded, storage nodes can produce an inconsistency proof
. Reads for blob IDs with inconsistency proofs return None. Correctly stored blobs cannot have inconsistency proofs generated for them.

You can learn more in the whitepaper and in the Walrus fundamentals documentation.

Data integrity
Walrus guarantees that any data read corresponds to what the user who uploaded the data intended. Because the encoding is done by the client
, it is possible that this encoding is incorrect, either by mistake or on purpose. This causes some subtleties, which are described in the encoding documentation.

Seal: Data confidentiality and access control
Walrus does not provide native encryption for data. By default, all blobs stored in Walrus are public and discoverable by everyone. If your use case needs encryption or access control, you need to secure data before uploading to Walrus.

You can use any encryption and access-control mechanism you prefer. If you want onchain access control, Seal is the most powerful and straightforward option.

Seal allows you to encrypt data using threshold encryption, where no single party holds the full decryption key. You can define onchain access policies that determine who can decrypt the data and under what conditions, and store encrypted content on Walrus while keeping decryption logic verifiable and flexible.

Seal integrates seamlessly with Walrus and is recommended for any use cases involving:

Sensitive off-chain content, for example, user documents, game assets, or private messages
Time-locked or token-gated data
Data shared between trusted parties or roles
Agent state and memory that an autonomous agent persists between runs
Walk through it end to end
The Encrypting data with Seal tutorial has working TypeScript that encrypts a message, stores the ciphertext on Walrus, reads it back, and decrypts it.

Encrypting agent state
A common pattern for AI agents is to keep working memory or accumulated state durable across runs by storing it on Walrus. Because Walrus blobs are public, encrypt that state with Seal before storing it, and gate decryption with a seal_approve policy that only the agent's identity (or its operator) satisfies. The agent encrypts and uploads at the end of a run, then reads and decrypts at the start of the next one, keeping the state confidential while it lives on Walrus.

Seal concepts
A few terms appear throughout the Seal documentation and the tutorial:

Access policy. A Move function named seal_approve (or seal_approve_*) that decides who may decrypt. Seal key servers evaluate it against current onchain state before releasing decryption shares.
Allowlist. A common policy where a shared object holds a list of authorized addresses. It suits private documents and invitational sharing. Other patterns include token gating and time locks.
Policy ID (identity). The byte string a piece of data is encrypted under. It must begin with the policy's namespace (for an allowlist, the allowlist object's ID) so the policy's prefix check passes.
Key servers and threshold. Seal splits the decryption key across key servers; the threshold is how many must each return a share to decrypt. No single server can decrypt on its own.
These are summarized here only as orientation. For the authoritative definitions, the full API, and the security model, see Using Seal.

Seal transactions need an explicit sender
When building a programmable transaction block (PTB) for Seal policy checks, set the transaction sender before passing the PTB to Seal. The sender must match the address that is requesting decryption access.

tx.setSender(address);

 Copy

Use an Agent
If the sender is missing or does not match, decryption can fail with Transaction was not signed by the correct sender.

Troubleshooting
Decryption needs to be online. Decryption is not an offline operation: the client must reach the Seal key servers and the relevant Sui network so the policy can be evaluated and shares retrieved. Plan for network access wherever you decrypt.
Requested package is not supported. The key servers do not recognize your package on the network they serve. Confirm the package is published on the same network as the key servers, and that decryption targets that same network. Seal key servers are network-specific: a Testnet key server does not serve keys for a Mainnet package, and vice versa.
Transaction was not signed by the correct sender. Set the PTB sender with tx.setSender() and ensure it matches the address requesting access (see the tip above).
To get started, follow the Encrypting data with Seal tutorial or refer to the Seal SDK.

Nautilus: Secure and verifiable off-chain computation
Nautilus is a framework for secure and verifiable off-chain computation on Sui. It enables you to delegate sensitive or resource-intensive tasks to a self-managed trusted execution environment (TEE) while using smart contract verification to preserve trust onchain.

Use Nautilus for hybrid apps that require private data handling, complex computations, or integration with external Web2 systems. The framework ensures computations are tamper-resistant, isolated, and cryptographically verifiable.

Nautilus currently supports self-managed AWS Nitro Enclave TEEs. You can verify AWS-signed enclave attestations onchain using Move smart contracts. See the GitHub repository for the reproducible build template.

Use cases
Trusted oracles: Process off-chain data from Web2 services or decentralized storage platforms like Walrus in a tamper-resistant way.
AI agents: Securely run AI models for inference or execute agentic workflows while providing data and model provenance onchain.
DePIN solutions: Enable private data computation in IoT and supply chain networks.
Fraud prevention: Secure order matching, settlement, and multi-party computations for DEXs and layer 2 solutions.
Identity management: Provide onchain verifiability for decentralized governance with proof of tamper resistance.
To get started, see Using Nautilus.

Edit































# Encrypting data with Seal

URL: https://docs.wal.app/docs/seal-encryption-tutorial

Walrus storesblobs **Blob** Single unstructured data object stored on Walrus. publicly: anyone with ablob ID **Blob ID** Cryptographic ID computed from a blob's slivers. can read the bytes. To keep data confidential, encrypt it before you store it. This tutorial walks through a complete round trip with [Seal](https://seal-docs.wal.app/) : encrypt a message, store the ciphertext on Walrus, read it back, and decrypt it, with working TypeScript for both directions.

Seal handles encryption and onchain access control; Walrus handles storage. The two are independent, so this page stays focused on how they fit together and links to the [Seal documentation](https://seal-docs.wal.app/UsingSeal) for the full API and security model. For the concepts behind the code, see [Data Security](/docs/data-security#seal-data-confidentiality-and-access-control) .

## How the pieces fit

1. **Encrypt** the data with Seal. Seal applies threshold encryption: the decryption key is split across key servers, and no single server can decrypt on its own.
2. **Store** the resulting ciphertext on Walrus. Only encrypted bytes ever reach Walrus.
3. **Read** the ciphertext back from Walrus by itsblob ID .
4. **Decrypt** with Seal. The key servers release decryption shares only after an onchain `seal_approve` policy confirms the requester is allowed.

## Prerequisites

- Node.js and the `@mysten/sui` , `@mysten/seal` , and `@mysten/walrus` packages.
- Testnet SUI for gas andWAL **WAL** The native token of Walrus. for storage. AcquireWAL with `walrus get-wal` .
- An access-control policy deployed onchain that exposes a `seal_approve` function. This tutorial uses the **allowlist** pattern from the Seal repository. Deploy [`allowlist.move`](https://github.com/MystenLabs/seal/blob/main/examples/move/sources/allowlist.move) , create an allowlist, and add your address to it. The Move side is documented in full under [Using Seal](https://seal-docs.wal.app/UsingSeal) ; this page does not duplicate it.
Why a Move policy is required
Seal does not decide who may decrypt; your `seal_approve` function does. The key servers evaluate it against current onchain state before releasing shares. The allowlist pattern grants access to a fixed set of addresses, but any Move logic works: token gating, time locks, or custom conditions. See [access-control options](/docs/sites/security/access-control-options#seal-access-policy-patterns) .

## Configuration

All four scripts share one Suiclient **Client** Entity interacting directly with the storage nodes; this can be an aggregator or cache, a publisher, or an end user. (extended with the Walrus SDK), one Sealclient , and the policy IDs you got when you deployed the allowlist. Seal key servers are network-specific, so theclient , the policy, and the key servers must all be on the same network.

Loading…
The keypair helper supplies a Testnet account with SUI andWAL . In a browser app you would sign with a wallet through `@mysten/dapp-kit` instead.

Loading…

## Encrypt and store

Encryption needs a Seal **identity** : an arbitrary byte string that must begin with your policy's namespace so the `seal_approve` prefix check passes. For the allowlist pattern the namespace is the allowlist object's ID; appending a random nonce gives each message a distinct identity under the same policy.

The core call is `sealClient.encrypt` , which returns the encrypted object to store and a symmetric backup key you can ignore:

```ts
const { encryptedObject } = await sealClient.encrypt({
  threshold: THRESHOLD,
  packageId: PACKAGE_ID,
  id,
  data: message,
});
```

The full script encrypts the message and stores only the ciphertext on Walrus:

Loading…
Run it and note the printedblob ID :

```sh
SUI_PRIVATE_KEY=suiprivkey1... npx tsx encrypt-and-store.ts
```

## Read and decrypt

Decryption has three moving parts: a `SessionKey` authorized once by theuser **User** Any entity or person that wants to store or read blobs on or from Walrus; can act as a Walrus client itself or use the simple interface exposed by publishers and caches. 's signature, a PTB that calls `seal_approve` so the key servers can check the policy, and the `decrypt` call itself.

The PTB **must** have its sender set to the requesting address. The allowlist policy checks `ctx.sender()` , so a missing or mismatched sender fails with `Transaction was not signed by the correct sender` :

```ts
const tx = new Transaction();
tx.setSender(address);
tx.moveCall({
  target: `${PACKAGE_ID}::${MODULE_NAME}::seal_approve`,
  arguments: [tx.pure.vector('u8', fromHex(id)), tx.object(ALLOWLIST_ID)],
});
const txBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });
const decrypted = await sealClient.decrypt({ data: encryptedBytes, sessionKey, txBytes });
```

The full script reads theblob back from Walrus, recovers the identity from the encrypted object, authorizes a session key, fetches decryption shares, and decrypts:

Loading…
Run it with theblob ID from the previous step:

```sh
SUI_PRIVATE_KEY=suiprivkey1... npx tsx read-and-decrypt.ts <blobId>
```

If the requesting address is on the allowlist, the original message prints. If not, the key servers refuse and the SDK throws `NoAccessError` .

## Troubleshooting

- **`Transaction was not signed by the correct sender`** — call `tx.setSender()` with the requester's address before building the PTB, and make sure that address matches the session key's address.
- **`Requested package is not supported`** — the key servers do not recognize your package on this network. Confirm the package is published on the same network as the key servers and that `PACKAGE_ID` is correct.
- **`NoAccessError`** — the policy denied access. For the allowlist pattern, confirm the requesting address was added to the allowlist.
- **`InvalidParameter` right after creating objects** — a key server's full node may not have indexed a just-created object yet. Wait a few seconds and retry.
For the complete Seal API, key-server selection, and the security model, see [Using Seal](https://seal-docs.wal.app/UsingSeal) .


















Tusky Migration Guide
As of December 19, 2025, the storage service Tusky is shutting down. Data stored on Walrus through Tusky is still safe and accessible. During Tusky's sunsetting period, you can continue reading your data, however you must either migrate to using Walrus directly or through alternative tooling.

During this sunset period, you must:

Take note of the Tusky sunsetting window.

Request your encryption keys from Tusky if you use the password protected keys stored by them.

Begin downloading your datasets. Refer to the Tusky documentation for more information or view the video tutorial.

Decide which migration option fits your use case best.

Complete re-upload where required.

Validate reads and access patterns on Walrus.

Update applications or workflows as needed.

Immediate first steps
Take note of the sunset window.

You have until March 19, 2026 of guaranteed read access via Tusky from the date of their shut down announcement.
Do not wait until the last week of this window.
Take inventory of your data. Having an inventory of your data will help determine which migration option fits best.

Make a list of:
Vaults and buckets
Blob IDs or file paths
Encryption keys
Estimate the approximate total size of your data.
Request your encryption keys from Tusky now if you use the password protected keys they store.

Important note on encryption (applies to all migration options)
Tusky supports self-hosted keys and keys supplied by the user
 but stored encrypted on Tusky and password protected. All encryption and decryption of blobs
 happens on the client
 side and is handled by Tusky SDK.

This means once you download your data from Tusky via SDK, it should already be decrypted.

Based on your needs for data management going forward, you can choose to encrypt your data using an alternative mechanism as mentioned in the migration options. If you request the Tusky-stored encryption keys from them before they shut down the service, you may choose to reuse those keys with the relevant alternatives.

Migration option 1: Download from Tusky → decrypt → re-upload to Walrus
Download your data from Tusky
Use the Tusky app, HTTP API, or SDK for bulk export. Refer to the Tusky documentation for more information or view the video tutorial.
Set up a Walrus client
Install Walrus CLI or SDK, or use the web API: https://docs.wal.app/docs/getting-started
Re-upload to Walrus
Use the CLI, SDK, or web API.

For encryption, either:

Use a third-party library (like CryptoES or Node’s Crypto Module for symmetric key based encryption before upload. You can optionally use the keys that you might have retrieved from Tusky.
Integrate Seal as part of your write flow. This requires a Move-based access policy and integration with key server providers: https://seal-docs.wal.app/GettingStarted/.
Migration option 2: Direct Walrus access through blob or quilt patch IDs
Extract blob or patch IDs and metadata from Tusky (through their app, API, or SDK).

Fetch blobs or quilt patches directly from Walrus using:

Walrus CLI
Walrus HTTP API
Walrus SDKs
Walrus Quilt
Validate integrity and availability of the data.
You might have to decrypt your data using encryption keys that you have retrieved from Tusky. Make sure you request these before their service is shut down.
Update your application or workflows to reference Walrus directly going forward.
Migration option 3: Migrate to another Walrus-compatible interface (Managed UX)
Available options:

Nami Cloud
Zark Lab: Refer to the Getting Started with Zark guide.
Pawtato
tip
More managed UX options coming soon.

Export data from Tusky
Use the Tusky app, API, or SDK to download all required data.
Evaluate and choose one of the options listed above.
Based on your needs, confirm support for:
Bulk uploads
Large files
Encryption
Long-term maintenance and support
Re-upload data
Upload data through the new interface (relevant UI, API, or SDK).
Re-apply encryption and access controls as needed.
Validate access and workflows
Confirm reads, permissions, and any application integrations.
















# Glossary

URL: https://docs.wal.app/docs/glossary

This glossary defines key terms used throughout the Walrus documentation, covering storage concepts, erasure coding, cryptographic primitives, token economics, and network roles.

A B C D E F G H I J K L M N O P Q R S T U V W X Y Z

## A

Aggregator Service that reconstructs blobs by interacting with storage nodes and exposes a basic `HTTP GET` endpoint to end users.
Availability period The period specified in storage epochs for which a blob is certified to be available on Walrus.

## B

Blob Single unstructured data object stored on Walrus.
Blob ID Cryptographic ID computed from a blob's slivers.
Blob metadata Metadata of one blob; in particular, this contains a hash per shard to enable the authentication of slivers and recovery symbols.

## C

Cache An aggregator with additional caching capabilities.
Certificate of availability A blob ID with signatures of storage nodes holding at least \(2f+1\) shards in a specific epoch.
Client Entity interacting directly with the storage nodes; this can be an aggregator or cache, a publisher, or an end user.

## D

Deletable blob Blob that can be deleted by its owner at any time to reuse the storage resource.

## E

Expiry The end epoch at which a blob is no longer available and can be deleted; the end epoch is always exclusive.

## F

FROST The smallest unit of WAL (similar to MIST for SUI); 1 WAL is equal to 1 billion (1000000000) FROST.

## I

Inconsistency certificate An aggregated signature from 2/3 of storage nodes (weighted by their number of shards) that they have seen and stored an inconsistency proof for a blob ID.
Inconsistency proof Set of several recovery symbols with their Merkle proofs such that the decoded sliver does not match the corresponding hash; this proves an incorrect/inconsistent encoding by the client.

## M

Member A storage node that is part of a committee at some epoch.

## P

Permanent blob Blob that cannot be deleted by its owner and is guaranteed to be available until at least its expiry epoch (assuming it is valid).
Point of availability Point in time when a certificate of availability is submitted to Sui and the corresponding blob is guaranteed to be available until its expiration.
Publisher Service interacting with Sui and the storage nodes to store blobs on Walrus; offers a basic `HTTP POST` endpoint to end users.

## R

Reconstruction Decoding of the primary slivers to obtain the blob; includes re-encoding the blob and checking the Merkle proofs.
RedStuff Erasure-encoding approach, which uses two different encodings (primary and secondary) to enable shard recovery; details are available in the [whitepaper](./walrus.pdf).

## S

Shard (Disjoint) Subset of erasure-encoded data of all blobs; at every point in time, a shard is assigned to and stored on a single storage node.
Shard recovery Process of a storage node recovering a sliver or full shard by obtaining recovery symbols from other storage nodes.
Sliver Erasure-encoded data of one shard corresponding to a single blob for one of the two encodings; this contains several erasure-encoded symbols of that blob but not the blob metadata.
Sliver pair The combination of a shard's primary and secondary sliver.
Storage attestation Process where storage nodes exchange challenges and responses to demonstrate that they are storing their currently assigned shards.
Storage committee The set of storage nodes for a storage epoch, including metadata about the shards they are responsible for and other metadata.
Storage epoch The epoch for Walrus as distinct to the epoch for Sui.
Storage node Entity storing data for Walrus; holds one or several *shards*.

## U

User Any entity or person that wants to store or read blobs on or from Walrus; can act as a Walrus client itself or use the simple interface exposed by publishers and caches.

## W

WAL The native token of Walrus.














Walrus Examples
Example applications that demonstrate different workflows and use cases on Walrus

Sui Archival System
An example application that demonstrates archiving Sui blockchain checkpoint data on Walrus.

→
Using Walrus with JavaScript
JavaScript code examples to demonstrate how to use Walrus from within a JavaScript application.

→
Using Walrus with Move
Move code examples to demonstrate how to use Walrus from within a Move package.

→
Using Walrus with Python
Python code examples to demonstrate how to use Walrus from within a Python application.

→
Walrus Relay
An example of a file upload web application that uses the Walrus Upload Relay.

→
Edit













# Sui Archival System

URL: https://docs.wal.app/docs/examples/checkpoint-data

The Sui Archival application demonstrates how Sui blockchain checkpoint data can be archived on Walrus in a reliable, deterministic, and resilient manner.

The application is accessible at [https://walrus-sui-archival.wal.app/](https://walrus-sui-archival.wal.app/)

The application's code is [open source and available on GitHub](https://github.com/MystenLabs/walrus-sui-archival) .

## How it works

The application polls data from Sui by subscribing to checkpoint sources such as the ingestion framework. It continuously receives live checkpoints as they are created. Once the application obtains a checkpoint, it creates a checkpointblob **Blob** Single unstructured data object stored on Walrus. based on a deterministic algorithm. The application then uploadsblobs to Walrus. The application storesblob metadata **Blob metadata** Metadata of one blob; in particular, this contains a hash per shard to enable the authentication of slivers and recovery symbols. in its local database. Whenblobs are close to expiration, the system automatically extends their lifetime to ensure continuous availability.

Additional technical details can be found in the [application's documentation](https://walrus-sui-archival.wal.app/tech/) .

The application uses the following code for the main archival functionality:

Loading…
[View the application's full code on GitHub](https://github.com/MystenLabs/walrus-sui-archival) .




















# Using Walrus with JavaScript

URL: https://docs.wal.app/docs/examples/javascript

The following JavaScript example shows how to upload and download ablob **Blob** Single unstructured data object stored on Walrus. through a web form using the HTTP API.

Loading…





























# Using Walrus with Move

URL: https://docs.wal.app/docs/examples/move

The following Move example showcases how to import and use Walrus onchain objects.

Loading…
















# Using Walrus with Python

URL: https://docs.wal.app/docs/examples/python

You can interact with Walrus from within Python code.

## Use the HTTP API

Use the HTTP API to store and readblobs **Blob** Single unstructured data object stored on Walrus. .

Loading…

## Use the JSON API

Use the JSON API to store, read, and check the availability of ablob . Checking the certification of ablob illustrates reading theblob 's corresponding Sui object.

Loading…

## Track Walrus events

Loading…



















# Walrus Relay

URL: https://docs.wal.app/docs/examples/walrus-relay

Using the Walrus TypeScript SDK and the Walrus Upload Relay, the following example app creates a web application that can be used for uploading and managingblobs **Blob** Single unstructured data object stored on Walrus. on Walrus.

[View a deployed instance of this example in your browser](https://relay.wal.app) or [view the entire source code](https://github.com/MystenLabs/walrus-sdk-relay-example-app) .

Define and configure theWalrus client **Client** Entity interacting directly with the storage nodes; this can be an aggregator or cache, a publisher, or an end user. :

Loading…
Define network configuration options:

Loading…
Create the web application's `App.tsx` file:

Loading…