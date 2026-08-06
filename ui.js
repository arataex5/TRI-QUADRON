// ===== TRI QUADRON — UI制御 =====

let state = null;
let turnState = null; // { subphase, selectedCardUid, objectiveRotation, optionalDiscardUsed, pendingDiscardUid }
let pendingHandoff = null; // { idx, purpose }
let draftRotation = {}; // shapeId -> rotation count（ドラフト画面用）
let endTurnLocked = false;
let onlineMode = false; // true = オンライン対戦中（ホストまたはゲスト）
let onlineRole = null; // 'host' | 'guest' | null
let myOnlineSeat = null; // オンライン対戦での自分の席番号

// ---- 画面切替 ----
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  el.classList.add('active');
  el.scrollTop = 0;
  window.scrollTo(0, 0);
}
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ---- 汎用ユーティリティ ----
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function getFlagCellEl(flagId) {
  return [...document.querySelectorAll('.flag-cell')].find(c => c.querySelector('.flag-id').textContent === flagId) || null;
}
// 「自分」として扱うべきプレイヤー番号を返す
// （オンライン対戦：自分の割り当て席／CPU戦：唯一の人間／パス&プレイ：現在の手番の人）
function findPrivateInfoOwnerIdx() {
  if (!state) return 0;
  if (onlineMode && myOnlineSeat !== null) return myOnlineSeat;
  const humans = state.players.filter(p => !p.isCpu);
  return humans.length === 1 ? humans[0].idx : state.currentPlayer;
}

// カードが元の位置から目的の位置へスライドしていくアニメーション
function animateCardMove(sourceRect, destRect, card, duration = 420) {
  if (!sourceRect || !destRect || !card) return Promise.resolve();
  return new Promise(resolve => {
    const layer = document.getElementById('anim-layer');
    const clone = document.createElement('div');
    clone.className = `card anim-flying-card c-${card.color}`;
    clone.textContent = card.number;
    const w = sourceRect.width, h = sourceRect.height;
    // カードの大きさは変えず、目的地セルの中心へ向けて位置だけスライドさせる
    const destLeft = destRect.left + destRect.width / 2 - w / 2;
    const destTop = destRect.top + destRect.height / 2 - h / 2;
    Object.assign(clone.style, {
      left: sourceRect.left + 'px', top: sourceRect.top + 'px',
      width: w + 'px', height: h + 'px',
      margin: '0', fontSize: Math.max(12, h * 0.32) + 'px',
      transition: `left ${duration}ms cubic-bezier(.35,.6,.3,1), top ${duration}ms cubic-bezier(.35,.6,.3,1), opacity 160ms ease-in ${duration - 160}ms`,
    });
    layer.appendChild(clone);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        clone.style.left = destLeft + 'px';
        clone.style.top = destTop + 'px';
        clone.style.opacity = '0.2';
      });
    });
    setTimeout(() => { clone.remove(); resolve(); }, duration + 30);
  });
}

// ---- プレイヤープロフィール ----
let myProfile = loadProfile();
let profileEditingParts = null; // モーダル編集中のドラフト
let profileActiveTab = 'head';

function renderProfileBar() {
  document.getElementById('profile-bar-avatar').innerHTML = buildAvatarSvg(myProfile.parts);
  document.getElementById('profile-bar-name').textContent = displayNameFor(myProfile, 1);
}
function openProfileModal() {
  document.getElementById('profile-name-input').value = myProfile.name;
  profileEditingParts = { ...myProfile.parts };
  profileActiveTab = 'head';
  renderAvatarPreview();
  renderPartTabs();
  renderPartGrid();
  document.getElementById('modal-profile').classList.add('open');
}
function renderAvatarPreview() {
  document.getElementById('avatar-preview-large').innerHTML = buildAvatarSvg(profileEditingParts);
}
function renderPartTabs() {
  const el = document.getElementById('avatar-part-tabs');
  el.innerHTML = AVATAR_CATEGORY_ORDER.map(cat => `
    <button type="button" class="part-tab ${cat === profileActiveTab ? 'active' : ''}" data-cat="${cat}">${AVATAR_CATEGORY_LABELS[cat]}</button>
  `).join('');
  el.querySelectorAll('.part-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      profileActiveTab = btn.dataset.cat;
      renderPartTabs();
      renderPartGrid();
    });
  });
}
function renderPartGrid() {
  const el = document.getElementById('avatar-part-grid');
  const list = AVATAR_CATEGORIES[profileActiveTab];
  el.innerHTML = list.map(part => `
    <div class="avatar-pick-cell ${profileEditingParts[profileActiveTab] === part.id ? 'selected' : ''}" data-id="${part.id}" title="${part.label}">
      ${buildAvatarSvg({ ...profileEditingParts, [profileActiveTab]: part.id })}
    </div>
  `).join('');
  el.querySelectorAll('.avatar-pick-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      profileEditingParts[profileActiveTab] = cell.dataset.id;
      renderAvatarPreview();
      renderPartGrid();
    });
  });
  renderPartColorRow();
}
function renderPartColorRow() {
  const el = document.getElementById('avatar-part-colors');
  const colorKey = profileActiveTab + 'Color';
  const current = profileEditingParts[colorKey];
  el.innerHTML = AVATAR_COLOR_PALETTE.map(c => `
    <div class="color-swatch ${c.id === current ? 'selected' : ''}" data-color="${c.id}" title="${c.name}" style="background:${c.hex}"></div>
  `).join('');
  el.querySelectorAll('.color-swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      profileEditingParts[colorKey] = sw.dataset.color;
      renderAvatarPreview();
      renderPartGrid();
    });
  });
}
document.getElementById('btn-edit-profile').addEventListener('click', openProfileModal);
document.getElementById('btn-cancel-profile').addEventListener('click', () => {
  document.getElementById('modal-profile').classList.remove('open');
});
document.getElementById('btn-save-profile').addEventListener('click', () => {
  const name = document.getElementById('profile-name-input').value.trim().slice(0, 12);
  myProfile = { name, parts: { ...profileEditingParts } };
  saveProfile(myProfile);
  renderProfileBar();
  document.getElementById('modal-profile').classList.remove('open');
});
renderProfileBar();

// 現在のプロフィールを player0 に反映する（ローカル対局・CPU対局用）
function applyProfileToLocalPlayer0(state) {
  state.players[0].name = displayNameFor(myProfile, 1);
  state.players[0].parts = myProfile.parts;
}

// ---- 開始 ----
document.getElementById('btn-start').addEventListener('click', () => {
  onlineMode = false; onlineRole = null; myOnlineSeat = null;
  state = createInitialState();
  applyProfileToLocalPlayer0(state);
  dealSetup(state);
  highlightedPlayers.clear();
  advanceDraft(0);
});
document.getElementById('btn-rules').addEventListener('click', () => { rulesCurrentPage = 1; renderRulesPage(); showScreen('screen-rules'); });
document.getElementById('btn-close-rules').addEventListener('click', () => showScreen('screen-title'));

