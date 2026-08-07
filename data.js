// ===== TRI QUADRON — データ定義 =====

// 9色（カード色）。CSS変数名と対応させる。
const COLORS = [
  { id: 'crimson', name: '緋',   hex: '#c0392b' },
  { id: 'azure',   name: '藍',   hex: '#2166ac' },
  { id: 'jade',    name: '翠',   hex: '#1e8e5a' },
  { id: 'amber',   name: '黄',   hex: '#f5c400' },
  { id: 'violet',  name: '菫',   hex: '#7d4fa3' },
  { id: 'ink',     name: '墨',   hex: '#3b3f44' },
  { id: 'orange',  name: '橙',   hex: '#d9722c' },
  { id: 'magenta', name: '桃',   hex: '#c23b7d' },
  { id: 'teal',    name: '碧',   hex: '#1f8a8a' },
];

const PLAYER_COLORS = ['#e8734a', '#4a90c9', '#5cb85c', '#e0c341'];
const PLAYER_NAMES = ['プレイヤー1', 'プレイヤー2', 'プレイヤー3', 'プレイヤー4'];

// 4x4 フラッグ盤面 A〜P。row,colは0-3。
const FLAG_IDS = 'ABCDEFGHIJKLMNOP'.split('');
function flagPos(id) {
  const idx = FLAG_IDS.indexOf(id);
  return { row: Math.floor(idx / 4), col: idx % 4 };
}
function flagIdAt(row, col) {
  return FLAG_IDS[row * 4 + col];
}

// ===== 個人目標シェイプ（3マス構成・直線を除く8種） =====
// cells は基準となる相対座標（正規化前）。難易度1〜5。
const SHAPES_RAW = [
  { id: 'kagi_small',  name: 'かぎ形（小）',   difficulty: 1, cells: [[0,0],[1,0],[1,1]] },
  { id: 'kaidan',      name: '階段形（小）',   difficulty: 1, cells: [[0,0],[1,0],[2,1]] },
  { id: 'kagi_large',  name: 'かぎ形（大）',   difficulty: 2, cells: [[0,0],[2,0],[2,1]] },
  { id: 'sankaku',     name: '三角形',         difficulty: 2, cells: [[0,0],[0,2],[1,1]] },
  { id: 'tanigata',    name: '谷形',           difficulty: 2, cells: [[0,0],[0,2],[2,1]] },
  { id: 'hirogari',    name: 'コの字（広がり）', difficulty: 3, cells: [[0,0],[0,3],[1,0]] },
  { id: 'tsuegata',    name: 'つえ形',         difficulty: 3, cells: [[0,0],[1,0],[3,1]] },
  { id: 'furiko',      name: 'ふりこ形',       difficulty: 3, cells: [[0,0],[1,1],[3,1]] },
  { id: 'zigzag',      name: '飛び石（ジグザグ）', difficulty: 4, cells: [[0,0],[1,2],[2,1]] },
  { id: 'hanegata',    name: 'はね形',         difficulty: 4, cells: [[0,0],[0,3],[2,1]] },
  { id: 'daisankaku',  name: '大三角形',       difficulty: 5, cells: [[0,0],[0,3],[3,0]] },
  { id: 'taikaku_kagi', name: '対角かぎ形',    difficulty: 5, cells: [[0,0],[1,0],[3,3]] },
];

function normalizeCells(cells) {
  const minR = Math.min(...cells.map(c => c[0]));
  const minC = Math.min(...cells.map(c => c[1]));
  return cells.map(c => [c[0] - minR, c[1] - minC])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}
function cellsKey(cells) {
  return normalizeCells(cells).map(c => c.join(',')).join('|');
}
function rotate90(cells) {
  const maxR = Math.max(...cells.map(c => c[0]));
  return cells.map(([r, c]) => [c, maxR - r]);
}
function allRotationKeys(cells) {
  const keys = new Set();
  let cur = cells;
  for (let i = 0; i < 4; i++) {
    keys.add(cellsKey(cur));
    cur = rotate90(cur);
  }
  return keys;
}

