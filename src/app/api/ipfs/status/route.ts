import { MAX_UPLOAD_BYTES, storageConfigured } from "@/lib/server/storage";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ configured: storageConfigured(), provider: "Pinata", maxFileBytes: MAX_UPLOAD_BYTES });
}
