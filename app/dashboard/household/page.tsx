import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMyHouseholds, getActiveHousehold } from "@/lib/household";
import NoHousehold from "./_components/NoHousehold";
import HouseholdOverviewView from "./_components/HouseholdOverviewView";

export const dynamic = "force-dynamic";

export default async function HouseholdHomePage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const households = await getMyHouseholds(user.id);
  if (households.length === 0) return <NoHousehold title="Household HQ" />;

  const active = await getActiveHousehold(user.id);
  const hid = active?.id || households[0].id;

  return <HouseholdOverviewView hid={hid} householdName={active?.name || households[0].name} meId={user.id} currency={user.currency} />;
}
