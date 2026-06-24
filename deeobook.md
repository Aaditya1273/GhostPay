https://docs.sui.io/onchain-finance/deepbookv3/















Skip to main content
DeepBookV3
On this page
DeepBookV3
DeepBookV3 is a next-generation decentralized central limit order book (CLOB) built on Sui. DeepBookV3 leverages Sui's parallel execution and low transaction
 fees to bring a highly performant, low-latency exchange on chain.

The latest version delivers new features including flash loans, governance, improved account abstraction, and enhancements to the existing matching engine. This version also introduces its own tokenomics with the DEEP token, which you can stake for additional benefits.

DeepBookV3 does not include an end-user interface for token trading. Rather, it offers built-in trading functionality that can support token trades from decentralized exchanges, wallets, or other apps. The available SDK abstracts away a lot of the complexities of interacting with the chain and building programmable transaction blocks
, lowering the barrier of entry for active market making.

info
The documentation refers to the DeepBook
 standard as "DeepBookV3" to avoid confusion with the recently deprecated version of DeepBook (DeepBookV2).

DeepBookV3 tokenomics
The DEEP token pays for trading fees on the exchange. Users can pay trading fees using DEEP tokens or input tokens, but owning, using, and staking DEEP continues to provide the most benefits to active DeepBookV3 traders on the Sui network.

As an example, governance determines the fee for paying in DEEP tokens, which is 20% lower than the fee for using input tokens.

Users that stake DEEP can enjoy taker and maker incentives. Taker incentives can reduce trading fees by half, dropping them to as low as 0.25 basis points (bps) on stable pairs and 2.5 bps on volatile pairs. Maker incentives are rebates earned based on maker volume generated.

Liquidity support
Similar to order books for other market places, DeepBookV3's CLOB architecture enables you to enter market and limit orders. You can sell SUI tokens, referred to as an ask, can set your price, referred to as a limit order, or sell at the market's going rate. If you are seeking to buy SUI, referred to as a bid, you can pay the current market price or set a limit price. Limit orders only get fulfilled if the CLOB finds a match between a buyer and seller.

If you put in a limit order for 1,000 SUI, and no single seller is currently offering that quantity of tokens, DeepBookV3 automatically pools the current asks to meet the quantity of your bid.

Transparency and privacy
As a CLOB, DeepBookV3 works like a digital ledger, logging bids and asks in chronological order and automatically finding matches between the two sides. It takes into account user parameters on trades such as prices.

The digital ledger is open so people can view the trades and prices, giving clear proof of fairness. You can use this transparency to create metrics and dashboards to monitor trading activity.

Documentation
This documentation outlines the design of DeepBookV3, its public endpoints, and provides guidance for integrations. The SDK abstracts away a lot of the complexities of interacting with the chain and building programmable transaction blocks, lowering the barrier of entry for active market making.

Open source
DeepBookV3 is open for community development. You can use the Sui Improvement Proposals (SIPs) process to suggest changes to make DeepBookV3 better.

Design
Learn about DeepBookV3 design, including the Pool, PoolRegistry, and BalanceManager shared objects.

→
Contract Information
In this section
BalanceManager
Orders
Flash Loans
Swaps
Staking and Governance
Permissionless Pool Creation
+ 3 more
→
DeepBookV3 SDK
In this section
BalanceManager
Pools
Orders
Flash Loans
Swaps
Staking and Governance
→
Indexer
DeepBookV3 Indexer provides streamlined, real-time access to order book and trading data from the DeepBookV3 protocol. It acts as a centralized service to aggregate and expose critical data points.

→
Edit this page
Next
Design




Sui Logo
© 2026 Sui Foundation | Documentation distributed under CC BY 4.0



Design
At a high level, the DeepBookV3 design follows the following flow, which revolves around three shared objects:

Pool: A shared object
 that represents one market and is responsible for managing its order book, users, stakes, and so on. See the Pool shared object section to learn more.
PoolRegistry: Used only during pool creation, it makes sure that duplicate pools are not created and maintains package
 versioning.
BalanceManager: Used to source a user's funds when placing orders. A single BalanceManager can be used between all pools. See BalanceManager to learn more.
1

Pool shared object
All public facing functions take in the Pool shared object as a mutable or immutable reference. Pool is made up of three distinct components:

Book
State
Vault
Logic is isolated between components and each component builds on top of the previous one. By maintaining a book, then state, then vault relationship, DeepBookV3 can provide data availability guarantees, improve code readability, and help make maintaining and upgrading the protocol easier.

Pool Modules

Book
This component is made up of the main Book module
 along with Fill, OrderInfo, and Order modules. The Book struct maintains two BigVector<Order> objects for bids and asks, as well as some metadata. It is responsible for storing, matching, modifying, and removing Orders.

When placing an order, an OrderInfo is first created. If applicable, it is first matched against existing maker orders, accumulating Fills in the process. Any remaining quantity will be used to create an Order object and injected into the book. By the end of book processing, the OrderInfo object has enough information to update all relevant users and the overall state.

State
State stores Governance, History, and Account. It processes all requests, updating at least one of these stored structs.

Governance
The Governance module stores data related to the pool's trading params. These parameters are the taker fee, maker fee, and the stake required. Stake required represents the amount of DEEP tokens that a user must have staked in this specific pool to be eligible for taker and maker incentives.

Every epoch
, users with nonzero stake can submit a proposal to change these parameters. The proposed fees are bounded.

min_value (bps)	max_value (bps)	Pool type	Taker or maker
1	10	Volatile	Taker
0	5	Volatile	Maker
0.1	1	Stable	Taker
0	0.5	Stable	Maker
0	0	Whitelisted	Taker and maker
 
Users can also vote on live proposals. When a proposal exceeds the quorum
, the new trade parameters are queued to go live from the following epoch and onwards. Proposals and votes are reset every epoch. Users can start submitting and voting on proposals the epoch following their stake. Quorum is equivalent to half of the total voting power. A user's voting power is calculated with the following formula where 
V
V is the voting power, 
S
S is the amount staked, and 
V
c
V 
c
​
  is the voting power cutoff. 
V
c
V 
c
​
  is currently set to 100,000 DEEP.

V
=
min
⁡
(
S
,
V
c
)
+
max
⁡
(
S
−
V
c
,
0
)
V=min(S,V 
c
​
 )+max( 
S
​
 − 
V 
c
​
 
​
 ,0)

The following diagram helps visualize the governance lifecycle.

DeepBookV3 Governance Timeline

History
The History module stores aggregated volumes, trading params, fees collected and fees to burn for the current epoch and previous epochs. During order processing, fills are used to calculate and update the total volume. Additionally, if the maker of the trade has enough stake, the total staked volume is also updated.

The first operation of every epoch will trigger an update, moving the current epoch data into historic data, and resetting the current epoch data.

