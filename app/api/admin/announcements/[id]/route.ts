import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// PATCH /api/admin/announcements/:id → Go PATCH /api/v1/admin/announcements/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(request, `/api/v1/admin/announcements/${id}`, "PATCH");
}

// DELETE /api/admin/announcements/:id → Go DELETE /api/v1/admin/announcements/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(request, `/api/v1/admin/announcements/${id}`, "DELETE");
}
