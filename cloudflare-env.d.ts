declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    FUNDSCOPE_SYNC_TOKEN?: string;
  }
}
