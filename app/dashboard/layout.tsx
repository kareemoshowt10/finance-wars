import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashNav from "./_components/DashNav";
import MobileTabBar from "./_components/MobileTabBar";
import Onboarding from "./_components/Onboarding";
import PageTransition from "./_components/PageTransition";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user) redirect("/login");
  const accountCount = await prisma.account.count({ where: { userId: user.id } });
  const showOnboarding = !user.onboarded && accountCount === 0;

  return (
    <div className="min-h-screen">
      <DashNav userName={user.name} />
      <main className="md:pl-60">
        <div className="px-6 md:px-10 py-8 pb-tabbar md:pb-8 max-w-6xl mx-auto">
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
      <MobileTabBar />
      {showOnboarding && <Onboarding />}
    </div>
  );
}
