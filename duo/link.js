// Two-iPad play (duo): the line between the two iPads. Owner 2026-11-10: "Dùng cách đồng cỏ phép thuật đang làm" -> PeerJS
// room numbers as in dong-co-phep-thuat/game4 (p2pRoom), cut down to exactly one host and one guest.
// - The room's PeerJS id comes from the game key (proof.js), so only iPads opened with the private link can find it.
// - On every new connection both sides say hello (build version + a nonce) and prove the key (HMAC of the other's nonce);
//   the host then says welcome. Nothing about the child ever goes over the line: the session sends numbers and ids only.
// - One guest. A dropped line comes back by itself (guest redials for 60 s; host waits for the same guest for 60 s).
import {roomPeerId, newNonce, proofFor, checkProof} from './proof.js?v=1011.2112';

const randomCode = () => String(1000 + Math.floor(Math.random() * 9000));
const fail = (code, message = code) => Object.assign(Error(message), {code});
const sleep = ms => new Promise(r => setTimeout(r, ms));

// A Conn has ONE data handler and ONE close handler (set again = replace). Data that arrives while no data handler is set
// waits in a queue, so nothing is lost between the handshake and the session taking over.
function makeConn(sendRaw, closeRaw) {
  let onD = null, onC = null, closed = false;
  const q = [];
  return {
    conn: {
      send(o) { if (!closed) sendRaw(o); },
      onData(fn) { onD = fn; while (fn && q.length) fn(q.shift()); },
      onClose(fn) { onC = fn; if (closed && fn) fn(); },
      close() { if (closed) return; closeRaw(); end(); },
    },
    data(d) { if (closed) return; if (onD) onD(d); else q.push(d); },
    end,
  };
  function end() { if (closed) return; closed = true; onC?.(); }
}

// PeerJS (vendored lib/peerjs.min.js). host(id) registers the id with the free PeerJS server; dial(id) connects to it.
export function peerTransport({libUrl}) {
  let lib = null, guestPeer = null;
  const load = () => lib || (lib = window.Peer ? Promise.resolve() : new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = libUrl; s.onload = () => res();
    s.onerror = () => { lib = null; rej(fail('network', 'peerjs did not load')); };
    document.head.append(s);
  }));
  const wrap = c => {
    const w = makeConn(o => { if (c.open) try { c.send(o); } catch (e) {} }, () => { try { c.close(); } catch (e) {} });
    c.on('data', d => w.data(d)); c.on('close', w.end); c.on('error', w.end);
    return w.conn;
  };
  const whenOpen = peer => new Promise((res, rej) => {
    let done = false;
    peer.on('open', () => { done = true; res(); });
    peer.on('error', e => { if (!done) { done = true; try { peer.destroy(); } catch (x) {} rej(fail(e?.type === 'unavailable-id' ? 'id-taken' : 'error', String(e?.type || e))); } });
  });
  const keepUp = peer => peer.on('disconnected', () => { if (!peer.destroyed) try { peer.reconnect(); } catch (e) {} });
  return {
    async host(id) {
      await load();
      const peer = new window.Peer(id, {debug: 0});
      await whenOpen(peer); keepUp(peer);
      let onConn = () => {};
      peer.on('connection', c => { const w = wrap(c); if (c.open) onConn(w); else c.on('open', () => onConn(w)); });
      return {onConn(fn) { onConn = fn; }, close() { try { peer.destroy(); } catch (e) {} }};
    },
    async dial(id) {
      await load();
      if (!guestPeer || guestPeer.destroyed) { const p = new window.Peer(undefined, {debug: 0}); guestPeer = p; try { await whenOpen(p); } catch (e) { guestPeer = null; throw e; } keepUp(p); }
      const peer = guestPeer;
      if (peer.disconnected) try { peer.reconnect(); } catch (e) {}
      return new Promise((res, rej) => {
        const c = peer.connect(id, {reliable: true, serialization: 'json'});
        const done = () => { clearTimeout(t); peer.off?.('error', onErr); };
        // the server says nobody holds that id: the room does not exist (or is gone)
        const onErr = e => { if (e?.type === 'peer-unavailable' && (!e.message || e.message.includes(id))) { done(); try { c.close(); } catch (x) {} rej(fail('no-room')); } };
        const t = setTimeout(() => { done(); try { c.close(); } catch (x) {} rej(fail('no-room')); }, 10000);
        peer.on('error', onErr);
        c.on('open', () => { done(); res(wrap(c)); });
      });
    },
  };
}

