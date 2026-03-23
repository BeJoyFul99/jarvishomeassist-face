import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/apiProxy";

// GET /api/wifi/:id/credentials → Go GET /api/v1/wifi/:id/credentials
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(request, `/api/v1/wifi/${id}/credentials`, "GET");
}
