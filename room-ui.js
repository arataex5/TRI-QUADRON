// ===== TRI QUADRON — オンライン対戦ルームUI =====

let lobbyExcludedShapeIds = new Set();
let lobbyChoiceCount = 2;
let lobbyTurnTimerSec = 0;
let lobbyCpuPickTargetSlot = null;
let turnTimerIntervalId = null;
let turnTimerDeadline = null;
let waitModeEnabled = true; // true: 切断時は制限時間いっぱい待つ／false: ホストがすぐCPU代打ちできる状態

// ---- タイトルからの入口 ----
document.getElementById('btn-start-online').addEventListener('click', () => {
  showScreen('screen-room-home');
  document.getElementById('room-home-transport-note').textContent = PeerJsTransport.available()
    ? 'PeerJSを使ってリアルタイムに対戦します。'
    : '通信ライブラリが読み込めなかったため、この端末内（別タブ）でのみ対戦できるテストモードで動作します。';
  document.getElementById('room-id-input').value = '';
  document.getElementById('room-join-error').textContent = '';
});
document.getElementById('btn-room-home-back').addEventListener('click', () => showScreen('screen-title'));

document.getElementById('btn-create-room').addEventListener('click', async () => {
  try {
    wireNetRoomCallbacks();
    await NetRoom.createRoom(myProfile);
    enterLobby();
  } catch (e) {
    toast('ルームを作成できませんでした：' + (e.message || e));
  }
});
document.getElementById('btn-join-room').addEventListener('click', async () => {
  const id = document.getElementById('room-id-input').value.trim();
  const errEl = document.getElementById('room-join-error');
  errEl.textContent = '';
  if (!/^[0-9]{5}$/.test(id)) { errEl.textContent = '5桁のルームIDを入力してください'; return; }
  try {
    wireNetRoomCallbacks();
    await NetRoom.joinRoom(id, myProfile);
    enterLobby();
  } catch (e) {
    errEl.textContent = e.message || 'ルームに入室できませんでした';
  }
});

// ---- NetRoomのコールバック配線 ----
function wireNetRoomCallbacks() {
  NetRoom.onRoomUpdate = (slots, roomName, roomId, settings) => renderLobby(slots, roomName, roomId, settings);
  NetRoom.onGameState = (newState) => {
    onlineMode = true;
    onlineRole = NetRoom.role;
    myOnlineSeat = NetRoom.mySlotIndex;
    handleIncomingGameState(newState);
  };
  NetRoom.onGameStarting = () => {
    onlineMode = true;
    onlineRole = NetRoom.role;
    myOnlineSeat = NetRoom.mySlotIndex;
  };
  NetRoom.onError = (msg) => toast(msg);
  NetRoom.onKicked = () => {
    toast('ルームから退出させられました');
    NetRoom.leaveRoom();
    showScreen('screen-title');
  };
  NetRoom.onHostMigrated = (isNowHost) => {
    onlineRole = NetRoom.role;
    myOnlineSeat = NetRoom.mySlotIndex;
    toast(isNowHost ? 'あなたが新しいホストになりました' : '新しいホストに再接続しました');
  };
  NetRoom.onRemoteAction = (fromSeat, action) => hostApplyRemoteAction(fromSeat, action);
  NetRoom.onPlayerDisconnected = (slotIdx) => handlePlayerDisconnected(slotIdx);
  NetRoom.onPlayerReconnected = (slotIdx) => handlePlayerReconnected(slotIdx);
}

function enterLobby() {
  lobbyExcludedShapeIds = new Set();
  lobbyChoiceCount = 2;
  lobbyTurnTimerSec = 0;
  showScreen('screen-room-lobby');
}

