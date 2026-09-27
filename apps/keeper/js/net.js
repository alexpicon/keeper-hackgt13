// Author: Alex Picon <alexnpc@me.com>
// Same-origin WebSocket relay so two real devices (a headset/laptop and a
// phone) can pair with a short buoy code over the public internet. It layers on
// top of BroadcastChannel, which already covers two tabs on one machine. Both
// are best-effort: if the relay is down, the single-device demo still runs.

const CODES = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O, easier to read on a card

export function makeCode() {
  let s = "";
  for (let i = 0; i < 4; i++) s += CODES[(Math.random() * CODES.length) | 0];
  return s;
}

export function makeNet(room, role, onMessage, onStatus) {
  if (!room || typeof WebSocket === "undefined") return null;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const url = `${proto}://${location.host}/api/keeper/ws?room=${room}&role=${role}`;
  let sock = null;
  let closed = false;
  let backoff = 600;

  function connect() {
    if (closed) return;
    try {
      sock = new WebSocket(url);
    } catch {
      onStatus?.("offline");
      return;
    }
    sock.onopen = () => {
      backoff = 600;
      onStatus?.("waiting");
    };
    sock.onmessage = (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      if (msg.t === "peers") onStatus?.(msg.n > 1 ? "paired" : "waiting");
      else onMessage?.(msg);
    };
    sock.onclose = () => {
      onStatus?.("offline");
      if (!closed) {
        setTimeout(connect, backoff);
        backoff = Math.min(5000, backoff * 1.6);
      }
    };
    sock.onerror = () => sock && sock.close();
  }
  connect();

  return {
    send(obj) {
      if (sock && sock.readyState === WebSocket.OPEN) {
        try {
          sock.send(JSON.stringify(obj));
        } catch {
          /* dropped frame is fine; snapshots reconcile */
        }
      }
    },
    close() {
      closed = true;
      sock?.close();
    },
  };
}
