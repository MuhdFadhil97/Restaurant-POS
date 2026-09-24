import { beforeEach, describe, expect, it, vi } from "vitest";

// Regression test for a crash bug found 2026-09-24 (see memory.md): an async
// Express middleware that throws instead of calling next(err) rejects a
// promise Express never awaits, which kills the whole backend process with
// an unhandled rejection instead of returning an error response — one bad
// request takes down every till at every outlet. Fixed by wrapping each of
// these with asyncHandler at its definition. This test exists so removing
// that wrapping (e.g. during a refactor) fails loudly here instead of
// crashing a live server.
vi.mock("../src/lib/prisma", () => ({
  prisma: {
    printBridge: { findFirst: vi.fn(), update: vi.fn().mockResolvedValue(undefined) },
    outlet: { count: vi.fn() },
    user: { count: vi.fn() },
  },
}));
vi.mock("../src/lib/license", () => ({ getLicenseStatus: vi.fn() }));

import { prisma } from "../src/lib/prisma";
import { getLicenseStatus } from "../src/lib/license";
import { authenticateBridge } from "../src/middleware/bridgeAuth";
import { enforceOutletLimit, enforceUserLimit } from "../src/middleware/license";

type Middleware = (req: unknown, res: unknown, next: (err?: unknown) => void) => unknown;

// Calls the middleware and waits for next() — however it settles internally
// (asyncHandler's wrapper doesn't return the inner promise, so we can't just
// await the call). If the middleware instead lets an error escape as an
// unhandled rejection, next() is never called and this times out, failing
// the test deterministically rather than crashing the test process.
async function runAndWaitForNext(mw: Middleware, req: unknown = {}): Promise<ReturnType<typeof vi.fn>> {
  const next = vi.fn();
  mw(req, {}, next);
  await vi.waitFor(() => expect(next).toHaveBeenCalled());
  return next;
}

describe("async middleware error safety", () => {
  beforeEach(() => vi.clearAllMocks());

  it("authenticateBridge reports a missing token via next(err), not a rejection", async () => {
    const next = await runAndWaitForNext(authenticateBridge, { headers: {} });
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 401 });
  });

  it("authenticateBridge reports an unknown token via next(err), not a rejection", async () => {
    (prisma.printBridge.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const next = await runAndWaitForNext(authenticateBridge, { headers: { authorization: "Bearer bad" } });
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 401 });
  });

  it("enforceOutletLimit reports a limit breach via next(err), not a rejection", async () => {
    (getLicenseStatus as ReturnType<typeof vi.fn>).mockReturnValue({ payload: { maxOutlets: 1 } });
    (prisma.outlet.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    const next = await runAndWaitForNext(enforceOutletLimit);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 403 });
  });

  it("enforceUserLimit reports a limit breach via next(err), not a rejection", async () => {
    (getLicenseStatus as ReturnType<typeof vi.fn>).mockReturnValue({ payload: { maxUsers: 1 } });
    (prisma.user.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    const next = await runAndWaitForNext(enforceUserLimit);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 403 });
  });
});