// ---- ロビー描画 ----
function renderLobby(slots, roomName, roomId, settings) {
  const isHost = NetRoom.role === 'host';
  document.getElementById('lobby-room-name').textContent = roomName;
  document.getElementById('lobby-room-id').textContent = roomId;
  document.getElementById('btn-edit-room-name').hidden = !isHost;

  lobbyTurnTimerSec = settings.turnTimerSec;
  lobbyExcludedShapeIds = new Set(settings.objectiveExcluded);
  lobbyChoiceCount = settings.objectiveChoiceCount;
  renderLobbySettingsReadout();
  if (isHost) renderLobbySettingsControls();

  document.querySelectorAll('#timer-options-box .timer-btn, #lobby-count-box .lobby-count-btn').forEach(btn => {
    btn.disabled = !isHost;
  });
  document.querySelectorAll('#lobby-exclude-list input').forEach(cb => { cb.disabled = !isHost; });

  renderLobbyPlayerList(slots, isHost);

  const allReady = slots.every(s => s === null || s.ready);
  const startBtn = document.getElementById('btn-lobby-start');
  startBtn.hidden = !isHost;
  startBtn.disabled = !allReady || slots.filter(s => s).length < 2;

  const mySlot = slots[NetRoom.mySlotIndex];
  const readyBtn = document.getElementById('btn-my-ready');
  if (mySlot) {
    readyBtn.textContent = mySlot.ready ? '準備完了 ✓' : '準備完了';
    readyBtn.classList.toggle('btn-primary', !mySlot.ready);
    readyBtn.classList.toggle('btn-ok', !!mySlot.ready);
  }

  document.getElementById('lobby-note').textContent = slots.filter(s => s).length < 2
    ? 'あと1人以上、参加者かCPUが必要です。'
    : (allReady ? '' : '全員が準備完了になるとゲームを開始できます。');
}

function renderLobbySettingsReadout() {
  document.getElementById('btn-toggle-timer').textContent =
    (document.getElementById('timer-options-box').hidden ? '▸' : '▾') + ' 手番制限時間を設定する（' + timerLabel(lobbyTurnTimerSec) + '）';
  document.getElementById('btn-toggle-lobby-exclude').textContent =
    (document.getElementById('lobby-exclude-list').hidden ? '▸' : '▾') + ' 目標カードを除外する' + (lobbyExcludedShapeIds.size ? `（${lobbyExcludedShapeIds.size}枚除外中）` : '');
  document.getElementById('btn-toggle-lobby-count').textContent =
    (document.getElementById('lobby-count-box').hidden ? '▸' : '▾') + ` 選択肢数を設定する（${lobbyChoiceCount}枚）`;
}
function timerLabel(sec) {
  return sec === 0 ? 'なし' : sec + '秒';
}
function renderLobbySettingsControls() {
  document.querySelectorAll('.timer-btn').forEach(btn => btn.classList.toggle('active', parseInt(btn.dataset.sec) === lobbyTurnTimerSec));
  document.querySelectorAll('.lobby-count-btn').forEach(btn => btn.classList.toggle('active', parseInt(btn.dataset.count) === lobbyChoiceCount));
  const listEl = document.getElementById('lobby-exclude-list');
  if (!listEl.dataset.built) {
    listEl.innerHTML = SHAPES.map(s => `
      <label class="exclude-shape-row">
        <input type="checkbox" data-shape="${s.id}">
        ${shapeMiniGridHTML(s)}
        <span class="exclude-shape-name">${s.name} ${'★'.repeat(s.difficulty)}${'☆'.repeat(5 - s.difficulty)}</span>
      </label>
    `).join('');
    listEl.dataset.built = '1';
    listEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) lobbyExcludedShapeIds.add(cb.dataset.shape);
        else lobbyExcludedShapeIds.delete(cb.dataset.shape);
        NetRoom.hostUpdateSettings({ objectiveExcluded: [...lobbyExcludedShapeIds] });
      });
    });
  }
  listEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.checked = lobbyExcludedShapeIds.has(cb.dataset.shape);
  });
}
document.getElementById('btn-toggle-timer').addEventListener('click', () => {
  const box = document.getElementById('timer-options-box');
  box.hidden = !box.hidden;
  renderLobbySettingsReadout();
});
document.getElementById('btn-toggle-lobby-exclude').addEventListener('click', () => {
  const box = document.getElementById('lobby-exclude-list');
  box.hidden = !box.hidden;
  renderLobbySettingsReadout();
});
document.getElementById('btn-toggle-lobby-count').addEventListener('click', () => {
  const box = document.getElementById('lobby-count-box');
  box.hidden = !box.hidden;
  renderLobbySettingsReadout();
});
document.querySelectorAll('.timer-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (NetRoom.role !== 'host') return;
    NetRoom.hostUpdateSettings({ turnTimerSec: parseInt(btn.dataset.sec) });
  });
});
document.querySelectorAll('.lobby-count-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (NetRoom.role !== 'host') return;
    NetRoom.hostUpdateSettings({ objectiveChoiceCount: parseInt(btn.dataset.count) });
  });
});

