// ===== TRI QUADRON — ゲームエンジン =====

const PHASE = {
  DRAFT_DEAL: 'draft_deal',       // 目標カード配布・選択中
  COUNTDOWN: 'countdown',
  PLAY: 'play',
  RESOLVE: 'resolve',
  REPLENISH: 'replenish',
  GAME_OVER: 'game_over',
};

function createInitialState(seatConfig = null) {
  // seatConfig: null（ローカル4人：デフォルト名） または長さ4の配列
  //   各要素: { isCpu, aiType, name, parts } / null（未設定＝デフォルト名の人間）
  const deck = shuffle(buildDeck());
  const state = {
    deck,
    discard: [],
    market: [],
    flags: {}, // id -> { ownerIdx: null|0-3, die: null|1-3, acquiredBy: null|0-3 }
    players: [0, 1, 2, 3].map(i => {
      const seat = seatConfig ? seatConfig[i] : null;
      const isCpu = !!(seat && seat.isCpu);
      const cpuChar = isCpu ? getCpuCharacter(seat.aiType) : null;
      let dispName;
      if (isCpu) {
        dispName = cpuChar.name;
        const occurrence = seatConfig.slice(0, i).filter(s => s && s.isCpu && s.aiType === seat.aiType).length;
        if (occurrence > 0) dispName += (occurrence === 1 ? '②' : '③');
      } else if (seat && seat.name) {
        dispName = seat.name;
      } else {
        dispName = PLAYER_NAMES[i];
      }
      return {
        idx: i,
        name: dispName,
        isCpu,
        aiType: isCpu ? cpuChar.aiType : null,
        hand: [],
        slots: [null, null, null, null], // 各枠: {targetFlag, cards:[]} | null
        objective: null, // shapeId（確定後）
        objectiveChoices: [], // ドラフト中の2択
        acquiredFlags: [],
        grudgeFlags: [], // たけしAI用：報復対象フラッグ
        parts: (!isCpu && seat && seat.parts) || null, // 人間プレイヤーのアバターパーツ構成（プロフィールから設定）
      };
    }),
    publicShapeList: [], // ドラフト後に残る4シェイプ（公開情報）
    turnOrder: [0, 1, 2, 3],
    currentPlayer: 0,
    turnCount: 0, // 各プレイヤーが完了した手番の総数（終了判定用）
    roundsCompleted: 0,
    phase: PHASE.DRAFT_DEAL,
    log: [],
    gameOverTriggeredAtTurn: null, // 終了条件が満たされたターン数
    winnerInfo: null,
  };
  FLAG_IDS.forEach(id => {
    state.flags[id] = { ownerIdx: null, die: null };
  });
  return state;
}

function logMsg(state, msg) {
  state.log.unshift(msg);
  if (state.log.length > 60) state.log.pop();
}

// ---- セットアップ ----
function dealSetup(state, settings = null) {
  // 市場3枚
  for (let i = 0; i < 3; i++) state.market.push(state.deck.pop());

  // 目標シェイプドラフト：設定（除外リスト・選択肢数）に応じてプールを作る
  const excluded = new Set((settings && settings.objectiveExcluded) || []);
  let pool = SHAPES.map(s => s.id).filter(id => !excluded.has(id));
  if (pool.length === 0) pool = SHAPES.map(s => s.id); // 全除外は無効設定として無視する
  const requestedCount = (settings && settings.objectiveChoiceCount) || 2;
  const choiceCount = Math.max(1, Math.min(requestedCount, pool.length));

  state.players.forEach(p => {
    p.objectiveChoices = shuffle(pool).slice(0, choiceCount);
  });

  // 初期手札5枚
  state.players.forEach(p => {
    for (let i = 0; i < 5; i++) p.hand.push(state.deck.pop());
  });

  logMsg(state, `セットアップ完了。各プレイヤーは目標カード${choiceCount}枚から1枚を選んでください。`);
}

function chooseObjective(state, playerIdx, shapeId) {
  const p = state.players[playerIdx];
  if (!p.objectiveChoices.includes(shapeId)) return false;
  p.objective = shapeId;
  p.objectiveChoices = [];
  return true;
}