// ---- ルール画面のページ送り ----
let rulesCurrentPage = 1;
const RULES_TOTAL_PAGES = document.querySelectorAll('#rules-pager .rules-page').length;
function renderRulesPage() {
  document.querySelectorAll('#rules-pager .rules-page').forEach(el => {
    el.hidden = parseInt(el.dataset.page) !== rulesCurrentPage;
  });
  document.getElementById('rules-page-indicator').textContent = `${rulesCurrentPage} / ${RULES_TOTAL_PAGES}`;
  document.getElementById('btn-rules-prev').disabled = rulesCurrentPage === 1;
  document.getElementById('btn-rules-next').disabled = rulesCurrentPage === RULES_TOTAL_PAGES;
  document.getElementById('screen-rules').scrollTop = 0;
}
document.getElementById('btn-rules-prev').addEventListener('click', () => {
  if (rulesCurrentPage > 1) { rulesCurrentPage--; renderRulesPage(); }
});
document.getElementById('btn-rules-next').addEventListener('click', () => {
  if (rulesCurrentPage < RULES_TOTAL_PAGES) { rulesCurrentPage++; renderRulesPage(); }
});

// ---- CPU対戦相手選択 ----
let cpuSelection = [null, null, null]; // CPU 1〜3人目の aiType
let humanTurnPosition = 'random'; // 'random' または 0〜3（0始まりの手番位置）
let excludedShapeIds = new Set(); // 除外する目標カード
let objectiveChoiceCount = 2; // 目標カードの選択肢数（デフォルト2枚）

document.getElementById('btn-start-cpu').addEventListener('click', () => {
  cpuSelection = [null, null, null];
  humanTurnPosition = 'random';
  excludedShapeIds = new Set();
  objectiveChoiceCount = 2;
  renderCpuSelectScreen();
  renderTurnOrderOptions();
  renderObjectiveExcludeList();
  renderChoiceCountOptions();
  document.getElementById('objective-exclude-list').hidden = true;
  document.getElementById('choice-count-box').hidden = true;
  updateExcludeToggleLabel();
  updateChoiceCountToggleLabel();
  showScreen('screen-cpu-select');
});
function renderTurnOrderOptions() {
  document.querySelectorAll('.turn-order-btn').forEach(btn => {
    const val = btn.dataset.pos === 'random' ? 'random' : parseInt(btn.dataset.pos);
    btn.classList.toggle('active', val === humanTurnPosition);
  });
}
document.querySelectorAll('.turn-order-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    humanTurnPosition = btn.dataset.pos === 'random' ? 'random' : parseInt(btn.dataset.pos);
    renderTurnOrderOptions();
  });
});

// ---- 目標カードの除外設定（展開式） ----
function updateExcludeToggleLabel() {
  const list = document.getElementById('objective-exclude-list');
  const arrow = list.hidden ? '▸' : '▾';
  const countNote = excludedShapeIds.size > 0 ? `（${excludedShapeIds.size}枚除外中）` : '';
  document.getElementById('btn-toggle-exclude').textContent = `${arrow} 目標カードを除外する${countNote}`;
}
document.getElementById('btn-toggle-exclude').addEventListener('click', () => {
  const list = document.getElementById('objective-exclude-list');
  list.hidden = !list.hidden;
  updateExcludeToggleLabel();
});
function renderObjectiveExcludeList() {
  const el = document.getElementById('objective-exclude-list');
  el.innerHTML = SHAPES.map(s => `
    <label class="exclude-shape-row">
      <input type="checkbox" data-shape="${s.id}" ${excludedShapeIds.has(s.id) ? 'checked' : ''}>
      ${shapeMiniGridHTML(s)}
      <span class="exclude-shape-name">${s.name} ${'★'.repeat(s.difficulty)}${'☆'.repeat(5 - s.difficulty)}</span>
    </label>
  `).join('');
  el.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) excludedShapeIds.add(cb.dataset.shape);
      else excludedShapeIds.delete(cb.dataset.shape);
      updateExcludeToggleLabel();
    });
  });
}
// ---- 目標カードの選択肢数（展開式） ----
function updateChoiceCountToggleLabel() {
  const box = document.getElementById('choice-count-box');
  const arrow = box.hidden ? '▸' : '▾';
  document.getElementById('btn-toggle-choice-count').textContent = `${arrow} 選択肢数を設定する（${objectiveChoiceCount}枚）`;
}
document.getElementById('btn-toggle-choice-count').addEventListener('click', () => {
  const box = document.getElementById('choice-count-box');
  box.hidden = !box.hidden;
  updateChoiceCountToggleLabel();
});
function renderChoiceCountOptions() {
  document.querySelectorAll('.choice-count-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.count) === objectiveChoiceCount);
  });
}
document.querySelectorAll('.choice-count-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    objectiveChoiceCount = parseInt(btn.dataset.count);
    renderChoiceCountOptions();
    updateChoiceCountToggleLabel();
  });
});

function renderCpuSelectScreen() {
  renderCpuSeats();
  const grid = document.getElementById('cpu-select-grid');
  grid.innerHTML = CPU_CHARACTERS.map(c => {
    const seatIdxs = cpuSelection.reduce((arr, t, i) => { if (t === c.aiType) arr.push(i); return arr; }, []);
    const selected = seatIdxs.length > 0;
    return `
      <div class="cpu-card ${selected ? 'selected' : ''}" data-type="${c.aiType}">
        ${seatIdxs.length ? `<div class="cpu-card-badges">${seatIdxs.map(i => `<span class="cpu-card-badge">CPU${i + 1}</span>`).join('')}</div>` : ''}
        <div class="cpu-card-avatar">${c.avatar}</div>
        <div class="cpu-card-name">${c.name}</div>
        <div class="cpu-card-illust-note">${c.illustNote}</div>
        <div class="cpu-card-style">${c.playstyleShort}</div>
        <div class="cpu-card-strength">${'★'.repeat(c.strength)}${'☆'.repeat(5 - c.strength)}</div>
      </div>
    `;
  }).join('');
  grid.querySelectorAll('.cpu-card').forEach(el => {
    el.addEventListener('click', () => {
      const type = el.dataset.type;
      const emptyIdx = cpuSelection.indexOf(null);
      if (emptyIdx === -1) { toast('すでに3人選択されています。座席の×で外すか「選び直す」を押してください'); return; }
      cpuSelection[emptyIdx] = type;
      renderCpuSelectScreen();
    });
  });
  const filled = cpuSelection.filter(x => x).length;
  document.getElementById('cpu-select-note').textContent = filled < 3
    ? `カードをタップして、CPU対戦相手を3人選んでください（あと${3 - filled}人）。同じキャラを複数回選ぶこともできます。`
    : '3人選択済みです。「対局を始める」を押してください。';
  document.getElementById('btn-cpu-select-start').disabled = filled < 3;
}
function renderCpuSeats() {
  const el = document.getElementById('cpu-seats');
  el.innerHTML = cpuSelection.map((type, i) => {
    const c = type ? getCpuCharacter(type) : null;
    return `
      <div class="cpu-seat ${c ? 'filled' : ''}">
        <span class="cpu-seat-label">CPU${i + 1}</span>
        ${c ? `<span class="cpu-seat-avatar">${c.avatar}</span><span class="cpu-seat-name">${c.name}</span>
               <button class="cpu-seat-remove" data-seat="${i}" type="button">×</button>`
             : `<span class="cpu-seat-empty">未選択</span>`}
      </div>
    `;
  }).join('');
  el.querySelectorAll('.cpu-seat-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      cpuSelection[parseInt(btn.dataset.seat)] = null;
      renderCpuSelectScreen();
    });
  });
}
document.getElementById('btn-cpu-select-reset').addEventListener('click', () => {
  cpuSelection = [null, null, null];
  renderCpuSelectScreen();
});
document.getElementById('btn-cpu-select-start').addEventListener('click', () => {
  const availableCount = SHAPES.length - excludedShapeIds.size;
  if (availableCount < objectiveChoiceCount) {
    window.alert(`目標カードを除外しすぎています。残り${availableCount}枚に対して、選択肢数${objectiveChoiceCount}枚を用意できません。除外を減らすか選択肢数を減らしてください。`);
    return;
  }
  const humanIdx = humanTurnPosition === 'random' ? Math.floor(Math.random() * 4) : humanTurnPosition;
  const seatConfig = [null, null, null, null];
  seatConfig[humanIdx] = { isCpu: false, name: displayNameFor(myProfile, 1), parts: myProfile.parts };
  let cpuPtr = 0;
  for (let i = 0; i < 4; i++) {
    if (i === humanIdx) continue;
    seatConfig[i] = { isCpu: true, aiType: cpuSelection[cpuPtr++] };
  }
  state = createInitialState(seatConfig);
  dealSetup(state, { objectiveExcluded: [...excludedShapeIds], objectiveChoiceCount });
  onlineMode = false; onlineRole = null; myOnlineSeat = null;
  highlightedPlayers.clear();
  advanceDraft(0);
});

