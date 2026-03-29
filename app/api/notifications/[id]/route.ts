import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// DELETE /api/notifications/:id → Go DELETE /api/v1/notifications/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(request, `/api/v1/notifications/${id}`, "DELETE");
}
