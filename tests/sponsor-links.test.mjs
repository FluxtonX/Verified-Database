import assert from "node:assert/strict";
import test from "node:test";
import { sponsorCardUrl } from "../src/lib/sponsor-links.ts";

const campaign = "utm_source=verifeddb&utm_medium=referral&utm_campaign=sponsor_card";

test("sponsor cards identify VerifedDB for bare and already-tagged destinations", () => {
  assert.equal(sponsorCardUrl("https://www.creem.io/"), `https://www.creem.io/?${campaign}`);
  const original = "https://example.com/offer?utm_source=trustmrr&utm_source=yt&UTM_Medium=video&utm_campaign=old&utm_creator=someone";
  const tagged = sponsorCardUrl(original);
  assert.equal(tagged, `https://example.com/offer?${campaign}`);
  assert.equal(sponsorCardUrl(tagged), tagged);
});

test("copied reference affiliate links no longer credit another publisher", () => {
  assert.equal(sponsorCardUrl("https://higgsfield.ai/marclou"), `https://higgsfield.ai/?${campaign}`);
  assert.equal(sponsorCardUrl("https://higgsfield.ai/?utm_source=yt&utm_medium=video&utm_category=yt&utm_campaign=marclou&utm_creator=marclou&utm_content_type=ie&utm_post=tbiStz&invite_code=marclou"), `https://higgsfield.ai/?${campaign}`);
  assert.equal(sponsorCardUrl("https://aisdr.com/?ref=trustmrr"), `https://aisdr.com/?${campaign}`);
});

test("advertiser landing pages, genuine partner codes and fragments are preserved", () => {
  assert.equal(sponsorCardUrl("https://example.com/partner/verifeddb?ref=our-partner&coupon=SAVE20#pricing"), `https://example.com/partner/verifeddb?ref=our-partner&coupon=SAVE20&${campaign}#pricing`);
  assert.equal(sponsorCardUrl("https://higgsfield.ai/verifeddb?invite_code=our-approved-code"), `https://higgsfield.ai/verifeddb?invite_code=our-approved-code&${campaign}`);
});

test("unsafe or invalid destinations cannot become sponsor links", () => {
  for (const destination of ["", "/relative", "not-a-url", "javascript:alert(1)", "data:text/html,test", "https://user:password@example.com/"]) {
    assert.equal(sponsorCardUrl(destination), null, destination);
  }
});