// ---- 受け渡し（目標カードのドラフトのみ。手番の受け渡し画面は廃止） ----
function goToHandoff(idx, purpose) {
  pendingHandoff = { idx, purpose };
  document.getElementById('handoff-name').textContent = PLAYER_NAMES[idx];
  document.querySelector('.handoff-hint').textContent = '端末を渡したら、タップして目標カードを確認してください';
  document.getElementById('btn-handoff-start').textContent = '目標カードを確認';
  showScreen('screen-handoff');
}
document.getElementById('btn-handoff-start').addEventListener('click', () => {
  const { idx } = pendingHandoff;
  showScreen('screen-draft');
  renderDraftFor(idx);
});

// ---- ドラフトの進行（人間は画面表示、CPUは自動決定） ----
function advanceDraft(idx) {
  if (idx > 3) {
    finalizeDraft(state);
    proceedToTurn();
    return;
  }
  if (state.players[idx].isCpu) {
    cpuChooseObjective(state, idx);
    advanceDraft(idx + 1);
  } else if (state.players.some(p => p.isCpu)) {
    // CPU戦では、受け渡しの必要がないので直接ドラフト画面を表示する
    showScreen('screen-draft');
    renderDraftFor(idx);
  } else {
    goToHandoff(idx, 'draft');
  }
}

// ---- 手番の進行（人間はそのまま盤面表示、CPUは自動実行を演出付きで表示） ----
// ゲストはこの関数を呼ばない（ホストからの状態受信で進行を反映する）
function proceedToTurn() {
  if (onlineMode && onlineRole === 'guest') return;
  if (state.phase === PHASE.GAME_OVER) {
    renderGameOver();
    showScreen('screen-over');
    return;
  }
  showScreen('screen-board');
  const cur = state.players[state.currentPlayer];
  if (cur.isCpu) {
    runCpuTurnWithOverlay(state.currentPlayer);
  } else {
    startTurnUI(state.currentPlayer);
  }
}

async function runCpuTurnWithOverlay(idx) {
  const p = state.players[idx];
  if (typeof clearDisconnectTimer === 'function') clearDisconnectTimer();
  if (typeof hideDisconnectBanner === 'function') hideDisconnectBanner();
  showCpuThinkingOverlay(idx);
  turnState = { subphase: 'play', selectedCardUid: null, objectiveRotation: (turnState && turnState.objectiveRotation) || 0, optionalDiscardUsed: false, pendingDiscardUid: null };
  renderAll();
  await sleep(550);
  hideCpuThinkingOverlay();

  cpuPrepareTurn(state, idx);
  renderAll();
  await sleep(200);

  const playInfo = (() => {
    const handBackEl = document.querySelector('.hand-cards .card-back');
    const sourceRect = handBackEl ? handBackEl.getBoundingClientRect() : null;
    const info = cpuChooseAndPlay(state, idx);
    return info ? { ...info, sourceRect } : null;
  })();
  if (playInfo) {
    renderAll();
    const targetCellEl = getFlagCellEl(playInfo.targetFlag);
    if (playInfo.sourceRect && targetCellEl) {
      await animateCardMove(playInfo.sourceRect, targetCellEl.getBoundingClientRect(), playInfo.card);
    } else {
      await sleep(300);
    }
  }

  const results = cpuResolveSlots(state, idx);
  renderAll();
  if (results.length) { toast(results[results.length - 1]); await sleep(700); }
  else { await sleep(250); }

  cpuReplenish(state, idx);
  renderAll();
  await sleep(350);

  logMsg(state, `${p.name}（CPU）がターンを終了しました。`);
  endTurnAdvance(state);
  proceedToTurn();
}
function showCpuThinkingOverlay(idx) {
  showScreen('screen-board');
  const p = state.players[idx];
  const char = getCpuCharacter(p.aiType);
  document.getElementById('cpu-overlay-avatar').innerHTML = char ? char.avatar : '';
  document.getElementById('cpu-overlay-name').textContent = p.name;
  document.getElementById('cpu-thinking-overlay').classList.add('show');
}
function hideCpuThinkingOverlay() {
  document.getElementById('cpu-thinking-overlay').classList.remove('show');
}

// ---- オンライン対戦：ゲスト側が状態を受信したときの処理 ----
function handleIncomingGameState(newState) {
  const wasMyTurnBefore = state && myOnlineSeat !== null && state.currentPlayer === myOnlineSeat;
  state = newState;
  hideCpuThinkingOverlay();

  if (state.phase === PHASE.DRAFT_DEAL) {
    showScreen('screen-draft');
    const me = state.players[myOnlineSeat];
    if (me && !me.objective) {
      renderDraftFor(myOnlineSeat);
    } else {
      document.getElementById('draft-panel').innerHTML = '<h2>選択しました</h2><p class="draft-note">他のプレイヤーの選択を待っています…</p>';
    }
    return;
  }

  if (state.phase === PHASE.GAME_OVER) {
    renderGameOver();
    showScreen('screen-over');
    return;
  }
  showScreen('screen-board');

  const isMyTurnNow = myOnlineSeat !== null && state.currentPlayer === myOnlineSeat;
  if (isMyTurnNow && !wasMyTurnBefore) {
    startTurnUI(myOnlineSeat);
  } else if (!turnState) {
    turnState = { subphase: 'play', selectedCardUid: null, objectiveRotation: 0, optionalDiscardUsed: false, pendingDiscardUid: null };
    renderAll();
  } else {
    renderAll();
  }
}

