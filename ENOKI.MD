Welcome to Enoki
Enoki gets its name from a type of Japanese mushroom. In the same way that Enoki and all other fungi and plants sprout from vast networks of mycelium (shared root system), Enoki on Sui acts as the root system and gateway to build Web3 applications. Offering straightforward and accessible developer experience, and high quality user experience, Enoki empowers builders with the ability to exploit blockchain superpowers with the ease and convenience we are all familiar with in Web 2.0.

Non-custodial account management
To unburden your users from having to think about Web3 technologies, you can use Enoki to create a Sui address from a Web 2.0 login. End users log in using Web 2.0 systems they are already familiar with, like Google login, and are able to perform transactions on the Sui network. The creation of a Sui address is handled for them and is tied to their Web 2.0 credentials.

Enoki uses zkLogin to generate self-custodial Sui addresses, with just a simple web credential login. Using the OAuth2 OpenID Connect standard, users can sign in with Google, Apple, Twitch and more. The user's on-chain address is linked to an active JSON Web Token (JWT) from their web credential. Enoki generates a salt and address, using zkLogin proofs that allow a user to sign transactions just by logging into their web credential.

Through Enoki Developer Portal, you control and configure the login providers you want your users to authenticate with.

Sponsored transactions
Enoki allows builders to fully sponsor all end-user transactions, and Enoki Developer Portal provides the tools to setup and manage these transactions. Using these, you can pay for transactions on the Sui network on behalf of your users. Doing so further removes complexity for your end users, as they don't need to understand gas fees or even know what a SUI token



Enoki TypeScript SDK
The Enoki TypeScript SDK is in active development. Expect the implementation to change frequently.

Integrate Enoki into your dApps with the TypeScript SDK. Wrapping your main app with the Enoki context provider delivers Enoki functions and state across all your components.

With Enoki integrated in your app, users receive a Sui address based on their Web 2.0 authentication flow, so each authorized user always has the same address. The salt Enoki uses to create the address is per app, however, so the same user has different addresses across multiple apps using Enoki.

Getting started
Include the Enoki SDK in your app to provide Sui blockchain functionality without having to manage any cryptographic keys. Your app users don't need to install a wallet, either. They complete the authorization flow from Web 2.0 identity providers, like Google, Apple, or Twitch, and can then perform on-chain transactions using your app.

Install
To begin, add the @mysten/enoki package to your project using a package manager:

npm
pnpm
yarn
bun

npm install @mysten/enoki


Enoki TypeScript SDK
Register Enoki Wallets
Initializing
To register Enoki wallets using the wallet-standard, you can use the registerEnokiWallets function. This will add a wallet for each of the configured auth providers. These wallets implement all the standard wallet standard features, and can be interacted with like any other Sui wallet.

Note that Enoki wallets are bound to a specific network, so you will need to re-register your Enoki wallets using an updated client instance and network configuration whenever the targeted network changes. See the React integration section below for how this is handled.


import { registerEnokiWallets } from '@mysten/enoki';
const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
registerEnokiWallets({
	client: suiClient,
	network: 'testnet',
	apiKey: 'YOUR_PUBLIC_ENOKI_API_KEY',
	providers: {
		google: {
			clientId: 'YOUR_GOOGLE_CLIENT_ID',
		},
		facebook: {
			clientId: 'YOUR_FACEBOOK_CLIENT_ID',
		},
		twitch: {
			clientId: 'YOUR_TWITCH_CLIENT_ID',
		},
	},
});
When the standard:connect feature is called, the Enoki SDK will open a pop-up window to handle the OAuth flow. Once the Oauth flow has completed, the wallet will now be connected, and can be used to sign transactions or personal messages.

React integration
First, set up the dapp-kit providers as described in the dapp-kit docs. Next, create a component to register the Enoki wallets using the registerEnokiWallets function. This component should be rendered before the wallet provider.


