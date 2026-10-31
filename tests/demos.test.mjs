import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const file = path => readFileSync(new URL("../" + path, import.meta.url));
const manifest = JSON.parse(file("assets/demos.json"));

function chunks(buffer, start, end) {
  const result = [];
  for (let offset = start; offset + 8 <= end;) {
    const length = buffer.readUInt32LE(offset + 4);
    assert.ok(offset + 8 + length <= end, "Incomplete WebP chunk");
    result.push({ tag: buffer.toString("ascii", offset, offset + 4), payload: offset + 8, length });
    offset += 8 + length + length % 2;
  }
  return result;
}

test("every recorded demo is complete, lossless, correctly cropped, and keeps its duration", () => {
  assert.equal(manifest.fps, "60/1");
  for (const clip of manifest.clips) {
    const bytes = file("assets/" + clip.file);
    assert.equal(bytes.toString("ascii", 0, 4), "RIFF", clip.file);
    assert.equal(bytes.toString("ascii", 8, 12), "WEBP", clip.file);
    assert.equal(bytes.readUInt32LE(4) + 8, bytes.length, clip.file);
    const all = chunks(bytes, 12, bytes.length);
    const canvas = all.find(chunk => chunk.tag === "VP8X");
    const still = all.find(chunk => chunk.tag === "VP8L");
    let width, height;
    if (canvas) {
      width = bytes.readUIntLE(canvas.payload + 4, 3) + 1;
      height = bytes.readUIntLE(canvas.payload + 7, 3) + 1;
    } else {
      assert.ok(still, "Missing lossless image: " + clip.file);
      const dimensions = bytes.readUInt32LE(still.payload + 1);
      width = (dimensions & 0x3fff) + 1;
      height = ((dimensions >>> 14) & 0x3fff) + 1;
    }
    assert.deepEqual([width, height], clip.crop.slice(0, 2), clip.file);
    assert.ok(!all.some(chunk => chunk.tag === "VP8 "), "Lossy WebP: " + clip.file);
    const frames = all.filter(chunk => chunk.tag === "ANMF");
    if (clip.still) {
      assert.equal(frames.length, 0, clip.file);
    } else {
      assert.ok(frames.length > 1, "Missing animation: " + clip.file);
      let duration = 0;
      for (const frame of frames) {
        duration += bytes.readUIntLE(frame.payload + 12, 3);
        const image = chunks(bytes, frame.payload + 16, frame.payload + frame.length);
        assert.ok(image.some(chunk => chunk.tag === "VP8L"), "Non-lossless animation frame: " + clip.file);
        assert.ok(!image.some(chunk => chunk.tag === "VP8 "), clip.file);
      }
      assert.ok(Math.abs(duration - (clip.end - clip.start) * 1000) <= 18, `${clip.file}: duration ${duration}ms`);
    }
  }
});

test("the public blog cover is a complete high-resolution lossless 16:9 animation", () => {
  const bytes = file("public/assets/slidebox-cover.webp");
  assert.equal(bytes.readUInt32LE(4) + 8, bytes.length);
  const all = chunks(bytes, 12, bytes.length);
  const canvas = all.find(chunk => chunk.tag === "VP8X");
  assert.deepEqual([bytes.readUIntLE(canvas.payload + 4, 3) + 1, bytes.readUIntLE(canvas.payload + 7, 3) + 1], [1920, 1080]);
  const frames = all.filter(chunk => chunk.tag === "ANMF");
  assert.ok(frames.length > 1);
  let duration = 0;
  for (const frame of frames) {
    duration += bytes.readUIntLE(frame.payload + 12, 3);
    assert.ok(chunks(bytes, frame.payload + 16, frame.payload + frame.length).some(chunk => chunk.tag === "VP8L"));
  }
  assert.ok(Math.abs(duration - 4000) <= 18, `Cover duration: ${duration}ms`);
  const cover = JSON.parse(file("public/assets/slidebox-cover.json"));
  assert.equal(cover.fps, 60);
  assert.match(cover.source, /Automated browser rendering/);
});

test("the README includes every demo and its table-of-contents anchors resolve", () => {
  const readme = file("README.md").toString();
  for (const clip of manifest.clips) assert.ok(readme.includes("/assets/" + clip.file), clip.file);
  const headings = new Set([...readme.matchAll(/^#{1,6} (.+)$/gm)].map(([, text]) => text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s/g, "-")));
  for (const [, anchor] of readme.matchAll(/\]\(#([^)]+)\)/g)) {
    assert.ok(headings.has(anchor), "Unresolved README anchor: " + anchor);
  }
});