// ---- オンライン対戦：ホスト側が受信したリモート操作を実際のゲームロジックへ適用する ----
// ---- オンライン対戦：切断中プレイヤーの代打ちをCPUロジックで1ターン処理する ----
function runDisconnectedPlayerCpuTurn(idx) {
  const p = state.players[idx];
  const originalAiType = p.aiType;
  const originalIsCpu = p.isCpu;
  p.aiType = p.aiType || 'taro';
  p.isCpu = true;
  cpuPrepareTurn(state, idx);
  const playInfo = cpuChooseAndPlay(state, idx);
  if (playInfo) resolveReadySlots(state, idx);
  cpuReplenish(state, idx);
  p.aiType = originalAiType;
  p.isCpu = originalIsCpu;
  logMsg(state, `${p.name}（代打ちCPU）がターンを終了しました。`);
  endTurnAdvance(state);
  proceedToTurn();
}

function hostApplyRemoteAction(fromSeat, action) {
  const { actionType, payload } = action;
  switch (actionType) {
    case 'chooseObjective': {
      chooseObjective(state, fromSeat, payload.shapeId);
      if (state.players.every(p => p.objective)) {
        finalizeDraft(state);
        proceedToTurn();
      }
      // 全員そろっていない間は、他のプレイヤーの見た目（待機中）は変わらないため再送不要
      break;
    }
    case 'playCard': {
      const res = playCard(state, fromSeat, payload.cardUid, payload.slotIdx, payload.newTargetFlag);
      if (res.ok) resolveReadySlots(state, fromSeat);
      renderAll();
      break;
    }
    case 'resetSlot': {
      resetSlot(state, fromSeat, payload.slotIdx);
      renderAll();
      break;
    }
    case 'discardSwap': {
      discardOne(state, fromSeat, payload.cardUid);
      if (state.deck.length > 0) drawCard(state, fromSeat, 'deck');
      renderAll();
      break;
    }
    case 'drawCard': {
      drawCard(state, fromSeat, payload.source, payload.marketIdx);
      renderAll();
      break;
    }
    case 'endTurn': {
      endTurnAdvance(state);
      proceedToTurn();
      break;
    }
  }
}

// ---- ドラフト画面 ----
function renderDraftFor(idx) {
  const p = state.players[idx];
  draftRotation = {};
  p.objectiveChoices.forEach(id => { draftRotation[id] = 0; });
  renderDraftPanel(idx);
}
function renderDraftPanel(idx) {
  const p = state.players[idx];
  const panel = document.getElementById('draft-panel');
  const n = p.objectiveChoices.length;
  const restNote = n === 1 ? '' : `残った${n - 1}枚は公開情報として扱われます。`;
  panel.innerHTML = `
    <h2>${p.name} の目標選択</h2>
    <p class="draft-note">${n}枚の中から、あなたの秘密の目標として1枚を選んでください。${restNote}（回転ボタンで向きを確認できます）</p>
    <div class="draft-shape-choices">
      ${p.objectiveChoices.map(id => shapeCardHTML(id, '', draftRotation[id])).join('')}
    </div>
  `;
  panel.querySelectorAll('.shape-card').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.rotate-btn')) return;
      const shapeId = el.dataset.shape;
      if (onlineMode) {
        if (onlineRole === 'guest') {
          NetRoom.sendAction('chooseObjective', { shapeId });
        } else {
          hostApplyRemoteAction(idx, { actionType: 'chooseObjective', payload: { shapeId } });
        }
        document.getElementById('draft-panel').innerHTML = '<h2>選択しました</h2><p class="draft-note">他のプレイヤーの選択を待っています…</p>';
        return;
      }
      chooseObjective(state, idx, shapeId);
      advanceDraft(idx + 1);
    });
  });
  panel.querySelectorAll('.rotate-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const shapeId = btn.dataset.shape;
      draftRotation[shapeId] = (draftRotation[shapeId] + 1) % 4;
      renderDraftPanel(idx);
    });
  });
}

function shapeCardHTML(shapeId, extraClass = '', rotation = 0) {
  const s = getShape(shapeId);
  return `
    <div class="shape-card ${extraClass}" data-shape="${s.id}">
      ${shapeMiniGridHTML(s, rotation)}
      <div class="shape-name">${s.name}</div>
      <div class="shape-diff">${'★'.repeat(s.difficulty)}${'☆'.repeat(5 - s.difficulty)}</div>
      <button class="btn btn-tiny rotate-btn" data-shape="${s.id}" type="button">⟳ 90°回転</button>
    </div>
  `;
}
function shapeMiniGridHTML(shape, rotation = 0) {
  const cells = rotateShapeCellsPreview(shape, rotation);
  const keySet = new Set(cells.map(c => c.join(',')));
  let html = '<div class="shape-mini-grid">';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const on = keySet.has(`${r},${c}`);
      html += `<div class="cell ${on ? 'on' : ''}"></div>`;
    }
  }
  html += '</div>';
  return html;
}

// ---- ターン開始 ----
function startTurnUI(idx) {
  turnState = {
    subphase: 'play', selectedCardUid: null,
    objectiveRotation: 0,
    optionalDiscardUsed: false, pendingDiscardUid: null,
  };
  endTurnLocked = false;
  renderAll();
  if (typeof hostMaybeStartGeneralTurnTimer === 'function') hostMaybeStartGeneralTurnTimer(idx);
}

// ---- 全体描画 ----
function renderAll() {
  document.getElementById('phase-indicator').textContent = turnState.subphase === 'play' ? '② カード配置フェイズ' : '④ 補充フェイズ';
  document.getElementById('active-player-label').textContent = state.currentPlayer === findPrivateInfoOwnerIdx()
    ? `${state.players[state.currentPlayer].name} の手札`
    : `${state.players[state.currentPlayer].name}${state.players[state.currentPlayer].isCpu ? '（CPU）' : ''} の手番`;

  const roomIdEl = document.getElementById('topbar-room-id');
  if (onlineMode && typeof NetRoom !== 'undefined' && NetRoom.roomId) {
    roomIdEl.hidden = false;
    document.getElementById('topbar-room-id-value').textContent = NetRoom.roomId;
  } else {
    roomIdEl.hidden = true;
  }

  renderPlayersStrip();
  renderGridBoard();
  renderMarket();
  renderDeckPile();
  renderDiscardPileVisual();
  renderObjectiveBox();
  renderHand();
  renderDockActions();
  renderLog();
  renderPublicShapes();
  renderHandRankGuide();
  renderDiscardPile();
  sizeGridBoard();

  if (onlineMode && onlineRole === 'host' && typeof NetRoom !== 'undefined') {
    NetRoom.hostSendFilteredStates(idx => buildFilteredStateForViewer(state, idx));
  }
}

// board-left の残りスペースに合わせて grid-board を正方形にリサイズする
// （CSSのみだと market-row が hand-dock に隠れてしまうため、実測して調整する）
function sizeGridBoard() {
  const center = document.querySelector('.board-center');
  const grid = document.getElementById('grid-board');
  if (!center || !grid) return;
  if (window.innerWidth <= 1300) {
    // 狭い画面ではCSS（縦積みレイアウト）にサイズを任せる
    grid.style.width = '';
    grid.style.height = '';
    return;
  }
  const availH = center.clientHeight - 4;
  const availW = center.clientWidth - 4;
  const size = Math.max(220, Math.floor(Math.min(availH, availW)));
  grid.style.width = size + 'px';
  grid.style.height = size + 'px';
}
window.addEventListener('resize', () => { if (state) sizeGridBoard(); });

