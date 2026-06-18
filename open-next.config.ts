// @opennextjs/cloudflare configuration.
// Adapts the Next.js 16 build for Cloudflare Workers runtime.
// Docs: https://opennext.js.org/cloudflare
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // No incremental cache yet — add R2/KV/D1 here when projects sync to the DB.
});
