import { z } from "zod";
import { AUTH_HEADER } from "@/lib/storage-auth";
import { clientIp, errorResponse, HttpError, rateLimit, requireWallet, signedUploadUrl } from "@/lib/server/storage";

const Body = z.object({ filename: z.string().min(1).max(500), size: z.number().int().nonnegative() });

export async function POST(req: Request) {
  try {
    rateLimit(`ip:${clientIp(req)}`, 120);
    const wallet = await requireWallet(req.headers.get(AUTH_HEADER));
    rateLimit(`wallet:${wallet.toLowerCase()}`, 80);
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, "Invalid upload request.");
    const url = await signedUploadUrl({ ...parsed.data, wallet });
    return Response.json({ url });
  } catch (e) {
    return errorResponse(e);
  }
}
