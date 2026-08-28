import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMyHouseholds, getActiveHousehold, getHouseholdMembers } from "@/lib/household";
import NoHousehold from "../_components/NoHousehold";
import BankView from "./BankView";

export const dynamic = "force-dynamic";

export default async function BankPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const households = await getMyHouseholds(user.id);
  if (households.length === 0) return <NoHousehold title="The Bank" />;

  const active = await getActiveHousehold(user.id);
  const hid = active?.id || households[0].id;
  const members = await getHouseholdMembers(hid);

  return (
    <BankView
      hid={hid}
      meId={user.id}
      currency={user.currency}
      members={members.filter((m) => m.userId).map((m) => ({ userId: m.userId as string, name: m.user?.name || "Member" }))}
    />
  );
}