User rebate calculations are done in this module. During every epoch, a maker is eligible for rebates as long as their DEEP staked is over the stake required and have contributed in maker volume. The following formula is used to calculate maker fees, quoted from the Whitepaper: DeepBook
 Token document. Details on maker incentives can be found in section 2.2 of the whitepaper.

The computation of incentives – which happens after an epoch ends and is only given to makers who have staked the required number of DEEP tokens in advance – is calculated in Equation (3) for a given maker 
i
i. Equation (3) introduces several new variables. First, 
M
M refers to the set of makers who stake a sufficient number of DEEP tokens, and 
M
ˉ
M
ˉ
  refers to the set of makers who do not fulfill this condition. Second, 
F
F refers to total fees (collected both from takers and the maker) that a maker’s volume has generated in a given epoch. Third, 
L
L refers to the total liquidity provided by a maker – and specifically the liquidity traded, not just the liquidity quoted. Finally, the critical point 
p
p is the “phaseout” point, at which – if total liquidity provided by other makers’ crosses this point – incentives are zero for the maker in that epoch. This point 
p
p is constant for all makers in a pool and epoch.

Incentives
 
for
 
Maker
 
i
=
max
⁡
[
F
i
(
1
+
∑
j
∈
M
ˉ
F
j
∑
j
∈
M
F
j
)
(
1
−
∑
j
∈
M
∪
M
ˉ
L
j
−
L
i
p
)
,
0
]
Incentives for Maker i=max[F 
i
​
 (1+ 
∑ 
j∈M
​
 F 
j
​
 
∑ 
j∈ 
M
ˉ
 
​
 F 
j
​
 
​
 )(1− 
p
∑ 
j∈M∪ 
M
ˉ
 
​
 L 
j
​
 −L 
i
​
 
​
 ),0]
(3)

In essence, if the total volume during an epoch is greater than the median volume from the last 28 days, then there are no rebates. The lower the volume compared to the median, the more rebates are available. The maximum amount of rebates for an epoch is equivalent to the total amount of DEEP collected during that epoch. Remaining DEEP is burned.

Account
Account represents a single user and their relevant data. Everything related to volumes, stake, voted proposal, unclaimed rebates, and balances to be transferred. There is a one to one relationship between a BalanceManager and an Account.

Every epoch, the first action that a user performs will update their account, triggering a calculation of any potential rebates from the previous epoch, as well as resetting their volumes for the current epoch. Any new stakes from the previous epoch become active.

Each account has settled and owed balances. Settled balances are what the pool owes to the user, and owed balances are what the user owes to the pool. For example, when placing an order, the user's owed balances increase, representing the funds that the user has to pay to place that order. Then, if a maker order is taken by another user, the maker's settled balances increase, representing the funds that the maker is owed.

Vault
Every transaction
 that a user performs on DeepBookV3 resets their settled and owed balances. The vault then processes these balances for the user, deducting or adding to funds to their BalanceManager.

The vault also stores the DeepPrice struct. This object holds up to 100 data points representing the conversion rate between the pool's base or quote asset and DEEP. These data points are sourced from a whitelisted pool, DEEP/USDC or DEEP/SUI. This conversion rate is used to determine the quantity of DEEP tokens required to pay for trading fees.

BigVector
BigVector is an arbitrary sized vector-like data structure, implemented using an onchain B+ Tree to support almost constant time (log base max_fan_out) random access, insertion and removal.

Iteration is supported by exposing access to leaf nodes (slices). Finding the initial slice can be done in almost constant time, and subsequently finding the previous or next slice can also be done in constant time.

Nodes in the B+ Tree are stored as individual dynamic fields hanging off the BigVector.

Place limit order flow
The following diagram of the lifecycle of an order placement action helps visualize the book, then state, then vault flow.

Place limit order flow

Pool
In the Pool module, place_order_int is called with the user's input parameters. In this function, four things happen in order:

An OrderInfo is created.
The Book function create_order is called.
The State function process_create is called.
The Vault function settle_balance_manager is called.
Book
The order creation within the book involves three primary tasks:

Validate inputs.
Match against existing orders.
Inject any remaining quantity into the order book as a limit order.
Validation of inputs ensures that quantity, price, timestamp, and order type are within expected ranges.

To match an OrderInfo against the book, the list of Orders is iterated in the opposite side of the book. If there is an overlap in price and the existing maker order has not expired, then DeepBookV3 matches their quantities and generates a Fill. DeepBookV3 appends that fill to the OrderInfo fills, to use later in state. DeepBookV3 updates the existing maker order quantities and status during each match, and removes them from the book if they are completely filled or expired.

Finally, if the OrderInfo object has any remaining quantity, DeepBookV3 converts it into a compact Order object and injects it into the order book. Order has the minimum amount of data necessary for matching, while OrderInfo has the maximum amount of data for general processing.

Regardless of direction or order type, all DeepBookV3 matching is processed in a single function.

State
The process_create function in State handles the processing of an order creation event within the pool's state: calculating the transaction amounts and fees for the order, and updating the account volumes accordingly.

First, the function processes the list of fills from the OrderInfo object, updating volumes tracked and settling funds for the makers involved. Next, the function retrieves the account's total trading volume and active stake. It calculates the taker's fee based on the user's account stake and volume in DEEP tokens, while the maker fee is retrieved from the governance trade parameters. To receive discounted taker fees, the account must have more than the minimum stake for the pool, and the trading volume in DEEP tokens must exceed the same threshold. If any quantity remains in the OrderInfo object, it is added to the account's list of orders as an Order and is already created in Book.

Finally, the function calculates the partial taker fills and maker order quantities, if there are any, with consideration for the taker and maker fees. It adds these to the previously settled and owed balances from the account. Trade history is updated with the total fees collected from the order and two tuples are returned to Pool, settled and owed balances, in (base, quote, DEEP) format, ensuring the correct assets are transferred in Vault.

Vault
The settle_balance_manager function in Vault is responsible for managing the transfer
 of any settled and owed amounts for the BalanceManager.

First, the function validates that a trader is authorized to use the BalanceManager.

Then, for each asset type the process compares balances_out against balances_in. If the balances_out total exceeds balances_in, the function splits the difference from the vault's balance and deposits it into the BalanceManager. Conversely, if the balances_in total exceeds balances_out, the function withdraws the difference from the BalanceManager and joins it to the vault's balance.

This process is repeated for base, quote, and DEEP asset balances, ensuring all asset balances are accurately reflected and settled between the vault and the BalanceManager.

Related topics
BalanceManager
Learn about the balance manager and how it works.
Edit this page


Contract Information
This page contains the contract addresses
, supported coins, and pool information for DeepBookV3 on Sui Mainnet
.