// ---- 山札パイル（残り枚数＋視点別の予測ツールチップ） ----
function renderDeckPile() {
  document.getElementById('deck-pile-count').textContent = state.deck.length;
}
document.getElementById('deck-pile').addEventListener('mouseenter', (e) => {
  if (!state) return;
  const { breakdown, totalRemaining } = computeDeckProbability(state, state.currentPlayer);
  const rows = breakdown.map(b => `
    <div class="tooltip-color-row">
      <span><span class="dot" style="background:${COLORS.find(c => c.id === b.color).hex}"></span>${b.name}</span>
      <span>${b.remaining} 枚</span>
    </div>
    <div class="tooltip-number-list">${b.remaining ? b.remainingNumbers.join('・') : 'なし'}</div>
  `).join('');
  showTooltip(e.currentTarget, `
    <div class="tooltip-title">あなたの視点での残りカード予測</div>
    ${rows}
    <div class="tooltip-total">合計 最大 ${totalRemaining} 枚（不明な範囲）</div>
  `);
  positionTooltip(e);
});
document.getElementById('deck-pile').addEventListener('mousemove', (e) => positionTooltip(e));
document.getElementById('deck-pile').addEventListener('mouseleave', hideTooltip);

// ---- 捨て札パイル（全体枚数の表示＋自分の捨て札のみホバー表示） ----
function renderDiscardPileVisual() {
  document.getElementById('discard-pile-count').textContent = state.discard.length;
  const fan = document.getElementById('discard-fan');
  if (state.discard.length === 0) {
    fan.innerHTML = '<div class="discard-fan-empty"></div>';
  } else {
    const n = Math.min(3, state.discard.length);
    let html = '';
    for (let i = 0; i < n; i++) html += `<div class="card-back df${i}"></div>`;
    fan.innerHTML = html;
  }
}
document.getElementById('discard-pile-visual').addEventListener('mouseenter', (e) => {
  if (!state) return;
  const mine = state.discard.filter(c => c.discardedBy === state.currentPlayer);
  const content = mine.length === 0
    ? `<div class="tooltip-title">あなたが捨てたカード</div><div class="tooltip-empty">まだありません</div>`
    : `<div class="tooltip-title">あなたが捨てたカード（${mine.length}枚）</div><div class="tooltip-card-list">${mine.map(c => cardHTML(c, 'mini')).join('')}</div>`;
  showTooltip(e.currentTarget, content);
  positionTooltip(e);
});
document.getElementById('discard-pile-visual').addEventListener('mousemove', (e) => positionTooltip(e));
document.getElementById('discard-pile-visual').addEventListener('mouseleave', hideTooltip);
document.getElementById('discard-pile-visual').addEventListener('click', () => {
  document.getElementById('drawer-discard').classList.add('open');
});

// ---- 汎用ツールチップ ----
function showTooltip(el, html) {
  const tip = document.getElementById('hover-tooltip');
  tip.innerHTML = html;
  tip.classList.add('show');
}
function positionTooltip(e) {
  const tip = document.getElementById('hover-tooltip');
  const pad = 16;
  let x = e.clientX + pad;
  let y = e.clientY + pad;
  const rect = tip.getBoundingClientRect();
  if (x + rect.width > window.innerWidth) x = e.clientX - rect.width - pad;
  if (y + rect.height > window.innerHeight) y = e.clientY - rect.height - pad;
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
}
function hideTooltip() {
  document.getElementById('hover-tooltip').classList.remove('show');
}

let highlightedPlayers = new Set(); // クリックで選択中のプレイヤー（枠を光らせる用）

function renderPlayersStrip() {
  const strip = document.getElementById('players-panel');
  strip.innerHTML = '<h3>プレイヤー（手番順）</h3>' + state.turnOrder.map((idx, order) => {
    const p = state.players[idx];
    return `
    <div class="player-chip ${p.idx === state.currentPlayer ? 'active' : ''} ${highlightedPlayers.has(p.idx) ? 'selected-highlight' : ''}" style="--p-color:${PLAYER_COLORS[p.idx]}" data-pidx="${p.idx}">
      <span class="turn-order-no">${order + 1}</span>
      <span class="pname-avatar">${playerAvatarSvg(p)}</span>
      <span class="pname">${p.name}${p.isCpu ? '<span class="cpu-tag">CPU</span>' : ''}</span>
      <span class="pflags">🚩${p.acquiredFlags.length}</span>
    </div>
  `;
  }).join('');
  strip.querySelectorAll('.player-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const pidx = parseInt(chip.dataset.pidx);
      if (highlightedPlayers.has(pidx)) highlightedPlayers.delete(pidx);
      else highlightedPlayers.add(pidx);
      renderPlayersStrip();
      renderGridBoard();
    });
  });
}
// 指定フラッグに、そのプレイヤーが出したカード（進行中の枠、または直近の出撃カード）があるか
function isFlagAssociatedWithPlayer(state, flagId, playerIdx) {
  const f = state.flags[flagId];
  if (f.lastCardsOwner === playerIdx) return true;
  return getFlagBuilders(state, flagId).some(b => b.playerIdx === playerIdx);
}
function playerAvatarSvg(p) {
  if (p.isCpu) { const c = getCpuCharacter(p.aiType); return c ? c.avatar : ''; }
  if (p.parts) return buildAvatarSvg(p.parts);
  return '';
}

function ownerColor(ownerIdx) {
  return PLAYER_COLORS[ownerIdx];
}
function acquiredOwnerOf(flagId) {
  const p = state.players.find(pl => pl.acquiredFlags.includes(flagId));
  return p ? p.idx : null;
}

// 指定フラッグを狙って進行中（1〜2枚）の枠を、全プレイヤーから集める
function getFlagBuilders(state, flagId) {
  const builders = [];
  state.players.forEach(p => {
    p.slots.forEach((slot, slotIdx) => {
      if (slot && slot.targetFlag === flagId && slot.cards.length > 0 && slot.cards.length < 3) {
        builders.push({ playerIdx: p.idx, slotIdx, cards: slot.cards });
      }
    });
  });
  return builders;
}

