import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';
import type { UnavailableArchiveManifest } from '../src/lib/archive-types.ts';
import type { ArchiveAssetRef, ArchiveSnapshot } from './archive-model.ts';
import type { ReadyArchiveManifest } from '../src/lib/archive-types.ts';
import { archiveIssues, MAX_METADATA_EXPANDED_BYTES, timestamp, validateCatalogue,
  validateCheckpoint, validateHistoryShard, validateShardStates } from './archive-model.ts';
import { createGitHubStore } from './archive-store.ts';

export const PAGES_BUDGET = 850 * 1024 * 1024;
const MAX_COMPRESSED_BYTES = 32 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 64 * 1024 * 1024;

export async function materializeSnapshot(options: { snapshot: ArchiveSnapshot;
  readAssetBytes: (ref: ArchiveAssetRef) => Promise<Uint8Array>; outputDirectory: string;
  maxTotalBytes?: number; now?: string; collectionEnabled?: boolean }): Promise<ReadyArchiveManifest> {
  const { snapshot, readAssetBytes } = options;
  const checkpoint = validateCheckpoint(snapshot.checkpoint, snapshot.catalogue);
  const now = options.now ?? new Date().toISOString();
  if (!timestamp(now) || now < checkpoint.updatedAt) throw new Error('Invalid publication timestamp.');
  const maximum = options.maxTotalBytes ?? PAGES_BUDGET;
  if (!Number.isSafeInteger(maximum) || maximum < 1) throw new Error('Invalid Pages size budget.');
  const output = resolve(options.outputDirectory);
  await mkdir(output, { recursive: true });
  const appBytes = await directoryBytes(output, maximum, new Set(['archive']));
  const refs = [checkpoint.catalogue, ...Object.values(checkpoint.shards)];
  if (new Set(refs.map(ref => ref.name)).size !== refs.length) throw new Error('Archive asset names must be unique.');
  if (appBytes + refs.reduce((sum, ref) => sum + ref.bytes, 0) > maximum) {
    throw new Error('The full snapshot exceeds the Pages budget. No histories were dropped.');
  }
  const staging = await mkdtemp(join(dirname(output), `${basename(output)}-archive-staging-`));
  const destination = join(output, 'archive');
  const previous = `${staging}-previous`;
  let movedPrevious = false;
  try {
    const catalogueBytes = await readAssetBytes(checkpoint.catalogue);
    const catalogue = validateCatalogue(verifyArchiveBytes(catalogueBytes, checkpoint.catalogue, MAX_METADATA_EXPANDED_BYTES));
    if (!isDeepStrictEqual(catalogue, snapshot.catalogue)) throw new Error('Catalogue does not match the checkpoint snapshot.');
    await writeFile(join(staging, checkpoint.catalogue.name), catalogueBytes);

    // Download a few immutable objects at a time. Settle all readers before
    // cleanup so a failed worker cannot leave writes racing with publication.
    const shards = Object.entries(checkpoint.shards);
    let cursor = 0;
    let failure: unknown;
    const readers = Array.from({ length: Math.min(4, shards.length) }, async () => {
      while (!failure && cursor < shards.length) {
        const [bucket, ref] = shards[cursor++];
        try {
          const bytes = await readAssetBytes(ref);
          const shard = validateHistoryShard(verifyArchiveBytes(bytes, ref), bucket);
          validateShardStates(shard, checkpoint.states);
          await writeFile(join(staging, ref.name), bytes);
        } catch (error) { failure = error; throw error; }
      }
    });
    const results = await Promise.allSettled(readers);
    const rejected = results.find(result => result.status === 'rejected');
    if (rejected?.status === 'rejected') throw rejected.reason;

    const publicRef = (ref: ArchiveAssetRef) => ({ path: `archive/${ref.name}`, sha256: ref.sha256,
      bytes: ref.bytes, expandedBytes: ref.expandedBytes });
    const latestDates = catalogue.entries.flatMap(entry => entry.latestDate ? [entry.latestDate] : []).sort();
    const warnings = [...(checkpoint.sourceRetryAt && checkpoint.sourceRetryAt > now
      ? [`MFAPI requested a pause. Automatic source requests resume no earlier than ${checkpoint.sourceRetryAt}.`] : []),
    ...(checkpoint.lastCatalogueError
      ? [`The last catalogue refresh failed (${checkpoint.lastCatalogueError}); the previous verified catalogue was retained.`] : []),
    ...catalogue.warnings].slice(0, 100);
    const manifest: ReadyArchiveManifest = { version: 2, source: 'mfapi.in', status: 'ready', collectionEnabled: options.collectionEnabled === true,
      sequence: checkpoint.sequence, generatedAt: now, checkpointAt: checkpoint.updatedAt,
      catalogueFetchedAt: checkpoint.catalogueFetchedAt, latestNavDate: latestDates.at(-1) ?? null,
      counts: checkpoint.counts, catalogue: publicRef(checkpoint.catalogue),
      shards: Object.fromEntries(shards.map(([bucket, ref]) => [bucket, publicRef(ref)])),
      issues: archiveIssues(checkpoint.states, 20), warnings };
    await writeFile(join(staging, 'manifest.json'), JSON.stringify(manifest) + '\n');
    const dataBytes = await assertPagesBudget(staging, maximum);
    if (appBytes + dataBytes > maximum) throw new Error('The complete app and archive exceed the Pages budget.');

    // The manifest becomes visible only with a complete verified directory.
    try { await rename(destination, previous); movedPrevious = true; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    try { await rename(staging, destination); }
    catch (error) {
      if (movedPrevious) { await rename(previous, destination); movedPrevious = false; }
      throw error;
    }
    if (movedPrevious) await rm(previous, { recursive: true, force: true });
    return manifest;
  } finally { await rm(staging, { recursive: true, force: true }); }
}

export function verifyArchiveBytes(bytes: Uint8Array, ref: { sha256: string; bytes: number; expandedBytes: number },
  maximumExpanded = MAX_EXPANDED_BYTES): unknown {
  if (!Number.isSafeInteger(ref.bytes) || ref.bytes < 1 || ref.bytes > MAX_COMPRESSED_BYTES || bytes.byteLength !== ref.bytes) {
    throw new Error('Archive compressed size does not match its verified reference or exceeds the limit.');
  }
  if (!/^[a-f0-9]{64}$/.test(ref.sha256) || createHash('sha256').update(bytes).digest('hex') !== ref.sha256) {
    throw new Error('Archive digest does not match its verified reference.');
  }
  if (!Number.isSafeInteger(ref.expandedBytes) || ref.expandedBytes < 1 || ref.expandedBytes > maximumExpanded) {
    throw new Error('Archive expanded size exceeds the publication limit.');
  }
  let expanded: Buffer;
  try { expanded = gunzipSync(bytes, { maxOutputLength: ref.expandedBytes }); }
  catch { throw new Error('Archive gzip data is invalid or exceeds its expanded size limit.'); }
  if (expanded.byteLength !== ref.expandedBytes) throw new Error('Archive expanded size does not match its verified reference.');
  return JSON.parse(expanded.toString('utf8')) as unknown;
}

export async function writeUnavailableManifest(directory: string, enabled: boolean, now: string): Promise<void> {
  const manifest: UnavailableArchiveManifest = { version: 2, source: 'mfapi.in', status: enabled ? 'not-started' : 'disabled',
    generatedAt: now, message: enabled ? 'The shared archive is enabled but has no verified checkpoint yet.'
      : 'The shared GitHub archive has not been activated. Fund histories remain available directly from MFAPI.' };
  const destination = join(directory, 'archive');
  await mkdir(destination, { recursive: true });
  await writeFile(join(destination, 'manifest.json.tmp'), JSON.stringify(manifest) + '\n');
  await rename(join(destination, 'manifest.json.tmp'), join(destination, 'manifest.json'));
}

export async function assertPagesBudget(directory: string, maximum = PAGES_BUDGET): Promise<number> {
  if (!Number.isSafeInteger(maximum) || maximum < 1) throw new Error('Invalid Pages size budget.');
  return directoryBytes(directory, maximum);
}

async function directoryBytes(directory: string, maximum: number, omitRoot = new Set<string>()): Promise<number> {
  let bytes = 0;
  async function visit(folder: string): Promise<void> {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      if (folder === directory && omitRoot.has(entry.name)) continue;
      const path = join(folder, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Pages publication must not contain symbolic links.');
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) {
        bytes += (await stat(path)).size;
        if (bytes > maximum) throw new Error(`Pages artifact exceeds the ${maximum}-byte budget. The complete archive was retained; publication stopped.`);
      } else throw new Error('Pages publication contains an unsupported file type.');
    }
  }
  await visit(directory);
  return bytes;
}

