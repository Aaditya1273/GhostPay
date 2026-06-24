/// Module: payment
/// GhostPay Payment — records payments made by an Agent.
/// Each payment emits an event for the frontend indexer and stores
/// a receipt object with amount, currency, recipient, and metadata.
module ghostpay::payment {

    use std::string::{Self, String};
    use std::option::Option;
    use sui::clock::{Self, Clock};
    use sui::event;
    use ghostpay::agent::{Self, Agent, AgentCap};

    // === Errors ===
    const EAgentInactive: u64 = 1;
    const EZeroAmount: u64 = 2;
    const ENotAuthorized: u64 = 3;

    // === Structs ===

    /// A payment receipt stored as a dynamic child object of the Agent.
    public struct PaymentReceipt has key, store {
        id: UID,
        /// Sequential ID within the agent's payment history
        seq: u64,
        /// Timestamp when the payment was made (epoch ms)
        timestamp: u64,
        /// Amount in the smallest unit (e.g., cents for USDC)
        amount: u64,
        /// Currency identifier string (e.g., "USDC", "SUI")
        currency: String,
        /// Recipient address
        recipient: address,
        /// Optional memo / description
        memo: String,
        /// Status: "pending", "completed", "failed", "refunded"
        status: String,
        /// Optional blob ID for encrypted receipt on Walrus
        receipt_blob_id: Option<String>,
    }

    // === Events ===

    /// Emitted when a payment is initiated.
    public struct PaymentInitiatedEvent has copy, drop {
        agent_id: ID,
        seq: u64,
        amount: u64,
        currency: String,
        recipient: address,
        timestamp: u64,
    }

    /// Emitted when a payment status changes.
    public struct PaymentStatusChangedEvent has copy, drop {
        agent_id: ID,
        seq: u64,
        new_status: String,
    }

    // === Public Functions ===

    /// Record a new payment initiated by the agent.
    /// Requires either the agent owner or a valid capability holder.
    public fun record_payment(
        agent: &mut Agent,
        amount: u64,
        currency: String,
        recipient: address,
        memo: String,
        receipt_blob_id: Option<String>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): PaymentReceipt {
        assert!(agent::is_active(agent), EAgentInactive);
        assert!(amount > 0, EZeroAmount);
        assert!(agent::owner(agent) == ctx.sender(), ENotAuthorized);

        let seq = agent::increment_payment_seq(agent);
        let now = clock::timestamp_ms(clock);

        let receipt = PaymentReceipt {
            id: object::new(ctx),
            seq,
            timestamp: now,
            amount,
            currency,
            recipient,
            memo,
            status: string::utf8(b"completed"),
            receipt_blob_id,
        };

        event::emit(PaymentInitiatedEvent {
            agent_id: agent::agent_id(agent),
            seq,
            amount: receipt.amount,
            currency: receipt.currency,
            recipient: receipt.recipient,
            timestamp: now,
        });

        receipt
    }

    /// Record a payment using an AgentCap (delegated authority).
    public fun record_payment_with_cap(
        agent: &mut Agent,
        cap: &AgentCap,
        amount: u64,
        currency: String,
        recipient: address,
        memo: String,
        receipt_blob_id: Option<String>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): PaymentReceipt {
        agent::assert_authorized(agent, cap, clock, ctx);
        assert!(agent::is_active(agent), EAgentInactive);
        assert!(amount > 0, EZeroAmount);

        let seq = agent::increment_payment_seq(agent);
        let now = clock::timestamp_ms(clock);

        let receipt = PaymentReceipt {
            id: object::new(ctx),
            seq,
            timestamp: now,
            amount,
            currency,
            recipient,
            memo,
            status: string::utf8(b"completed"),
            receipt_blob_id,
        };

        event::emit(PaymentInitiatedEvent {
            agent_id: agent::agent_id(agent),
            seq,
            amount: receipt.amount,
            currency: receipt.currency,
            recipient: receipt.recipient,
            timestamp: now,
        });

        receipt
    }

    /// Update the status of a payment (e.g., refunded, failed).
    public fun update_payment_status(
        receipt: &mut PaymentReceipt,
        new_status: String,
        agent: &Agent,
        _ctx: &TxContext,
    ) {
        assert!(agent::owner(agent) == _ctx.sender(), ENotAuthorized);
        receipt.status = new_status;

        event::emit(PaymentStatusChangedEvent {
            agent_id: agent::agent_id(agent),
            seq: receipt.seq,
            new_status: receipt.status,
        });
    }

    // === View Functions ===

    public fun payment_amount(receipt: &PaymentReceipt): u64 {
        receipt.amount
    }

    public fun payment_currency(receipt: &PaymentReceipt): String {
        receipt.currency
    }

    public fun payment_recipient(receipt: &PaymentReceipt): address {
        receipt.recipient
    }

    public fun payment_status(receipt: &PaymentReceipt): String {
        receipt.status
    }

    public fun payment_timestamp(receipt: &PaymentReceipt): u64 {
        receipt.timestamp
    }

    public fun payment_seq_number(receipt: &PaymentReceipt): u64 {
        receipt.seq
    }

    public fun payment_memo(receipt: &PaymentReceipt): String {
        receipt.memo
    }
}
