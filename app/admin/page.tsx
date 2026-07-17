import { AdminConsole } from "@/components/admin-console";
import { serializeMarket } from "@/lib/domain/serializers";
import { listMarkets } from "@/lib/repositories/queries";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const markets = await listMarkets();
  return <AdminConsole initialMarkets={markets.map(serializeMarket)} />;
}