function renderGridBoard() {
  const board = document.getElementById('grid-board');
  board.innerHTML = '';
  const myPlayer = state.players[findPrivateInfoOwnerIdx()];
  const reachSet = myPlayer.objective
    ? computeReachFlags(myPlayer.objective, myPlayer.acquiredFlags)
    : new Set();
  const acquiredAll = FLAG_IDS_ACQUIRED(state);
  const hasSelection = turnState.subphase === 'play' && !!turnState.selectedCardUid;

  FLAG_IDS.forEach(id => {
    const f = state.flags[id];
    const acqOwner = acquiredOwnerOf(id);
    const isAcquired = acqOwner !== null;
    const isReach = reachSet.has(id) && !isAcquired;
    const hasDetail = !!f.lastCards;
    const builders = getFlagBuilders(state, id);
    const clickable = hasSelection && !isAcquired;

    const occupantCount = builders.length + (hasDetail ? 1 : 0);
    const occClass = occupantCount <= 0 ? '' : occupantCount === 1 ? ' occupants-1' : occupantCount === 2 ? ' occupants-2' : occupantCount === 3 ? ' occupants-3' : ' occupants-4';

    const cell = document.createElement('div');
    cell.className = 'flag-cell'
      + (isAcquired ? ' acquired' : '')
      + (isReach ? ' reach' : '')
      + (hasDetail ? ' has-detail' : '')
      + (clickable ? ' clickable-target' : '')
      + (builders.length ? ' has-builders' : '')
      + occClass;
    if (isAcquired) cell.style.setProperty('--owner-glow', ownerColor(acqOwner));

    if (highlightedPlayers.size) {
      const matched = [...highlightedPlayers].filter(pidx => isFlagAssociatedWithPlayer(state, id, pidx));
      if (matched.length) {
        cell.classList.add('player-highlighted');
        const layers = [];
        if (isAcquired) layers.push(`0 0 10px ${ownerColor(acqOwner)}`, `inset 0 0 14px ${ownerColor(acqOwner)}55`);
        // 1人目は縁の外側に光らせ、2人目以降は重ならないよう内側に少しずつネストさせたリングで表示する
        matched.forEach((pidx, i) => {
          const color = PLAYER_COLORS[pidx];
          if (i === 0) {
            layers.push(`0 0 18px ${color}`);
          } else {
            const inset = 3 + (i - 1) * 3;
            layers.push(`inset 0 0 1px ${inset}px ${color}`);
          }
        });
        cell.style.boxShadow = layers.join(', ');
        cell.style.borderColor = PLAYER_COLORS[matched[0]];
      }
    }

    let inner = `<span class="flag-id">${id}</span><div class="flag-top">`;
    if (acqOwner !== null) {
      inner += `<div class="flag-piece" style="background:${ownerColor(acqOwner)}"></div>`;
    } else if (f.ownerIdx !== null) {
      inner += `<div class="flag-piece" style="background:${ownerColor(f.ownerIdx)}"></div><div class="flag-die">残りカウント：${f.die}</div>`;
    }
    inner += '</div>';

    if (hasDetail) {
      inner += `<div class="flag-deployed">${f.lastCards.map(c => cardHTML(c, 'mini')).join('')}</div>`;
      inner += `<div class="flag-hand-label">${f.lastHand ? f.lastHand.label : ''}</div>`;
    }

    if (builders.length) {
      inner += '<div class="flag-builders">' + builders.map(b => {
        const isMine = b.playerIdx === state.currentPlayer;
        return `<div class="builder-row ${isMine ? 'mine' : ''}">
          <span class="builder-dot" style="background:${PLAYER_COLORS[b.playerIdx]}" title="${state.players[b.playerIdx].name}"></span>
          <span class="builder-cards">${b.cards.map(c => cardHTML(c, 'mini')).join('')}</span>
          ${isMine && turnState.subphase === 'play' ? `<button type="button" class="builder-reset" data-slot="${b.slotIdx}" title="この枠をリセット">✕</button>` : ''}
        </div>`;
      }).join('') + '</div>';
    }

    cell.innerHTML = inner;

    // カード選択中はタップで配置、非選択中はタップで拡大詳細を表示（常に何かしら反応する）
    if (clickable) {
      cell.addEventListener('click', (e) => {
        if (e.target.closest('.builder-reset')) return;
        handleFlagCellClick(id);
      });
    } else {
      cell.classList.add('detail-clickable');
      cell.addEventListener('click', (e) => {
        if (e.target.closest('.builder-reset')) return;
        openFlagDetailModal(id);
      });
    }
    cell.querySelectorAll('.builder-reset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ok = window.confirm('この枠をリセットしますか？（出したカードは捨て札になります）');
        if (!ok) return;
        const slotIdx = parseInt(btn.dataset.slot);
        if (onlineMode && onlineRole === 'guest') {
          NetRoom.sendAction('resetSlot', { slotIdx });
          return;
        }
        resetSlot(state, state.currentPlayer, slotIdx);
        renderAll();
      });
    });

    board.appendChild(cell);
  });
}

// 選択中のカードを、盤面でタップされたフラッグに出す
// （既にそのフラッグを狙っている自分の枠があればそこに追加、なければ空き枠で新規に狙う）
function handleFlagCellClick(flagId) {
  const p = state.players[state.currentPlayer];
  let slotIdx = p.slots.findIndex(s => s && s.targetFlag === flagId && s.cards.length < 3);
  let newTarget = null;
  if (slotIdx === -1) {
    slotIdx = p.slots.findIndex(s => s === null);
    if (slotIdx === -1) { toast('すでに4つの枠を使用中です。既存の枠をリセットしてください'); return; }
    newTarget = flagId;
  }
  doPlaySelectedCard(slotIdx, newTarget, flagId);
}

function renderMarket() {
  const el = document.getElementById('market-cards');
  const canTake = turnState.subphase === 'replenish' && state.players[state.currentPlayer].hand.length < 5;
  el.innerHTML = '';
  state.market.forEach((card, i) => {
    const d = cardEl(card);
    if (!canTake) d.style.cursor = 'default';
    if (canTake) {
      d.addEventListener('click', () => {
        if (onlineMode && onlineRole === 'guest') {
          NetRoom.sendAction('drawCard', { source: 'market', marketIdx: i });
          return;
        }
        const res = drawCard(state, state.currentPlayer, 'market', i);
        if (res.ok) { toast(`市場から ${colorLabel(card.color)}${card.number} を取得`); renderAll(); }
      });
    }
    el.appendChild(d);
  });
}

function renderObjectiveBox() {
  const p = state.players[findPrivateInfoOwnerIdx()];
  const shape = getShape(p.objective);
  const box = document.getElementById('objective-box');
  box.innerHTML = `
    <h3>あなたの目標</h3>
    <div class="objective-toggle">
      <button class="btn btn-tiny rotate-btn" id="btn-rotate-objective">⟳ 90°回転</button>
      <span class="objective-hidden-note">${shape.name} ${'★'.repeat(shape.difficulty)}</span>
    </div>
    <div class="objective-shape-large">${shapeMiniGridHTML(shape, turnState.objectiveRotation)}</div>
    <p class="modal-note">他の人に見えないようご注意ください</p>
  `;
  document.getElementById('btn-rotate-objective').addEventListener('click', () => {
    turnState.objectiveRotation = (turnState.objectiveRotation + 1) % 4;
    renderObjectiveBox();
  });
}

function doPlaySelectedCard(slotIdx, newTargetFlag, displayFlagId) {
  const cardUid = turnState.selectedCardUid;
  const p = state.players[state.currentPlayer];
  const cardData = p.hand.find(c => c.uid === cardUid);
  const handCardEl = document.querySelector(`.hand-cards .card[data-uid="${cardUid}"]`);
  const sourceRect = handCardEl ? handCardEl.getBoundingClientRect() : null;

  if (onlineMode && onlineRole === 'guest') {
    NetRoom.sendAction('playCard', { cardUid, slotIdx, newTargetFlag });
    turnState.selectedCardUid = null;
    turnState.subphase = 'replenish';
    renderDockActions();
    renderHand();
    if (sourceRect && cardData) {
      const targetCellEl = getFlagCellEl(displayFlagId || newTargetFlag);
      if (targetCellEl) animateCardMove(sourceRect, targetCellEl.getBoundingClientRect(), cardData);
    }
    return;
  }

  const res = playCard(state, state.currentPlayer, cardUid, slotIdx, newTargetFlag);
  if (!res.ok) { toast(res.error); return; }
  turnState.selectedCardUid = null;
  turnState.subphase = 'replenish';
  const results = resolveReadySlots(state, state.currentPlayer);
  renderAll();
  if (results.length) setTimeout(() => toast(results[results.length - 1]), 200);

  if (sourceRect && cardData) {
    const targetCellEl = getFlagCellEl(displayFlagId || newTargetFlag);
    if (targetCellEl) animateCardMove(sourceRect, targetCellEl.getBoundingClientRect(), cardData);
  }
}