// 各シェイプについて、4回転すべての正規化キーを事前計算しておく
const SHAPES = SHAPES_RAW.map(s => ({
  ...s,
  rotationKeys: allRotationKeys(s.cells),
  placements: computeAllPlacements(s),
}));

// シェイプが盤面(4x4)上で取り得るすべての配置（回転4種×平行移動）を
// フラッグID3つ組のリストとして列挙する
function computeAllPlacements(shape) {
  const placements = [];
  let cur = normalizeCells(shape.cells);
  for (let rot = 0; rot < 4; rot++) {
    const maxR = Math.max(...cur.map(c => c[0]));
    const maxC = Math.max(...cur.map(c => c[1]));
    for (let dr = 0; dr <= 3 - maxR; dr++) {
      for (let dc = 0; dc <= 3 - maxC; dc++) {
        const flagIds = cur.map(([r, c]) => flagIdAt(r + dr, c + dc));
        placements.push(flagIds);
      }
    }
    cur = normalizeCells(rotate90(cur));
  }
  return placements;
}

// プレビュー表示用：シェイプのセルをtimes回(90度単位)回転した相対座標を返す
function rotateShapeCellsPreview(shape, times) {
  let cur = normalizeCells(shape.cells);
  const n = ((times % 4) + 4) % 4;
  for (let i = 0; i < n; i++) cur = normalizeCells(rotate90(cur));
  return cur;
}

// 指定プレイヤーが「リーチ」（あと1マスで目標達成）状態にあるフラッグIDの集合を返す
function computeReachFlags(shapeId, ownedFlagIds) {
  const shape = getShape(shapeId);
  const ownedSet = new Set(ownedFlagIds);
  const reach = new Set();
  shape.placements.forEach(triple => {
    const ownedCount = triple.filter(id => ownedSet.has(id)).length;
    if (ownedCount === 2) {
      const missing = triple.find(id => !ownedSet.has(id));
      if (missing) reach.add(missing);
    }
  });
  return reach;
}

function getShape(id) {
  return SHAPES.find(s => s.id === id);
}

// combinations of size k from array
function combinations(arr, k) {
  const result = [];
  function helper(start, combo) {
    if (combo.length === k) { result.push(combo.slice()); return; }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      helper(i + 1, combo);
      combo.pop();
    }
  }
  helper(0, []);
  return result;
}

// 所持フラッグ群（ID配列）の中に、指定シェイプに一致する3つの組み合わせがあるか判定
function shapeAchieved(shapeId, ownedFlagIds) {
  if (ownedFlagIds.length < 3) return false;
  const shape = getShape(shapeId);
  const combos = combinations(ownedFlagIds, 3);
  for (const combo of combos) {
    const cells = combo.map(id => { const p = flagPos(id); return [p.row, p.col]; });
    const key = cellsKey(cells);
    if (shape.rotationKeys.has(key)) return true;
  }
  return false;
}

