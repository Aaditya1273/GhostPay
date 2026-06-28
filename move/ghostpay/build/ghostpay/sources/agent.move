/// Module: agent
/// GhostPay Agent — an owned Sui object that represents a user's autonomous agent.
/// Each agent has an identity (email, display name), a wallet, and capabilities
/// for payments, memory storage, and compliance.
module ghostpay::agent {

    use std::string::{Self, String};
    use sui::clock::{Self, Clock};
    use sui::event;
    use sui::object::{Self, UID, ID};

    // === Errors ===
    const ENotOwner: u64 = 1;
    const ENotAuthorized: u64 = 4;

    // === Structs ===

    /// The core Agent object. This is an owned object transferred to the user.
    public struct Agent has key, store {
        id: UID,
        /// The address that owns this agent
        owner: address,
        /// Display name set by the user
        display_name: String,
        /// Email hash (SHA256 of email, for privacy)
        email_hash: String,
        /// Timestamp when the agent was created (epoch ms)
        created_at: u64,
        /// Monotonic counter for payment sequence numbers
        payment_seq: u64,
        /// Monotonic counter for memory record IDs
        memory_seq: u64,
        /// Whether the agent is active (can be frozen)
        active: bool,
    }

    /// A capability granting the holder permission to act on behalf of an agent.
    public struct AgentCap has key, store {
        id: UID,
        agent_id: ID,
        granted_to: address,
        expires_at: u64,
    }

    /// Metadata about the GhostPay global state (singleton).
    public struct GhostPayState has key {
        id: UID,
        total_agents: u64,
        admin: address,
        paused: bool,
    }

    // === Events ===

    /// Emitted when a new agent is created.
    public struct AgentCreatedEvent has copy, drop {
        agent_id: ID,
        owner: address,
        created_at: u64,
    }

    /// Emitted when an agent's display name is updated.
    public struct AgentUpdatedEvent has copy, drop {
        agent_id: ID,
        new_display_name: String,
    }

    /// Emitted when an agent is deactivated.
    public struct AgentDeactivatedEvent has copy, drop {
        agent_id: ID,
    }

    // === Public Functions ===

    /// Initialize the global GhostPay state. Called once at publish.
    fun init(ctx: &mut TxContext) {
        let admin = ctx.sender();
        transfer::share_object(GhostPayState {
            id: object::new(ctx),
            total_agents: 0,
            admin,
            paused: false,
        });
    }

    /// Create a new agent for the caller. Each address can own multiple agents.
    public fun create_agent(
        display_name: String,
        email_hash: String,
        state: &mut GhostPayState,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Agent {
        let owner = ctx.sender();
        let now = clock::timestamp_ms(clock);
        let agent = Agent {
            id: object::new(ctx),
            owner,
            display_name,
            email_hash,
            created_at: now,
            payment_seq: 0,
            memory_seq: 0,
            active: true,
        };

        state.total_agents = state.total_agents + 1;

        event::emit(AgentCreatedEvent {
            agent_id: object::id(&agent),
            owner,
            created_at: now,
        });

        agent
    }

    /// Update the agent's display name. Only the owner can do this.
    public fun update_display_name(
        agent: &mut Agent,
        new_name: String,
        _ctx: &TxContext,
    ) {
        assert!(agent.active, ENotOwner);
        assert!(agent.owner == _ctx.sender(), ENotOwner);
        agent.display_name = new_name;
        event::emit(AgentUpdatedEvent {
            agent_id: object::id(agent),
            new_display_name: new_name,
        });
    }

    /// Deactivate an agent. Only the owner can do this.
    public fun deactivate_agent(
        agent: &mut Agent,
        _ctx: &TxContext,
    ) {
        assert!(agent.owner == _ctx.sender(), ENotOwner);
        agent.active = false;
        event::emit(AgentDeactivatedEvent {
            agent_id: object::id(agent),
        });
    }

    /// Grant a capability to another address.
    public fun grant_capability(
        agent: &Agent,
        grantee: address,
        duration_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ): AgentCap {
        assert!(agent.owner == ctx.sender(), ENotOwner);
        assert!(agent.active, ENotAuthorized);
        let now = clock::timestamp_ms(clock);
        AgentCap {
            id: object::new(ctx),
            agent_id: object::id(agent),
            granted_to: grantee,
            expires_at: now + duration_ms,
        }
    }

    // === View Functions ===

    public fun is_active(agent: &Agent): bool {
        agent.active
    }

    public fun owner(agent: &Agent): address {
        agent.owner
    }

    public fun agent_id(agent: &Agent): ID {
        object::id(agent)
    }

    public fun payment_seq(agent: &Agent): u64 {
        agent.payment_seq
    }

    public fun memory_seq(agent: &Agent): u64 {
        agent.memory_seq
    }

    /// Increment payment sequence (called by payment module).
    public(package) fun increment_payment_seq(agent: &mut Agent): u64 {
        agent.payment_seq = agent.payment_seq + 1;
        agent.payment_seq
    }

    /// Increment memory sequence (called by memory module).
    public(package) fun increment_memory_seq(agent: &mut Agent): u64 {
        agent.memory_seq = agent.memory_seq + 1;
        agent.memory_seq
    }

    /// Assert the sender is the agent owner or has a valid capability.
    public fun assert_authorized(
        agent: &Agent,
        cap: &AgentCap,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let sender = ctx.sender();
        let is_owner = agent.owner == sender;
        let has_cap = cap.agent_id == object::id(agent)
            && cap.granted_to == sender
            && cap.expires_at >= clock::timestamp_ms(clock);
        assert!(is_owner || has_cap, ENotAuthorized);
    }
}