function finalizeDraft(state) {
  // 実際に誰かの目標として選ばれているシェイプの集合を公開リストとする
  state.publicShapeList = [...new Set(state.players.map(p => p.objective))];
  logMsg(state, `ドラフト完了。公開リストに残った目標形状: ${state.publicShapeList.map(id => getShape(id).name).join(' / ')}`);
  state.phase = PHASE.COUNTDOWN;
  state.currentPlayer = 0;
  runCountdownPhase(state);
}

// ---- フェイズ1: カウントダウン ----
function runCountdownPhase(state) {
  const p = state.players[state.currentPlayer];
  const zeroedFlags = [];
  FLAG_IDS.forEach(id => {
    const f = state.flags[id];
    if (f.ownerIdx === p.idx && f.die !== null) {
      f.die -= 1;
      if (f.die <= 0) zeroedFlags.push(id);
    }
  });
  zeroedFlags.forEach(id => {
    const f = state.flags[id];
    f.die = null;
    f.ownerIdx = null;
    p.acquiredFlags.push(id);
    logMsg(state, `${p.name} がフラッグ${id}を確定獲得しました！`);
    // このフラッグを狙って中途半端に出されていた（3枚未満の）他の枠は自動的に捨て札になる
    state.players.forEach(other => {
      other.slots.forEach((slot, slotIdx) => {
        if (slot && slot.targetFlag === id && slot.cards.length < 3) {
          discardCards(state, slot.cards, other.idx);
          other.slots[slotIdx] = null;
          logMsg(state, `フラッグ${id}が確定したため、${other.name}の枠が自動的に捨て札になりました。`);
        }
      });
    });
  });
  state.phase = PHASE.PLAY;
}

// ---- フェイズ2: 枠リセット ----
function resetSlot(state, playerIdx, slotIdx) {
  const p = state.players[playerIdx];
  const slot = p.slots[slotIdx];
  if (!slot) return false;
  discardCards(state, slot.cards, playerIdx);
  p.slots[slotIdx] = null;
  logMsg(state, `${p.name} が枠${slotIdx + 1}をリセットしました（フラッグ${slot.targetFlag}への挑戦を中止）。`);
  return true;
}

// カードを捨て札にする（誰が捨てたかを記録する）
function discardCards(state, cards, byPlayerIdx) {
  cards.forEach(c => { c.discardedBy = byPlayerIdx; });
  state.discard.push(...cards);
}

// ---- フェイズ2: カードプレイ ----
function isFlagAvailableForNewSlot(state, flagId) {
  const f = state.flags[flagId];
  // 確定獲得済み（誰かのacquiredFlagsに入っている）でなければ新規/上書き挑戦可能
  return !FLAG_IDS_ACQUIRED(state).includes(flagId);
}
function FLAG_IDS_ACQUIRED(state) {
  return state.players.flatMap(p => p.acquiredFlags);
}

function playCard(state, playerIdx, cardUid, slotIdx, newTargetFlag) {
  const p = state.players[playerIdx];
  const cardIdx = p.hand.findIndex(c => c.uid === cardUid);
  if (cardIdx === -1) return { ok: false, error: 'カードが手札にありません' };
  const card = p.hand[cardIdx];

  let slot = p.slots[slotIdx];
  if (!slot) {
    if (!newTargetFlag) return { ok: false, error: '新しい枠にはフラッグ指定が必要です' };
    if (!isFlagAvailableForNewSlot(state, newTargetFlag)) return { ok: false, error: 'そのフラッグは既に確定獲得されています' };
    slot = { targetFlag: newTargetFlag, cards: [] };
    p.slots[slotIdx] = slot;
  }
  if (slot.cards.length >= 3) return { ok: false, error: 'この枠は既に3枚揃っています' };

  slot.cards.push(card);
  p.hand.splice(cardIdx, 1);
  logMsg(state, `${p.name} が枠${slotIdx + 1}(フラッグ${slot.targetFlag})に ${colorLabel(card.color)}${card.number} を配置しました。`);
  return { ok: true };
}