import {
	createNetworkConfig,
	SuiClientProvider,
	useSuiClientContext,
	WalletProvider,
} from '@mysten/dapp-kit';
import { isEnokiNetwork, registerEnokiWallets } from '@mysten/enoki';
import { getFullnodeUrl } from '@mysten/sui/client';
import { useEffect } from 'react';
const { networkConfig } = createNetworkConfig({
	testnet: { url: getFullnodeUrl('testnet') },
	mainnet: { url: getFullnodeUrl('mainnet') },
});
function App() {
	return (
		<SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
			<RegisterEnokiWallets />
			<WalletProvider autoConnect>
				<YourApp />
			</WalletProvider>
		</SuiClientProvider>
	);
}
function RegisterEnokiWallets() {
	const { client, network } = useSuiClientContext();
	useEffect(() => {
		if (!isEnokiNetwork(network)) return;



Enoki TypeScript SDK
Signing in with Enoki
Once Enoki Wallets have been registered via the wallet standard, you can integrate login capabilities with dapp-kit's ConnectButton component or the useConnectWallet hook.

Using the Connect Button
The following example assumes that you have set up the dapp-kit providers and have registered Enoki wallets via the registerEnokiWallets method.


import { ConnectButton } from '@mysten/dapp-kit';
export function YourApp() {
	return <ConnectButton />;
}
When the user taps or clicks the Connect button, the Connect modal will include entries for signing in with each of the configured auth providers. If the user selects one of Auth providers from the list of registered Enoki wallets, the Enoki SDK will automatically handle the OAuth flow in a pop-up window and connect that Enoki wallet as the current active account.

Using custom login buttons
To customize the login experience, you can use the useConnectWallet and useWallets hooks to create your own login buttons:


import { useConnectWallet, useCurrentAccount, useWallets } from '@mysten/dapp-kit';
import { isEnokiWallet, EnokiWallet, AuthProvider } from '@mysten/enoki';
import { type EnokiWallet } from '@mysten/enoki';
function YourLoginComponent() {
	const currentAccount = useCurrentAccount();
	const { connect } = useConnectWallet();
	const wallets = useWallets().filter(isEnokiWallet);
	const walletsByProvider = wallets.reduce(
		(map, wallet) => map.set(wallet.provider, wallet),
		new Map<AuthProvider, EnokiWallet>(),
	);
	const googleWallet = walletsByProvider.get('google');
	const facebookWallet = walletsByProvider.get('facebook');
	if (currentAccount) {
		return <div>Current address: {currentAccount.address}</div>;
	}
	return (
		<>
			{googleWallet ? (
				<button
					onClick={() => {
						connect({ wallet: googleWallet });
					}}
				>
					Sign in with Google
				</button>
			) : null}
			{facebookWallet ? (
				<button
					onClick={() => {
						connect({ wallet: facebookWallet });
					}}
				>
					Sign in with Facebook
				</button>
			) : null}
		</>
	);
}
Removing Enoki wallets from the ConnectButton modal
If your app supports both Enoki and normal wallets, and you have implemented custom login buttons, you can hide the Enoki wallets from the ConnectButton modal by using the walletFilter prop of the ConnectButton component:


import { ConnectButton } from '@mysten/dapp-kit';
import { isEnokiWallet } from '@mysten/enoki';
export function YourApp() {
	return <ConnectButton walletFilter={(wallet) => !isEnokiWallet(wallet)} />;
}


Register Enoki Wallets
Initializing
To register Enoki wallets using the wallet-standard, you can use the registerEnokiWallets function. This will add a wallet for each of the configured auth providers. These wallets implement all the standard wallet standard features, and can be interacted with like any other Sui wallet.

Note that Enoki wallets are bound to a specific network, so you will need to re-register your Enoki wallets using an updated client instance and network configuration whenever the targeted network changes. See the React integration section below for how this is handled.


import { registerEnokiWallets } from '@mysten/enoki';
const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });
registerEnokiWallets({
	client: suiClient,
	network: 'testnet',
	apiKey: 'YOUR_PUBLIC_ENOKI_API_KEY',
	providers: {
		google: {
			clientId: 'YOUR_GOOGLE_CLIENT_ID',
		},
		facebook: {
			clientId: 'YOUR_FACEBOOK_CLIENT_ID',
		},
		twitch: {
			clientId: 'YOUR_TWITCH_CLIENT_ID',
		},
	},
});
When the standard:connect feature is called, the Enoki SDK will open a pop-up window to handle the OAuth flow. Once the Oauth flow has completed, the wallet will now be connected, and can be used to sign transactions or personal messages.

React integration
First, set up the dapp-kit providers as described in the dapp-kit docs. Next, create a component to register the Enoki wallets using the registerEnokiWallets function. This component should be rendered before the wallet provider.


import {
	createNetworkConfig,
	SuiClientProvider,
	useSuiClientContext,
	WalletProvider,
} from '@mysten/dapp-kit';
import { isEnokiNetwork, registerEnokiWallets } from '@mysten/enoki';
import { getFullnodeUrl } from '@mysten/sui/client';
import { useEffect } from 'react';
const { networkConfig } = createNetworkConfig({
	testnet: { url: getFullnodeUrl('testnet') },
	mainnet: { url: getFullnodeUrl('mainnet') },
});
function App() {
	return (
		<SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
			<RegisterEnokiWallets />
			<WalletProvider autoConnect>
				<YourApp />
			</WalletProvider>
		</SuiClientProvider>
	);
}
function RegisterEnokiWallets() {
	const { client, network } = useSuiClientContext();
	useEffect(() => {
		if (!isEnokiNetwork(network)) return;





Signing in with Enoki
Once Enoki Wallets have been registered via the wallet standard, you can integrate login capabilities with dapp-kit's ConnectButton component or the useConnectWallet hook.

Using the Connect Button
The following example assumes that you have set up the dapp-kit providers and have registered Enoki wallets via the registerEnokiWallets method.


import { ConnectButton } from '@mysten/dapp-kit';
export function YourApp() {
	return <ConnectButton />;
}
When the user taps or clicks the Connect button, the Connect modal will include entries for signing in with each of the configured auth providers. If the user selects one of Auth providers from the list of registered Enoki wallets, the Enoki SDK will automatically handle the OAuth flow in a pop-up window and connect that Enoki wallet as the current active account.

Using custom login buttons
To customize the login experience, you can use the useConnectWallet and useWallets hooks to create your own login buttons:


import { useConnectWallet, useCurrentAccount, useWallets } from '@mysten/dapp-kit';
import { isEnokiWallet, EnokiWallet, AuthProvider } from '@mysten/enoki';
import { type EnokiWallet } from '@mysten/enoki';
function YourLoginComponent() {
	const currentAccount = useCurrentAccount();
	const { connect } = useConnectWallet();
	const wallets = useWallets().filter(isEnokiWallet);
	const walletsByProvider = wallets.reduce(
		(map, wallet) => map.set(wallet.provider, wallet),
		new Map<AuthProvider, EnokiWallet>(),
	);
	const googleWallet = walletsByProvider.get('google');
	const facebookWallet = walletsByProvider.get('facebook');
	if (currentAccount) {
		return <div>Current address: {currentAccount.address}</div>;
	}
	return (
		<>
			{googleWallet ? (
				<button
					onClick={() => {
						connect({ wallet: googleWallet });
					}}
				>
					Sign in with Google
				</button>
			) : null}
			{facebookWallet ? (
				<button
					onClick={() => {
						connect({ wallet: facebookWallet });
					}}
				>
					Sign in with Facebook
				</button>
			) : null}
		</>
	);
}
Removing Enoki wallets from the ConnectButton modal
If your app supports both Enoki and normal wallets, and you have implemented custom login buttons, you can hide the Enoki wallets from the ConnectButton modal by using the walletFilter prop of the ConnectButton component:


import { ConnectButton } from '@mysten/dapp-kit';
import { isEnokiWallet } from '@mysten/enoki';
export function YourApp() {
	return <ConnectButton walletFilter={(wallet) => !isEnokiWallet(wallet)} />;
}












Signing Transactions
The Enoki SDK uses the wallet-standard to allow signing transactions to be handle the same way it is done with other wallets. You can use the useSignAndExecuteTransaction hook from dapp-kit to sign and execute transactions

Example
Consider the following code example. Unseen here, the SuiClientProvider wraps the root of this app and the Enoki wallets are already registered through the wallet standard. Doing this enables the wallet related hooks from dapp-kit to work with Enoki.

When the user taps or clicks the Sign and execute transaction button, if the currently connected wallet is an Enoki wallet, the Enoki SDK will automatically generate a signature for the transaction, before it is executed with dapp-kit.


import { Transaction } from '@mysten/sui/transactions';
import { useSignAndExecuteTransaction } from '@mysten/dapp-kit';
function Demo() {
	const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
	async function handleButtonClick() {
		const transaction = new Transaction();
		// Add some commands to the transaction...
		// Executes the transaction using the currently connected wallet
		const { digest } = await signAndExecuteTransaction({
			transaction,
		});
	}
	return <button onClick={handleButtonClick}>Sign and execute transaction</button>;
}
Unlike other wallets, signing does not require confirmation to approve the transaction. In a production app, you should provide logic that informs the user they are performing a transaction and allow them to cancel it if it was unintended.





Sponsored Transactions
Enoki provides sponsored transactions, which allow you to send transactions to zkLogin accounts without the need to on-ramp users to Sui.

Using Enoki you can:

Integrate sponsored transactions with less effort.
Safely sponsor transactions without introducing excessive costs or opportunities for misuse.
Sponsor transactions in development environments before introducing them into production.
Implementation
Sponsoring transactions requires using private API keys.

When using private API keys, you execute your sponsored transactions through a backend service that interacts with the Enoki API. The backend service allows you to make transactions without exposing your private API keys.

Enoki API
Use a backend service with private API keys to perform sponsored transactions using Enoki.

To use Enoki APIs:

Construct transactionBlockKindBytes with txb.build({ provider, onlyTransactionKind: true }).


const client = useSuiClient();
const txb = new Transaction();
// ... add some transactions...
const transactionBlockKindBytes = await txb.build({ client, onlyTransactionKind: true });
Pass the transactionBlockKindBytes value to your backend service. The backend calls transaction-blocks/sponsor with method POST and provides:

zklogin-jwt value as part of the header.
network and transactionBlockKindBytes values in the body.
If successful, the response includes the bytes for the transaction and the transaction digest.

Sign the returned transaction bytes with your key pair.

From your backend service, call transaction-blocks/sponsor/:digest with method POST, and provide the signature you create in the previous step in the body of the call. If successful, the response includes a sponsor-signed base64-encoded transaction.




EnokiClient
The EnokiClient is a low-level client.

API Reference
The APIs on the client mirror the HTTP APIs.

getAuthProviders
getZkLogin
createZkLoginZkp
createZkLoginNonce



Enoki SDK Examples
The following examples highlight some common workflows for onboarding users using Enoki.

Sponsored transactions using client-side signatures
To sponsor and execute transactions in your backend service using client-side signatures:

Log in to the Enoki Portal and select the desired app from your team's dashboard.

Create a public API key enabled for zkLogin and the network you want to target.

Use the dashboard to add an auth provider and configure the Client ID value it provides.

Log in to the Enoki Portal and select the desired app from your team's dashboard.

Create a private API key enabled for Sponsored Transactions and the networks you want to target.

Create an Enoki client in your backend service using the key you create in the previous step.

Keep your secret key in an env variable and take care not to expose it publicly.


import { EnokiClient } from '@mysten/enoki';
export const enokiClient = new EnokiClient({
	apiKey: process.env.ENOKI_SECRET_KEY!,
});
Create a new Transaction, add the needed commands and serialize the transaction kind to bytes (Uint8Array). The following example sets the owner of a kiosk and transfers the kioskOwnerCap to the recipient.


const tx = new Transaction();
tx.moveCall({
	target: '0x2::kiosk::set_owner_custom',
	arguments: [tx.object(kioskId), tx.object(user.kioskOwnerCapId), tx.pure(recipient)],
});
tx.transferObjects([tx.object(user.kioskOwnerCapId)], recipient);
const txBytes = await tx.build({
	client: suiClient,
	onlyTransactionKind: true,
});
Make a call to the enokiClient to sponsor the transaction. The response returned will be the bytes and digest of the transaction, which is later used to execute the transaction:


const resp = await enokiClient.createSponsoredTransaction({
	network: ENOKI_CLIENT_NETWORK,
	transactionKindBytes: toB64(txBytes),
	sender: address,
	allowedMoveCallTargets: ['0x2::kiosk::set_owner_custom'],
	allowedAddresses: [recipient],
});
Set the sender of the transaction, include the move call you are going to invoke in the allowedMoveCallTargets field and the recipient (if any) in the allowedAddresses field. You can also configure these values in the Enoki Portal project dashboard.

Execute the sponsored transaction. You need both the user’s signature and the digest to execute the transaction. The previous call returns the digest but you must collect the signature from the user. Assuming the user session is on the client side, you need to return the transaction bytes to the client and collect the signature as shown:


import { useSignTransaction } from '@mysten/dapp-kit';
export default function Example() {
   const { mutateAsync: signTransaction } = useSignTransaction();
   const getSignature = async () => {
      // use bytes returned from your backend after sponsoring the transaction
      const { signature } = await signTransaction({ transaction: bytes });
      if (!signature) {
         throw new Error('Error signing transaction block');
      }
      ...
   }
}
The code snippet gets the bytes value from the createSponsoredTransaction() response, which it uses to collect the user signature. The code then needs to return that signature to the backend service, along with the digest, to execute the transaction:


const resp = await enokiClient.executeSponsoredTransaction({
	digest,
	signature,
});
Backend sponsor, execute, and sign transactions
When sponsoring, executing, and signing transactions from a backend, you don't need to transfer the transaction bytes to the client to get the signature. Instead, you can use the initial steps from the previous example to get the API key and create the Enoki client, then execute the following code from the backend:


const tx = new Transaction();
tx.moveCall({
	target: '0x2::kiosk::set_owner_custom',
	arguments: [tx.object(kioskId), tx.object(kioskOwnerCapId), tx.pure(address)],
});
tx.transferObjects([tx.object(kioskOwnerCapId)], address);
const txBytes = await tx.build({
	client: suiClient,
	onlyTransactionKind: true,
});
const sponsored = await enokiClient.createSponsoredTransaction({
	network: ENOKI_CLIENT_NETWORK,
	transactionKindBytes: toB64(txBytes),
	sender: getAddress(process.env.ADMIN_SECRET_KEY!),
	allowedMoveCallTargets: [
		'0x0000000000000000000000000000000000000000000000000000000000000002::kiosk::set_owner_custom',
	],
	allowedAddresses: [address],
});
const signer = getSigner(process.env.ADMIN_SECRET_KEY!);
const { signature } = await signer.signTransaction(fromB64(sponsored.bytes));
await enokiClient.executeSponsoredTransaction({
	digest: sponsored.digest,
	signature,
});
The backend service executes this code without the need to transfer from server side to client side, because the backend stores the signer.

Migrating a dApp to Mainnet
During dApp development, you typically implement the Enoki workflows in these examples on one of the Sui development networks, Testnet or Devnet. Before migrating an Enoki-enhanced dApp from development networks to Mainnet, check that:

You set the network parameter that might be passed to the enokiClient.createAuthorizationURL or to the enokiClient.createSponsoredTransaction functions is set to mainnet.
In the Enoki Portal, make sure you have Mainnet enabled in the networks list for the API keys that are used for the sponsorship.



HTTP API Reference
Enoki provides several HTTP APIs, which expose all of the core Enoki functionality. Our API accepts JSON-encoded request bodies, returns JSON-encoded responses, and uses standard HTTP response codes, authentication.

Base URL: https://api.enoki.mystenlabs.com

Versioning
The Enoki API is currently version v1. The API version must be included as a path prefix to requests made to the API.

Versioned Base URL: https://api.enoki.mystenlabs.com/v1

Authentication
The Enoki API uses API keys to authenticate requests. You can view and manage your API keys in the Enoki Developer Portal. You can create both private and public API keys. Public keys are meant to be used when calling Enoki from a frontend or used in publicly available code. If you're calling the API from a backend service instead, use either a public or private API key to construct your Authorization header. The benefit of using a private key is to avoid public key rate limits. Format the header as follows:


Authorization: Bearer <YOUR_ENOKI_API_KEY>
Request IDs
If you would like to debug a request, you can include a Request-Id header in your request. This is expected to be a globally identifier (often a UUID) that you generate on the client when initiating a request.


Request-Id: <UUID>
API endpoints
You can find the full list of API endpoints in the OpenAPI specification.

Enoki API Specification
View the full list of API endpoints in the OpenAPI specification.

























Enoki API Specification
HTTP API for Enoki

Create zkLogin nonce
Generates a nonce used in the zkLogin OAuth flow. Using this API is not required, you can also construct a nonce client-side if desired.

https://api.enoki.mystenlabs.com
POST
/
v1
/
zklogin
/
nonce
Send
Authorization
Body
Authorization

apiKey
Authorization
Bearer <token>
In: header

Request Body

application/json
network?
string
The Sui network you wish to use. Defaults to mainnet.

Default"mainnet"
Value in"testnet" | "mainnet" | "devnet"
ephemeralPublicKey
string
The ephemeral public key created during the zkLogin process, encoded as a base64 string.

additionalEpochs?
number
The amount of epochs that you would like to have the nonce be valid for.

Default2
Range0 <= value <= 30
Response Body
200

application/json
cURL
JavaScript
Go
Python
Java
C#

curl -X POST "https://api.enoki.mystenlabs.com/v1/zklogin/nonce" \
  -H "Authorization: Bearer " \
  -H "Content-Type: application/json" \
  -d '{
    "ephemeralPublicKey": "string"
  }'
200

{
  "data": {
    "nonce": "string",
    "randomness": "string",
    "epoch": 0,
    "maxEpoch": 0,
    "estimatedExpiration": 0
  }
}
Create zkLogin ZKP
Creates a zero-knowledge proof, which is used to submit transactions to Sui.

https://api.enoki.mystenlabs.com
POST
/
v1
/
zklogin
/
zkp
Send
Authorization
Header
Body
Authorization

apiKey
Authorization
Bearer <token>
In: header

Header Parameters
zklogin-jwt
string
The JWT of the user signed in with zkLogin.

Request Body

application/json
network?
string
The Sui network you wish to use. Defaults to mainnet.

Default"mainnet"
Value in"testnet" | "mainnet" | "devnet"
ephemeralPublicKey
string
The ephemeral public key created during the zkLogin process, encoded as a base64 string.

maxEpoch
integer
The maxEpoch created during the zkLogin process.

Range0 <= value
randomness
string
The randomness created during the zkLogin process.

Response Body
200

application/json
cURL
JavaScript
Go
Python
Java
C#

curl -X POST "https://api.enoki.mystenlabs.com/v1/zklogin/zkp" \
  -H "zklogin-jwt: string" \
  -H "Authorization: Bearer " \
  -H "Content-Type: application/json" \
  -d '{
    "ephemeralPublicKey": "string",
    "maxEpoch": 0,
    "randomness": "string"
  }'
200

{
  "data": {
    "proofPoints": null,
    "issBase64Details": null,
    "headerBase64": null,
    "addressSeed": "string"
  }
}
Create sponsored transaction
Creates sponsored transaction

https://api.enoki.mystenlabs.com
POST
/
v1
/
transaction-blocks
/
sponsor
Send
Authorization
Header
Body
Authorization

apiKey
Authorization
Bearer <token>
In: header

Header Parameters
zklogin-jwt?
string
The JWT of the user signed in with zkLogin.

Request Body

application/json
network?
string
The Sui network you wish to use. Defaults to mainnet.

Default"mainnet"
Value in"testnet" | "mainnet" | "devnet"
transactionBlockKindBytes
string
Bytes of the transaction with the onlyTransactionKind flag set to true.

sender?
string
The address sending the transaction. Include this parameter if not including the zklogin-jwt header. This option is only supported when calling the API from a backend service using a private key.

allowedAddresses?
array<string>
List of Sui addresses that can be present in the transaction. These addresses are combined with the list configured in the Enoki Developer Portal. Transactions attempting to refer to or transfer assets outside of these addresses are rejected.

Array Item
allowedMoveCallTargets?
array<string>
List of permitted Move targets the sponsored user's transactions can call.

Array Item
Response Body
200

application/json
cURL
JavaScript
Go
Python
Java
C#

curl -X POST "https://api.enoki.mystenlabs.com/v1/transaction-blocks/sponsor" \
  -H "zklogin-jwt: string" \
  -H "Authorization: Bearer " \
  -H "Content-Type: application/json" \
  -d '{
    "transactionBlockKindBytes": "string"
  }'
200

{
  "data": {
    "digest": "string",
    "bytes": "string"
  }
}
Submits a sponsored transaction for execution
Submits a transaction created from /transaction-blocks/sponsor for execution.

https://api.enoki.mystenlabs.com
POST
/
v1
/
transaction-blocks
/
sponsor
/
{digest}
Send
Authorization
Path
Body
Authorization

apiKey
Authorization
Bearer <token>
In: header

Path Parameters
digest
string
The digest of the previously-created sponsored transaction block to execute.

Request Body

application/json
signature
string
User signature of the transaction.

Response Body
200

application/json
cURL
JavaScript
Go
Python
Java
C#

curl -X POST "https://api.enoki.mystenlabs.com/v1/transaction-blocks/sponsor/string" \
  -H "Authorization: Bearer " \
  -H "Content-Type: application/json" \
  -d '{
    "signature": "string"
  }'
