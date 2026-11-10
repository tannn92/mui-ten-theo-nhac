// Two-iPad play (duo): the screens. Owner 2026-11-10: "bấm tạo phòng rồi join rồi 1 máy làm máy chủ chọn nhạc các thứ, máy
// kia thì chọn đồ xong ready rồi máy chủ start thì cả 2 máy vào"; join by typing the room number.
// Lobby (this file, #duoPanel inside #menu): choice -> hosting (big number) / join (keypad) -> room (cards, song + level,
// Sẵn sàng / Bắt đầu, Tắt nhạc máy này, Rời phòng, the child's wardrobe). Every tap that may start sound unlocks audio first.
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
export const MSG = {
  'no-room': 'Không tìm thấy phòng có số này. Kiểm tra lại nhé.',
  full: 'Phòng đã đủ 2 người.',
  key: 'Không vào được phòng này.',
  version: 'Hai iPad đang chạy khác bản. Mở lại game để cập nhật.',
  error: 'Không kết nối được. Kiểm tra mạng rồi thử lại.',
};
const msgOf = code => MSG[code] || MSG.error;

export function createUI({game, start}) {
  const panel = $('duoPanel'), menu = $('menu'), outfitRow = $('outfitRow'), outfitHome = outfitRow.parentNode, outfitNext = outfitRow.nextSibling;
  let controller = null, S = null, screen = null, digits = '', busy = false, poll = 0, lastIds = '', offChange = null;
  const ui = {open, close, get session() { return S; }};
  window.__duoDbg = () => ({phase: S?.phase || null, role: S?.role || null, partner: S?.partner?.status || null, startWall: S?.debug?.startWall ?? null, offset: S?.debug?.offset ?? null, rtt: S?.debug?.rtt ?? null});   // tests
  let hud = null, raf = 0, countGo = null, sayUntil = 0, cheered = false;
  const doneEl = $('duoDone');

  function homeOutfits() { if (outfitRow.parentNode !== outfitHome) outfitHome.insertBefore(outfitRow, outfitNext); }
  function show(name, html) { homeOutfits(); screen = name; panel.dataset.screen = name; panel.innerHTML = html; panel.scrollTop = 0; }
  function say(text) { const m = $('duoMsg'); if (m) m.textContent = text || ''; }

  async function open() {
    menu.classList.add('duo'); menu.classList.remove('done', 'duodone'); document.body.classList.add('duo');
    S = null; controller = await start(); choice();
  }
  // leaving the room screens for any reason tears the room down completely: no hook, partner dancer or muted music may
  // stay behind for one-player play (final review C1/C2)
  function close() {
    clearInterval(poll); offChange?.(); offChange = null; unmountHud();
    if (S && S.phase !== 'left') try { S.leave(); } catch (e) {}
    Object.assign(game.hooks, {hit: null, end: null, pause: null, resume: null}); game.mute(false); Promise.resolve(window.Dance.setDuo(null)).catch(() => {});
    S = null; controller = null;
    homeOutfits(); panel.innerHTML = ''; screen = null; delete panel.dataset.screen;
    menu.classList.remove('duo', 'duodone'); document.body.classList.remove('duo');
  }
  function leave() { try { S?.leave(); } catch (e) {} close(); }

  // ---- screens ----
  function choice() {
    show('choice', `<h2 class="duo-title">Chơi 2 người</h2><p class="duo-sub">Hai iPad ngồi cạnh nhau, cùng nhảy một bài</p>
      <div class="duo-two"><button type="button" class="big pink duo-big" data-act="host">Tạo phòng</button><button type="button" class="big blue duo-big" data-act="join">Vào phòng</button></div>
      <p id="duoMsg" class="duo-msg" role="status"></p><button type="button" class="duo-link" data-act="back">Quay lại</button>`);
  }
  async function hosting() {
    show('hosting', `<h2 class="duo-title">Số phòng</h2><div id="duoCode" class="duo-code" aria-live="polite">····</div>
      <p class="duo-sub">Đưa số này cho bạn nhé</p><p class="duo-wait">Đang chờ bạn vào…</p>
      <p id="duoMsg" class="duo-msg" role="status"></p><button type="button" class="duo-link" data-act="cancel">Huỷ</button>`);
    try { S = await controller.host(); } catch (e) { say(msgOf(e.code)); return; }
    if (screen !== 'hosting') { S.leave(); return; }   // cancelled meanwhile
    $('duoCode').textContent = S.code;
    follow();
  }
  function joinScreen() {
    digits = '';
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => `<button type="button" class="duo-key" data-digit="${d}">${d}</button>`).join('');
    show('join', `<h2 class="duo-title">Nhập số phòng</h2><div class="duo-digits" aria-live="polite"><span></span><span></span><span></span><span></span></div>
      <div class="duo-keypad">${keys}<button type="button" class="duo-key del" data-act="del">Xoá</button><button type="button" class="duo-key" data-digit="0">0</button><span></span></div>
      <p id="duoMsg" class="duo-msg" role="status"></p><button type="button" class="duo-link" data-act="back">Quay lại</button>`);
  }
  function drawDigits() { panel.querySelectorAll('.duo-digits span').forEach((s, i) => { s.textContent = digits[i] || ''; s.classList.toggle('on', i < digits.length); }); }
  async function join(code) {
    busy = true; say('Đang nối…'); panel.querySelectorAll('.duo-key').forEach(k => k.disabled = true);
    try { const s = await controller.join(code); busy = false; if (screen !== 'join') { s.leave(); return; } S = s; follow(); }   // "Quay lại" while dialling
    catch (e) { busy = false; digits = ''; drawDigits(); say(msgOf(e.code)); panel.querySelectorAll('.duo-key').forEach(k => k.disabled = false); }
  }
  // from here on the screen follows the session
  function follow() {
    offChange?.(); offChange = S.on('change', update);
    mountHud(); S.on('countdown', go => { countGo = go; }); S.on('partnerHit', praise);
    clearInterval(poll); lastIds = JSON.stringify(window.Dance.outfitIds());
    // the wardrobe changes the child's clothes (a cold garment is sewn first): send the outfit when it really changed
    poll = setInterval(() => { if (!S) return; const ids = JSON.stringify(window.Dance.outfitIds()); if (ids !== lastIds) { lastIds = ids; S.sendOutfit(); } }, 400);
    update();
  }
  function room() {
    const songs = game.songs().map(s => `<div class="duo-song" data-slug="${esc(s.slug)}"><span class="duo-st">${esc(s.title)}</span>${game.levels.filter(L => game.hasLevel(s.slug, L.key)).map(L => `<button type="button" class="duo-lvl lvl-${L.key}" data-level="${L.key}">${esc(L.name)}</button>`).join('')}</div>`).join('');
    show('room', `<h2 class="duo-title" id="duoRoomTitle">Phòng ${esc(S.code)}</h2>
      <div class="duo-cards"><div class="duo-card host"><i aria-hidden="true"></i><b>Máy chủ</b><span class="duo-status"></span></div><div class="duo-card guest"><i aria-hidden="true"></i><b>Bạn</b><span class="duo-status"></span></div></div>
      <div class="duo-actions">${S.role === 'host' ? '<button type="button" id="duoStart" class="big pink">Bắt đầu</button>' : '<button type="button" id="duoReady" class="big blue">Sẵn sàng</button>'}</div>
      <p id="duoMsg" class="duo-msg" role="status"></p>
      <h3 class="duo-sec">Chọn bài</h3><div class="duo-songs${S.role === 'host' ? '' : ' ro'}">${songs}</div>
      <div class="duo-outfits"></div>
      <div class="duo-foot"><button type="button" id="duoMute" class="duo-toggle" aria-pressed="false">Tắt nhạc máy này</button><button type="button" id="duoLeave" class="duo-link">Rời phòng</button></div>`);
    panel.querySelector('.duo-outfits').append(outfitRow);
  }
  function closedScreen() {
    show('closed', `<h2 class="duo-title">Phòng đã đóng.</h2><button type="button" class="big duo-big" data-act="back">Quay lại</button>`);
  }
  // status line of a player card
  function statusOf(isMe) {
    if (isMe) return S.role === 'guest' && S.me.ready ? 'Sẵn sàng ✓' : 'Đang chọn đồ';
    const st = S.partner.status;
    if (st === 'none') return 'Đang chờ bạn vào…';
    if (st === 'reconnecting') return 'Đang nối lại…';
    if (st === 'left') return 'Đã rời';
    return S.role === 'host' && S.partner.ready ? 'Sẵn sàng ✓' : 'Đang chọn đồ';
  }
  function update() {
    if (!S) return;
    if (S.closed && S.role === 'guest' && screen !== 'closed') return closedScreen();
    if (S.phase === 'left') return;
    if (S.phase === 'done') renderDone(); else if (menu.classList.contains('duodone')) menu.classList.remove('duodone');
    if (S.phase === 'countdown') cheered = false;
    if (screen === 'hosting' && S.partner.status === 'here') room();
    if (screen === 'hosting' && S.linkWhy === 'version') say(MSG.version);
    if ((screen === 'join' || screen === 'hosting') && S.role === 'guest') room();
    if (screen !== 'room') return;
    const host = S.role === 'host';
    panel.querySelector('.duo-card.host .duo-status').textContent = statusOf(host);
    panel.querySelector('.duo-card.guest .duo-status').textContent = statusOf(!host);
    panel.querySelectorAll('.duo-song').forEach(row => row.querySelectorAll('.duo-lvl').forEach(c => {
      const on = S.room.song === row.dataset.slug && S.room.level === c.dataset.level;
      c.classList.toggle('on', on); c.setAttribute('aria-pressed', String(on)); c.disabled = !host;
    }));
    const st = $('duoStart'); if (st) st.disabled = !(S.partner.ready && S.partner.status === 'here' && S.room.song && S.room.level && S.phase === 'lobby');
    const rd = $('duoReady'); if (rd) { rd.textContent = S.me.ready ? 'Huỷ sẵn sàng' : 'Sẵn sàng'; rd.classList.toggle('on', S.me.ready); rd.disabled = S.phase !== 'lobby'; }
    const mu = $('duoMute'); if (mu) { mu.setAttribute('aria-pressed', String(S.me.mute)); mu.classList.toggle('on', S.me.mute); }
    say(S.linkWhy === 'version' ? MSG.version : S.phase === 'prep' ? 'Đang mở bài…' : S.notice === 'prepFail' ? 'Máy bạn chưa mở được bài. Thử lại nhé.' : '');
  }

  // ---- in the song: two score pills + lean bar, an arrow above each head (mine bigger, bobbing), the partner's praise word,
  // the 3-2-1 countdown, the pause texts and "Chơi tiếp một mình" (host pink, guest blue, the same on both iPads) ----
  const ARROW = '<svg viewBox="0 0 40 34" aria-hidden="true"><path d="M5 5 H35 L20 29 Z" fill="var(--duo-c)" stroke="#fff" stroke-width="4" stroke-linejoin="round"/></svg>';
  function mountHud() {
    if (hud) return;
    const el = (id, cls, html = '') => { const e = document.createElement('div'); e.id = id; e.className = cls; e.innerHTML = html; document.body.append(e); return e; };
    hud = {
      bar: el('duoHud', 'duo-hud', '<div class="duo-pill host"><i></i><b id="duoScoreHost">0</b><small class="duo-pst"></small></div><div class="duo-leanbar"><span id="duoLean"></span></div><div class="duo-pill guest"><i></i><b id="duoScoreGuest">0</b><small class="duo-pst"></small></div>'),
      host: el('duoMarkHost', 'duo-mark host', ARROW), guest: el('duoMarkGuest', 'duo-mark guest', ARROW), say: el('duoSay', 'duo-say'), count: el('duoCount', 'duo-count'),
    };
    hud.host.hidden = hud.guest.hidden = hud.say.hidden = hud.count.hidden = true;
    const solo = document.createElement('button'); solo.id = 'duoSolo'; solo.type = 'button'; solo.className = 'pz-exit duo-solo'; solo.textContent = 'Chơi tiếp một mình'; solo.hidden = true;
    solo.addEventListener('click', () => { game.unlockAudio(); S?.soloOn(); });
    document.querySelector('#pause .pz-card')?.append(solo); hud.solo = solo;
    raf = requestAnimationFrame(tick);
  }
  function unmountHud() { cancelAnimationFrame(raf); if (!hud) return; for (const k of ['bar', 'host', 'guest', 'say', 'count', 'solo']) hud[k].remove(); hud = null; countGo = null; const t = $('pauseTitle'); if (t) t.textContent = 'Tạm dừng'; }
  const setText = (e, v) => { v = String(v); if (e && e.textContent !== v) e.textContent = v; };
  const place = (e, p) => { if (!p) { e.hidden = true; return; } e.hidden = false; e.style.left = p[0].toFixed(1) + 'px'; e.style.top = p[1].toFixed(1) + 'px'; };
  function praise(g) {
    const gr = game.grades[g]; if (!hud || !gr) return;
    hud.say.textContent = gr.name; hud.say.style.color = gr.color; hud.say.hidden = false; sayUntil = performance.now() + 700;
    hud.say.classList.remove('pop'); void hud.say.offsetWidth; hud.say.classList.add('pop');
  }
  function partnerLine() { const st = S.partner.status; return st === 'reconnecting' ? 'Đang nối lại…' : st === 'left' ? 'Đã rời' : st === 'paused' ? 'Đang tạm dừng' : ''; }
  function tick() {
    raf = requestAnimationFrame(tick);
    if (!S || !hud) return;
    const host = S.role === 'host', mine = game.state().score, theirs = S.partner.score, hs = host ? mine : theirs, gs = host ? theirs : mine;
    setText($('duoScoreHost'), hs); setText($('duoScoreGuest'), gs);
    $('duoLean').style.left = (50 + 45 * (gs - hs) / Math.max(1, gs + hs)).toFixed(2) + '%';
    const lines = hud.bar.querySelectorAll('.duo-pst'); setText(lines[0], host ? '' : partnerLine()); setText(lines[1], host ? partnerLine() : '');
    const h = window.Dance.heads(), me = host ? hud.host : hud.guest, other = host ? hud.guest : hud.host;
    me.classList.add('me'); other.classList.remove('me');
    place(me, h.partner ? h.me : null); place(other, h.partner);   // the arrows tell two dancers apart: none while alone
    if (countGo != null) { const left = countGo - performance.now(); if (left > 0) { hud.count.hidden = false; setText(hud.count, Math.min(3, Math.ceil(left / 1000))); } else { hud.count.hidden = true; countGo = null; } }
    if (sayUntil && performance.now() > sayUntil) { hud.say.hidden = true; sayUntil = 0; }
    if (!hud.say.hidden) place(hud.say, h.partner ? [h.partner[0], h.partner[1] - 44] : null);
    const t = $('pauseTitle');
    if (S.phase === 'paused') { setText(t, S.run.resumeMe && !S.run.resumePartner ? 'Đợi bạn bấm chơi tiếp…' : S.run.resumePartner && !S.run.resumeMe ? 'Bạn đang chờ, chạm ▶ nhé!' : S.partner.status === 'paused' ? 'Bạn đang tạm dừng…' : 'Tạm dừng'); hud.solo.hidden = false; }
    else { hud.solo.hidden = true; setText(t, 'Tạm dừng'); }
  }

  // ---- the end: two columns (pink host, blue guest), the winner crowned, a gentle word for the other (she is 6), a tie, a
  // partner who left; "Về phòng" goes back to the room (the guest says ready again), "Rời phòng" leaves ----
  const stars = n => `<div class="duo-stars">${[0, 1, 2].map(i => `<span class="${i < n ? 'on' : ''}">★</span>`).join('')}</div>`;
  function renderDone() {
    if (!S) return;
    const host = S.role === 'host', me = S.run.myResult, pr = S.partner.result, left = S.partner.status === 'left';
    const theirs = pr || {score: S.partner.score, hits: S.partner.hits, playable: S.partner.playable, maxCombo: S.partner.maxCombo, stars: 0};
    const win = me && pr && !left ? (me.score > pr.score ? 'me' : me.score < pr.score ? 'partner' : 'tie') : null;
    const col = (who, r, isMe) => {
      const crowned = (win === 'me' && isMe) || (win === 'partner' && !isMe);
      const word = !isMe && left ? 'Đã rời' : !isMe && !pr ? 'Đang chờ bạn…' : win === 'tie' ? 'Hoà!' : crowned ? 'Thắng rồi!' : win ? 'Giỏi lắm! Ván sau nhé!' : 'Giỏi lắm!';
      return `<div class="col ${who}${isMe ? ' me' : ''}">${crowned ? '<div class="duo-crown" aria-hidden="true">👑</div>' : ''}<i aria-hidden="true"></i><b>${who === 'host' ? 'Máy chủ' : 'Bạn'}</b>${stars(r?.stars || 0)}<div class="duo-score">${r?.score ?? 0}</div><div class="duo-hits">${r?.hits ?? 0}/${r?.playable ?? 0} trúng</div><div class="duo-combo">Combo ${r?.maxCombo ?? 0}</div><div class="duo-word">${word}</div></div>`;
    };
    const mine = me || {score: game.state().score, hits: game.state().hits, playable: game.state().playable, maxCombo: game.state().maxCombo, stars: game.state().stars};
    const html = `<h2 class="duo-title">Kết quả</h2><div class="duo-cols">${host ? col('host', mine, true) + col('guest', theirs, false) : col('host', theirs, false) + col('guest', mine, true)}</div>
      <div class="duo-actions"><button type="button" class="big pink" data-act="room">Về phòng</button><button type="button" class="big" data-act="leave">Rời phòng</button></div>`;
    if (doneEl.innerHTML !== html) doneEl.innerHTML = html;
    menu.classList.add('duodone');
    if (win === 'me' && !cheered) { cheered = true; game.confetti?.(true); }
  }
  doneEl.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !S) return;
    if (b.dataset.act === 'room') { S.backToRoom(); menu.classList.remove('duodone'); update(); }
    else if (b.dataset.act === 'leave') leave();
  });

  // ---- taps ----
  panel.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.disabled || !panel.contains(b)) return;
    const act = b.dataset.act;
    if (act === 'host') return hosting();
    if (act === 'join') return joinScreen();
    if (act === 'back') return close();
    if (act === 'cancel') return leave();
    if (b.dataset.digit != null && !busy && digits.length < 4) { digits += b.dataset.digit; drawDigits(); if (digits.length === 4) join(digits); return; }
    if (act === 'del' && !busy) { digits = digits.slice(0, -1); drawDigits(); say(''); return; }
    if (!S) return;
    if (b.classList.contains('duo-lvl') && S.role === 'host') { S.setSong(b.closest('.duo-song').dataset.slug, b.dataset.level); return; }
    if (b.id === 'duoReady') { S.setReady(!S.me.ready); return; }   // setReady(true) unlocks audio inside this tap
    if (b.id === 'duoStart') { S.start(); return; }                  // start() unlocks audio inside this tap
    if (b.id === 'duoMute') { S.setMute(!S.me.mute); return; }
    if (b.id === 'duoLeave') return leave();
  });
  return ui;
}