function cardHTML(card, sizeClass = '') {
  return `<div class="card ${sizeClass} c-${card.color}">${card.number}</div>`;
}
function cardEl(card) {
  const d = document.createElement('div');
  d.className = `card c-${card.color}`;
  d.textContent = card.number;
  d.dataset.uid = card.uid;
  return d;
}

function renderHand() {
  const p = state.players[state.currentPlayer];
  const el = document.getElementById('hand-cards');
  el.innerHTML = '';
  const isMyTurn = state.currentPlayer === findPrivateInfoOwnerIdx();
  if (!isMyTurn) {
    for (let i = 0; i < p.hand.length; i++) {
      const back = document.createElement('div');
      back.className = 'card-back';
      el.appendChild(back);
    }
    return;
  }
  p.hand.forEach(card => {
    const d = cardEl(card);
    if (card.uid === turnState.selectedCardUid) d.classList.add('selected');
    if (card.uid === turnState.pendingDiscardUid) d.classList.add('selected');
    d.addEventListener('click', () => onHandCardClick(card));
    el.appendChild(d);
  });
}

function onHandCardClick(card) {
  if (turnState.subphase === 'play') {
    turnState.selectedCardUid = (turnState.selectedCardUid === card.uid) ? null : card.uid;
    renderHand();
    renderGridBoard();
    renderDockActions();
  } else if (turnState.subphase === 'replenish') {
    const p = state.players[state.currentPlayer];
    if (turnState.optionalDiscardUsed || p.hand.length < 5) return;
    turnState.pendingDiscardUid = (turnState.pendingDiscardUid === card.uid) ? null : card.uid;
    renderHand();
    renderDockActions();
  }
}

function renderDockActions() {
  const el = document.getElementById('dock-actions');
  const hint = document.getElementById('action-hint');
  const p = state.players[state.currentPlayer];
  el.innerHTML = '';

  const isMyTurn = state.currentPlayer === findPrivateInfoOwnerIdx();
  if (!isMyTurn) {
    hint.textContent = p.isCpu ? `${p.name} が考え中です…` : `${p.name} の手番です…`;
    return;
  }

  if (turnState.subphase === 'play') {
    hint.textContent = turnState.selectedCardUid ? '盤面のフラッグをタップして出してください' : '手札から1枚選んでください（必須）／自分の枠は盤面上でリセットも可能です';
    return;
  }

  hint.textContent = (p.hand.length === 5 && !turnState.optionalDiscardUsed && !turnState.pendingDiscardUid)
    ? `手札 ${p.hand.length}/5 ／ 不要な1枚をタップで交換も可能`
    : `手札 ${p.hand.length}/5`;

  if (turnState.pendingDiscardUid) {
    const b = document.createElement('button');
    b.className = 'btn btn-danger';
    b.innerHTML = 'この1枚を捨てる<br>（引き直しは山札か市場から選べます）';
    b.addEventListener('click', () => {
      const cardUid = turnState.pendingDiscardUid;
      turnState.pendingDiscardUid = null;
      turnState.optionalDiscardUsed = true;
      if (onlineMode && onlineRole === 'guest') {
        NetRoom.sendAction('discardSwap', { cardUid });
        renderDockActions();
        return;
      }
      discardOne(state, state.currentPlayer, cardUid);
      if (state.deck.length > 0) drawCard(state, state.currentPlayer, 'deck');
      renderAll();
    });
    el.appendChild(b);
    return;
  }

  if (p.hand.length < 5) {
    if (state.deck.length > 0) {
      const b = document.createElement('button');
      b.className = 'btn btn-primary';
      b.textContent = '山札から引く';
      b.addEventListener('click', () => {
        if (onlineMode && onlineRole === 'guest') {
          NetRoom.sendAction('drawCard', { source: 'deck' });
          return;
        }
        drawCard(state, state.currentPlayer, 'deck');
        renderAll();
      });
      el.appendChild(b);
    }
  }

  const canEnd = p.hand.length === 5 || (state.deck.length === 0 && state.market.length === 0);
  const b2 = document.createElement('button');
  b2.className = 'btn btn-primary';
  b2.textContent = 'ターン終了';
  b2.disabled = !canEnd || endTurnLocked;
  b2.addEventListener('click', () => {
    if (endTurnLocked) return;
    endTurnLocked = true;
    b2.disabled = true;
    b2.remove();
    if (onlineMode && onlineRole === 'guest') {
      NetRoom.sendAction('endTurn', {});
      return;
    }
    endTurnAdvance(state);
    proceedToTurn();
  });
  el.appendChild(b2);
}

// ---- フラッグ詳細モーダル（出撃済みカード＆役の確認） ----
function openFlagDetailModal(flagId) {
  const f = state.flags[flagId];
  document.getElementById('detail-flag-title').textContent = `フラッグ ${flagId}`;

  if (f.lastCards) {
    document.getElementById('detail-cards').innerHTML = f.lastCards.map(c => cardHTML(c, '')).join('');
    document.getElementById('detail-hand-label').textContent = f.lastHand ? f.lastHand.label : '';
    const ownerName = state.players[f.lastCardsOwner] ? state.players[f.lastCardsOwner].name : '';
    const acqOwner = acquiredOwnerOf(flagId);
    const statusText = acqOwner !== null
      ? `${state.players[acqOwner].name} が確定獲得済み`
      : (f.ownerIdx !== null ? `現在 ${state.players[f.ownerIdx].name} が保持中（カウント${f.die}）` : '');
    document.getElementById('detail-owner-label').textContent = `直近の出撃：${ownerName} ／ ${statusText}`;
  } else {
    document.getElementById('detail-cards').innerHTML = '';
    document.getElementById('detail-hand-label').textContent = '';
    document.getElementById('detail-owner-label').textContent = 'まだ誰もこのフラッグに出撃していません';
  }

  const builders = getFlagBuilders(state, flagId);
  const buildersEl = document.getElementById('detail-builders');
  if (builders.length === 0) {
    buildersEl.innerHTML = '';
  } else {
    buildersEl.innerHTML = '<div class="detail-builders-title">進行中の枠</div>' + builders.map(b => `
      <div class="detail-builder-row">
        <span class="builder-dot" style="background:${PLAYER_COLORS[b.playerIdx]}"></span>
        <span>${state.players[b.playerIdx].name}</span>
        <span class="detail-builder-cards">${b.cards.map(c => cardHTML(c, 'small')).join('')}</span>
      </div>
    `).join('');
  }

  document.getElementById('modal-flag-detail').classList.add('open');
}
document.getElementById('btn-close-flag-detail').addEventListener('click', () => {
  document.getElementById('modal-flag-detail').classList.remove('open');
});

