import assert from "node:assert/strict";
import test from "node:test";
import {
  sponsorLogoImage, sponsorLogoMaxBytes, sponsorLogoPath, storedSponsorLogoPath,
} from "../src/lib/sponsor-logo.ts";

test("sponsor uploads accept a small PNG and reject empty, oversized, or spoofed images", async () => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=", "base64");
  assert.equal(await sponsorLogoImage(new File([png], "logo.png", { type: "image/png" })), "png");
  assert.equal(await sponsorLogoImage(new File([], "empty.png", { type: "image/png" })), null);
  assert.equal(await sponsorLogoImage(new File(["not an image at all"], "fake.png", { type: "image/png" })), null);
  assert.equal(await sponsorLogoImage(new File([new Uint8Array(sponsorLogoMaxBytes + 1)], "large.png", { type: "image/png" })), null);
  assert.equal(await sponsorLogoImage(new File([png], "wrong.jpg", { type: "image/jpeg" })), null);
});

test("only this sponsorship's uploaded logo can be cleaned up", () => {
  const id = "6a7c87f4-0375-4160-8c12-55af8a589221";
  const path = sponsorLogoPath(id, "png");
  const base = "https://example.supabase.co";
  const url = `${base}/storage/v1/object/public/sponsor-logos/${path}`;
  assert.equal(storedSponsorLogoPath(url, base, id), path);
  assert.equal(storedSponsorLogoPath(url, base, "246dd934-f2a5-4785-a032-cdbe9104cf25"), null);
  assert.equal(storedSponsorLogoPath("https://example.com/logo.png", base, id), null);
});
