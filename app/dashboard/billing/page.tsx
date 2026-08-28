import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMyHouseholds, getActiveHousehold } from "@/lib/household";
import NoHousehold from "../household/_components/NoHousehold";
import BillingView from "./BillingView";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const households = await getMyHouseholds(user.id);
  if (households.length === 0) return <NoHousehold title="Billing & Plan" />;

  const active = await getActiveHousehold(user.id);
  const hid = active?.id || households[0].id;

  return <BillingView hid={hid} householdName={active?.name || households[0].name} />;
}
