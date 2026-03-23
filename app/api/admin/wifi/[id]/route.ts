import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// PATCH /api/admin/wifi/:id → Go PATCH /api/v1/admin/wifi/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(request, `/api/v1/admin/wifi/${id}`, "PATCH");
}

// DELETE /api/admin/wifi/:id → Go DELETE /api/v1/admin/wifi/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(request, `/api/v1/admin/wifi/${id}`, "DELETE");
}
