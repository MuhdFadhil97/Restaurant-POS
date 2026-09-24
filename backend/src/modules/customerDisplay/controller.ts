import { Request, Response } from "express";
import { asyncHandler } from "../../middleware/errorHandler";
import * as service from "./service";
import { onSnapshot } from "./store";

export const publish = asyncHandler(async (req: Request, res: Response) => {
  res.json(await service.publishSnapshot(Number(req.params.terminalId), req.body, req.user));
});

// Public: lets the display page (opened by its token) discover which
// terminal and mode it is before deciding BroadcastChannel vs. SSE.
export const info = asyncHandler(async (req: Request, res: Response) => {
  const terminal = await service.resolveDisplayTerminal(req.params.token);
  res.json({
    terminalId: terminal.id,
    mode: terminal.customerDisplayMode,
    outlet: terminal.outlet,
  });
});

// Server-Sent Events: one push per cart change, no polling. The initial
// event carries whatever snapshot already exists (or an idle placeholder) so
// a display that opens mid-shift isn't blank until the next cart change.
export const stream = asyncHandler(async (req: Request, res: Response) => {
  const terminal = await service.resolveDisplayTerminal(req.params.token);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  const send = (snapshot: unknown) => res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
  send(service.currentOrIdleSnapshot(terminal.id, terminal.outlet));

  const unsubscribe = onSnapshot(terminal.id, send);
  // Comment ping keeps the connection alive through proxies that time out
  // idle connections (the SSE spec calls these lines out as ignorable).
  const keepAlive = setInterval(() => res.write(": ping\n\n"), 20_000);

  req.on("close", () => {
    clearInterval(keepAlive);
    unsubscribe();
  });
});
