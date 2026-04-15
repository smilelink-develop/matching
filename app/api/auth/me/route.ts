import { getCurrentAccount } from "@/lib/auth";

export async function GET() {
  const account = await getCurrentAccount();
  return Response.json({ ok: true, account });
}
