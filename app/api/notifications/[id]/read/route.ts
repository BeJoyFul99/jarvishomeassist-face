import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// PATCH /api/notifications/:id/read → Go PATCH /api/v1/notifications/:id/read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(request, `/api/v1/notifications/${id}/read`, "PATCH");
}