200

{
  "data": {
    "digest": "string"
  }
}
Get address for zkLogin user
Returns the address and salt value for the given JWT. If the JWT is not valid, the API will return an error code.

https://api.enoki.mystenlabs.com
GET
/
v1
/
zklogin
Send
Authorization
Header
Authorization

apiKey
Authorization
Bearer <token>
In: header

Header Parameters
zklogin-jwt
string
The JWT of the user signed in with zkLogin.

Response Body
200

application/json
cURL
JavaScript
Go
Python
Java
C#

curl -X GET "https://api.enoki.mystenlabs.com/v1/zklogin" \
  -H "zklogin-jwt: string" \
  -H "Authorization: Bearer "
200

{
  "data": {
    "salt": "string",
    "address": "string",
    "publicKey": "string"
  }
}
Get addresses for zkLogin user
Returns the addresses for a given JWT. If the JWT is not valid, the API will return an error code.

https://api.enoki.mystenlabs.com
GET
/
v1
/
zklogin
/
addresses
Send
Authorization
Header
Authorization

apiKey
Authorization
Bearer <token>
In: header

Header Parameters
zklogin-jwt
string
The JWT of the user signed in with zkLogin.

Response Body
200

application/json
cURL
JavaScript
Go
Python
Java
C#

curl -X GET "https://api.enoki.mystenlabs.com/v1/zklogin/addresses" \
  -H "zklogin-jwt: string" \
  -H "Authorization: Bearer "
