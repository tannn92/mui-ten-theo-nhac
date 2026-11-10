// Two-iPad play (duo): entry point, loaded only when "Chơi 2 người" is tapped (index.html). startDuo(game) gives a controller
// to host or join a room; openDuo(game) shows the screens (ui.js) on top of it. Test switches: ?duoTransport=broadcast (two
// pages of one browser, no PeerJS server) and ?duoVersion=X (pretend another build).
import {openLink, peerTransport, broadcastTransport} from './link.js?v=1011.2112';
import {createSession} from './session.js?v=1011.2112';
import {createUI} from './ui.js?v=1011.2112';

export async function startDuo(game, opts = {}) {
  const q = new URLSearchParams(location.search);
  const kind = q.get('duoTransport') || opts.transport || 'peer', version = q.get('duoVersion') || game.V;
  const transport = kind === 'broadcast' ? broadcastTransport() : peerTransport({libUrl: 'lib/peerjs.min.js?v=' + encodeURIComponent(game.V)});
  const gid = crypto.randomUUID();   // this page, for the whole room: a reconnect replaces its own line
  const make = async (role, code) => createSession({link: await openLink({role, code, keyBytes: game.keyBytes(), version, transport, gid}), game, dance: window.Dance});
  return {host: () => make('host'), join: code => make('guest', String(code)), ui: null};
}

let ui = null;
export async function openDuo(game) {
  if (!document.querySelector('link[data-duo-css]')) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.dataset.duoCss = '1'; l.href = new URL('./duo.css?v=' + encodeURIComponent(game.V), import.meta.url).href;
    document.head.append(l);
  }
  if (!ui) ui = createUI({game, start: () => startDuo(game)});
  ui.open();
  return ui;
}
