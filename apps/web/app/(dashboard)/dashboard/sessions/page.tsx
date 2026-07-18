"use client";

import { useEffect, useMemo, useState } from "react";
import { SessionManager, SessionManagerBatch } from "@/components/dashboard/session-manager";
import { Batch, listBatches } from "@/lib/api-client";
import { notify } from "@/lib/toast";
import { useRequireRole } from "@/lib/use-require-role";

export default function MentorSessionsPage() {
  const isAuthorized = useRequireRole("MENTOR");
  const [batches, setBatches] = useState<Batch[] | null>(null);

  useEffect(() => {
    if (!isAuthorized) return;
    let cancelled = false;

    listBatches()
      .then((result) => {
        if (!cancelled) setBatches(result);
      })
      .catch((error) => {
        if (!cancelled) notify.error(error, "Could not load batches.");
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

  // Render a loading state until batches are fetched
  if (batches === null) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Sessions</h1>
        <p>Loading batches...</p>
      </div>
    );
  }

  return (
    <SessionManager
      batches={sessionManagerBatches}
      emptyBatchesMessage="No active batches yet. Create a batch to start scheduling sessions."
      canManage
    />
  );
}
