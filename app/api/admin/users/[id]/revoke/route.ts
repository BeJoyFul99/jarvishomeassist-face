import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// POST /api/admin/users/:id/revoke → Go POST /api/v1/admin/users/:id/revoke
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(request, `/api/v1/admin/users/${id}/revoke`, "POST");
}
