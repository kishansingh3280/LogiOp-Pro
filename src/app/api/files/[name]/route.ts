import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

type Ctx = { params: Promise<{ name: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { name } = await ctx.params;
  // Prevent path traversal
  if (name.includes("..") || name.includes("/") || name.includes("\\")) {
    return NextResponse.json({ error: "Invalid" }, { status: 400 });
  }
  const filePath = path.join(process.cwd(), "uploads", name);
  try {
    const data = await readFile(filePath);
    const ext = path.extname(name).toLowerCase();
    const mime =
      ext === ".pdf"
        ? "application/pdf"
        : ext === ".png"
          ? "image/png"
          : ext === ".jpg" || ext === ".jpeg"
            ? "image/jpeg"
            : ext === ".webp"
              ? "image/webp"
              : "application/octet-stream";
    return new NextResponse(data, {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `inline; filename="${name}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