200

{
  "data": {
    "addresses": [
      {
        "clientId": "string",
        "salt": "string",
        "address": "string",
        "publicKey": "string",
        "legacy": true
      }
    ]
  }
}
Get app metadata
Returns the public metadata (configured in the Enoki Developer Portal) of the app associated with the API key.

https://api.enoki.mystenlabs.com
GET
/
v1
/
app
Send
Authorization
Authorization

apiKey
Authorization
Bearer <token>
In: header

Response Body
200

application/json
cURL
JavaScript
Go
Python
Java
C#

curl -X GET "https://api.enoki.mystenlabs.com/v1/app" \
  -H "Authorization: Bearer "
200

{
  "data": {
    "allowedOrigins": [
      "https://example.com"
    ],
    "authenticationProviders": [
      {
        "providerType": "google",
        "clientId": "..."
      }
    ],
    "domains": [
      {
        "nftId": "string",
        "name": "string",
        "network": "testnet"
      }
    ]
  }
}
Get a list of subnames for an address
Get a list of subnames for an address

https://api.enoki.mystenlabs.com
GET
/
v1
/
subnames
Send
Authorization
Query
Authorization

apiKey
Authorization
Bearer <token>
In: header

Query Parameters
network?
string
The network subnames are registered on.

Default"mainnet"
Value in"testnet" | "mainnet"
domain?
string
The domain name the subname is on.