Contract versions
DeepBookV3 uses upgradeable contracts. When a contract is upgraded, only DEEPBOOK_PACKAGE_ID needs to be updated - previous versions remain compatible unless noted. A redeployment would require updating DEEPBOOK_PACKAGE_ID, REGISTRY_ID, and all pool IDs.

Current version
Parameter	Value
Version	6
Package
 ID	0x337f4f4f6567fcd778d5454f27c16c70e2f274cc6377ea6249ddf491482ef497
Registry ID	0xaf16199a2dff736e9f07a845f23c5da6df6f756eddb631aed9d24a93efc4549d
Version history
Version	Date	Package ID	Changes
6	Jan 7, 2026	0x337f4f4f6567fcd778d5454f27c16c70e2f274cc6377ea6249ddf491482ef497	Final preparation for margin launch
5	Dec 18, 2025	0x2d93777cc8b67c064b495e8606f2f8f5fd578450347bbe7b36e0bc03963c1c40	Improvements for referral system
4	Dec 9, 2025	0x00c1a56ec8c4c623a848b2ed2f03d23a25d17570b670c22106f336eb933785cc	Referral system, penalty taker fees
3	Jun 11, 2025	0xb29d83c26cdd2a64959263abbcfc4a6937f0c9fccaf98580ca56faded65be244	Small bug fix for creating balance manager
2	Apr 16, 2025	0xcaf6ba059d539a97646d47f0b9ddf843e138d215e2a12ca1f4585d386f7aec3a	Input token fees, permissionless pool creation, gas
 improvements
1	Oct 10, 2024	0x2c8d603bc51326b8c13cef9dd07031a408a48dddb541963357661df5d3204809	Original deployment
Supported coins

SUI COIN
Parameter	Value
Type	0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI
Decimals	9



SUI/USDC
Parameter	Value
Pool ID	0xe05dafb5133bcffb8d59f4e12465dc0e9faeaa05e3e342a08fe135800e3e4407
Tick Size	0.00001
Lot Size	0.1 SUI
Min Size	1 SUI
Taker Fee	1 bps
Maker Fee	0 bps


DEEP/SUI
Parameter	Value
Pool ID	0xb663828d6217467c8a1838a03793da896cbe745b150ebd57d82f814ca579fc22
Tick Size	0.00001
Lot Size	1 DEEP
Min Size	10 DEEP
Taker Fee	0 bps
Maker Fee	0 bps

DEEP/USDC
Parameter	Value
Pool ID	0xf948981b806057580f91622417534f491da5f61aeaf33d0ed8e69fd5691c95ce
Tick Size	0.00001
Lot Size	1 DEEP
Min Size	10 DEEP
Taker Fee	0 bps
Maker Fee	0 bps


BalanceManager
The BalanceManager shared object
 holds all balances for different assets. To perform trades, pass a combination of BalanceManager and TradeProof into a pool. TradeProofs are generated in one of two ways, either by the BalanceManager owner directly, or by any TradeCap owner. The owner can generate a TradeProof without the risk of equivocation
. The TradeCap owner, because it's an owned object, risks equivocation when generating a TradeProof. Generally, a high frequency trading engine trades as the default owner.

With exception to swaps, all interactions with DeepBookV3 require a BalanceManager as one of its inputs. When orders are matched, funds are transferred to or from the BalanceManager. You can use a single BalanceManager between all pools.

API
Following are the different public functions that the BalanceManager exposes.





The new() function creates a BalanceManager. Combine it with share, or else the transaction
 fails. You can combine the transaction with deposit calls, allowing you to create, deposit, then share the balance manager in one transaction.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/balance_manager.move
public fun new(ctx: &mut TxContext): BalanceManager {
    let id = object::new(ctx);
    event::emit(BalanceManagerEvent {
        balance_manager_id: id.to_inner(),
        owner: ctx.sender(),
    });

    BalanceManager {
        id,
        owner: ctx.sender(),
        balances: bag::new(ctx),
        allow_listed: vec_set::empty(),
    }
}







The new_with_custom_owner() function creates a BalanceManager with a custom owner. Combine it with share, or else the transaction fails. You can combine the transaction with deposit calls, allowing you to create, deposit, then share the balance manager in one transaction.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/balance_manager.move
public fun new_with_custom_owner(owner: address, ctx: &mut TxContext): BalanceManager {
    let id = object::new(ctx);
    event::emit(BalanceManagerEvent {
        balance_manager_id: id.to_inner(),
        owner,
    });

    BalanceManager {
        id,
        owner,
        balances: bag::new(ctx),
        allow_listed: vec_set::empty(),
    }
}












he new_with_custom_owner_caps<App>() function creates a BalanceManager with a custom owner and returns all three capabilities (DepositCap, WithdrawCap, and TradeCap) in a single call. This function requires authorization through the DeepBook
 Registry with a specific App type. Combine the balance manager with share, or else the transaction fails. This is a convenient way to set up a complete balance manager with all necessary capabilities in one transaction.

caution
Move
 code using DeepBookV3 uses DepositCap, WithdrawCap, and TradeCap, while the DeepBookV3 SDK uses depositCap, withdrawCap, and tradeCap.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/balance_manager.move
#[deprecated(note = b"This function is deprecated, use `new_with_custom_owner_caps_v2` instead.")]
#[allow(unused_type_parameter)]
public fun new_with_custom_owner_caps<App: drop>(
    _deepbook_registry: &Registry,
    _owner: address,
    _ctx: &mut TxContext,
): (BalanceManager, DepositCap, WithdrawCap, TradeCap) { abort 1337 }




The owner of a BalanceManager can mint a TradeCap and send it to another address
. Upon receipt, that address will have the capability to place orders with this BalanceManager. The address owner cannot deposit or withdraw funds, however. The maximum total number of TradeCap, WithdrawCap, and DepositCap that can be assigned for a BalanceManager is 1000. If this limit is reached, one or more existing caps must be revoked before minting new ones. You can also use revoke_trade_cap to revoke DepositCap and WithdrawCap.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/balance_manager.move
/// Mint a `TradeCap`, only owner can mint a `TradeCap`.
public fun mint_trade_cap(balance_manager: &mut BalanceManager, ctx: &mut TxContext): TradeCap {
    balance_manager.validate_owner(ctx);
    balance_manager.mint_trade_cap_internal(ctx)
}

/// Revoke a `TradeCap`. Only the owner can revoke a `TradeCap`.
/// Can also be used to revoke `DepositCap` and `WithdrawCap`.
public fun revoke_trade_cap(
    balance_manager: &mut BalanceManager,
    trade_cap_id: &ID,
    ctx: &TxContext,
) {
    balance_manager.validate_owner(ctx);

    assert!(balance_manager.allow_listed.contains(trade_cap_id), ECapNotInList);
    balance_manager.allow_listed.remove(trade_cap_id);
}