// Same contract over BroadcastChannel, for tests with two pages of one browser (no network, no PeerJS server).
export function broadcastTransport() {
  const ids = new BroadcastChannel('duo-ids'), mine = new Map();
  const over = (connId, me) => {
    const ch = new BroadcastChannel('duo-c-' + connId);
    const w = makeConn(o => ch.postMessage({from: me, data: o}), () => { ch.postMessage({from: me, close: true}); ch.close(); });
    ch.onmessage = e => { const m = e.data; if (!m || m.from === me) return; if (m.close) { ch.close(); w.end(); } else w.data(m.data); };
    return w.conn;
  };
  ids.onmessage = e => {
    const m = e.data;
    if (m?.q === 'who' && mine.has(m.id)) ids.postMessage({a: 'mine', id: m.id, nonce: m.nonce});
    else if (m?.q === 'dial' && mine.has(m.id)) mine.get(m.id)(m.conn);
  };
  const reply = (match, ms) => new Promise(res => {
    const f = e => { if (match(e.data)) { clearTimeout(t); ids.removeEventListener('message', f); res(true); } };
    const t = setTimeout(() => { ids.removeEventListener('message', f); res(false); }, ms);
    ids.addEventListener('message', f);
  });
  return {
    async host(id) {
      const nonce = Math.random().toString(36).slice(2), asked = reply(d => d?.a === 'mine' && d.id === id && d.nonce === nonce, 200);
      ids.postMessage({q: 'who', id, nonce});
      if (mine.has(id) || await asked) throw fail('id-taken');
      let onConn = () => {};
      mine.set(id, connId => { const c = over(connId, 'b'); ids.postMessage({a: 'accept', conn: connId}); onConn(c); });
      return {onConn(fn) { onConn = fn; }, close() { mine.delete(id); }};
    },
    async dial(id) {
      const connId = Math.random().toString(36).slice(2) + Date.now().toString(36), c = over(connId, 'a');
      const accepted = reply(d => d?.a === 'accept' && d.conn === connId, 5000);
      ids.postMessage({q: 'dial', id, conn: connId});
      if (!await accepted) { c.close(); throw fail('no-room'); }
      return c;
    },
  };
}