document.getElementById('btn-edit-room-name').addEventListener('click', () => {
  const name = window.prompt('ルーム名を入力してください（24文字まで）', document.getElementById('lobby-room-name').textContent);
  if (name === null) return;
  NetRoom.hostSetRoomName(name.trim());
});

// ---- プレイヤー一覧 ----
function renderLobbyPlayerList(slots, isHost) {
  const el = document.getElementById('lobby-player-list');
  el.innerHTML = slots.map((s, i) => {
    if (!s) {
      return `
        <div class="lobby-player-row empty">
          <span class="lobby-player-seat">P${i + 1}</span>
          <span class="lobby-player-empty-label">まだ入室していません</span>
          ${isHost ? `<button class="btn btn-tiny" data-add-cpu="${i}">CPU追加</button>` : ''}
        </div>`;
    }
    if (s.kind === 'cpu') {
      const c = getCpuCharacter(s.aiType);
      return `
        <div class="lobby-player-row cpu-row" data-cpu-tooltip="${s.aiType}">
          <span class="lobby-player-seat">P${i + 1}</span>
          <span class="lobby-player-avatar">${c ? c.avatar : ''}</span>
          <span class="lobby-player-name">${c ? c.name : 'CPU'}<span class="cpu-tag">CPU</span></span>
          <span class="lobby-ready-dot ready">準備OK</span>
          ${isHost ? `<button class="btn btn-tiny" data-remove-seat="${i}">×</button>` : ''}
        </div>`;
    }
    const avatarSvg = buildAvatarSvg(s.parts);
    const isMe = i === NetRoom.mySlotIndex;
    return `
      <div class="lobby-player-row ${isMe ? 'is-me' : ''}">
        <span class="lobby-player-seat">P${i + 1}</span>
        <span class="lobby-player-avatar">${avatarSvg}</span>
        <span class="lobby-player-name">${s.name}${isMe ? '（あなた）' : ''}${!s.connected ? '<span class="lobby-disconnected-tag">切断中</span>' : ''}</span>
        <span class="lobby-ready-dot ${s.ready ? 'ready' : ''}">${s.ready ? '準備OK' : '未準備'}</span>
        ${isHost && !isMe ? `<button class="btn btn-tiny" data-remove-seat="${i}">×</button>` : ''}
      </div>`;
  }).join('');

  el.querySelectorAll('[data-add-cpu]').forEach(btn => {
    btn.addEventListener('click', () => openLobbyCpuPick(parseInt(btn.dataset.addCpu)));
  });
  el.querySelectorAll('[data-remove-seat]').forEach(btn => {
    btn.addEventListener('click', () => NetRoom.hostRemoveSeat(parseInt(btn.dataset.removeSeat)));
  });
  el.querySelectorAll('.cpu-row').forEach(row => {
    row.addEventListener('mouseenter', (e) => {
      const c = getCpuCharacter(row.dataset.cpuTooltip);
      if (!c) return;
      showTooltip(row, `
        <div class="tooltip-title">${c.name}（${'★'.repeat(c.strength)}${'☆'.repeat(5 - c.strength)}）</div>
        <div>${c.playstyleShort}</div>
      `);
      positionTooltip(e);
    });
    row.addEventListener('mousemove', (e) => positionTooltip(e));
    row.addEventListener('mouseleave', hideTooltip);
  });
}