function colorLabel(colorId) {
  const c = COLORS.find(c => c.id === colorId);
  return c ? c.name : colorId;
}

// ---- フェイズ3: 出撃判定（3枚揃った枠を自動解決） ----
// 勝った（場に残った）カードは捨て札にならず、そのままフラッグ上に残り続ける。
// 負けた／リセットされた／上書きされて外れたカードのみ捨て札になる。
function resolveReadySlots(state, playerIdx) {
  const p = state.players[playerIdx];
  const results = [];
  p.slots.forEach((slot, slotIdx) => {
    if (!slot || slot.cards.length !== 3) return;
    const flagId = slot.targetFlag;
    const f = state.flags[flagId];

    if (FLAG_IDS_ACQUIRED(state).includes(flagId)) {
      discardCards(state, slot.cards, p.idx);
      p.slots[slotIdx] = null;
      const msg = `${p.name} の枠${slotIdx + 1}はフラッグ${flagId}が既に確定獲得済みのため不発に終わりました。`;
      logMsg(state, msg);
      results.push(msg);
      return;
    }

    const hand = evaluateHand(slot.cards);
    let outcome;

    if (f.ownerIdx === null) {
      f.ownerIdx = p.idx;
      f.die = 3;
      f.lastHand = hand;
      f.lastCards = slot.cards.slice();
      f.lastCardsOwner = p.idx;
      outcome = `新規出撃成功：フラッグ${flagId}を${hand.label}(${p.name})が確保（カウント3）`;
    } else if (f.ownerIdx === p.idx) {
      // 自分が既に保持中の枠に対して再出撃 → 延命扱い（上限3）、古いカードは捨て札に、新しいカードが場に残る
      if (f.lastCards) discardCards(state, f.lastCards, f.lastCardsOwner);
      f.die = Math.min(3, f.die + 1);
      f.lastHand = hand;
      f.lastCards = slot.cards.slice();
      f.lastCardsOwner = p.idx;
      outcome = `${p.name} がフラッグ${flagId}の保持を強化（カウント${f.die}）`;
    } else {
      const defenderIdx = f.ownerIdx;
      const defenderHand = f.lastHand;
      if (defenderHand && isStrictlyStronger(hand, defenderHand)) {
        // 上書き成功：防衛側の古いカードが捨て札に、挑戦側の新しいカードが場に残る
        if (f.lastCards) discardCards(state, f.lastCards, f.lastCardsOwner);
        state.players[defenderIdx].grudgeFlags.push(flagId);
        f.ownerIdx = p.idx;
        f.die = Math.min(3, (f.die || 0) + 1);
        f.lastHand = hand;
        f.lastCards = slot.cards.slice();
        f.lastCardsOwner = p.idx;
        outcome = `上書き成功：${p.name} の${hand.label}が${state.players[defenderIdx].name}を退けフラッグ${flagId}を奪取（カウント${f.die}）`;
      } else {
        // 上書き失敗：挑戦側が出したカードのみ捨て札に（防衛側はそのまま場に残る）
        discardCards(state, slot.cards, p.idx);
        outcome = `上書き失敗：${p.name} の${hand.label}は${state.players[defenderIdx].name}の役を上回れず、フラッグ${flagId}は防衛されました`;
      }
    }
    p.slots[slotIdx] = null;
    logMsg(state, outcome);
    results.push(outcome);
  });
  return results;
}

