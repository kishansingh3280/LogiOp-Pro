import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const entry = await prisma.ledgerEntry.findUnique({ where: { id } });
  if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || "";
  const storedName = `${randomUUID()}${ext}`;
  const uploadDir = path.join(process.cwd(), "uploads");
  await mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, storedName);
  await writeFile(filePath, bytes);

  const attachment = await prisma.billAttachment.create({
    data: {
      ledgerEntryId: id,
      fileName: file.name,
      filePath: `/api/files/${storedName}`,
      mimeType: file.type || null,
      fileSize: bytes.length,
    },
  });

  return NextResponse.json(attachment, { status: 201 });
}
