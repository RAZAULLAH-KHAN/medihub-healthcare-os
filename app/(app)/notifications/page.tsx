"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { createClient } from "@/lib/supabase/client";
import type { AppNotification } from "@/lib/types";

export default function NotificationsPage() {
  const [items, setItems] = useState<AppNotification[] | null>(null);

  async function load() {
    const supabase = createClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userRes.user.id)
      .order("created_at", { ascending: false });
    setItems((data as AppNotification[]) ?? []);
  }

  useEffect(() => {
    load();
    const supabase = createClient();
    const channel = supabase
      .channel("notifications-inbox")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!items) return <ListSkeleton />;
  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-sm text-text-secondary" aria-live="polite">
          {unread} unread
        </p>
      </div>
      {items.length ? (
        items.map((n) => (
          <button
            key={n.id}
            type="button"
            className={`w-full rounded-xl border p-4 text-left ${
              n.read ? "border-border bg-surface" : "border-primary bg-teal-50"
            }`}
            onClick={async () => {
              await fetch("/api/notifications/read", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ id: n.id }),
              });
              load();
            }}
          >
            <p className="font-semibold">{n.title}</p>
            <p className="text-text-secondary">{n.body}</p>
            <p className="mt-1 text-sm text-text-secondary">
              {new Date(n.created_at).toLocaleString()}
            </p>
          </button>
        ))
      ) : (
        <EmptyState
          title="No notifications"
          description="Appointment reminders and report-ready alerts will land here."
        />
      )}
    </div>
  );
}
