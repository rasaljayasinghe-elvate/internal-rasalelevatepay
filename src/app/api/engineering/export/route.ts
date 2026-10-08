import { NextRequest, NextResponse } from "next/server";
import { buildEngineeringList, engineeringListToCsv, engineeringListToMarkdown } from "@/lib/engineering";

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format") === "csv" ? "csv" : "markdown";
  const groups = await buildEngineeringList();

  if (format === "csv") {
    return new NextResponse(engineeringListToCsv(groups), {
      headers: {
        "content-type": "text/csv",
        "content-disposition": 'attachment; filename="engineering-issues.csv"',
      },
    });
  }

  return new NextResponse(engineeringListToMarkdown(groups), {
    headers: {
      "content-type": "text/markdown",
      "content-disposition": 'attachment; filename="engineering-issues.md"',
    },
  });
}