address?
string
The address to resolve subnames for

Response Body
200

application/json
cURL
JavaScript
Go
Python
Java
C#

curl -X GET "https://api.enoki.mystenlabs.com/v1/subnames?network=testnet&domain=string&address=string" \
  -H "Authorization: Bearer "
200

{
  "data": {
    "subnames": [
      {
        "name": "string",
        "status": "PENDING",
        "createdAt": "2025-08-06T14:30:00.000Z"
      }
    ]
  }
}
Create a subname
Initiates the creation of a subname. The subname request is added to a processing queue and will be created asynchronously, typically within a few seconds. Note: A successful response from this API does not guarantee that the subname has been created yet. To check the status of the subname, use the get subname API or resolve the name directly on Sui.

https://api.enoki.mystenlabs.com
POST
/
v1
/
subnames
Send
Authorization
Header
Body
Authorization

apiKey
Authorization
Bearer <token>
In: header

Header Parameters
zklogin-jwt?
string
The JWT of the user signed in with zkLogin.

Request Body

application/json
domain
string
The domain name to create the subname under.

network?
string
The network the domain and subname are registered on.

Default"mainnet"
Value in"testnet" | "mainnet"
subname
string
The subname to create.

targetAddress?
string
The address the new subname will resolve to

Response Body
202

application/json
cURL
JavaScript
Go
Python
Java
C#

curl -X POST "https://api.enoki.mystenlabs.com/v1/subnames" \
  -H "zklogin-jwt: string" \
  -H "Authorization: Bearer " \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "string",
    "subname": "string"
  }'
202

{
  "data": {
    "name": "string",
    "status": "PENDING",
    "createdAt": "2025-08-06T14:30:00.000Z"
  }
}
Delete a subname
Initiates the deletion of a subname. The subname request is added to a processing queue and will be deleted asynchronously, typically within a few seconds. Note: A successful response from this API does not guarantee that the subname has been deleted yet. To check the status of the subname, use the get subname API or resolve the name directly on Sui.

https://api.enoki.mystenlabs.com
DELETE
/
v1
/
subnames
Send
Authorization
Body
Authorization

apiKey
Authorization
Bearer <token>
In: header

Request Body

application/json
domain
string
The domain name the subname is on.

network?
string
The network the domain and subname are registered on.

Default"mainnet"
Value in"testnet" | "mainnet"
subname
string
The subname to delete.

targetAddress?
string
The address the new subname will resolve to

Response Body
202

application/json
cURL
JavaScript
Go
Python
Java
C#

curl -X DELETE "https://api.enoki.mystenlabs.com/v1/subnames" \
  -H "Authorization: Bearer " \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "string",
    "subname": "string"
  }'
202

{
  "data": {
    "name": "string",
    "status": "PENDING",
    "createdAt": "2025-08-06T14:30:00.000Z"
  }
}






















Enoki Developer Portal FAQ
General
What is Enoki?
How can I sign up?
Why can’t I see pricing or subscription options?
Why can’t I pay for my subscription in SUI?
What if I want to add additional people to my team?
I need some help, where can I get it?
zkLogin
What credential providers are available?
Can we add private SSO/OAuth credentials to zkLogin?
How do I avoid creating different wallets for users on different devices?
Can my users edit or download the salt?
How do I secure client IDs for my apps against compromise?
Sponsored transactions




What are sponsored transactions?
All on-chain transactions must be paid for with gas. Enoki allows developers to cover this cost on behalf of users by sponsoring transactions. Gas budgets are allocated to each team based on subscription tier, and additional credits can be purchased as needed.

Do sponsored transaction credits expire?
Credits purchased do not expire so long as an active subscription remains in place (including the Free tier). If an account is returned to the Sandbox plan (no live applications), and/or a request is received to delete an account, any remaining gas credits expire at the end of the subscription month.




What is a sponsored transaction provisioning fee?
Each time a transaction is sponsored, there are costs associated with the actual gas for the transaction, as well as the services used in offering the sponsorship. This fee covers the additional costs. All paid subscriptions come with an allowance and the fee is only charged when usage exceeds this allowance.







Enoki Connect
Many decentralized applications (dApps) rely on embedded zkLogin wallets to simplify and streamline the user onboarding process. This approach offers a seamless and frictionless experience, allowing users to create and use wallets effortlessly without the complexities of traditional crypto wallet management. However, a key limitation of this model is that the wallet is tightly bound to the specific dApp where it was created. With Enoki Connect, users can use their dApp-specific accounts across different dApps, enabling a more unified and consistent experience.

