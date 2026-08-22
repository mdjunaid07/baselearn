import rateLimit from "express-rate-limit";

// A 4-digit student PIN only has 10,000 possibilities, so it's brute-forceable in
// minutes without this. Keyed by IP (express-rate-limit's default) rather than by
// studentId/email, so an attacker can't dodge the limit by cycling target accounts
// from one machine. Only failed attempts count against the limit, so a legitimate
// user who mistypes once isn't at risk of getting locked out by their own retries.
//
// A factory rather than one shared instance: each rateLimit() call owns its own
// counter/store, so exhausting the student login limiter (e.g. from repeated PIN
// typos) can never also lock out the teacher login endpoint for the same IP, or
// vice versa — they were sharing one instance before, which was the bug.
function makeLoginRateLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: { error: "Too many login attempts. Please try again in a few minutes." },
  });
}

export const studentLoginRateLimiter = makeLoginRateLimiter();
export const teacherLoginRateLimiter = makeLoginRateLimiter();