The owner of a BalanceManager can mint a DepositCap or WithdrawCap and send it to another address. Upon receipt, that address will have the capability to deposit in or withdraw from BalanceManager. The address owner cannot execute trades, however. The maximum total number of TradeCap, WithdrawCap, and DepositCap that can be assigned for a BalanceManager is 1000. If this limit is reached, one or more existing caps must be revoked before minting new ones.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/balance_manager.move
/// Mint a `DepositCap`, only owner can mint.
public fun mint_deposit_cap(balance_manager: &mut BalanceManager, ctx: &mut TxContext): DepositCap {
    balance_manager.validate_owner(ctx);
    balance_manager.mint_deposit_cap_internal(ctx)
}

/// Mint a `WithdrawCap`, only owner can mint.
public fun mint_withdraw_cap(
    balance_manager: &mut BalanceManager,
    ctx: &mut TxContext,
): WithdrawCap {
    balance_manager.validate_owner(ctx);
    balance_manager.mint_withdraw_cap_internal(ctx)
}



To call any function that requires a balance check or transfer
, the user must provide their BalanceManager as well as a TradeProof. There are two ways to generate a trade proof, one used by the owner and another used by a TradeCap owner.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/balance_manager.move
/// Generate a `TradeProof` by the owner. The owner does not require a capability
/// and can generate TradeProofs without the risk of equivocation.
public fun generate_proof_as_owner(
    balance_manager: &mut BalanceManager,
    ctx: &TxContext,
): TradeProof {
    balance_manager.validate_owner(ctx);

    TradeProof {
        balance_manager_id: object::id(balance_manager),
        trader: ctx.sender(),
    }
}

/// Generate a `TradeProof` with a `TradeCap`.
/// Risk of equivocation since `TradeCap` is an owned object.
public fun generate_proof_as_trader(
    balance_manager: &mut BalanceManager,
    trade_cap: &TradeCap,
    ctx: &TxContext,
): TradeProof {
    balance_manager.validate_trader(trade_cap);

    TradeProof {
        balance_manager_id: object::id(balance_manager),
        trader: ctx.sender(),
    }
}




Only the owner can call this function to deposit funds into the BalanceManager.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/balance_manager.move
/// Deposit funds to a balance manager. Only owner can call this directly.
public fun deposit<T>(balance_manager: &mut BalanceManager, coin: Coin<T>, ctx: &mut TxContext) {
    balance_manager.emit_balance_event(
        type_name::with_defining_ids<T>(),
        coin.value(),
        true,
    );

    let proof = balance_manager.generate_proof_as_owner(ctx);
    balance_manager.deposit_with_proof(&proof, coin.into_balance());
}





Only the owner can call this function to withdraw funds from the BalanceManager.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/balance_manager.move
/// Withdraw funds from a balance_manager. Only owner can call this directly.
/// If withdraw_all is true, amount is ignored and full balance withdrawn.
/// If withdraw_all is false, withdraw_amount will be withdrawn.
public fun withdraw<T>(
    balance_manager: &mut BalanceManager,
    withdraw_amount: u64,
    ctx: &mut TxContext,
): Coin<T> {
    let proof = generate_proof_as_owner(balance_manager, ctx);
    let coin = balance_manager.withdraw_with_proof(&proof, withdraw_amount, false).into_coin(ctx);
    balance_manager.emit_balance_event(
        type_name::with_defining_ids<T>(),
        coin.value(),
        false,
    );

    coin
}
public fun withdraw_all<T>(balance_manager: &mut BalanceManager, ctx: &mut TxContext): Coin<T> {
    let proof = generate_proof_as_owner(balance_manager, ctx);
    let coin = balance_manager.withdraw_with_proof(&proof, 0, true).into_coin(ctx);
    balance_manager.emit_balance_event(
        type_name::with_defining_ids<T>(),
        coin.value(),
        false,
    );

    coin
}


Only holders of a DepositCap for the BalanceManager can call this function to deposit funds into the BalanceManager.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/balance_manager.move
/// Deposit funds into a balance manager by a `DepositCap` owner.
public fun deposit_with_cap<T>(
    balance_manager: &mut BalanceManager,
    deposit_cap: &DepositCap,
    coin: Coin<T>,
    ctx: &TxContext,
) {
    balance_manager.emit_balance_event(
        type_name::with_defining_ids<T>(),
        coin.value(),
        true,
    );

    let proof = balance_manager.generate_proof_as_depositor(deposit_cap, ctx);
    balance_manager.deposit_with_proof(&proof, coin.into_balance());
}



Only holders of a WithdrawCap for the BalanceManager can call this function to withdraw funds from the BalanceManager.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/balance_manager.move
/// Withdraw funds from a balance manager by a `WithdrawCap` owner.
public fun withdraw_with_cap<T>(
    balance_manager: &mut BalanceManager,
    withdraw_cap: &WithdrawCap,
    withdraw_amount: u64,
    ctx: &mut TxContext,
): Coin<T> {
    let proof = balance_manager.generate_proof_as_withdrawer(
        withdraw_cap,
        ctx,
    );
    let coin = balance_manager.withdraw_with_proof(&proof, withdraw_amount, false).into_coin(ctx);
    balance_manager.emit_balance_event(
        type_name::with_defining_ids<T>(),
        coin.value(),
        false,
    );

    coin
}










The owner of a TradeCap can set or unset a pool-specific referral for the balance manager. Setting a referral allows the balance manager to be associated with a DeepBookPoolReferral for that pool, which can track and earn referral fees. Each balance manager can have different referrals for different pools.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/balance_manager.move
/// Set the referral for the balance manager.
public fun set_balance_manager_referral(
    balance_manager: &mut BalanceManager,
    referral: &DeepBookPoolReferral,
    trade_cap: &TradeCap,
) {
    balance_manager.validate_trader(trade_cap);
    let _: Option<ID> = balance_manager.id.remove_if_exists(ReferralKey(referral.pool_id));
    balance_manager.id.add(ReferralKey(referral.pool_id), referral.id.to_inner());

    event::emit(DeepBookReferralSetEvent {
        referral_id: referral.id.to_inner(),
        balance_manager_id: balance_manager.id.to_inner(),
    });
}

/// Unset the referral for the balance manager.
public fun unset_balance_manager_referral(
    balance_manager: &mut BalanceManager,
    pool_id: ID,
    trade_cap: &TradeCap,
) {
    balance_manager.validate_trader(trade_cap);
    let _: Option<ID> = balance_manager.id.remove_if_exists(ReferralKey(pool_id));

    event::emit(DeepBookReferralSetEvent {
        referral_id: id_from_address(@0x0),
        balance_manager_id: balance_manager.id.to_inner(),
    });
}



Register a balance manager with the registry. This adds the balance manager to the owner's list of managers in the registry.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/balance_manager.move
public fun register_balance_manager(
    balance_manager: &BalanceManager,
    registry: &mut Registry,
    ctx: &mut TxContext,
) {
    balance_manager.validate_owner(ctx);
    let owner = balance_manager.owner();
    let manager_id = balance_manager.id();
    registry.add_balance_manager(owner, manager_id);
}





