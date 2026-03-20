import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// PATCH /api/admin/users/:id → Go PATCH /api/v1/admin/users/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(request, `/api/v1/admin/users/${id}`, "PATCH");
}

// DELETE /api/admin/users/:id → Go DELETE /api/v1/admin/users/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(request, `/api/v1/admin/users/${id}`, "DELETE");
}
