// Serves the existing, official 480×480 HappyTails logo as a search/favicon icon.
// The source image remains public/images/logo.png; no duplicate image assets.
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 480, height: 480 };
export const contentType = "image/png";

export default async function Icon(): Promise<Response> {
  const logo = await readFile(join(process.cwd(), "public", "images", "logo.png"));
  return new Response(new Uint8Array(logo), {
    headers: { "Content-Type": contentType },
  });
}
