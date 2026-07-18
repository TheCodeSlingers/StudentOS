"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { InviteModal } from "@/components/modals/invite-modal";
import { ApiError, Member, listMembers, removeMember } from "@/lib/api-client";
import { notify } from "@/lib/toast";
import { useRequireRole } from "@/lib/use-require-role";
import styles from "../../shared.module.css";

function statusTone(status: Member["status"]): "success" | "warning" | "neutral" {
  if (status === "ACTIVE") return "success";
  if (status === "INVITED") return "warning";
  return "neutral";
}

export default function MembersPage() {
  const isAuthorized = useRequireRole("MENTOR");
  const [members, setMembers] = useState<Member[] | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  function loadMembers() {
    listMembers()
      .then(setMembers)
      .catch((fetchError) => notify.error(fetchError, "Could not load members."));
  }

  useEffect(() => {
    if (!isAuthorized) return;
    loadMembers();
  }, [isAuthorized]);

  async function handleRemove(membershipId: string) {
    setRemovingId(membershipId);
    try {
      await removeMember(membershipId);
      setMembers((current) =>
        current?.map((member) => (member.id === membershipId ? { ...member, status: "INACTIVE" } : member)) ?? null
      );
      notify.success("Member has been removed from the workspace.");
    } catch (removeError) {
      notify.error(removeError, "Could not remove this member.");
    } finally {
      setRemovingId(null);
    }
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Members</h1>
          <p className={styles.subtitle}>Mentors and students in this workspace.</p>
        </div>
        <Button type="button" style={{ width: "auto" }} onClick={() => setIsInviteOpen(true)}>
          Invite member
        </Button>
      </div>

      <div className={styles.card}>
        {members === null ? (
          <p className={styles.emptyState}>Loading members…</p>
        ) : members.length === 0 ? (
          <p className={styles.emptyState}>No members yet.</p>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className={styles.primaryCell}>{member.user.name}</div>
                      <div className={styles.secondaryCell}>{member.user.email}</div>
                    </td>
                    <td>{member.role === "MENTOR" ? "Mentor" : "Student"}</td>
                    <td>
                      <span className={styles.badge} data-tone={statusTone(member.status)}>
                        {member.status}
                      </span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        {member.status === "ACTIVE" ? (
                          <button
                            type="button"
                            className={styles.textButton}
                            data-tone="danger"
                            disabled={removingId === member.id}
                            onClick={() => handleRemove(member.id)}
                          >
                            {removingId === member.id ? "Removing…" : "Remove"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InviteModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} onInvited={loadMembers} />
    </div>
  );
}