function openLobbyCpuPick(slotIdx) {
  lobbyCpuPickTargetSlot = slotIdx;
  const grid = document.getElementById('lobby-cpu-pick-grid');
  grid.innerHTML = CPU_CHARACTERS.map(c => `
    <div class="cpu-card" data-type="${c.aiType}">
      <div class="cpu-card-avatar">${c.avatar}</div>
      <div class="cpu-card-name">${c.name}</div>
      <div class="cpu-card-illust-note">${c.illustNote}</div>
      <div class="cpu-card-style">${c.playstyleShort}</div>
      <div class="cpu-card-strength">${'★'.repeat(c.strength)}${'☆'.repeat(5 - c.strength)}</div>
    </div>
  `).join('');
  grid.querySelectorAll('.cpu-card').forEach(el => {
    el.addEventListener('click', () => {
      NetRoom.hostAddCpu(lobbyCpuPickTargetSlot, el.dataset.type);
      document.getElementById('modal-lobby-cpu-pick').classList.remove('open');
    });
  });
  document.getElementById('modal-lobby-cpu-pick').classList.add('open');
}
document.getElementById('btn-cancel-lobby-cpu-pick').addEventListener('click', () => {
  document.getElementById('modal-lobby-cpu-pick').classList.remove('open');
});

// ---- 準備完了／退出／ゲーム開始 ----
document.getElementById('btn-my-ready').addEventListener('click', () => {
  const mySlot = NetRoom.slots[NetRoom.mySlotIndex];
  const nextReady = !(mySlot && mySlot.ready);
  if (NetRoom.role === 'host') NetRoom.hostSetMyReady(nextReady);
  else NetRoom.guestSetReady(nextReady);
});
document.getElementById('btn-leave-room').addEventListener('click', () => {
  NetRoom.leaveRoom();
  onlineMode = false; onlineRole = null; myOnlineSeat = null;
  showScreen('screen-title');
});
document.getElementById('btn-lobby-start').addEventListener('click', () => {
  if (NetRoom.role !== 'host') return;
  const seatConfig = NetRoom.hostBuildSeatConfig();
  onlineMode = true; onlineRole = 'host'; myOnlineSeat = NetRoom.mySlotIndex;
  state = createInitialState(seatConfig);
  dealSetup(state, { objectiveExcluded: NetRoom.settings.objectiveExcluded, objectiveChoiceCount: NetRoom.settings.objectiveChoiceCount });
  state.players.forEach((p, i) => { if (p.isCpu) cpuChooseObjective(state, i); });
  highlightedPlayers.clear();
  NetRoom.hostBroadcastGameStarting();
  NetRoom.hostSendFilteredStates(idx => buildFilteredStateForViewer(state, idx));
  const me = state.players[myOnlineSeat];
  if (me && !me.objective) {
    showScreen('screen-draft');
    renderDraftFor(myOnlineSeat);
  } else if (state.players.every(p => p.objective)) {
    finalizeDraft(state);
    proceedToTurn();
  }
});

