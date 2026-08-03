// Each schedule (each family) gets its own short id in the URL, e.g. ?id=ax7fq2kd
// Whoever has the link can open the same schedule from any device.

function randomId(len = 8) {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789"; // no easily-confused characters
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

export function resolveScheduleId() {
  const params = new URLSearchParams(window.location.search);
  let id = params.get("id");
  if (!id) {
    id = randomId(8);
    params.set("id", id);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }
  return id;
}