github.com/MystenLabs/deepbookv3/packages/deepbook/sources/balance_manager.move
public fun validate_proof(balance_manager: &BalanceManager, proof: &TradeProof) {
    assert!(object::id(balance_manager) == proof.balance_manager_id, EInvalidProof);
}

/// Returns the balance of a Coin in a balance manager.
public fun balance<T>(balance_manager: &BalanceManager): u64 {
    let key = BalanceKey<T> {};
    if (!balance_manager.balances.contains(key)) {
        0
    } else {
        let acc_balance: &Balance<T> = &balance_manager.balances[key];
        acc_balance.value()
    }
}

/// Returns the owner of the balance_manager.
public fun owner(balance_manager: &BalanceManager): address {
    balance_manager.owner
}

/// Returns the owner of the balance_manager.
public fun id(balance_manager: &BalanceManager): ID {
    balance_manager.id.to_inner()
}

/// Get the referral id from the balance manager.
public fun get_balance_manager_referral_id(
    balance_manager: &BalanceManager,
    pool_id: ID,
): Option<ID> {
    let ref_key = ReferralKey(pool_id);
    if (!balance_manager.id.exists_(ref_key)) {
        return option::none()
    };
    let referral_id: &ID = balance_manager.id.borrow(ref_key);

    option::some(*referral_id)
}
public fun balance_manager_referral_owner(referral: &DeepBookPoolReferral): address {
    referral.owner
}
public fun balance_manager_referral_pool_id(referral: &DeepBookPoolReferral): ID {
    referral.pool_id
}

Copy

Use an Agent







Emitted when a new balance manager is created.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/balance_manager.move
/// Event emitted when a new balance_manager is created.
public struct BalanceManagerEvent has copy, drop {
    balance_manager_id: ID,
    owner: address,
}

Users can create limit or market orders, modify orders, and cancel orders. The BalanceManager must have the necessary funds to process orders. DeepBookV3 has four order options and three self matching options. If you set the pay_with_deep flag to true, trading fees are paid with the DEEP token. If you set the pay_with_deep flag to false, trading fees are paid with the input token.

Users can modify their existing order, reducing the size, lowering the expiration time, or both. Users cannot modify their order to increase their size or increase their expiration time. To do that, they must cancel the original order and place a new order.

Users can cancel a single order or cancel all of their orders.








Emitted when a maker order is filled.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/book/order_info.move
/// Emitted when a maker order is filled.
public struct OrderFilled has copy, drop, store {
    pool_id: ID,
    maker_order_id: u128,
    taker_order_id: u128,
    maker_client_order_id: u64,
    taker_client_order_id: u64,
    price: u64,
    taker_is_bid: bool,
    taker_fee: u64,
    taker_fee_is_deep: bool,
    maker_fee: u64,
    maker_fee_is_deep: bool,
    base_quantity: u64,
    quote_quantity: u64,
    maker_balance_manager_id: ID,
    taker_balance_manager_id: ID,
    timestamp: u64,
}


Emitted when a maker order is canceled.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/book/order.move
/// Emitted when a maker order is canceled.
public struct OrderCanceled has copy, drop, store {
    balance_manager_id: ID,
    pool_id: ID,
    order_id: u128,
    client_order_id: u64,
    trader: address,
    price: u64,
    is_bid: bool,
    original_quantity: u64,
    base_asset_quantity_canceled: u64,
    timestamp: u64,
}



Emitted when a maker order is modified.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/book/order.move
/// Emitted when a maker order is modified.
public struct OrderModified has copy, drop, store {
    balance_manager_id: ID,
    pool_id: ID,
    order_id: u128,
    client_order_id: u64,
    trader: address,
    price: u64,
    is_bid: bool,
    previous_quantity: u64,
    filled_quantity: u64,
    new_quantity: u64,
    timestamp: u64,
}



Emitted when a maker order is placed into the order book.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/book/order_info.move
/// Emitted when a maker order is injected into the order book.
public struct OrderPlaced has copy, drop, store {
    balance_manager_id: ID,
    pool_id: ID,
    order_id: u128,
    client_order_id: u64,
    trader: address,
    price: u64,
    is_bid: bool,
    placed_quantity: u64,
    expire_timestamp: u64,
    timestamp: u64,
}




Flash loans by definition are uncollateralized loans that are borrowed and repaid within the same programmable transaction
 block. Users can borrow flash loans in the base or quote asset from any DeepBookV3 pool. Flash loans return a FlashLoan hot potato (struct with no abilities), which must be returned back to the pool by the end of the call. The transaction is atomic, so the entire transaction fails if the loan is not returned.

The quantity borrowed can be the maximum amount that the pool owns. Borrowing from a pool and trading in the same pool can result in failures because trading requires the movement of funds. If the funds are borrowed, then there are no funds to move
.



Borrow base assets from the Pool. The function returns a hot potato, forcing the borrower to return the assets within the same transaction.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/pool.move
public fun borrow_flashloan_base<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    base_amount: u64,
    ctx: &mut TxContext,
): (Coin<BaseAsset>, FlashLoan) {
    let self = self.load_inner_mut();
    self.vault.borrow_flashloan_base(self.pool_id, base_amount, ctx)
}




Borrow quote assets from the Pool. The function returns a hot potato, forcing the borrower to return the assets within the same transaction.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/pool.move
public fun borrow_flashloan_quote<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    quote_amount: u64,
    ctx: &mut TxContext,
): (Coin<QuoteAsset>, FlashLoan) {
    let self = self.load_inner_mut();
    self.vault.borrow_flashloan_quote(self.pool_id, quote_amount, ctx)
}


Return the flash loaned base assets to the Pool. FlashLoan object
 is unwrapped only if the assets are returned, otherwise the transaction fails.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/pool.move
public fun return_flashloan_base<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    coin: Coin<BaseAsset>,
    flash_loan: FlashLoan,
) {
    let self = self.load_inner_mut();
    self.vault.return_flashloan_base(self.pool_id, coin, flash_loan);
}


Return the flash loaned quote assets to the Pool. FlashLoan object is unwrapped only if the assets are returned, otherwise the transaction fails.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/pool.move
public fun return_flashloan_quote<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    coin: Coin<QuoteAsset>,
    flash_loan: FlashLoan,
) {
    let self = self.load_inner_mut();
    self.vault.return_flashloan_quote(self.pool_id, coin, flash_loan);
}





DeepBook
 provides a swap-like interface commonly seen in automatic market makers (AMMs). Unlike the order functions, you can call swap_exact_amount without a BalanceManager. You call it directly with Coin objects instead. When swapping from base to quote, base_in must have a positive value while quote_in must be zero. When swapping from quote to base, quote_in must be positive and base_in zero. Some deep_in amount is required to pay for trading fees. You can overestimate this amount, as the unused DEEP tokens are returned at the end of the call.

