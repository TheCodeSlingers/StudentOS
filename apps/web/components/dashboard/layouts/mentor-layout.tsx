"use client";

import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/Button";
import { InviteModal } from "@/components/modals/invite-modal";
import { DashboardShell } from "../dashboard-shell";
import { MENTOR_NAV_ITEMS } from "../nav/mentor-nav";

export function MentorLayout({ children }: { children: ReactNode }) {
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  return (
    <>
      <DashboardShell
        navItems={MENTOR_NAV_ITEMS}
        footerAction={
          <Button type="button" onClick={() => setIsInviteOpen(true)}>
            Invite member
          </Button>
        }
      >
        {children}
      </DashboardShell>

      <InviteModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} />
    </>
  );
}
