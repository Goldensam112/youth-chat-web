import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const message = err instanceof Error ? err.message : "Unexpected server error";
  const status = message.includes("not found") ? 404 : message.includes("Insufficient") ? 402 : 400;
  res.status(status).json({ message });
};
