/// Module: compliance
/// GhostPay Compliance — view-key management and access logging for selective disclosure.
/// Enables users to share encrypted data with auditors / compliance officers
/// via view-keys without exposing their entire financial history.
module ghostpay::compliance {

    use std::string::{Self, String};
    use sui::clock::{Self, Clock};
    use sui::event;
    use ghostpay::agent::{Self, Agent, AgentCap};

    // === Errors ===
    const ENotOwner: u64 = 1;
    const ENotAuthorized: u64 = 2;
    const EInvalidDuration: u64 = 3;
    const EViewKeyExpired: u64 = 4;
    const EAgentInactive: u64 = 5;

    // === Structs ===

    /// A view-key that grants an auditor/compliance officer access to specific data.
    public struct ViewKey has key, store {
        id: UID,
        /// ID of the agent granting access
        agent_id: ID,
        /// The address that can use this view-key
        viewer: address,
        /// Label for this view-key (e.g., "Annual Audit 2026")
        label: String,
        /// Timestamp when created
        created_at: u64,
        /// Timestamp when this view-key expires
        expires_at: u64,
        /// Whether the view-key is active or revoked
        active: bool,
    }

    /// An access log entry recording when someone viewed data via a view-key.
    public struct AccessLogEntry has key, store {
        id: UID,
        /// Agent ID that was accessed
        agent_id: ID,
        /// The viewer who accessed the data
        viewer: address,
        /// The specific data reference or memory seq that was accessed
        data_ref: String,
        /// Timestamp of access
        timestamp: u64,
        /// Purpose or reason for access
        purpose: String,
    }

    // === Events ===

    /// Emitted when a view-key is created.
    public struct ViewKeyCreatedEvent has copy, drop {
        agent_id: ID,
        view_key_id: ID,
        viewer: address,
        expires_at: u64,
    }

    /// Emitted when a view-key is revoked.
    public struct ViewKeyRevokedEvent has copy, drop {
        agent_id: ID,
        view_key_id: ID,
    }

    /// Emitted when data is accessed for compliance.
    public struct DataAccessedEvent has copy, drop {
        agent_id: ID,
        viewer: address,
        data_ref: String,
        timestamp: u64,
    }

    /// Emitted when SEAL approve is called for decryption.
    public struct SealApprovalEvent has copy, drop {
        agent_id: ID,
        viewer: address,
        data_ref: String,
        timestamp: u64,
    }

    // === Public Functions ===

    /// SEAL approval function — called by the SEAL SDK via txBytes during decryption.
    /// The SDK looks for any function named `seal_approve*` in the transaction bytes
    /// to verify the user has authorized decryption.
    public fun seal_approve(
        agent: &Agent,
        viewer: address,
        data_ref: String,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let sender = ctx.sender();
        let is_owner = sender == agent::owner(agent);
        let is_viewer = sender == viewer;
        assert!(is_owner || is_viewer, ENotAuthorized);

        let now = clock::timestamp_ms(clock);
        event::emit(SealApprovalEvent {
            agent_id: agent::agent_id(agent),
            viewer,
            data_ref,
            timestamp: now,
        });
    }

    /// Create a view-key granting a viewer access to the agent's compliance data.
    /// Only the agent owner can create view-keys.
    public fun create_view_key(
        agent: &Agent,
        viewer: address,
        label: String,
        duration_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ): ViewKey {
        assert!(agent::owner(agent) == ctx.sender(), ENotOwner);
        assert!(agent::is_active(agent), EAgentInactive);
        assert!(duration_ms > 0, EInvalidDuration);

        let now = clock::timestamp_ms(clock);
        let view_key = ViewKey {
            id: object::new(ctx),
            agent_id: agent::agent_id(agent),
            viewer,
            label,
            created_at: now,
            expires_at: now + duration_ms,
            active: true,
        };

        event::emit(ViewKeyCreatedEvent {
            agent_id: agent::agent_id(agent),
            view_key_id: object::id(&view_key),
            viewer,
            expires_at: view_key.expires_at,
        });

        view_key
    }

    /// Revoke a view-key before it expires. Only the agent owner can do this.
    public fun revoke_view_key(
        view_key: &mut ViewKey,
        agent: &Agent,
        _ctx: &TxContext,
    ) {
        assert!(agent::owner(agent) == _ctx.sender(), ENotOwner);
        assert!(view_key.active, EViewKeyExpired);

        view_key.active = false;

        event::emit(ViewKeyRevokedEvent {
            agent_id: agent::agent_id(agent),
            view_key_id: object::id(view_key),
        });
    }

    /// Log an access event. Can be called by the viewer or the agent owner.
    public fun log_access(
        agent: &Agent,
        viewer: address,
        data_ref: String,
        purpose: String,
        clock: &Clock,
        ctx: &mut TxContext,
    ): AccessLogEntry {
        let sender = ctx.sender();
        let is_authorized = sender == agent::owner(agent) || sender == viewer;
        assert!(is_authorized, ENotAuthorized);

        let now = clock::timestamp_ms(clock);
        let entry = AccessLogEntry {
            id: object::new(ctx),
            agent_id: agent::agent_id(agent),
            viewer,
            data_ref,
            timestamp: now,
            purpose,
        };

        event::emit(DataAccessedEvent {
            agent_id: agent::agent_id(agent),
            viewer,
            data_ref,
            timestamp: now,
        });

        entry
    }

    // === View Functions ===

    public fun view_key_viewer(view_key: &ViewKey): address {
        view_key.viewer
    }

    public fun view_key_label(view_key: &ViewKey): String {
        view_key.label
    }

    public fun view_key_is_active(view_key: &ViewKey): bool {
        view_key.active
    }

    public fun view_key_expires_at(view_key: &ViewKey): u64 {
        view_key.expires_at
    }

    public fun view_key_agent_id(view_key: &ViewKey): ID {
        view_key.agent_id
    }

    public fun access_log_viewer(entry: &AccessLogEntry): address {
        entry.viewer
    }

    public fun access_log_data_ref(entry: &AccessLogEntry): String {
        entry.data_ref
    }

    public fun access_log_timestamp(entry: &AccessLogEntry): u64 {
        entry.timestamp
    }

    public fun access_log_purpose(entry: &AccessLogEntry): String {
        entry.purpose
    }
}