// role 'host': hosts `code` (or a random number; a taken number -> up to 5 random tries) and waits for a guest.
// role 'guest': joins `code`; rejects with code 'no-room' | 'key' | 'version' | 'full' | 'error'.
// Link.state: 'waiting' (host without guest) | 'open' | 'reconnecting' | 'closed'; onState(fn(state, info)), info.why:
// 'key' | 'version' (a refused visitor, state unchanged on the host) | 'left' | 'lost' | 'closed' | 'full'.
export async function openLink({role, code, keyBytes, version, transport, gid = crypto.randomUUID()}) {
  const handlers = new Map(), stateFns = [];
  let conn = null, closing = false, partnerGid = null, lostTimer = 0, hostHandle = null;
  const link = {
    role, code: null, hostId: null, state: 'connecting', info: null,
    send(msg) { if (link.state === 'open' && conn) conn.send(msg); },
    on(type, fn) { if (!handlers.has(type)) handlers.set(type, new Set()); handlers.get(type).add(fn); return () => handlers.get(type).delete(fn); },
    onState(fn) { stateFns.push(fn); return () => { const i = stateFns.indexOf(fn); if (i >= 0) stateFns.splice(i, 1); }; },
    close() {
      if (closing) return; closing = true; clearTimeout(lostTimer);
      const c = conn; conn = null;
      if (c) c.send({t: 'bye', why: 'closed'});
      setTimeout(() => { c?.close(); hostHandle?.close(); }, 200);   // let the bye leave first
      setState('closed', {why: 'closed'});
    },
    _dropConn() { conn?.close(); },   // tests: the line drops without a goodbye
  };
  function setState(s, info = null) { link.state = s; link.info = info; for (const f of [...stateFns]) try { f(s, info); } catch (e) { console.warn('duo link state', e); } }
  function deliver(m) {
    if (!m || typeof m !== 'object' || typeof m.t !== 'string' || m.t === 'hello' || m.t === 'proof' || m.t === 'welcome') return;
    if (m.t === 'bye') return onBye(m);
    for (const f of [...(handlers.get(m.t) || [])]) try { f(m); } catch (e) { console.warn('duo link', m.t, e); }
  }
  function onBye(m) {
    const c = conn; conn = null; c?.close();
    if (role === 'guest') { closing = true; setState('closed', {why: m.why || 'closed'}); }
    else { partnerGid = null; setState('waiting', {why: 'left'}); }
  }
  function attach(c, theirGid) {
    if (conn && conn !== c) { const old = conn; conn = null; old.close(); }   // the same guest dialled again: the new line wins
    conn = c; partnerGid = theirGid; clearTimeout(lostTimer);
    c.onData(deliver);
    c.onClose(() => { if (conn !== c) return; conn = null; if (!closing && link.state !== 'closed') dropped(); });
    setState('open');
  }
  function dropped() {
    setState('reconnecting');
    if (role === 'guest') redial();
    else lostTimer = setTimeout(() => { if (!conn && !closing) { partnerGid = null; setState('waiting', {why: 'lost'}); } }, 60000);
  }
  async function redial() {
    const until = Date.now() + 60000;
    while (!closing && !conn && Date.now() < until) {
      try {
        const c = await transport.dial(link.hostId), r = await handshake(c);
        if (closing) { c.close(); return; }
        attach(c, r.gid); return;
      } catch (e) { if (['key', 'version', 'full', 'closed'].includes(e.code)) { closing = true; setState('closed', {why: e.code}); return; } }
      await sleep(1500);
    }
    if (!closing && !conn) { closing = true; setState('closed', {why: 'lost'}); }
  }
  function handshake(c) {
    const nonce = newNonce();
    return new Promise((resolve, reject) => {
      let theirs = null, proved = false, welcomed = false, over = false;
      const stop = why => { if (over) return; over = true; clearTimeout(timer); c.onData(null); c.onClose(null); c.close(); reject(fail(why)); };
      const timer = setTimeout(() => stop('error'), 8000);
      const done = () => {
        if (over || !theirs || !proved) return;
        if (role === 'host') {
          // only a guest that proved the key learns that the room is taken
          if (link.state === 'open' && partnerGid && theirs.gid !== partnerGid) { c.send({t: 'bye', why: 'full'}); return stop('full'); }
          c.send({t: 'welcome'});
        } else if (!welcomed) return;
        over = true; clearTimeout(timer); c.onData(null); c.onClose(null); resolve({gid: theirs.gid});
      };
      c.onClose(() => stop('error'));
      c.onData(async m => {
        if (over || !m || typeof m !== 'object') return;
        if (m.t === 'hello') {
          if (m.v !== version) { c.send({t: 'bye', why: 'version'}); return stop('version'); }
          theirs = m;
          c.send({t: 'proof', mac: await proofFor(keyBytes, link.hostId, String(m.nonce))});
          done();
        } else if (m.t === 'proof') {
          if (!await checkProof(keyBytes, link.hostId, nonce, m.mac)) { c.send({t: 'bye', why: 'key'}); return stop('key'); }
          proved = true; done();
        } else if (m.t === 'welcome') { welcomed = true; done(); }
        else if (m.t === 'bye') stop(m.why || 'closed');
      });
      c.send({t: 'hello', v: version, nonce, gid});
    });
  }

  if (role === 'host') {
    let c0 = code || randomCode();
    for (let i = 0; ; i++) {
      link.hostId = await roomPeerId(keyBytes, c0);
      try { hostHandle = await transport.host(link.hostId); break; }
      catch (e) { if (e.code !== 'id-taken' || i >= 4) throw e; c0 = randomCode(); }
    }
    link.code = c0;
    hostHandle.onConn(c => handshake(c).then(r => { if (closing) c.close(); else attach(c, r.gid); }, e => { if (e.code === 'key' || e.code === 'version') setState(link.state, {why: e.code}); }));
    setState('waiting');
    return link;
  }
  link.code = code; link.hostId = await roomPeerId(keyBytes, code);
  const c = await transport.dial(link.hostId);
  const r = await handshake(c);
  attach(c, r.gid);
  return link;
}