// ---- フェイズ4: 補充 ----
// 山札が尽きていて捨て札がある場合、捨て札をシャッフルして新しい山札にする
function ensureDeckAvailable(state) {
  if (state.deck.length === 0 && state.discard.length > 0) {
    state.deck = shuffle(state.discard);
    state.discard = [];
    logMsg(state, `山札が尽きたため、捨て札 ${state.deck.length}枚をシャッフルして新しい山札にしました。`);
  }
}
function refillMarket(state) {
  while (state.market.length < 3) {
    ensureDeckAvailable(state);
    if (state.deck.length === 0) break;
    state.market.push(state.deck.pop());
  }
}
function drawCard(state, playerIdx, source, marketIdx) {
  const p = state.players[playerIdx];
  if (p.hand.length >= 5) return { ok: false, error: '手札が上限です' };
  let card = null;
  if (source === 'deck') {
    ensureDeckAvailable(state);
    if (state.deck.length === 0) return { ok: false, error: '山札が空です' };
    card = state.deck.pop();
  } else if (source === 'market') {
    if (marketIdx === undefined || !state.market[marketIdx]) return { ok: false, error: '市場にカードがありません' };
    card = state.market.splice(marketIdx, 1)[0];
    refillMarket(state);
  }
  if (card) p.hand.push(card);
  return { ok: true, card };
}
function discardOne(state, playerIdx, cardUid) {
  const p = state.players[playerIdx];
  const idx = p.hand.findIndex(c => c.uid === cardUid);
  if (idx === -1) return { ok: false };
  discardCards(state, p.hand.splice(idx, 1), playerIdx);
  return { ok: true };
}

function autoReplenish(state, playerIdx) {
  const p = state.players[playerIdx];
  ensureDeckAvailable(state);
  while (p.hand.length < 5 && (state.deck.length > 0 || state.market.length > 0)) {
    if (state.deck.length > 0) {
      p.hand.push(state.deck.pop());
    } else if (state.market.length > 0) {
      p.hand.push(state.market.shift());
      refillMarket(state);
    } else break;
    ensureDeckAvailable(state);
  }
}

// 現在のプレイヤーの視点から「見えているカード」を集める
// （自分の手札／自分が捨てたカード／全員の枠のカード／全員のフラッグに残っているカード／市場）
function computeKnownCardsForPlayer(state, playerIdx) {
  const known = [];
  const p = state.players[playerIdx];
  known.push(...p.hand);
  state.discard.forEach(c => { if (c.discardedBy === playerIdx) known.push(c); });
  state.players.forEach(pl => pl.slots.forEach(s => { if (s) known.push(...s.cards); }));
  FLAG_IDS.forEach(id => { const f = state.flags[id]; if (f.lastCards) known.push(...f.lastCards); });
  known.push(...state.market);
  return known;
}
// 山札に残っている可能性がある色ごとの枚数を、そのプレイヤーの視点で推定する
function computeDeckProbability(state, playerIdx) {
  const known = computeKnownCardsForPlayer(state, playerIdx);
  const knownPairs = new Set(known.map(c => c.color + '-' + c.number));
  const breakdown = COLORS.map(col => {
    const remainingNumbers = [];
    for (let n = 1; n <= 10; n++) {
      if (!knownPairs.has(col.id + '-' + n)) remainingNumbers.push(n);
    }
    return { color: col.id, name: col.name, remaining: remainingNumbers.length, remainingNumbers };
  });
  const totalRemaining = breakdown.reduce((s, b) => s + b.remaining, 0);
  return { breakdown, totalRemaining };
}

// ---- 勝利条件判定 ----
function isDeckAndDiscardEmpty(state) {
  return state.deck.length === 0 && state.discard.length === 0;
}
// 全員が手札0枚で、山札・市場・捨て札のいずれからも補充できない＝誰もカードを出せない状態
function isEveryoneStuck(state) {
  const noSupply = state.deck.length === 0 && state.market.length === 0 && state.discard.length === 0;
  return noSupply && state.players.every(p => p.hand.length === 0);
}

function checkTriggerConditions(state) {
  for (const p of state.players) {
    if (p.objective && shapeAchieved(p.objective, p.acquiredFlags)) return true;
    if (p.acquiredFlags.length >= 5) return true;
  }
  if (isDeckAndDiscardEmpty(state)) return true;
  if (isEveryoneStuck(state)) return true;
  return false;
}

