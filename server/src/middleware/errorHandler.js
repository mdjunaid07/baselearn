// Centralized so routes can just `next(err)` and trust a consistent JSON shape back.
export function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || "Something went wrong on the server." });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `No route: ${req.method} ${req.originalUrl}` });
}
