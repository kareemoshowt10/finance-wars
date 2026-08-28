import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMyHouseholds, getActiveHousehold } from "@/lib/household";
import NoHousehold from "../_components/NoHousehold";
import HouseholdGoalsView from "./HouseholdGoalsView";

export const dynamic = "force-dynamic";

export default async function HouseholdGoalsPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const households = await getMyHouseholds(user.id);
  if (households.length === 0) return <NoHousehold title="Household Goals" />;

  const active = await getActiveHousehold(user.id);
  const hid = active?.id || households[0].id;

  return <HouseholdGoalsView hid={hid} meId={user.id} currency={user.currency} />;
}
