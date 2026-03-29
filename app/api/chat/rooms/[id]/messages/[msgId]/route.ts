import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// PUT /api/chat/rooms/:id/messages/:msgId — edit a message
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; msgId: string }> },
) {
  const { id, msgId } = await params;
  return proxyToBackend(request, `/api/v1/chat/rooms/${id}/messages/${msgId}`, "PUT");
}

// DELETE /api/chat/rooms/:id/messages/:msgId — delete a message
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; msgId: string }> },
) {
  const { id, msgId } = await params;
  return proxyToBackend(request, `/api/v1/chat/rooms/${id}/messages/${msgId}`, "DELETE");
}