// ---- 切断・再接続・タイマー ----
function handlePlayerDisconnected(slotIdx) {
  if (!onlineMode || onlineRole !== 'host' || !state) return;
  hostMarkDisconnectedInStateLocal(slotIdx);
  renderAll();
  showDisconnectBanner(slotIdx);
  if (state.currentPlayer === slotIdx) startDisconnectTimer(slotIdx);
}
function handlePlayerReconnected(slotIdx) {
  if (!onlineMode || onlineRole !== 'host' || !state) return;
  if (state.players[slotIdx]) state.players[slotIdx].connected = true;
  clearDisconnectTimer();
  hideDisconnectBanner();
  renderAll();
}
function hostMarkDisconnectedInStateLocal(slotIdx) {
  if (state.players[slotIdx]) state.players[slotIdx].connected = false;
}
function showDisconnectBanner(slotIdx) {
  const name = state.players[slotIdx].name;
  document.getElementById('disconnect-banner-text').textContent = `${name} さんの接続が切れています`;
  document.getElementById('disconnect-banner').classList.add('show');
  updateDisconnectModeButton(slotIdx);
}
function updateDisconnectModeButton(slotIdx) {
  const btn = document.getElementById('btn-toggle-wait-mode');
  btn.hidden = false;
  btn.textContent = waitModeEnabled ? 'CPU代打ちモードに切り替え' : 'プレイヤー待機モードに切り替え';
  btn.onclick = () => {
    waitModeEnabled = !waitModeEnabled;
    updateDisconnectModeButton(slotIdx);
    if (!waitModeEnabled) {
      cpuSubstituteNow(slotIdx);
    } else if (state.currentPlayer === slotIdx && state.players[slotIdx] && state.players[slotIdx].connected === false) {
      startDisconnectTimer(slotIdx);
    }
  };
}
function hideDisconnectBanner() {
  document.getElementById('disconnect-banner').classList.remove('show');
  document.getElementById('disconnect-banner-timer').textContent = '';
  document.getElementById('btn-toggle-wait-mode').hidden = true;
}
function startDisconnectTimer(slotIdx) {
  clearDisconnectTimer();
  if (!waitModeEnabled) { cpuSubstituteNow(slotIdx); return; }
  const durationMs = 60000;
  turnTimerDeadline = Date.now() + durationMs;
  turnTimerIntervalId = setInterval(() => {
    const remain = Math.max(0, Math.round((turnTimerDeadline - Date.now()) / 1000));
    document.getElementById('disconnect-banner-timer').textContent = `（あと${remain}秒でCPUが代打ちします）`;
    if (remain <= 0) { clearDisconnectTimer(); cpuSubstituteNow(slotIdx); }
  }, 500);
}
function clearDisconnectTimer() {
  if (turnTimerIntervalId) clearInterval(turnTimerIntervalId);
  turnTimerIntervalId = null;
}
function cpuSubstituteNow(slotIdx) {
  clearDisconnectTimer();
  if (!state || !state.players[slotIdx] || state.players[slotIdx].connected) return;
  if (state.currentPlayer !== slotIdx) return;
  runDisconnectedPlayerCpuTurn(slotIdx);
}

// ---- 通常の手番制限時間（ルーム設定）：接続中プレイヤーが時間内に動かない場合も代打ちする ----
function hostMaybeStartGeneralTurnTimer(idx) {
  if (!onlineMode || onlineRole !== 'host' || !state) return;
  clearDisconnectTimer();
  hideDisconnectBanner();
  const sec = NetRoom.settings.turnTimerSec;
  const p = state.players[idx];
  if (!sec || p.isCpu || p.connected === false) return;
  turnTimerDeadline = Date.now() + sec * 1000;
  document.getElementById('disconnect-banner-text').textContent = `${p.name} さんの手番です`;
  document.getElementById('disconnect-banner').classList.add('show');
  document.getElementById('btn-toggle-wait-mode').hidden = true;
  turnTimerIntervalId = setInterval(() => {
    const remain = Math.max(0, Math.round((turnTimerDeadline - Date.now()) / 1000));
    document.getElementById('disconnect-banner-timer').textContent = `（残り${remain}秒）`;
    if (remain <= 0) {
      clearDisconnectTimer();
      hideDisconnectBanner();
      runDisconnectedPlayerCpuTurn(idx);
    }
  }, 500);
}