// ===== CPU対戦相手のキャラクター定義 =====
// イラストはすべて同じ画風（丸顔・シンプルな線画のフラットアイコン）で統一する
function cpuAvatarSvg(inner) {
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="58" fill="#2a3a33" stroke="#c9a227" stroke-width="2"/>
    ${inner}
  </svg>`;
}
const CPU_SKIN = '#f0c896';
const CPU_FACE = `<circle cx="60" cy="66" r="30" fill="${CPU_SKIN}"/>`;
const CPU_EARS = `<circle cx="31" cy="68" r="6" fill="${CPU_SKIN}"/><circle cx="89" cy="68" r="6" fill="${CPU_SKIN}"/>`;

const CPU_CHARACTERS = [
  {
    id: 'takeshi', aiType: 'takeshi', name: 'たけし',
    playstyleShort: 'やられたら倍返し好戦派', strength: 2,
    illustNote: 'やんちゃ坊主',
    avatar: cpuAvatarSvg(`
      ${CPU_EARS}${CPU_FACE}
      <path d="M30 55 Q35 15 60 20 Q85 15 90 55 Q75 30 60 34 Q45 30 30 55Z" fill="#3a2a1c"/>
      <path d="M38 30 L28 8 M52 22 L48 2 M68 22 L72 2 M82 30 L92 8" stroke="#3a2a1c" stroke-width="5" stroke-linecap="round"/>
      <rect x="26" y="42" width="68" height="10" rx="4" fill="#c0392b"/>
      <circle cx="47" cy="70" r="3.4" fill="#231a12"/><circle cx="73" cy="70" r="3.4" fill="#231a12"/>
      <path d="M45 86 Q60 96 75 86" stroke="#231a12" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M64 74 L70 68" stroke="#231a12" stroke-width="2" stroke-linecap="round"/>
    `),
  },
  {
    id: 'masashi', aiType: 'masashi', name: 'まさし',
    playstyleShort: '妨害せず目標まっしぐら', strength: 1,
    illustNote: '純粋そうな普通の男の子',
    avatar: cpuAvatarSvg(`
      ${CPU_EARS}${CPU_FACE}
      <path d="M30 50 Q30 18 60 18 Q90 18 90 50 Q90 34 60 32 Q30 34 30 50Z" fill="#5a3a22"/>
      <circle cx="47" cy="70" r="3.2" fill="#231a12"/><circle cx="73" cy="70" r="3.2" fill="#231a12"/>
      <path d="M48 86 Q60 93 72 86" stroke="#231a12" stroke-width="3" fill="none" stroke-linecap="round"/>
      <circle cx="46" cy="80" r="4" fill="#f2a9a0" opacity=".6"/><circle cx="74" cy="80" r="4" fill="#f2a9a0" opacity=".6"/>
    `),
  },
  {
    id: 'machiko', aiType: 'machiko', name: 'まちこ',
    playstyleShort: '目標優先、脅威には反撃', strength: 3,
    illustNote: 'ふつうの女の子',
    avatar: cpuAvatarSvg(`
      ${CPU_EARS}${CPU_FACE}
      <path d="M28 60 Q26 16 60 16 Q94 16 92 60 Q94 90 82 92 Q88 60 78 40 Q60 30 42 40 Q32 60 38 92 Q26 90 28 60Z" fill="#2c1c14"/>
      <circle cx="22" cy="86" r="7" fill="#e07ba0"/><circle cx="98" cy="86" r="7" fill="#e07ba0"/>
      <circle cx="47" cy="70" r="3.2" fill="#231a12"/><circle cx="73" cy="70" r="3.2" fill="#231a12"/>
      <path d="M48 85 Q60 92 72 85" stroke="#231a12" stroke-width="3" fill="none" stroke-linecap="round"/>
    `),
  },
  {
    id: 'kujaku', aiType: 'kujaku', name: 'くじゃく',
    playstyleShort: '妨害優先、隙あらば寝返る', strength: 4,
    illustNote: 'ナルシスト風の学校教師',
    avatar: cpuAvatarSvg(`
      <path d="M60 66 L18 30 L30 20 L60 46 L90 20 L102 30 Z" fill="#2166ac" opacity=".55"/>
      <path d="M60 66 L14 46 L22 34 L60 50 L98 34 L106 46 Z" fill="#1e8e5a" opacity=".55"/>
      ${CPU_EARS}${CPU_FACE}
      <path d="M30 52 Q32 20 60 20 Q88 20 90 52 Q80 30 60 30 Q40 30 30 52Z" fill="#1a1a1a"/>
      <rect x="40" y="64" width="14" height="7" rx="3" fill="#1a1a1a" opacity=".85"/>
      <rect x="66" y="64" width="14" height="7" rx="3" fill="#1a1a1a" opacity=".85"/>
      <line x1="54" y1="67" x2="66" y2="67" stroke="#1a1a1a" stroke-width="2"/>
      <path d="M48 88 Q60 82 72 88" stroke="#231a12" stroke-width="3" fill="none" stroke-linecap="round"/>
    `),
  },
  {
    id: 'kenta', aiType: 'kenta', name: 'けんた',
    playstyleShort: '目標優先、実利重視で妨害', strength: 4,
    illustNote: '眼鏡をかけた真面目っ子',
    avatar: cpuAvatarSvg(`
      ${CPU_EARS}${CPU_FACE}
      <path d="M30 52 Q30 20 60 20 Q90 20 90 52 Q88 32 60 32 Q32 32 30 52Z" fill="#241f1a"/>
      <circle cx="47" cy="70" r="9" fill="none" stroke="#231a12" stroke-width="2.5"/>
      <circle cx="73" cy="70" r="9" fill="none" stroke="#231a12" stroke-width="2.5"/>
      <line x1="56" y1="70" x2="64" y2="70" stroke="#231a12" stroke-width="2.5"/>
      <circle cx="47" cy="70" r="2.6" fill="#231a12"/><circle cx="73" cy="70" r="2.6" fill="#231a12"/>
      <path d="M50 87 Q60 90 70 87" stroke="#231a12" stroke-width="3" fill="none" stroke-linecap="round"/>
    `),
  },
  {
    id: 'taro', aiType: 'taro', name: 'たろう',
    playstyleShort: '常に最善手を選ぶ効率派', strength: 5,
    illustNote: '仮面をつけている謎多き子供',
    avatar: cpuAvatarSvg(`
      ${CPU_EARS}${CPU_FACE}
      <path d="M30 50 Q30 18 60 18 Q90 18 90 50 Q90 36 60 34 Q30 36 30 50Z" fill="#3b3f44"/>
      <path d="M28 58 Q60 44 92 58 L90 82 Q60 96 30 82 Z" fill="#7d4fa3"/>
      <path d="M42 68 Q47 64 52 68" stroke="#f2e9d3" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M68 68 Q73 64 78 68" stroke="#f2e9d3" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M50 82 Q60 86 70 82" stroke="#f2e9d3" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>
    `),
  },
];
function getCpuCharacter(id) {
  return CPU_CHARACTERS.find(c => c.id === id);
}
function buildDeck() {
  const deck = [];
  let uid = 0;
  for (const color of COLORS) {
    for (let n = 1; n <= 10; n++) {
      deck.push({ uid: 'c' + (uid++), color: color.id, number: n });
    }
  }
  return deck;
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ===== 役判定（3枚） =====
// rank: 4=ストレートフラッシュ 3=スリーカード 2=フラッシュ 1=ストレート 0=ブタ
function evaluateHand(cards) {
  const nums = cards.map(c => c.number).sort((a, b) => a - b);
  const colors = cards.map(c => c.color);
  const isFlush = colors.every(c => c === colors[0]);
  const isStraight = (nums[1] === nums[0] + 1) && (nums[2] === nums[1] + 1);
  const isThree = nums[0] === nums[1] && nums[1] === nums[2];
  const sum = nums[0] + nums[1] + nums[2];
  const high = nums[2];

  let rank, label;
  if (isStraight && isFlush) { rank = 4; label = 'ストレートフラッシュ'; }
  else if (isThree) { rank = 3; label = 'スリーカード'; }
  else if (isFlush) { rank = 2; label = 'フラッシュ'; }
  else if (isStraight) { rank = 1; label = 'ストレート'; }
  else { rank = 0; label = 'ブタ'; }

  // tiebreak値: 役ごとに比較すべき基準を決める（同ランク同士の比較用）
  let tiebreak;
  if (rank === 3) tiebreak = nums[0]; // スリーカードは数字そのもの
  else if (rank === 0) tiebreak = sum; // ブタは合計
  else tiebreak = high; // ストレート/フラッシュ/SFは最大数字

  return { rank, label, tiebreak, high, sum, nums };
}

// handA が handB より「明確に強い」か（上書き判定）。完全同値なら false（先出し有利）
function isStrictlyStronger(handA, handB) {
  if (handA.rank !== handB.rank) return handA.rank > handB.rank;
  if (handA.tiebreak !== handB.tiebreak) return handA.tiebreak > handB.tiebreak;
  // ブタ同士で合計も同じ場合など、完全一致 → 上書き不可
  return false;
}
