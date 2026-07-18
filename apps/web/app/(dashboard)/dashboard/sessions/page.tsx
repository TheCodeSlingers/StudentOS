"use client";

import { useEffect, useMemo, useState } from "react";
import { SessionManager, SessionManagerBatch } from "@/components/dashboard/session-manager";
import { ApiError, Batch, listBatches } from "@/lib/api-client";
import { useRequireRole } from "@/lib/use-require-role";

export default function MentorSessionsPage() {
  const isAuthorized = useRequireRole("MENTOR");
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [batchesError, setBatchesError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthorized) return;
    let cancelled = false;

    listBatches()
      .then((result) => {
        if (!cancelled) setBatches(result);
      })
      .catch((error) => {
        if (!cancelled) setBatchesError(error instanceof ApiError ? error.message : "Could not load batches.");
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthorized]);

  const sessionManagerBatches: SessionManagerBatch[] = useMemo(
    () =>
      (batches ?? []).map((batch) => ({
        id: batch.id,
        name: batch.name,
        attendanceDurationMinsOverride: batch.attendanceDurationMinsOverride,
      })),
    [batches]
  );

  if (!isAuthorized) {
    return null;
  }

  return (
    <SessionManager
      batches={sessionManagerBatches}
      batchesError={batchesError}
      emptyBatchesMessage="No active batches yet. Create a batch to start scheduling sessions."
      canManage
    />
  );
}
