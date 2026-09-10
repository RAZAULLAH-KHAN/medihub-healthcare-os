import { AppShell } from "@/components/AppShell";
import { getSessionProfile } from "@/lib/auth";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionProfile();
  return <AppShell profile={session?.profile ?? null}>{children}</AppShell>;
}
