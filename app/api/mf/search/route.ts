import { env } from 'cloudflare:workers';
import { handleRequest } from '../../../../server/archive.ts';
import type { ArchiveBindings } from '../../../../server/types.ts';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Promise<Response> {
  return handleRequest(request, env as unknown as ArchiveBindings);
}
