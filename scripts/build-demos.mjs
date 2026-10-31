import { readFileSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(readFileSync(new URL("../assets/demos.json", import.meta.url), "utf8"));
const source = process.argv[2];
if (!source) throw new Error("Usage: node scripts/build-demos.mjs /path/to/recording.mp4 [clip.webp ...]");
if (basename(source) !== manifest.source) throw new Error(`Expected ${manifest.source}; check the crop manifest before using different footage`);

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || `${command} failed`);
  return result.stdout;
}

const metadata = JSON.parse(run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate:format=duration", "-of", "json", source]));
const video = metadata.streams[0];
if (video.width !== manifest.width || video.height !== manifest.height || video.r_frame_rate !== manifest.fps) {
  throw new Error("Recording dimensions/frame rate do not match the crop manifest");
}

const requested = process.argv.slice(3);
for (const name of requested) {
  if (!manifest.clips.some(clip => clip.file === name)) throw new Error(`Unknown clip: ${name}`);
}
for (const clip of manifest.clips.filter(clip => !requested.length || requested.includes(clip.file))) {
  const [width, height, x, y] = clip.crop;
  if (x < 0 || y < 0 || x + width > video.width || y + height > video.height || (clip.end ?? clip.start) > Number(metadata.format.duration)) {
    throw new Error(`Invalid crop or time range: ${clip.file}`);
  }
  const output = resolve(root, "assets", clip.file);
  const args = ["-hide_banner", "-loglevel", "error", "-y", "-ss", String(clip.start), "-i", source];
  if (clip.still) args.push("-frames:v", "1");
  else args.push("-t", String(clip.end - clip.start));
  // Crop only: no scaling, frame-rate filter, or lossy encoding pass.
  args.push("-map", "0:v:0", "-vf", `crop=${width}:${height}:${x}:${y}`, "-an", "-c:v", "libwebp_anim", "-pix_fmt", "bgra", "-lossless", "1", "-quality", "100", "-compression_level", "6", "-loop", "0", output);
  run("ffmpeg", args);
  console.log(`${clip.file}: ${width}×${height}, ${clip.still ? "still reference" : `${(clip.end - clip.start).toFixed(2)}s at source timing`}, ${statSync(output).size.toLocaleString()} bytes`);
}
