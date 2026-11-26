import { connection } from "next/server";
import { getDb } from "@/db";
import { getOwnerSeal } from "@/lib/owners/repository";

/** 事業主のデータ印（PNG）を返す */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/owners/[id]/seal">,
) {
  const { id } = await params;
  await connection();
  const seal = /^\d+$/.test(id) ? getOwnerSeal(getDb(), Number(id)) : undefined;
  if (!seal) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(seal), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, no-cache",
    },
  });
}