How it works
Enoki Connect enables users to access their dApp-specific zkLogin accounts across multiple applications through three simple components:

Enoki Connect Wallet — a lightweight wallet interface for users to access their zkLogin accounts.

Source dApp Setup — builders enable Enoki Connect in the Enoki Portal.

Other dApps Integration — builders of other dApps register the same wallet by adding a small code snippet that references the source dApp’s public app slug.

Integration Steps
Enoki Portal Source dApp Configuration
Enoki zkLogin Required

For Enoki Connect to work, the source dApp must use Enoki zkLogin for managing its zkLogin accounts. This includes using the default salt provided by Enoki. Custom zkLogin configurations are not supported.

The source dApp — the application where users initially create and manage their zkLogin accounts — must first enable Enoki Connect in the Enoki Portal. Follow these steps to enable Enoki Connect for your application:

Sign in to the Enoki Portal.

Select your application from the dashboard.

In the side panel, click Enoki Connect.

Click Enable, fill in the required details, and click Enable again to activate Enoki Connect for your app.

Add the Enoki Connect Wallet Callback URL. For each of your Authentication Providers, add the callback URL (e.g., https://[YOUR_PUBLIC_APP_SLUG].connect.enoki.mystenlabs.com/auth/callback) as an Authorized Redirect URI. You can find this exact URL in the Enoki Portal once Enoki Connect is enabled.

Public App Slug

Select your apps Public App Slug carefully as it cannot change at the moment. (It has to be unique across all apps)

Enoki ZkLogin API Key

Enoki Connect Wallet requires a ZkLogin API Key to work.

Wallet Registration by Other dApps
Any other dApp that wants to allow users to access their zkLogin accounts from the source dApp can do so by registering the Enoki Connect Wallet. This is done by adding a small code snippet that references the source dApp’s public app slug.


// in an entry file of your dApp eg. main.ts
import { registerEnokiConnectWallets } from '@mysten/enoki-connect';
registerEnokiConnectWallets({
	publicAppSlugs: ['Replace_With_Source_Public_App_Slug'],
	dappName: 'Other DApp name',
});
You can find an example dApp here.









Identity Subnames
Identity Subnames allow you to create human-readable identities for your users on the Sui blockchain using SuiNS (Sui Name Service). Instead of users having to remember and share long hexadecimal addresses like 0x1234..., they can use simple, memorable names like alice@yourapp.

How it works
Subnames are built on top of SuiNS domains that you own. Once you link a domain to your app in the Enoki Portal, you can create subnames for your users through the API. These subnames resolve to user addresses on the Sui network, making it easier for users to send and receive assets.

Key Features
Human-readable addresses — Users get memorable identities instead of complex hexadecimal addresses
Built on SuiNS — Leverages the native Sui Name Service for on-chain resolution
Easy integration — Simple REST API to create, query, and delete subnames
Getting Started
Prerequisites
A SuiNS domain — You need to own a .sui domain on the network (testnet or mainnet) where you want to create subnames.

Enoki Portal setup — Link your domain to your application in the Enoki Portal:

Navigate to your app in the Enoki Portal
Go to the Subnames section
Connect your wallet and link your SuiNS domain
Publish the domain to make it active (this makes the domain visible to the API and allows adding and deleting subnames)
API Key with Subnames feature — Create or configure an API key with the SUBNAMES feature enabled.

Linking a Domain
To link a domain to your application:

In the Enoki Portal, navigate to your app's Subnames page
Click "Link a Domain"
Connect your Sui wallet that owns the domain
Select the network
Select the domain you want to link
Transfer the domain to the Enoki-managed contract
Enoki-Managed Contract

When you transfer your domain to Enoki, it's held in a secure on-chain contract that only allows Enoki to borrow the domain (to register or delete a subname) and then put it back to the contract. You retain the ability to reclaim your domain at any time through the Enoki Portal.

Domain Status

Domains must be in LIVE status before you can create subnames via the API. Use the "Publish Domain" action in the portal to activate newly linked domains.

Creating Subnames
You can create subnames using the REST API with either a public or private API key. Alternatively, admins can create and manage subnames directly through the Enoki Portal.

For complete API details, see the HTTP API Reference.

With Public API Key (Recommended for user-facing apps)
When using a public API key, include the user's zkLogin JWT to automatically associate the subname with their address:


const response = await fetch('https://api.enoki.mystenlabs.com/v1/subnames', {
	method: 'POST',
	headers: {
		Authorization: `Bearer ${publicApiKey}`,
		'zklogin-jwt': userJwt,
		'Content-Type': 'application/json',
	},
	body: JSON.stringify({
		domain: 'yourapp.sui',
		network: 'mainnet',
		subname: 'alice',
	}),
});
const data = await response.json();
// { name: 'alice@yourapp.sui', status: 'PENDING', createdAt: '2025-08-06T14:30:00.000Z' }
One Subname Per User

When using a public API key with zkLogin, each user can only have one subname per domain. Attempting to create a second subname for the same user will result in an error.

With Private API Key (For backend use)
When using a private API key, you must specify the targetAddress:


const response = await fetch('https://api.enoki.mystenlabs.com/v1/subnames', {
	method: 'POST',
	headers: {
		Authorization: `Bearer ${privateApiKey}`,
		'Content-Type': 'application/json',
	},
	body: JSON.stringify({
		domain: 'yourapp.sui',
		network: 'mainnet',
		subname: 'alice',
		targetAddress: '0x1234567890abcdef...',
	}),
});
Querying Subnames
Retrieve subnames associated with an address:


const response = await fetch(
	'https://api.enoki.mystenlabs.com/v1/subnames?' +
		new URLSearchParams({
			network: 'mainnet',
			address: '0x1234567890abcdef...',
			domain: 'yourapp.sui',
		}),
	{
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
	},
);
const data = await response.json();
// {
//   subnames: [
//     { name: 'alice@yourapp.sui', status: 'ACTIVE', createdAt: '2025-08-06T14:30:00.000Z' }
//   ]
// }
Deleting Subnames
Remove subnames using a private API key:


const response = await fetch('https://api.enoki.mystenlabs.com/v1/subnames', {
	method: 'DELETE',
	headers: {
		Authorization: `Bearer ${privateApiKey}`,
		'Content-Type': 'application/json',
	},
	body: JSON.stringify({
		domain: 'yourapp.sui',
		network: 'mainnet',
		subname: 'alice',
	}),
});
Private API Key Required

Deleting subnames requires a private API key for security reasons.

Subname Status
Subnames go through the following states:

PENDING — The subname has been submitted and is being processed (typically takes a few seconds)
ACTIVE — The subname is live and resolving on-chain
FAILED — The creation failed (this status is filtered out from API responses)
After creating a subname, poll the GET endpoint or check the subname resolution on-chain to confirm it's active.

Best Practices
Check status after creation — Use the GET endpoint to monitor when a subname becomes ACTIVE
Handle async nature — Don't assume immediate availability; subnames are processed asynchronously
Validate input — Validate subname format on the client side before making API calls
Use public keys for user actions — Let users create their own subnames with public API keys and zkLogin
Reserve private keys for admin — Use private API keys only for backend operations where you need to specify target addresses
Domain Renewals
SuiNS domains have expiration dates and must be renewed periodically to maintain ownership and functionality. Understanding the expiration timeline is critical:

Before expiration — Renew your domain at any time through the SuiNS platform
After expiration — Once your domain expires, you cannot register or delete subnames, and existing subnames will stop resolving
Grace period — You have a 30-day grace period to renew the domain and restore functionality
After grace period — Once the grace period ends, the domain becomes available for anyone to register, and you will lose ownership permanently
You can check your domain's expiration date in the Enoki Portal on the Subnames page
Domain Expiration

Renew your domain before the 30-day grace period ends to prevent losing ownership. After the grace period, anyone can register your domain, and all associated subnames will stop resolving. Set up reminders well in advance of the expiration date.

Auto-Renewals
Enoki supports automatic domain renewals for domains linked to your application. When enabled, domains will automatically renew around 30 days before expiration, ensuring uninterrupted service for your users' subnames without manual intervention.

Auto-Renewal Timeline

Domains automatically renew around 30 days before expiration. The exact timing may vary slightly based on network conditions and processing schedules. Renewal fees (based on domain length and market rates) apply only to mainnet domains and will be charged to your account.

Key Points:

Auto-renewals work for both mainnet and testnet domains
Renewal fees are automatically charged to your Enoki billing account (mainnet only)
Domains are renewed for 1 year
You can monitor your domain's expiration date and renewal history in the Enoki Portal
Manual Renewal:

If you prefer to renew your domain manually:

In the Enoki Portal, reclaim your domain to your wallet using the "Reclaim Domain" action
Go to SuiNS and renew your domain
Transfer the domain back to Enoki through the Portal
Service Interruption During Manual Renewal

While your domain is reclaimed to your wallet, Enoki cannot manage subnames. Creating and deleting subnames will be blocked until you transfer the domain back to Enoki.

Network Support
Subnames are available on both:

Testnet — For development and testing
Mainnet — For production use
Make sure your domain is registered on the same network where you want to create subnames, and that your API key has the corresponding network enabled.

















Enoki API Specification
HTTP API for Enoki

Create zkLogin nonce
Generates a nonce used in the zkLogin OAuth flow. Using this API is not required, you can also construct a nonce client-side if desired.

https://api.enoki.mystenlabs.com
POST
/
v1
/
zklogin
/
nonce
Send
Authorization
Body
Authorization

apiKey
Authorization
Bearer <token>
In: header

Request Body

application/json
network?
string
The Sui network you wish to use. Defaults to mainnet.

Default"mainnet"
Value in"testnet" | "mainnet" | "devnet"
ephemeralPublicKey
string
The ephemeral public key created during the zkLogin process, encoded as a base64 string.

additionalEpochs?
number
The amount of epochs that you would like to have the nonce be valid for.

Default2
Range0 <= value <= 30
Response Body
200

application/json
cURL
JavaScript
Go
Python
Java
C#

curl -X POST "https://api.enoki.mystenlabs.com/v1/zklogin/nonce" \
  -H "Authorization: Bearer " \
  -H "Content-Type: application/json" \
  -d '{
    "ephemeralPublicKey": "string"
  }'