function computeWinner(state) {
  // Tier1: 目標達成者
  const achievers = state.players.filter(p => p.objective && shapeAchieved(p.objective, p.acquiredFlags));
  let tier, pool;
  if (achievers.length > 0) {
    tier = 1;
    pool = achievers;
  } else {
    const fiveers = state.players.filter(p => p.acquiredFlags.length >= 5);
    if (fiveers.length > 0) {
      tier = 2;
      pool = fiveers;
    } else {
      tier = 3;
      const maxFlags = Math.max(...state.players.map(p => p.acquiredFlags.length));
      pool = state.players.filter(p => p.acquiredFlags.length === maxFlags);
    }
  }

  if (pool.length > 1) {
    if (tier === 1) {
      const maxDiff = Math.max(...pool.map(p => getShape(p.objective).difficulty));
      pool = pool.filter(p => getShape(p.objective).difficulty === maxDiff);
    }
    if (pool.length > 1) {
      const maxFlags = Math.max(...pool.map(p => p.acquiredFlags.length));
      pool = pool.filter(p => p.acquiredFlags.length === maxFlags);
    }
    if (pool.length > 1) {
      const countInProgress = p => FLAG_IDS.filter(id => state.flags[id].ownerIdx === p.idx).length;
      const maxProg = Math.max(...pool.map(countInProgress));
      pool = pool.filter(p => countInProgress(p) === maxProg);
    }
    if (pool.length > 1) {
      const closestDie = p => {
        const dies = FLAG_IDS.filter(id => state.flags[id].ownerIdx === p.idx).map(id => state.flags[id].die);
        return dies.length ? Math.min(...dies) : 99;
      };
      const minDie = Math.min(...pool.map(closestDie));
      pool = pool.filter(p => closestDie(p) === minDie);
    }
  }

  return { tier, winners: pool.map(p => p.idx) };
}

function endTurnAdvance(state) {
  state.turnCount += 1;
  if (state.gameOverTriggeredAtTurn === null && checkTriggerConditions(state)) {
    state.gameOverTriggeredAtTurn = state.turnCount;
    logMsg(state, '終了条件成立！ 全員が同じ手番数を終えたらゲーム終了です。');
  }
  const posInOrder = state.turnOrder.indexOf(state.currentPlayer);
  const nextIdx = (posInOrder + 1) % 4;
  state.currentPlayer = state.turnOrder[nextIdx];

  if (state.gameOverTriggeredAtTurn !== null && state.turnCount % 4 === 0 && state.turnCount >= state.gameOverTriggeredAtTurn) {
    state.phase = PHASE.GAME_OVER;
    state.winnerInfo = computeWinner(state);
    logMsg(state, 'ゲーム終了！');
  } else {
    state.phase = PHASE.COUNTDOWN;
    runCountdownPhase(state);
  }
}

// ============================================================
// ===== CPU AI エンジン =====
// ============================================================

// ドラフト時のCPUの目標選択：単純に難易度の低い方を選ぶ（手堅く達成しやすい方を優先）
function cpuChooseObjective(state, playerIdx) {
  const p = state.players[playerIdx];
  const choices = p.objectiveChoices.map(id => getShape(id));
  const best = choices.reduce((a, b) => (b.difficulty < a.difficulty ? b : a), choices[0]);
  chooseObjective(state, playerIdx, best.id);
}

