// Two-iPad play (duo): the room's rules over a link (link.js). Owner 2026-11-10: one iPad creates the room and picks the song,
// the other joins and picks clothes, taps "Sẵn sàng"; the host taps "Bắt đầu" and both go in together; two dancers on stage,
// head-to-head scores. Messages carry numbers, song slugs, level keys and wardrobe option ids only.
// Every `at` on the line is in HOST performance.now() ms; the guest keeps offset = host - local (bestOffset of 20 pings).
import {bestOffset, ctxTimeAt} from './clock.js?v=1111.0832';

const COUNTDOWN_MS = 3500, PINGS = 20, PING_GAP_MS = 50, RESULT_WAIT_MS = 5000, JOIN_LEAD_MS = 1500, SOLO_LEAD_MS = 1000;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export function createSession({link, game, dance}) {
  const isHost = link.role === 'host', fns = new Map();
  let offset = 0, samples = [], dressTimer = 0, dressed = Promise.resolve(), doneTimer = 0, countTimer = 0, prepTimer = 0, watched = null;
  const audioOk = () => game.ctx()?.state === 'running';
  const S = {
    role: link.role, code: link.code, phase: 'lobby', closed: null,
    room: {song: null, level: null},
    me: {outfit: dance.outfitIds(), ready: false, mute: localStorage.getItem('duo-mute') === '1'},
    // audioOk: false while the partner's sound may be off (it went to the home screen, or its AudioContext stopped)
    partner: {outfit: null, ready: false, mute: false, status: 'none', score: 0, hits: 0, combo: 0, maxCombo: 0, playable: 0, result: null, audioOk: true},
    notice: null,   // 'prepFail': the other iPad could not open the song
    debug: {offset: 0, rtt: null, startWall: null, lastFrom: null, link},
    // run state (reset at each start from 0:00)
    run: {loadedMe: false, loadedPartner: false, myPauseAt: null, partnerPauseAt: null, resumeMe: false, resumePartner: false, solo: false, myResult: null, doneSent: false},
  };
  const emit = (ev, ...a) => { for (const f of [...(fns.get(ev) || [])]) try { f(...a); } catch (e) { console.warn('duo session', ev, e); } };
  const changed = () => emit('change');
  const send = m => link.send(m);

  // ---- lobby ----
  function sendLobby() { send({t: 'lobby', ...(isHost ? {song: S.room.song, level: S.room.level} : {}), outfit: S.me.outfit, ready: S.me.ready, mute: S.me.mute}); }
  // the partner's dancer wears the partner's clothes (debounced: a set is several taps in one go)
  function dress() { clearTimeout(dressTimer); dressTimer = setTimeout(() => { dressed = Promise.resolve(dance.setDuo(S.partner.outfit ? {side: isHost ? 'L' : 'R', partner: S.partner.outfit} : null)).catch(e => console.warn('duo dress', e)); }, 300); }
  link.on('lobby', m => {
    if (!isHost && 'song' in m) { S.room.song = m.song ?? null; S.room.level = m.level ?? null; }
    const newOutfit = !same(m.outfit, S.partner.outfit);
    Object.assign(S.partner, {outfit: m.outfit || null, ready: !!m.ready, mute: !!m.mute});
    if (S.partner.status === 'none' || S.partner.status === 'reconnecting' || (S.partner.status === 'left' && S.phase === 'lobby')) S.partner.status = 'here';
    if (newOutfit) dress();
    changed();
  });

  // ---- clock (guest) ----
  link.on('ping', m => { if (isHost) send({t: 'pong', a: m.a, h: performance.now()}); });
  link.on('pong', m => { if (!isHost) samples.push({t0: m.a, th: m.h, t1: performance.now()}); });
  async function syncClock() {
    if (isHost) return;
    samples = [];
    for (let i = 0; i < PINGS && link.state === 'open'; i++) { send({t: 'ping', a: performance.now()}); await sleep(PING_GAP_MS); }
    await sleep(150);
    if (samples.length) { const r = bestOffset(samples); offset = r.offset; S.debug.offset = r.offset; S.debug.rtt = r.rtt; }
  }

  // ---- the line comes and goes ----
  link.onState((st, info) => {
    S.linkWhy = info?.why || null;   // e.g. 'version': someone with another build tried to join
    if (st === 'open') {
      if (S.partner.status !== 'paused') S.partner.status = 'here'; sendLobby();
      if (S.phase === 'paused' && S.run.resumeMe) syncClock().then(() => { if (S.phase !== 'paused') return; send({t: 'resumeReady', ok: audioOk()}); if (isHost) maybeResume(); });   // a ▶ lost with the old line
      else syncClock();
    }
    else if (st === 'reconnecting') S.partner.status = 'reconnecting';
    else if (st === 'waiting' && (info?.why === 'left' || info?.why === 'lost')) partnerGone();
    else if (st === 'closed') { S.closed = info?.why || 'closed'; partnerGone(); }
    changed();
  });
  function partnerGone() {
    S.partner.status = 'left'; S.partner.ready = false;
    if (S.phase === 'prep') { clearTimeout(prepTimer); S.phase = 'lobby'; }   // the song was still opening
    if (S.phase === 'lobby') { S.partner.outfit = null; dress(); }   // in a song the partner's dancer keeps dancing
    if (S.phase === 'done' && !S.run.doneSent) emitDone();
  }

  // ---- start ----
  async function prepareLocal() {
    await new Promise(r => setTimeout(r, 0)); await dressed;   // the partner's clothes are on before the stage is built
    await game.prepare(S.room.song, S.room.level);
    game.mute(S.me.mute);
  }
  function newRun() {
    Object.assign(S.run, {loadedMe: false, loadedPartner: false, myPauseAt: null, partnerPauseAt: null, resumeMe: false, resumePartner: false, solo: false, myResult: null, doneSent: false});
    Object.assign(S.partner, {score: 0, hits: 0, combo: 0, maxCombo: 0, playable: 0, result: null});
    if (S.partner.status === 'left' && link.state === 'open') S.partner.status = 'here';
  }
  async function start() {
    if (!isHost || S.phase !== 'lobby' || !S.partner.ready || !S.room.song || !S.room.level || link.state !== 'open') return false;
    game.unlockAudio();   // inside the tap: iPad audio may only start after a touch
    newRun(); S.notice = null; S.phase = 'prep'; changed();
    send({t: 'prep', song: S.room.song, level: S.room.level});
    clearTimeout(prepTimer); prepTimer = setTimeout(() => { if (S.phase === 'prep') { send({t: 'prepCancel'}); S.phase = 'lobby'; S.notice = 'prepFail'; changed(); } }, 20000);   // never hang on 'Đang mở bài…'
    try { await prepareLocal(); } catch (e) { console.warn('duo prepare', e); clearTimeout(prepTimer); send({t: 'prepCancel'}); S.phase = 'lobby'; changed(); return false; }
    S.run.loadedMe = true; maybeGo();
    return true;
  }
  link.on('prep', async m => {
    if (isHost) return;
    S.room.song = m.song; S.room.level = m.level; newRun(); S.phase = 'prep'; changed();
    const sync = syncClock();
    try { await prepareLocal(); } catch (e) { console.warn('duo prepare', e); send({t: 'prepFail'}); S.phase = 'lobby'; changed(); return; }
    await sync;
    if (S.phase === 'prep') send({t: 'loaded'});
  });
  link.on('prepFail', () => { if (isHost && S.phase === 'prep') { clearTimeout(prepTimer); S.phase = 'lobby'; S.notice = 'prepFail'; changed(); } });
  link.on('prepCancel', () => { if (!isHost && S.phase === 'prep') { S.phase = 'lobby'; changed(); } });
  link.on('loaded', () => { if (isHost) { S.run.loadedPartner = true; maybeGo(); } });
  function maybeGo() {
    if (!isHost || S.phase !== 'prep' || !S.run.loadedMe || !S.run.loadedPartner) return;
    clearTimeout(prepTimer);
    const at = performance.now() + COUNTDOWN_MS;
    send({t: 'go', at, from: 0}); go(at, 0);
  }
  link.on('go', m => { if (!isHost) go(m.at, m.from); });
  // heard from song time `from` at host time `atHost`, on this iPad's own clock
  async function go(atHost, from) {
    let ac = game.ctx();
    if (ac && ac.state !== 'running') { try { await Promise.race([ac.resume(), sleep(1500)]); } catch (e) {} }
    if (!ac || ac.state !== 'running') {   // iPad audio stays off until a touch: stay paused, this iPad's ▶ brings it in
      if (S.phase !== 'paused') { S.run.myPauseAt = game.pause(); S.phase = 'paused'; }
      S.run.resumeMe = false; changed(); return;
    }
    watchAudio();
    const local = atHost - offset;
    game.mute(S.me.mute);
    game.launch(ctxTimeAt(ac, local, performance.now()), from);
    S.debug.startWall = performance.timeOrigin + local; S.debug.lastFrom = from;
    Object.assign(S.run, {myPauseAt: null, partnerPauseAt: null, resumeMe: false, resumePartner: false});
    if (S.partner.status === 'paused') S.partner.status = 'here';
    S.phase = 'countdown'; emit('countdown', local); changed();
    clearTimeout(countTimer); countTimer = setTimeout(() => { if (S.phase === 'countdown') { S.phase = 'play'; changed(); } }, Math.max(0, local - performance.now()));
  }

  // ---- in the song ----
  game.hooks.hit = g => { const st = game.state(); send({t: 'score', score: st.score, hits: st.hits, combo: st.combo, maxCombo: st.maxCombo, playable: st.playable, grade: g}); };
  link.on('score', m => {
    for (const k of ['score', 'hits', 'combo', 'maxCombo', 'playable']) if (Number.isFinite(m[k])) S.partner[k] = m[k];
    if (m.grade != null) emit('partnerHit', m.grade);
    changed();
  });
  // pause: a tap on the stop button, or the iPad leaving the page (index.html pauseGame -> hooks.pause)
  // hidden: the page is leaving (home screen / lock): its audio may be off when it comes back, so a ▶ there is needed
  game.hooks.pause = at => { S.run.myPauseAt = at; S.run.resumeMe = false; S.run.solo = false; S.phase = 'paused'; send({t: 'pause', at, hidden: document.hidden, ok: audioOk()}); changed(); };
  link.on('pause', m => {
    S.run.partnerPauseAt = m.at; S.run.resumePartner = false; S.partner.status = 'paused'; S.partner.audioOk = !m.hidden && m.ok !== false;
    if (S.phase === 'play' || S.phase === 'countdown') { S.run.myPauseAt = game.pause(); S.run.resumeMe = false; S.phase = 'paused'; }
    changed();
  });
  // ▶ on this iPad (index.html resumeGame -> hooks.resume, audio already unlocked by the tap)
  game.hooks.resume = () => { resumeTap(); };
  async function resumeTap() {
    if (S.phase !== 'paused' || S.run.resumeMe) return;
    if (S.partner.status === 'left' || S.partner.result) return soloOn();   // nobody to wait for (left, or already finished)
    S.run.resumeMe = true; changed();
    if (link.state !== 'open' && !await waitOpen(10000)) { S.run.resumeMe = false; return soloOn(); }   // the line is coming back
    if (S.phase !== 'paused') return;
    await syncClock();
    if (S.phase !== 'paused') return;
    send({t: 'resumeReady', ok: audioOk()});
    if (isHost) maybeResume();
  }
  function waitOpen(ms) {
    return new Promise(res => { if (link.state === 'open') return res(true); let t = 0; const off = link.onState(st => { if (st === 'open') { off(); clearTimeout(t); res(true); } }); t = setTimeout(() => { off(); res(false); }, ms); });
  }
  link.on('resumeReady', m => {
    S.run.resumePartner = true; if (m.ok !== false) S.partner.audioOk = true;
    if (S.phase === 'play' || S.phase === 'countdown') { sendJoin(); return; }   // this iPad plays on: bring the partner into the running song
    if (isHost) maybeResume();
    changed();
  });
  link.on('audio', m => { S.partner.audioOk = !!m.ok; changed(); });
  // host: restart both when someone tapped ▶ and both iPads can sound (spec §8.6: "một trong hai bấm Tiếp tục thì cả hai")
  function maybeResume() {
    if (!isHost || S.phase !== 'paused' || !(S.run.resumeMe || S.run.resumePartner)) return;
    if (!audioOk()) return;                                     // this iPad's own ▶ is needed (its sound is off)
    if (!S.partner.audioOk && !S.run.resumePartner) return;     // the partner's own ▶ is needed
    const from = Math.min(S.run.myPauseAt ?? Infinity, S.run.partnerPauseAt ?? Infinity), at = performance.now() + COUNTDOWN_MS;
    const f = Number.isFinite(from) ? from : game.songTime();
    send({t: 'go', at, from: f}); go(at, f);
  }
  // "Chơi tiếp một mình": the partner has not come back; go on alone from where this iPad stopped
  function soloOn() {
    if (S.phase !== 'paused') return;
    game.unlockAudio();
    const from = S.run.myPauseAt ?? game.songTime();
    S.run.solo = true;
    go(performance.now() + SOLO_LEAD_MS + offset, from);
    // the partner already tapped ▶ and waits: bring it into this song once it plays
    if (S.run.resumePartner && S.partner.status !== 'left' && !S.partner.result) setTimeout(() => { if (S.phase === 'play' || S.phase === 'countdown') sendJoin(); }, SOLO_LEAD_MS + 80);
    changed();
  }
  function sendJoin() {
    if (link.state !== 'open') return;
    const local = performance.now() + JOIN_LEAD_MS, from = game.songTime() + JOIN_LEAD_MS / 1000;
    send({t: 'join', at: local + offset, from});
    S.run.solo = false; if (S.partner.status === 'paused') S.partner.status = 'here'; changed();
  }
  link.on('join', m => { if (S.phase === 'paused') go(m.at, m.from); });

  // an iOS interruption mid-song (call, Bluetooth, lock): pause both; and tell the partner when this iPad's sound is off/on
  function watchAudio() {
    const ac = game.ctx(); if (!ac || watched === ac) return; watched = ac;
    ac.addEventListener('statechange', () => {
      if (S.phase === 'left') return;
      send({t: 'audio', ok: audioOk()});
      if (!audioOk() && (S.phase === 'play' || S.phase === 'countdown')) globalThis.pauseGame?.();
      if (audioOk() && isHost) maybeResume();   // the host's own ▶ unlocked its sound
    });
  }
  const onVis = () => { if (S.phase !== 'left' && link.state === 'open') send({t: 'audio', ok: !document.hidden && audioOk()}); };
  document.addEventListener('visibilitychange', onVis);
  watchAudio();

  // ---- the end ----
  game.hooks.end = (r, early) => {
    S.run.myResult = r;
    if (early) { send({t: 'quit'}); S.phase = 'lobby'; if (!isHost) S.me.ready = false; sendLobby(); changed(); return; }   // left the song, still in the room
    send({t: 'end', result: r}); S.phase = 'done';
    clearTimeout(doneTimer);
    if (S.partner.result || S.partner.status === 'left') emitDone(); else doneTimer = setTimeout(emitDone, RESULT_WAIT_MS);
    changed();
  };
  link.on('end', m => {
    S.partner.result = m.result || null;
    if (m.result) for (const k of ['score', 'hits', 'maxCombo', 'playable']) if (Number.isFinite(m.result[k])) S.partner[k] = m.result[k];
    if (S.phase === 'done') emitDone();
    changed();
  });
  link.on('quit', () => { S.partner.status = 'left'; if (S.phase === 'done' && !S.run.doneSent) emitDone(); changed(); });
  function emitDone() { if (S.run.doneSent) return; S.run.doneSent = true; clearTimeout(doneTimer); emit('done', {me: S.run.myResult, partner: S.partner.result, partnerLeft: S.partner.status === 'left'}); }
  link.on('leave', () => { S.partner.status = 'left'; partnerGone(); changed(); });

  Object.assign(S, {
    on(ev, fn) { if (!fns.has(ev)) fns.set(ev, new Set()); fns.get(ev).add(fn); return () => fns.get(ev).delete(fn); },
    setSong(slug, level) { if (!isHost) return; S.room.song = slug; S.room.level = level; sendLobby(); changed(); },
    setReady(on) { if (on) game.unlockAudio(); S.me.ready = !!on; sendLobby(); changed(); },
    setMute(on) { S.me.mute = !!on; try { localStorage.setItem('duo-mute', on ? '1' : '0'); } catch (e) {} game.mute(S.me.mute); sendLobby(); changed(); },
    sendOutfit() { S.me.outfit = dance.outfitIds(); sendLobby(); },
    start, resumeTap, soloOn,
    backToRoom() { S.phase = 'lobby'; if (!isHost) S.me.ready = false; S.partner.result = null; sendLobby(); changed(); },
    leave() {
      send({t: 'leave'}); clearTimeout(dressTimer); clearTimeout(doneTimer); clearTimeout(countTimer); clearTimeout(prepTimer);
      document.removeEventListener('visibilitychange', onVis);
      Object.assign(game.hooks, {hit: null, end: null, pause: null, resume: null}); game.mute(false);   // the mute is for the room only
      setTimeout(() => link.close(), 100);
      Promise.resolve(dance.setDuo(null)).catch(() => {});
      S.phase = 'left'; changed();
    },
  });
  if (link.state === 'open') { S.partner.status = 'here'; sendLobby(); syncClock(); }   // a guest is open already
  return S;
}