You can use the get_amount_out endpoint to simulate a swap. The function returns the exact amount of DEEP tokens that the swap requires.





Swap exact base quantity without needing a balance_manager. DEEP quantity can be overestimated. Returns three Coin objects:

BaseAsset
QuoteAsset
DEEP
Some base quantity might be left over if the input quantity is not divisible by lot size.

You can overestimate the amount of DEEP required. The remaining balance is returned.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/pool.move
public fun swap_exact_base_for_quote<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    base_in: Coin<BaseAsset>,
    deep_in: Coin<DEEP>,
    min_quote_out: u64,
    clock: &Clock,
    ctx: &mut TxContext,
): (Coin<BaseAsset>, Coin<QuoteAsset>, Coin<DEEP>) {
    let quote_in = coin::zero(ctx);

    self.swap_exact_quantity(
        base_in,
        quote_in,
        deep_in,
        min_quote_out,
        clock,
        ctx,
    )
}





Swap exact quote quantity without needing a balance_manager. You can overestimate DEEP quantity. Returns three Coin objects:

BaseAsset
QuoteAsset
DEEP
Some quote quantity could be left over if the input quantity is not divisible by lot size.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/pool.move
public fun swap_exact_quote_for_base<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    quote_in: Coin<QuoteAsset>,
    deep_in: Coin<DEEP>,
    min_base_out: u64,
    clock: &Clock,
    ctx: &mut TxContext,
): (Coin<BaseAsset>, Coin<QuoteAsset>, Coin<DEEP>) {
    let base_in = coin::zero(ctx);

    self.swap_exact_quantity(
        base_in,
        quote_in,
        deep_in,
        min_base_out,
        clock,
        ctx,
    )
}









This function is what the previous two functions call with coin::zero() set for the third coin. Users can call this directly for base → quote or quote → base as long as base or quote have a zero value.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/pool.move
public fun swap_exact_quantity<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    base_in: Coin<BaseAsset>,
    quote_in: Coin<QuoteAsset>,
    deep_in: Coin<DEEP>,
    min_out: u64,
    clock: &Clock,
    ctx: &mut TxContext,
): (Coin<BaseAsset>, Coin<QuoteAsset>, Coin<DEEP>) {
    let mut base_quantity = base_in.value();
    let quote_quantity = quote_in.value();
    let taker_fee = self.load_inner().state.governance().trade_params().taker_fee();
    let input_fee_rate = math::mul(
        taker_fee,
        constants::fee_penalty_multiplier(),
    );
    assert!((base_quantity > 0) != (quote_quantity > 0), EInvalidQuantityIn);

    let pay_with_deep = deep_in.value() > 0;
    let is_bid = quote_quantity > 0;
    if (is_bid) {
        (base_quantity, _, _) = if (pay_with_deep) {
            self.get_quantity_out(0, quote_quantity, clock)
        } else {
            self.get_quantity_out_input_fee(0, quote_quantity, clock)
        }
    } else {
        if (!pay_with_deep) {
            base_quantity =
                math::div(
                    base_quantity,
                    constants::float_scaling() + input_fee_rate,
                );
        }
    };
    base_quantity = base_quantity - base_quantity % self.load_inner().book.lot_size();
    if (base_quantity < self.load_inner().book.min_size()) {
        return (base_in, quote_in, deep_in)
    };

    let mut temp_balance_manager = balance_manager::new(ctx);
    let trade_proof = temp_balance_manager.generate_proof_as_owner(ctx);
    temp_balance_manager.deposit(base_in, ctx);
    temp_balance_manager.deposit(quote_in, ctx);
    temp_balance_manager.deposit(deep_in, ctx);

    self.place_market_order(
        &mut temp_balance_manager,
        &trade_proof,
        0,
        constants::self_matching_allowed(),
        base_quantity,
        is_bid,
        pay_with_deep,
        clock,
        ctx,
    );

    let base_out = temp_balance_manager.withdraw_all<BaseAsset>(ctx);
    let quote_out = temp_balance_manager.withdraw_all<QuoteAsset>(ctx);
    let deep_out = temp_balance_manager.withdraw_all<DEEP>(ctx);

    if (is_bid) {
        assert!(base_out.value() >= min_out, EMinimumQuantityOutNotMet);
    } else {
        assert!(quote_out.value() >= min_out, EMinimumQuantityOutNotMet);
    };

    temp_balance_manager.delete();

    (base_out, quote_out, deep_out)
}





Swap exact base for quote using a BalanceManager. Assumes fees are paid in DEEP. Assumes balance manager has enough DEEP for fees. Returns two Coin objects: base and quote.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/pool.move
public fun swap_exact_base_for_quote_with_manager<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    balance_manager: &mut BalanceManager,
    trade_cap: &TradeCap,
    deposit_cap: &DepositCap,
    withdraw_cap: &WithdrawCap,
    base_in: Coin<BaseAsset>,
    min_quote_out: u64,
    clock: &Clock,
    ctx: &mut TxContext,
): (Coin<BaseAsset>, Coin<QuoteAsset>) {
    let quote_in = coin::zero(ctx);

    self.swap_exact_quantity_with_manager(
        balance_manager,
        trade_cap,
        deposit_cap,
        withdraw_cap,
        base_in,
        quote_in,
        min_quote_out,
        clock,
        ctx,
    )
}





Swap exact quote for base using a BalanceManager. Assumes fees are paid in DEEP. Assumes balance manager has enough DEEP for fees. Returns two Coin objects: base and quote.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/pool.move
public fun swap_exact_quote_for_base_with_manager<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    balance_manager: &mut BalanceManager,
    trade_cap: &TradeCap,
    deposit_cap: &DepositCap,
    withdraw_cap: &WithdrawCap,
    quote_in: Coin<QuoteAsset>,
    min_base_out: u64,
    clock: &Clock,
    ctx: &mut TxContext,
): (Coin<BaseAsset>, Coin<QuoteAsset>) {
    let base_in = coin::zero(ctx);

    self.swap_exact_quantity_with_manager(
        balance_manager,
        trade_cap,
        deposit_cap,
        withdraw_cap,
        base_in,
        quote_in,
        min_base_out,
        clock,
        ctx,
    )
}




