export function getAuthCookieOptions() {
  const crossOrigin = Boolean(process.env.FRONTEND_URL);
  return {
    httpOnly: true,
    sameSite: crossOrigin ? ("none" as const) : ("lax" as const),
    secure: crossOrigin,
  };
}
