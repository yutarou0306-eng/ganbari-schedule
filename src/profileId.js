// Each child's "stamp book" profile gets its own short id in the URL, e.g.
// ?profile=qz8fa2kd — separate from a schedule's ?id=. Whoever has the link
// (parent or child, on any device) sees the same accumulated stamps and
// reward list, since the profile itself lives in Supabase, not on-device.

export function getProfileIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("profile");
}

export function generateProfileId(len = 8) {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789"; // no easily-confused characters
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}
