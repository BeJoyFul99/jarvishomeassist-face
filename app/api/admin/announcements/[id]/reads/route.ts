import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// GET /api/admin/announcements/:id/reads → Go GET /api/v1/admin/announcements/:id/reads
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(request, `/api/v1/admin/announcements/${id}/reads`, "GET");
}