// ---- ドロワー：ログ／捨て札 ----
document.getElementById('btn-open-log').addEventListener('click', () => document.getElementById('drawer-log').classList.add('open'));
document.getElementById('btn-close-log').addEventListener('click', () => document.getElementById('drawer-log').classList.remove('open'));
document.getElementById('btn-open-discard').addEventListener('click', () => document.getElementById('drawer-discard').classList.add('open'));
document.getElementById('btn-close-discard').addEventListener('click', () => document.getElementById('drawer-discard').classList.remove('open'));

// ---- 役の強さ フローティングパネル ----
document.getElementById('btn-open-handrank').addEventListener('click', () => {
  document.getElementById('handrank-float').classList.add('open');
});
document.getElementById('btn-close-handrank-float').addEventListener('click', () => {
  document.getElementById('handrank-float').classList.remove('open');
});

// ---- タイトルに戻る（対局中断） ----
document.getElementById('btn-quit-to-title').addEventListener('click', () => {
  const ok = window.confirm('対局を中断してタイトルに戻りますか？（この対局の内容は失われます）');
  if (!ok) return;
  if (onlineMode) NetRoom.leaveRoom();
  onlineMode = false; onlineRole = null; myOnlineSeat = null;
  state = null;
  turnState = null;
  endTurnLocked = false;
  document.querySelectorAll('.drawer.open').forEach(d => d.classList.remove('open'));
  document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
  document.getElementById('handrank-float').classList.remove('open');
  showScreen('screen-title');
});

// ---- 役の強さ一覧（イラスト付き） ----
const HANDRANK_EXAMPLES = [
  { label: 'ストレートフラッシュ', desc: '同じ色で連続する数字3枚。最も強い役。', cards: [{color:'azure',number:4},{color:'azure',number:5},{color:'azure',number:6}] },
  { label: 'スリーカード', desc: '同じ数字が3枚。', cards: [{color:'crimson',number:7},{color:'jade',number:7},{color:'amber',number:7}] },
  { label: 'フラッシュ', desc: '同じ色で数字はバラバラ。', cards: [{color:'violet',number:2},{color:'violet',number:6},{color:'violet',number:9}] },
  { label: 'ストレート', desc: '色はバラバラで連続する数字3枚。', cards: [{color:'teal',number:3},{color:'orange',number:4},{color:'magenta',number:5}] },
  { label: 'ブタ', desc: '上記のどれにも当てはまらない組み合わせ。', cards: [{color:'ink',number:2},{color:'jade',number:8},{color:'amber',number:5}] },
];
let handrankExpanded = new Set(); // 展開中の行（'0'〜'4' または 'rule'）
function toggleHandrankRow(key) {
  if (handrankExpanded.has(key)) handrankExpanded.delete(key);
  else handrankExpanded.add(key);
  renderHandRankGuide();
}
function renderHandRankGuide() {
  const el = document.getElementById('handrank-float-content');
  let html = '';
  HANDRANK_EXAMPLES.forEach((h, i) => {
    const key = String(i);
    const open = handrankExpanded.has(key);
    html += `
      <div class="handrank-row ${open ? 'expanded' : ''}" data-key="${key}">
        <div class="handrank-cards">${h.cards.map(c => cardHTML(c, 'small')).join('')}</div>
        <div class="handrank-name">${h.label}</div>
        <div class="handrank-arrow">${open ? '▾' : '▸'}</div>
      </div>
      ${open ? `<div class="handrank-desc-panel">${h.desc}</div>` : ''}
    `;
    if (i < HANDRANK_EXAMPLES.length - 1) html += '<div class="handrank-vs">↓ より弱い</div>';
  });
  const ruleOpen = handrankExpanded.has('rule');
  html += `
    <div class="handrank-row ${ruleOpen ? 'expanded' : ''}" data-key="rule">
      <div class="handrank-cards"><span class="handrank-rule-icon">⚖</span></div>
      <div class="handrank-name">同じ役どうしの比較ルール</div>
      <div class="handrank-arrow">${ruleOpen ? '▾' : '▸'}</div>
    </div>
    ${ruleOpen ? `
      <div class="handrank-desc-panel handrank-tiebreak">
        ・ストレートフラッシュ／フラッシュ／ストレート：<strong>一番大きい数字</strong>が大きい方が勝ち。<br>
        ・スリーカード：<strong>その数字そのもの</strong>が大きい方が勝ち（例：8のスリーカード＞5のスリーカード）。<br>
        ・ブタ：<strong>3枚の合計数字</strong>が大きい方が勝ち。<br><br>
        役も数字（合計）もまったく同じときは上書きされず、<strong>先に出撃していた側がそのまま防衛</strong>します。
      </div>
    ` : ''}
  `;
  el.innerHTML = html;
  el.querySelectorAll('.handrank-row').forEach(row => {
    row.addEventListener('click', () => toggleHandrankRow(row.dataset.key));
  });
}

function renderLog() {
  const list = document.getElementById('log-list');
  list.innerHTML = state.log.map(m => `<li>${m}</li>`).join('');
}
function renderPublicShapes() {
  const el = document.getElementById('public-panel');
  let html = '<h3>公開目標リスト</h3><p class="drawer-note">誰かがまだ持っている可能性がある目標形状です（誰が持っているかは不明）。</p>';
  html += state.publicShapeList.map(id => {
    const s = getShape(id);
    return `<div class="public-shape-row">${shapeMiniGridHTML(s)}<div><div class="shape-name">${s.name}</div><div class="shape-diff">${'★'.repeat(s.difficulty)}${'☆'.repeat(5 - s.difficulty)}</div></div></div>`;
  }).join('');
  el.innerHTML = html;
}
function renderDiscardPile() {
  const el = document.getElementById('discard-cards');
  if (!el) return;
  const note = document.getElementById('discard-drawer-note');
  const mine = state.discard.filter(c => c.discardedBy === state.currentPlayer);
  note.textContent = `全体で捨てられたカードは${state.discard.length}枚です。ここでは、あなた自身が捨てたカードのみ確認できます（他人の捨て札は見えません）。`;
  if (mine.length === 0) {
    el.innerHTML = '<span class="objective-hidden-note">あなたが捨てたカードはまだありません</span>';
    return;
  }
  el.innerHTML = mine.map(c => cardHTML(c, 'small')).join('');
}

// ---- ゲーム終了画面 ----
function renderGameOver() {
  const info = state.winnerInfo;
  const tierLabel = { 1: '個人目標達成', 2: '5フラッグ以上獲得', 3: '獲得フラッグ数最多' }[info.tier];
  const names = info.winners.map(i => state.players[i].name).join(' ・ ');
  const panel = document.getElementById('over-panel');
  panel.innerHTML = `
    <div class="winner-banner">${names} の勝利！（${tierLabel}）</div>
    ${state.players.map(p => `
      <div class="result-row">
        <span>${p.name}${p.objective ? `（${getShape(p.objective).name} ${'★'.repeat(getShape(p.objective).difficulty)}）` : ''}</span>
        <span>獲得 ${p.acquiredFlags.length} ／ 達成 ${p.objective && shapeAchieved(p.objective, p.acquiredFlags) ? '○' : '×'}</span>
      </div>
    `).join('')}
    <button class="btn btn-primary btn-large" id="btn-restart">もう一度遊ぶ</button>
  `;
  document.getElementById('btn-restart').addEventListener('click', () => showScreen('screen-title'));
}
