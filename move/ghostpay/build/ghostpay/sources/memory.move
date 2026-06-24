/// Module: memory
/// GhostPay Memory — stores Walrus blob references on-chain with encryption metadata.
/// Each memory record is a child object of the Agent, containing the Walrus blob ID,
/// data type classification, and optional SEAL encrypted symmetric key.
module ghostpay::memory {

    use std::string::{Self, String};
    use sui::clock::{Self, Clock};
    use sui::event;
    use ghostpay::agent::{Self, Agent, AgentCap};

    // === Errors ===
    const EAgentInactive: u64 = 1;
    const ENotAuthorized: u64 = 2;
    const EBlobTooLong: u64 = 3;
    const EDataTooLong: u64 = 4;

    // === Constants ===
    const MAX_BLOB_ID_LEN: u64 = 200;
    const MAX_DATA_TYPE_LEN: u64 = 50;

    // === Structs ===

    /// A Walrus blob reference stored on-chain as a child of the Agent.
    public struct MemoryRecord has key, store {
        id: UID,
        /// Sequential ID within the agent's memory records
        seq: u64,
        /// The Walrus blob ID (hex-encoded)
        blob_id: String,
        /// Data type classification ("payslip", "kyc", "config", "receipt", "report", etc.)
        data_type: String,
        /// Timestamp when stored (epoch ms)
        timestamp: u64,
        /// Visibility: "private" (default), "shared", "shared_with_auditor"
        visibility: String,
        /// Size of the original data in bytes
        data_size: u64,
        /// Optional descriptive label
        label: String,
    }

    // === Events ===

    /// Emitted when a memory record is created.
    public struct MemoryStoredEvent has copy, drop {
        agent_id: ID,
        seq: u64,
        blob_id: String,
        data_type: String,
        timestamp: u64,
    }

    /// Emitted when a memory record's visibility changes.
    public struct MemoryVisibilityChangedEvent has copy, drop {
        agent_id: ID,
        seq: u64,
        new_visibility: String,
    }

    // === Public Functions ===

    /// Store a memory record on-chain with a reference to a Walrus blob.
    /// Only the agent owner or a capability holder can do this.
    public fun store_memory(
        agent: &mut Agent,
        blob_id: String,
        data_type: String,
        visibility: String,
        data_size: u64,
        label: String,
        clock: &Clock,
        ctx: &mut TxContext,
    ): MemoryRecord {
        assert!(agent::is_active(agent), EAgentInactive);
        assert!(agent::owner(agent) == ctx.sender(), ENotAuthorized);
        assert!(string::length(&blob_id) <= MAX_BLOB_ID_LEN, EBlobTooLong);
        assert!(string::length(&data_type) <= MAX_DATA_TYPE_LEN, EDataTooLong);

        let seq = agent::increment_memory_seq(agent);
        let now = clock::timestamp_ms(clock);

        let record = MemoryRecord {
            id: object::new(ctx),
            seq,
            blob_id,
            data_type,
            timestamp: now,
            visibility,
            data_size,
            label,
        };

        event::emit(MemoryStoredEvent {
            agent_id: agent::agent_id(agent),
            seq: record.seq,
            blob_id: record.blob_id,
            data_type: record.data_type,
            timestamp: now,
        });

        record
    }

    /// Store a memory record using an AgentCap (delegated authority).
    public fun store_memory_with_cap(
        agent: &mut Agent,
        cap: &AgentCap,
        blob_id: String,
        data_type: String,
        visibility: String,
        data_size: u64,
        label: String,
        clock: &Clock,
        ctx: &mut TxContext,
    ): MemoryRecord {
        agent::assert_authorized(agent, cap, clock, ctx);
        assert!(agent::is_active(agent), EAgentInactive);
        assert!(string::length(&blob_id) <= MAX_BLOB_ID_LEN, EBlobTooLong);
        assert!(string::length(&data_type) <= MAX_DATA_TYPE_LEN, EDataTooLong);

        let seq = agent::increment_memory_seq(agent);
        let now = clock::timestamp_ms(clock);

        let record = MemoryRecord {
            id: object::new(ctx),
            seq,
            blob_id,
            data_type,
            timestamp: now,
            visibility,
            data_size,
            label,
        };

        event::emit(MemoryStoredEvent {
            agent_id: agent::agent_id(agent),
            seq: record.seq,
            blob_id: record.blob_id,
            data_type: record.data_type,
            timestamp: now,
        });

        record
    }

    /// Update the visibility of a memory record (e.g., make it public for compliance).
    public fun update_visibility(
        record: &mut MemoryRecord,
        new_visibility: String,
        agent: &Agent,
        _ctx: &TxContext,
    ) {
        assert!(agent::owner(agent) == _ctx.sender(), ENotAuthorized);
        record.visibility = new_visibility;

        event::emit(MemoryVisibilityChangedEvent {
            agent_id: agent::agent_id(agent),
            seq: record.seq,
            new_visibility,
        });
    }

    // === View Functions ===

    public fun memory_blob_id(record: &MemoryRecord): String {
        record.blob_id
    }

    public fun memory_data_type(record: &MemoryRecord): String {
        record.data_type
    }

    public fun memory_timestamp(record: &MemoryRecord): u64 {
        record.timestamp
    }

    public fun memory_visibility(record: &MemoryRecord): String {
        record.visibility
    }

    public fun memory_data_size(record: &MemoryRecord): u64 {
        record.data_size
    }

    public fun memory_label(record: &MemoryRecord): String {
        record.label
    }

    public fun memory_seq_number(record: &MemoryRecord): u64 {
        record.seq
    }
}