200

{
  "data": {
    "nonce": "string",
    "randomness": "string",
    "epoch": 0,
    "maxEpoch": 0,
    "estimatedExpiration": 0
  }
}
Create zkLogin ZKP
Creates a zero-knowledge proof, which is used to submit transactions to Sui.

https://api.enoki.mystenlabs.com
POST
/
v1
/
zklogin
/
zkp
Send
Authorization
Header
Body
Authorization

apiKey
Authorization
Bearer <token>
In: header

Header Parameters
zklogin-jwt
string
The JWT of the user signed in with zkLogin.

Request Body

application/json
network?
string
The Sui network you wish to use. Defaults to mainnet.

Default"mainnet"
Value in"testnet" | "mainnet" | "devnet"
ephemeralPublicKey
string
The ephemeral public key created during the zkLogin process, encoded as a base64 string.

maxEpoch
integer
The maxEpoch created during the zkLogin process.

Range0 <= value
randomness
string
The randomness created during the zkLogin process.

Response Body
200

application/json
cURL
JavaScript
Go
Python
Java
C#

curl -X POST "https://api.enoki.mystenlabs.com/v1/zklogin/zkp" \
  -H "zklogin-jwt: string" \
  -H "Authorization: Bearer " \
  -H "Content-Type: application/json" \
  -d '{
    "ephemeralPublicKey": "string",
    "maxEpoch": 0,
    "randomness": "string"
  }'
200

{
  "data": {
    "proofPoints": null,
    "issBase64Details": null,
    "headerBase64": null,
    "addressSeed": "string"
  }
}
Create sponsored transaction
Creates sponsored transaction

https://api.enoki.mystenlabs.com
POST
/
v1
/
transaction-blocks
/
sponsor
Send
Authorization
Header
Body
Authorization

apiKey
Authorization
Bearer <token>
In: header

Header Parameters
zklogin-jwt?
string
The JWT of the user signed in with zkLogin.

Request Body

application/json
network?
string
The Sui network you wish to use. Defaults to mainnet.

Default"mainnet"
Value in"testnet" | "mainnet" | "devnet"
transactionBlockKindBytes
string
Bytes of the transaction with the onlyTransactionKind flag set to true.

sender?
string
The address sending the transaction. Include this parameter if not including the zklogin-jwt header. This option is only supported when calling the API from a backend service using a private key.

allowedAddresses?
array<string>
List of Sui addresses that can be present in the transaction. These addresses are combined with the list configured in the Enoki Developer Portal. Transactions attempting to refer to or transfer assets outside of these addresses are rejected.

Array Item
allowedMoveCallTargets?
array<string>
List of permitted Move targets the sponsored user's transactions can call.

Array Item
Response Body
200

application/json
cURL
JavaScript
Go
Python
Java
C#

curl -X POST "https://api.enoki.mystenlabs.com/v1/transaction-blocks/sponsor" \
  -H "zklogin-jwt: string" \
  -H "Authorization: Bearer " \
  -H "Content-Type: application/json" \
  -d '{
    "transactionBlockKindBytes": "string"
  }'