function pickRandom(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

// 自分の目標シェイプにとって最も有望な配置（既に確定獲得された邪魔なマスを含まない）を探し、
// その配置のうちまだ自分が持っていないフラッグ一覧を返す
function aiObjectiveTargetFlags(state, selfIdx) {
  const p = state.players[selfIdx];
  if (!p.objective) return [];
  const shape = getShape(p.objective);
  const acquiredAll = FLAG_IDS_ACQUIRED(state);
  const mySet = new Set(p.acquiredFlags);
  let bestScore = -1;
  let bestPlacements = [];
  shape.placements.forEach(triple => {
    const blocked = triple.some(id => acquiredAll.includes(id) && !mySet.has(id));
    if (blocked) return;
    const ownedCount = triple.filter(id => mySet.has(id)).length;
    if (ownedCount === 3) return;
    if (ownedCount > bestScore) { bestScore = ownedCount; bestPlacements = [triple]; }
    else if (ownedCount === bestScore) { bestPlacements.push(triple); }
  });
  if (bestPlacements.length === 0) return [];
  const chosen = pickRandom(bestPlacements);
  return chosen.filter(id => !mySet.has(id));
}
// 自分の目標が「あと1マス」のリーチ状態にあるフラッグ一覧
function aiMyReachFlags(state, selfIdx) {
  const p = state.players[selfIdx];
  if (!p.objective) return [];
  const acquiredAll = FLAG_IDS_ACQUIRED(state);
  const reach = computeReachFlags(p.objective, p.acquiredFlags);
  return [...reach].filter(id => !acquiredAll.includes(id));
}
// 公開されている目標形状をもとに、達成に近い（リーチ状態の）相手とそのフラッグを検出する
function aiThreatFlags(state, selfIdx) {
  const acquiredAll = FLAG_IDS_ACQUIRED(state);
  const threats = [];
  state.players.forEach(p => {
    if (p.idx === selfIdx) return;
    state.publicShapeList.forEach(shapeId => {
      const reach = computeReachFlags(shapeId, p.acquiredFlags);
      reach.forEach(flagId => {
        if (!acquiredAll.includes(flagId)) threats.push({ opponentIdx: p.idx, flagId, shapeId });
      });
    });
  });
  return threats;
}
// 現在誰か（自分以外）が保持中で、まだ確定獲得されていないフラッグ一覧
function aiOpponentHeldFlags(state, selfIdx) {
  const acquiredAll = FLAG_IDS_ACQUIRED(state);
  return FLAG_IDS.filter(id => {
    const f = state.flags[id];
    return f.ownerIdx !== null && f.ownerIdx !== selfIdx && !acquiredAll.includes(id);
  });
}
// まだ誰も手を付けていない（一番争いが少ない）フラッグ一覧。なければ確定前のフラッグ全般。
function aiEmptyFlags(state) {
  const acquiredAll = FLAG_IDS_ACQUIRED(state);
  const empty = FLAG_IDS.filter(id => state.flags[id].ownerIdx === null && !acquiredAll.includes(id));
  if (empty.length) return empty;
  return FLAG_IDS.filter(id => !acquiredAll.includes(id));
}
// 相手保持中のフラッグの中から、記録されている役が最も弱い（＝上書きしやすい）ものを選ぶ
function pickWeakestOpponentFlag(state, flagIds) {
  let best = null, bestHand = null;
  flagIds.forEach(id => {
    const f = state.flags[id];
    if (!f.lastHand) return;
    if (!bestHand || f.lastHand.rank < bestHand.rank ||
        (f.lastHand.rank === bestHand.rank && f.lastHand.tiebreak < bestHand.tiebreak)) {
      best = id; bestHand = f.lastHand;
    }
  });
  return best || pickRandom(flagIds);
}

// 性格（aiType）ごとに、今ターンの最優先ターゲットフラッグを1つ選ぶ
function aiPickTargetFlag(state, selfIdx) {
  const p = state.players[selfIdx];
  const acquiredAll = FLAG_IDS_ACQUIRED(state);
  const objFlags = aiObjectiveTargetFlags(state, selfIdx);
  const myReach = aiMyReachFlags(state, selfIdx);
  const threats = aiThreatFlags(state, selfIdx).filter(t => !acquiredAll.includes(t.flagId));
  const threatFlags = [...new Set(threats.map(t => t.flagId))];
  const opponentHeld = aiOpponentHeldFlags(state, selfIdx);
  const emptyFlags = aiEmptyFlags(state);

  switch (p.aiType) {
    case 'takeshi': {
      if (p.grudgeFlags.length) {
        const idx2 = p.grudgeFlags.findIndex(id => !acquiredAll.includes(id));
        if (idx2 !== -1) return p.grudgeFlags.splice(idx2, 1)[0];
        p.grudgeFlags = [];
      }
      if (myReach.length) return pickRandom(myReach);
      if (objFlags.length) return pickRandom(objFlags);
      if (threatFlags.length) return pickRandom(threatFlags);
      return pickRandom(emptyFlags);
    }
    case 'masashi': {
      if (myReach.length) return pickRandom(myReach);
      if (objFlags.length) return pickRandom(objFlags);
      return pickRandom(emptyFlags);
    }
    case 'machiko': {
      if (threatFlags.length) return pickRandom(threatFlags);
      if (myReach.length) return pickRandom(myReach);
      if (objFlags.length) return pickRandom(objFlags);
      return pickRandom(emptyFlags);
    }
    case 'kujaku': {
      if (myReach.length) return pickRandom(myReach);
      const threatHeld = threatFlags.filter(id => opponentHeld.includes(id));
      if (threatHeld.length) return pickRandom(threatHeld);
      if (threatFlags.length) return pickRandom(threatFlags);
      if (opponentHeld.length) return pickWeakestOpponentFlag(state, opponentHeld);
      if (objFlags.length) return pickRandom(objFlags);
      return pickRandom(emptyFlags);
    }
    case 'kenta': {
      if (myReach.length) return pickRandom(myReach);
      const dual = threatFlags.filter(id => objFlags.includes(id));
      if (dual.length) return pickRandom(dual);
      if (objFlags.length) return pickRandom(objFlags);
      // 妨害するにしても自分にメリットがある（脅威除去になる）場合のみ
      if (threatFlags.length) return pickRandom(threatFlags);
      return pickRandom(emptyFlags);
    }
    case 'taro': {
      const dual = objFlags.filter(id => opponentHeld.includes(id));
      if (dual.length) return pickRandom(dual);
      if (myReach.length) return pickRandom(myReach);
      if (objFlags.length) return pickRandom(objFlags);
      if (opponentHeld.length) return pickWeakestOpponentFlag(state, opponentHeld);
      return pickRandom(emptyFlags);
    }
    default:
      return pickRandom(objFlags.length ? objFlags : emptyFlags);
  }
}

// 部分的な3枚見込みの強さを概算する（2枚時点での役の伸びしろ評価にも使う）
function aiScorePartialHand(cards) {
  if (cards.length === 3) {
    const h = evaluateHand(cards);
    return h.rank * 1000 + h.tiebreak * 10 + h.sum;
  }
  if (cards.length === 2) {
    const [a, b] = cards;
    let score = a.number + b.number;
    if (a.number === b.number) score += 400; // スリーカード狙い（最優先）
    if (a.color === b.color) score += 250; // フラッシュ狙い
    if (Math.abs(a.number - b.number) === 1) score += 150; // ストレート狙い
    return score;
  }
  return cards[0] ? cards[0].number * 5 : 0;
}
function aiScoreLoneCard(c, hand) {
  const sameColor = hand.filter(x => x.color === c.color).length;
  const sameNumber = hand.filter(x => x.number === c.number).length;
  return c.number + sameColor * 8 + sameNumber * 14;
}
// 手札の中から、指定した既存カード群に最も合う1枚を選ぶ
function aiPickCardForSlot(hand, existingCards) {
  if (existingCards.length === 0) {
    return hand.reduce((best, c) => (aiScoreLoneCard(c, hand) > aiScoreLoneCard(best, hand) ? c : best), hand[0]);
  }
  let bestCard = hand[0], bestScore = -Infinity;
  hand.forEach(c => {
    const score = aiScorePartialHand([...existingCards, c]);
    if (score > bestScore) { bestScore = score; bestCard = c; }
  });
  return bestCard;
}
// 市場に、今伸ばしている枠の役に役立つカードがあればそのインデックスを返す（なければ-1）
function aiPickHelpfulMarketIndex(state, p) {
  const activeSlot = p.slots.find(s => s && s.cards.length > 0 && s.cards.length < 3);
  if (!activeSlot) return -1;
  let bestIdx = -1, bestScore = -Infinity;
  state.market.forEach((c, i) => {
    const score = aiScorePartialHand([...activeSlot.cards, c]);
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  });
  // 十分に役立つ場合のみ市場から取る（そうでなければ山札に任せる）
  return bestScore >= 250 ? bestIdx : -1;
}

// CPUの1ターンをまるごと自動実行する
// CPUの1ターンを構成する各ステップ（UI側で1つずつ演出しながら呼び出せるように分割）

// ステップ1：死に枠の掃除＋くじゃくAIの切り替え判断（無音・即時）
function cpuPrepareTurn(state, idx) {
  const p = state.players[idx];
  const acquiredAll = FLAG_IDS_ACQUIRED(state);
  p.slots.forEach((slot, i) => {
    if (slot && acquiredAll.includes(slot.targetFlag)) resetSlot(state, idx, i);
  });
  if (p.aiType === 'kujaku') {
    const myReach = aiMyReachFlags(state, idx);
    if (myReach.length) {
      p.slots.forEach((slot, i) => {
        if (!slot || slot.cards.length >= 3) return;
        const owner = state.flags[slot.targetFlag].ownerIdx;
        if (owner !== null && owner !== idx && !myReach.includes(slot.targetFlag)) {
          resetSlot(state, idx, i);
        }
      });
    }
  }
}

// ステップ2：ターゲットフラッグと出すカードを決定して実際に出す。
// 戻り値：{ targetFlag, card, slotIdx } または、手札が無ければ null
function cpuChooseAndPlay(state, idx) {
  const p = state.players[idx];
  if (p.hand.length === 0) return null;

  let targetFlag = aiPickTargetFlag(state, idx);
  if (!targetFlag) targetFlag = pickRandom(aiEmptyFlags(state));

  let slotIdx = p.slots.findIndex(s => s && s.targetFlag === targetFlag && s.cards.length < 3);
  let newTarget = null;
  if (slotIdx === -1) {
    slotIdx = p.slots.findIndex(s => s === null);
    if (slotIdx === -1) {
      slotIdx = 0;
      for (let i = 1; i < p.slots.length; i++) {
        if (p.slots[i].cards.length > p.slots[slotIdx].cards.length) slotIdx = i;
      }
      targetFlag = p.slots[slotIdx].targetFlag; // 妥協：既存の枠に合わせる
    } else {
      newTarget = targetFlag;
    }
  }

  const slot = p.slots[slotIdx];
  const existingCards = slot ? slot.cards : [];
  const card = aiPickCardForSlot(p.hand, existingCards);
  playCard(state, idx, card.uid, slotIdx, newTarget);
  return { targetFlag, card, slotIdx };
}

// ステップ3：3枚揃った枠を解決する（既存のresolveReadySlotsをそのまま利用）
function cpuResolveSlots(state, idx) {
  return resolveReadySlots(state, idx);
}

// ステップ4：手札を5枚まで補充する
function cpuReplenish(state, idx) {
  const p = state.players[idx];
  while (p.hand.length < 5) {
    const marketIdx = aiPickHelpfulMarketIndex(state, p);
    if (marketIdx !== -1) {
      drawCard(state, idx, 'market', marketIdx);
      continue;
    }
    if (state.deck.length > 0 || state.discard.length > 0) {
      drawCard(state, idx, 'deck');
    } else {
      break;
    }
  }
}

// CPUの1ターンをまるごと自動実行する（シミュレーション・テスト用。UIは各ステップを個別に呼び出す）
function runCpuTurn(state, idx) {
  const p = state.players[idx];
  cpuPrepareTurn(state, idx);
  cpuChooseAndPlay(state, idx);
  cpuResolveSlots(state, idx);
  cpuReplenish(state, idx);
  logMsg(state, `${p.name}（CPU）がターンを終了しました。`);
  endTurnAdvance(state);
}

// ---- オンライン対戦用：視点フィルタリング ----
// 他プレイヤーの手札・目標候補・確定目標を隠した状態のコピーを作る（ホストが各ゲストへ送る用）
function buildFilteredStateForViewer(state, viewerIdx) {
  const clone = JSON.parse(JSON.stringify(state));
  clone.players.forEach((p, i) => {
    if (i === viewerIdx) return;
    p.hand = p.hand.map(() => ({ hidden: true, uid: 'hidden-' + Math.random() }));
    p.objectiveChoices = p.objectiveChoices.map(() => null);
    p.objective = null;
  });
  return clone;
}
