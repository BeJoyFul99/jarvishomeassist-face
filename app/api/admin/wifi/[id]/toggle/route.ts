import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// POST /api/admin/wifi/:id/toggle → Go POST /api/v1/admin/wifi/:id/toggle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(request, `/api/v1/admin/wifi/${id}/toggle`, "POST");
}