200

{
  "data": {
    "digest": "string",
    "bytes": "string"
  }
}
Submits a sponsored transaction for execution
Submits a transaction created from /transaction-blocks/sponsor for execution.

https://api.enoki.mystenlabs.com
POST
/
v1
/
transaction-blocks
/
sponsor
/
{digest}
Send
Authorization
Path
Body
Authorization

apiKey
Authorization
Bearer <token>
In: header

Path Parameters
digest
string
The digest of the previously-created sponsored transaction block to execute.

Request Body

application/json
signature
string
User signature of the transaction.

Response Body
200

application/json
cURL
JavaScript
Go
Python
Java
C#

curl -X POST "https://api.enoki.mystenlabs.com/v1/transaction-blocks/sponsor/string" \
  -H "Authorization: Bearer " \
  -H "Content-Type: application/json" \
  -d '{
    "signature": "string"
  }'
200

{
  "data": {
    "digest": "string"
  }
}
Get address for zkLogin user
Returns the address and salt value for the given JWT. If the JWT is not valid, the API will return an error code.

https://api.enoki.mystenlabs.com
GET
/
v1
/
zklogin
Send
Authorization
Header
Authorization

apiKey
Authorization
Bearer <token>
In: header

Header Parameters
zklogin-jwt
string
The JWT of the user signed in with zkLogin.

Response Body
200

application/json
cURL
JavaScript
Go
Python
Java
C#

curl -X GET "https://api.enoki.mystenlabs.com/v1/zklogin" \
  -H "zklogin-jwt: string" \
  -H "Authorization: Bearer "
200

{
  "data": {
    "salt": "string",
    "address": "string",
    "publicKey": "string"
  }
}
Get addresses for zkLogin user
Returns the addresses for a given JWT. If the JWT is not valid, the API will return an error code.

https://api.enoki.mystenlabs.com
GET
/
v1
/
zklogin
/
addresses
Send
Authorization
Header
Authorization

apiKey
Authorization
Bearer <token>
In: header

Header Parameters
zklogin-jwt
string
The JWT of the user signed in with zkLogin.

Response Body
200

application/json
cURL
JavaScript
Go
Python
Java
C#

curl -X GET "https://api.enoki.mystenlabs.com/v1/zklogin/addresses" \
  -H "zklogin-jwt: string" \
  -H "Authorization: Bearer "
200

{
  "data": {
    "addresses": [
      {
        "clientId": "string",
        "salt": "string",
        "address": "string",
        "publicKey": "string",
        "legacy": true
      }
    ]
  }
}
Get app metadata
Returns the public metadata (configured in the Enoki Developer Portal) of the app associated with the API key.

https://api.enoki.mystenlabs.com
GET
/
v1
/
app
Send
Authorization
Authorization

apiKey
Authorization
Bearer <token>
In: header

Response Body
200

application/json
cURL
JavaScript
Go
Python
Java
C#

curl -X GET "https://api.enoki.mystenlabs.com/v1/app" \
  -H "Authorization: Bearer "
200

{
  "data": {
    "allowedOrigins": [
      "https://example.com"
    ],
    "authenticationProviders": [
      {
        "providerType": "google",
        "clientId": "..."
      }
    ],
    "domains": [
      {
        "nftId": "string",
        "name": "string",
        "network": "testnet"
      }
    ]
  }
}
Get a list of subnames for an address
Get a list of subnames for an address

https://api.enoki.mystenlabs.com
GET
/
v1
/
subnames
Send
Authorization
Query
Authorization

apiKey
Authorization
Bearer <token>
In: header

Query Parameters
network?
string
The network subnames are registered on.

Default"mainnet"
Value in"testnet" | "mainnet"
domain?
string
The domain name the subname is on.

address?
string
The address to resolve subnames for

Response Body
200

application/json
cURL
JavaScript
Go
Python
Java
C#

curl -X GET "https://api.enoki.mystenlabs.com/v1/subnames?network=testnet&domain=string&address=string" \
  -H "Authorization: Bearer "
200

{
  "data": {
    "subnames": [
      {
        "name": "string",
        "status": "PENDING",
        "createdAt": "2025-08-06T14:30:00.000Z"
      }
    ]
  }
}
Create a subname
Initiates the creation of a subname. The subname request is added to a processing queue and will be created asynchronously, typically within a few seconds. Note: A successful response from this API does not guarantee that the subname has been created yet. To check the status of the subname, use the get subname API or resolve the name directly on Sui.

https://api.enoki.mystenlabs.com
POST
/
v1
/
subnames
Send
Authorization
Header
Body
Authorization

apiKey
Authorization
Bearer <token>
In: header

Header Parameters
zklogin-jwt?
string
The JWT of the user signed in with zkLogin.

Request Body

application/json
domain
string
The domain name to create the subname under.

network?
string
The network the domain and subname are registered on.

Default"mainnet"
Value in"testnet" | "mainnet"
subname
string
The subname to create.

targetAddress?
string
The address the new subname will resolve to

Response Body
202

application/json
cURL
JavaScript
Go
Python
Java
C#

curl -X POST "https://api.enoki.mystenlabs.com/v1/subnames" \
  -H "zklogin-jwt: string" \
  -H "Authorization: Bearer " \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "string",
    "subname": "string"
  }'
202

{
  "data": {
    "name": "string",
    "status": "PENDING",
    "createdAt": "2025-08-06T14:30:00.000Z"
  }
}
Delete a subname
Initiates the deletion of a subname. The subname request is added to a processing queue and will be deleted asynchronously, typically within a few seconds. Note: A successful response from this API does not guarantee that the subname has been deleted yet. To check the status of the subname, use the get subname API or resolve the name directly on Sui.

https://api.enoki.mystenlabs.com
DELETE
/
v1
/
subnames
Send
Authorization
Body
Authorization

apiKey
Authorization
Bearer <token>
In: header

Request Body

application/json
domain
string
The domain name the subname is on.

network?
string
The network the domain and subname are registered on.

Default"mainnet"
Value in"testnet" | "mainnet"
subname
string
The subname to delete.

targetAddress?
string
The address the new subname will resolve to

Response Body
202

application/json
cURL
JavaScript
Go
Python
Java
C#

curl -X DELETE "https://api.enoki.mystenlabs.com/v1/subnames" \
  -H "Authorization: Bearer " \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "string",
    "subname": "string"
  }'
202

{
  "data": {
    "name": "string",
    "status": "PENDING",
    "createdAt": "2025-08-06T14:30:00.000Z"
  }
}
