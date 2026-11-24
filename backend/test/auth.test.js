import test from "node:test";
import assert from "node:assert/strict";
import { authenticate, authorize } from "../middleware/auth.js";

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test("authenticate rejects a request without a bearer token", async () => {
  const res = response();
  let continued = false;
  await authenticate({ headers: {} }, res, () => { continued = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(continued, false);
});

test("authorize rejects a role that is not allowed", () => {
  const res = response();
  let continued = false;
  authorize("SUPER_ADMIN")({ user: { role: "STAFF" } }, res, () => { continued = true; });
  assert.equal(res.statusCode, 403);
  assert.equal(continued, false);
});

test("authorize allows a permitted role", () => {
  const res = response();
  let continued = false;
  authorize("ADMIN", "SUPER_ADMIN")({ user: { role: "ADMIN" } }, res, () => { continued = true; });
  assert.equal(continued, true);
});
