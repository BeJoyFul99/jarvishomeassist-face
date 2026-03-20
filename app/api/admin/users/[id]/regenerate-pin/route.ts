import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// POST /api/admin/users/:id/regenerate-pin → Go POST /api/v1/admin/users/:id/regenerate-pin
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(request, `/api/v1/admin/users/${id}/regenerate-pin`, "POST");
}
