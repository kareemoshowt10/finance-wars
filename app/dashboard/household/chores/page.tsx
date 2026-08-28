import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMyHouseholds, getActiveHousehold } from "@/lib/household";
import NoHousehold from "../_components/NoHousehold";
import ChoresView from "./ChoresView";

export const dynamic = "force-dynamic";

export default async function ChoresPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const households = await getMyHouseholds(user.id);
  if (households.length === 0) return <NoHousehold title="Chores" />;

  const active = await getActiveHousehold(user.id);
  const hid = active?.id || households[0].id;

  return <ChoresView hid={hid} meId={user.id} />;
}