Swap exact quantity using a BalanceManager. This is the underlying function that the two manager-based swap functions call. Assumes fees are paid in DEEP and that the balance manager has sufficient DEEP for fees. Returns two Coin objects: base and quote.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/pool.move
public fun swap_exact_quantity_with_manager<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    balance_manager: &mut BalanceManager,
    trade_cap: &TradeCap,
    deposit_cap: &DepositCap,
    withdraw_cap: &WithdrawCap,
    base_in: Coin<BaseAsset>,
    quote_in: Coin<QuoteAsset>,
    min_out: u64,
    clock: &Clock,
    ctx: &mut TxContext,
): (Coin<BaseAsset>, Coin<QuoteAsset>) {
    let mut adjusted_base_quantity = base_in.value();
    let base_quantity = base_in.value();
    let quote_quantity = quote_in.value();
    assert!((adjusted_base_quantity > 0) != (quote_quantity > 0), EInvalidQuantityIn);

    let is_bid = quote_quantity > 0;
    if (is_bid) {
        (adjusted_base_quantity, _, _) = self.get_quantity_out(0, quote_quantity, clock)
    } else {
        adjusted_base_quantity =
            adjusted_base_quantity - adjusted_base_quantity % self.load_inner().book.lot_size();
    };
    if (adjusted_base_quantity < self.load_inner().book.min_size()) {
        return (base_in, quote_in)
    };

    balance_manager.deposit_with_cap(deposit_cap, base_in, ctx);
    balance_manager.deposit_with_cap(deposit_cap, quote_in, ctx);
    let trade_proof = balance_manager.generate_proof_as_trader(trade_cap, ctx);
    let order_info = self.place_market_order(
        balance_manager,
        &trade_proof,
        0,
        constants::self_matching_allowed(),
        adjusted_base_quantity,
        is_bid,
        true,
        clock,
        ctx,
    );

    let (base_out_quantity, quote_out_quantity) = if (is_bid) {
        let quote_left = quote_quantity - order_info.cumulative_quote_quantity();
        (order_info.executed_quantity(), quote_left)
    } else {
        let base_left = base_quantity - order_info.executed_quantity();
        (base_left, order_info.cumulative_quote_quantity())
    };

    let base_out = if (base_out_quantity > 0) {
        balance_manager.withdraw_with_cap(withdraw_cap, base_out_quantity, ctx)
    } else {
        coin::zero(ctx)
    };
    let quote_out = if (quote_out_quantity > 0) {
        balance_manager.withdraw_with_cap(withdraw_cap, quote_out_quantity, ctx)
    } else {
        coin::zero(ctx)
    };

    if (is_bid) {
        assert!(base_out.value() >= min_out, EMinimumQuantityOutNotMet);
    } else {
        assert!(quote_out.value() >= min_out, EMinimumQuantityOutNotMet);
    };

    (base_out, quote_out)
}




Staking and Governance
DeepBook
's novel approach to governance allows users to update a single pool's three parameters:

Taker fee rate
Maker fee rate
Stake required
Stake required is the amount of DEEP tokens a user must have staked in the pool to take advantage of taker and maker incentives. Each individual DeepBook pool has independent governance, and governance can be conducted every epoch
. See Design to learn more about governance.

DeepBook Governance Timeline.png




DEEP tokens must be available in the balance_manager for staking. A user's stake becomes active in the following epoch. If the user's active stake is greater than the stake required, the user can get reduced taker fees and can accumulate trading fee rebates during that epoch.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/pool.move
public fun stake<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    balance_manager: &mut BalanceManager,
    trade_proof: &TradeProof,
    amount: u64,
    ctx: &TxContext,
) {
    assert!(amount > 0, EInvalidStake);
    let self = self.load_inner_mut();
    let (settled, owed) = self.state.process_stake(self.pool_id, balance_manager.id(), amount, ctx);
    self.vault.settle_balance_manager(settled, owed, balance_manager, trade_proof);
}All of the user's active and inactive stake are removed and added back into the BalanceManager. Any casted votes are removed. Maker rebates for the epoch are forfeited, and any reduced taker fees for the remaining epoch are disabled.

The balance_manager must have enough staked DEEP tokens. The balance_manager data is updated with the unstaked amount. Balance is transferred to the balance_manager immediately.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/pool.move
public fun unstake<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    balance_manager: &mut BalanceManager,
    trade_proof: &TradeProof,
    ctx: &TxContext,
) {
    let self = self.load_inner_mut();
    let (settled, owed) = self.state.process_unstake(self.pool_id, balance_manager.id(), ctx);
    self.vault.settle_balance_manager(settled, owed, balance_manager, trade_proof);
}





Users with a nonzero active stake can submit proposals. One proposal per user. The user automatically votes for the proposal they submit.

Submit a proposal to change the taker fee, maker fee, and stake required. The balance_manager must have enough staked DEEP tokens to participate. Each balance_manager can only submit one proposal per epoch. If the maximum proposal is reached, the proposal with the lowest vote is removed. If the balance_manager has less voting power than the lowest voted proposal, the proposal is not added.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/pool.move
public fun submit_proposal<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    balance_manager: &mut BalanceManager,
    trade_proof: &TradeProof,
    taker_fee: u64,
    maker_fee: u64,
    stake_required: u64,
    ctx: &TxContext,
) {
    let self = self.load_inner_mut();
    balance_manager.validate_proof(trade_proof);
    self
        .state
        .process_proposal(
            self.pool_id,
            balance_manager.id(),
            taker_fee,
            maker_fee,
            stake_required,
            ctx,
        );
}

Copy

Use an Agent
Related



Users with nonzero voting power can vote on a proposal. All voting power is used on a single proposal. If the user has voted on a different proposal during this epoch, then that vote is removed and recasted into the new proposal. The balance_manager must have enough staked DEEP tokens to participate.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/pool.move
public fun vote<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    balance_manager: &mut BalanceManager,
    trade_proof: &TradeProof,
    proposal_id: ID,
    ctx: &TxContext,
) {
    let self = self.load_inner_mut();
    balance_manager.validate_proof(trade_proof);
    self.state.process_vote(self.pool_id, balance_manager.id(), proposal_id, ctx);
}






Use claim_rebates to claim the rewards for the balance_manager. The balance_manager must have rewards to claim. The balance_manager data is updated with the claimed rewards.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/pool.move
public fun claim_rebates<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    balance_manager: &mut BalanceManager,
    trade_proof: &TradeProof,
    ctx: &TxContext,
) {
    let self = self.load_inner_mut();
    let (settled, owed) = self
        .state
        .process_claim_rebates<BaseAsset, QuoteAsset>(
            self.pool_id,
            balance_manager,
            ctx,
        );
    self.vault.settle_balance_manager(settled, owed, balance_manager, trade_proof);
}