export async function publishArchive(options: {
  store: Pick<ReturnType<typeof createGitHubStore>, 'loadSnapshot' | 'readAssetBytes'>;
  enabled: boolean; outputDirectory: string; now?: string;
}): Promise<ReadyArchiveManifest | null> {
  // Turning off imports must not remove already published histories. Read the
  // durable pointer first, and let any auth/transport/corruption error fail.
  const snapshot = await options.store.loadSnapshot();
  if (snapshot) return materializeSnapshot({ snapshot, readAssetBytes: ref => options.store.readAssetBytes(ref),
    outputDirectory: options.outputDirectory, now: options.now, collectionEnabled: options.enabled });
  await writeUnavailableManifest(options.outputDirectory, options.enabled, options.now ?? new Date().toISOString());
  await assertPagesBudget(options.outputDirectory);
  return null;
}

async function main(): Promise<void> {
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  if (repository !== 'Vasuki8/mutual-fund-dashboard' || !token) {
    throw new Error('Publication requires the intended repository and its read-only Actions token.');
  }
  const store = createGitHubStore({ repository, token, deadline: Date.now() + 9 * 60_000 });
  const result = await publishArchive({ store, enabled: process.env.FUNDSCOPE_GITHUB_ARCHIVE_ENABLED === 'true',
    outputDirectory: resolve('dist/pages') });
  const bytes = await assertPagesBudget(resolve('dist/pages'));
  console.log(JSON.stringify({ status: result?.status ?? 'no-shared-checkpoint',
    sequence: result?.sequence ?? null, counts: result?.counts ?? null, publishedBytes: bytes }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error instanceof Error ? error.message : 'Archive publication failed.'); process.exitCode = 1; });
}
