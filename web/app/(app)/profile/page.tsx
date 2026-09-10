"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";

export default function ProfilePage() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Profile & privacy</h1>
      <p className="text-text-secondary">
        You can request deletion of your account and associated booking data.
        Staff accounts should contact the platform owner.
      </p>
      <form action={logout}>
        <Button type="submit" variant="secondary">
          Sign out
        </Button>
      </form>
      <Button
        type="button"
        variant="danger"
        onClick={async () => {
          if (!confirm("Delete your account and purge personal data?")) return;
          const res = await fetch("/api/account/delete", { method: "POST" });
          if (res.ok) {
            router.push("/signup");
          } else {
            setMsg("Could not delete account");
          }
        }}
      >
        Delete my account & data
      </Button>
      {msg ? <p className="text-danger">{msg}</p> : null}
    </div>
  );
}
