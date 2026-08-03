import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await prisma.catalogUnit.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
}
