"use client";

import { useMemo } from "react";
import { SessionManager, SessionManagerBatch } from "@/components/dashboard/session-manager";
import { useAuth } from "@/lib/auth-context";
import { useRequireCR } from "@/lib/use-require-role";

/**
 * CR-scoped version of the mentor Sessions page. A Class Representative only manages
 * sessions for the batch(es) they're CR of, sourced from their own session (crBatches)
 * rather than the mentor-only "list all workspace batches" endpoint.
 */
export default function CrSessionsPage() {
  const isAuthorized = useRequireCR();
  const { crBatches } = useAuth();

  const sessionManagerBatches: SessionManagerBatch[] = useMemo(
    () => crBatches.map((batch) => ({ id: batch.batchId, name: batch.batchName })),
    [crBatches]
  );

  if (!isAuthorized) {
    return null;
  }

  return (
    <SessionManager
      title="My batch sessions"
      batches={sessionManagerBatches}
      emptyBatchesMessage="You're not a Class Representative for any batch yet."
    />
  );
}
