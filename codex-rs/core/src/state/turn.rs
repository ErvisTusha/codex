//! Turn-scoped state and active turn metadata scaffolding.

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

use codex_protocol::models::ResponseInputItem;
use tokio::sync::oneshot;

use crate::protocol::ReviewDecision;

/// Metadata about the currently running turn.
#[derive(Default)]
pub(crate) struct ActiveTurn {
    pub(crate) sub_id: String,
    pub(crate) turn_state: Arc<Mutex<TurnState>>,
}

/// Mutable state for a single turn.
#[derive(Default)]
pub(crate) struct TurnState {
    pending_approvals: HashMap<String, oneshot::Sender<ReviewDecision>>,
    pending_input: Vec<ResponseInputItem>,
}

impl TurnState {
    pub(crate) fn insert_pending_approval(
        &mut self,
        key: String,
        tx: oneshot::Sender<ReviewDecision>,
    ) -> Option<oneshot::Sender<ReviewDecision>> {
        self.pending_approvals.insert(key, tx)
    }

    pub(crate) fn remove_pending_approval(
        &mut self,
        key: &str,
    ) -> Option<oneshot::Sender<ReviewDecision>> {
        self.pending_approvals.remove(key)
    }

    /// Update an existing pending approval with a new decision.
    /// This allows changing the approval decision while a task is in progress.
    /// Returns true if the approval was found and updated, false otherwise.
    pub(crate) fn update_pending_approval(&mut self, key: &str, decision: ReviewDecision) -> bool {
        if let Some(tx) = self.pending_approvals.remove(key) {
            // Send the decision and remove from pending map
            tx.send(decision).ok();
            true
        } else {
            false
        }
    }

    pub(crate) fn clear_pending(&mut self) {
        self.pending_approvals.clear();
        self.pending_input.clear();
    }

    pub(crate) fn push_pending_input(&mut self, input: ResponseInputItem) {
        self.pending_input.push(input);
    }

    pub(crate) fn take_pending_input(&mut self) -> Vec<ResponseInputItem> {
        if self.pending_input.is_empty() {
            Vec::with_capacity(0)
        } else {
            let mut ret = Vec::new();
            std::mem::swap(&mut ret, &mut self.pending_input);
            ret
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_update_pending_approval() {
        let mut turn_state = TurnState::default();
        let (tx, rx) = oneshot::channel();

        // Insert a pending approval
        turn_state.insert_pending_approval("test-id".to_string(), tx);

        // Update the approval
        let updated = turn_state.update_pending_approval("test-id", ReviewDecision::Approved);
        assert!(updated, "Should successfully update pending approval");

        // Verify the decision was sent through the channel
        let decision = rx.await.expect("Should receive decision");
        assert_eq!(decision, ReviewDecision::Approved);

        // Verify it was removed from pending map
        let removed = turn_state.remove_pending_approval("test-id");
        assert!(removed.is_none(), "Should not find approval after update");
    }

    #[tokio::test]
    async fn test_update_nonexistent_approval() {
        let mut turn_state = TurnState::default();

        // Try to update a non-existent approval
        let updated = turn_state.update_pending_approval("non-existent", ReviewDecision::Approved);
        assert!(!updated, "Should not update non-existent approval");
    }

    #[tokio::test]
    async fn test_insert_overwrites_previous_approval() {
        let mut turn_state = TurnState::default();
        let (tx1, rx1) = oneshot::channel();
        let (tx2, _rx2) = oneshot::channel();

        // Insert first approval
        let prev = turn_state.insert_pending_approval("test-id".to_string(), tx1);
        assert!(prev.is_none(), "Should not have previous approval");

        // Insert second approval with same id (should overwrite)
        let prev = turn_state.insert_pending_approval("test-id".to_string(), tx2);
        assert!(prev.is_some(), "Should return previous approval");

        // The previous channel should be returned, allowing us to handle it
        if let Some(prev_tx) = prev {
            prev_tx.send(ReviewDecision::Abort).ok();
        }

        // Verify the original channel receives the abort
        let decision = rx1.await.expect("Should receive decision");
        assert_eq!(decision, ReviewDecision::Abort);
    }
}