Permissionless Pool Creation
The Pool shared object
 represents a market, such as a SUI/USDC market. That Pool is the only one representing that unique pairing (SUI/USDC) and the pairing is the only member of that particular Pool. See DeepBookV3 Design to learn more about the structure of pools.



 The create_permissionless_pool() function creates a Pool

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/pool.move
public fun create_permissionless_pool<BaseAsset, QuoteAsset>(
    registry: &mut Registry,
    tick_size: u64,
    lot_size: u64,
    min_size: u64,
    creation_fee: Coin<DEEP>,
    ctx: &mut TxContext,
): ID {
    assert!(creation_fee.value() == constants::pool_creation_fee(), EInvalidFee);
    let base_type = type_name::with_defining_ids<BaseAsset>();
    let quote_type = type_name::with_defining_ids<QuoteAsset>();
    let whitelisted_pool = false;
    let stable_pool = registry.is_stablecoin(base_type) && registry.is_stablecoin(quote_type);

    create_pool<BaseAsset, QuoteAsset>(
        registry,
        tick_size,
        lot_size,
        min_size,
        creation_fee,
        whitelisted_pool,
        stable_pool,
        ctx,
    )
}


Tick size should be 10^(9 - base_decimals + quote_decimals - decimal_desired). For example, if creating a SUI(9 decimals)/USDC(6 decimals) pool, with a desired decimal of 3 for tick size (0.001), tick size should be 10^(9 - 9 + 6 - 3) = 10^(3) = 1000.

Decimal desired should be at most 1bps, or 0.01%, of the price between base and quote asset. For example, if 3 decimals is the target, 0.001 (three decimals) / price should be less than or equal to 0.0001. Consider a lower tick size for pools where both base and quote assets are stablecoins.

Lot size is in MIST
 of the base asset, and should be approximately $0.01 to $0.10 nominal of the base asset. Lot size must be a power of 10, and less than or equal to min size. Lot size should also be greater than or equal to 1,000.

Min size is in MIST of the base asset, and should be approximately $0.10 to $1.00 nominal of the base asset. Min size must be a power of 10, and larger than or equal to lot size.

Creation fee is 500 DEEP tokens.



The add_deep_price_point() function allows for the calculation of DEEP price and correct collection of fees in DEEP.

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/pool.move
public fun add_deep_price_point<BaseAsset, QuoteAsset, ReferenceBaseAsset, ReferenceQuoteAsset>(
    target_pool: &mut Pool<BaseAsset, QuoteAsset>,
    reference_pool: &Pool<ReferenceBaseAsset, ReferenceQuoteAsset>,
    clock: &Clock,
) {
    assert!(
        reference_pool.whitelisted() && reference_pool.registered_pool(),
        EIneligibleReferencePool,
    );
    let reference_pool_price = reference_pool.mid_price(clock);

    let target_pool = target_pool.load_inner_mut();
    let reference_base_type = type_name::with_defining_ids<ReferenceBaseAsset>();
    let reference_quote_type = type_name::with_defining_ids<ReferenceQuoteAsset>();
    let target_base_type = type_name::with_defining_ids<BaseAsset>();
    let target_quote_type = type_name::with_defining_ids<QuoteAsset>();
    let deep_type = type_name::with_defining_ids<DEEP>();
    let timestamp = clock.timestamp_ms();

    assert!(
        reference_base_type == deep_type || reference_quote_type == deep_type,
        EIneligibleTargetPool,
    );

    let reference_deep_is_base = reference_base_type == deep_type;
    let reference_other_type = if (reference_deep_is_base) {
        reference_quote_type
    } else {
        reference_base_type
    };
    let reference_other_is_target_base = reference_other_type == target_base_type;
    let reference_other_is_target_quote = reference_other_type == target_quote_type;
    assert!(
        reference_other_is_target_base || reference_other_is_target_quote,
        EIneligibleTargetPool,
    );

    let deep_per_reference_other_price = if (reference_deep_is_base) {
        math::div(1_000_000_000, reference_pool_price)
    } else {
        reference_pool_price
    };
    assert!(deep_per_reference_other_price > 0, EInvalidDeepPrice);

    target_pool
        .deep_price
        .add_price_point(
            deep_per_reference_other_price,
            timestamp,
            reference_other_is_target_base,
        );
    emit_deep_price_added(
        deep_per_reference_other_price,
        timestamp,
        reference_other_is_target_base,
        reference_pool.load_inner().pool_id,
        target_pool.pool_id,
    );
}

Copy

Use an Agent
All pools support input token fees. To allow a permissionless pool to pay fees in DEEP, which has a 20% discount compared to input token fees, two conditions must be met:

Either the base or quote asset must be USDC or SUI.
To calculate DEEP fees accurately, you must set up a cron job to call the add_deep_price_point() function on the pool every 1-10 minutes.
For a pool with USDC as an asset, use the DEEP/USDC pool at 0xf948981b806057580f91622417534f491da5f61aeaf33d0ed8e69fd5691c95ce as the reference pool.

For a pool with SUI as an asset, use the DEEP/SUI pool at 0xb663828d6217467c8a1838a03793da896cbe745b150ebd57d82f814ca579fc22 as the reference pool.





The update_pool_allowed_versions() function takes a pool and the registry, and updates the allowed contract versions within the pool. This is very important after contract upgrades to ensure the newest contract can be used on the pool. This is the permissionless equivalent of update_allowed_versions().

github.com/MystenLabs/deepbookv3/packages/deepbook/sources/pool.move
public fun update_pool_allowed_versions<BaseAsset, QuoteAsset>(
    self: &mut Pool<BaseAsset, QuoteAsset>,
    registry: &Registry,
) {
    let allowed_versions = registry.allowed_versions();
    let inner: &mut PoolInner<BaseAsset, QuoteAsset> = self.inner.load_value_mut();
    inner.allowed_versions = allowed_versions;
}



Query the Pool
The Pool shared object
 represents a market, such as a SUI/USDC market. That Pool is the only one representing that unique pairing (SUI/USDC) and the pairing is the only member of that particular Pool. See DeepBookV3 Design to learn more about the structure of pools.

To perform trades, you pass a BalanceManager and TradeProof into the relevant Pool. Unlike Pools, BalanceManager shared objects can contain any type of token, such that the same BalanceManager can access multiple Pools to interact with many different trade pairings. See BalanceManager to learn more.

API




Referrals
The DeepBook
 referral system allows users to earn fees by referring traders to the platform. Referrers can mint a DeepBookPoolReferral object
 for a specific pool, and traders can associate their BalanceManager with a referral. When traders with an associated referral execute trades, a portion of their trading fees is allocated to the referrer based on the referral multiplier.

How referrals work
Mint a referral: Anyone can mint a DeepBookPoolReferral for a specific pool with a specified multiplier. The referral is permanently tied to the pool it was minted from and can only earn fees from trades in that pool.
Set referral: Traders associate their BalanceManager with a pool-specific referral using a TradeCap. Each BalanceManager can be associated with different referrals from different pools simultaneously.
Earn fees: When taker orders are executed by the balance manager in that pool, referral fees are automatically allocated based on the multiplier. Maker orders do not generate referral fees.
Claim rewards: Referrers can claim their accumulated fees in base, quote, and DEEP tokens.
