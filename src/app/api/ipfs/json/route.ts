import { z } from "zod";
import { AUTH_HEADER } from "@/lib/storage-auth";
import { clientIp, errorResponse, HttpError, pinJson, rateLimit, requireWallet } from "@/lib/server/storage";

const Body = z.object({ name: z.string().min(1).max(300), content: z.record(z.string(), z.unknown()) });

export async function POST(req: Request) {
  try {
    rateLimit(`ip:${clientIp(req)}`, 60);
    const raw = await req.text();
    if (raw.length > 512 * 1024) throw new HttpError(413, "Metadata is too large.");
    const wallet = await requireWallet(req.headers.get(AUTH_HEADER));
    rateLimit(`wallet:${wallet.toLowerCase()}`, 30);
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new HttpError(400, "Invalid JSON.");
    }
    const parsed = Body.safeParse(json);
    if (!parsed.success) throw new HttpError(400, "Invalid metadata request.");
    const cid = await pinJson(parsed.data.content, parsed.data.name, wallet);
    return Response.json({ cid });
  } catch (e) {
    return errorResponse(e);
  }
}
