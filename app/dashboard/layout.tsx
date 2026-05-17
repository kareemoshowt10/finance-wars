import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import DashNav from "./_components/DashNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-black text-white">
      <DashNav userName={user.name} />
      <main className="md:pl-60">
        <div className="px-6 md:px-10 py-8 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
