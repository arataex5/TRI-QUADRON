// ===== プレイヤーアバター（パーツ×色 組み合わせ式） =====
// 頭（髪・帽子）／目／鼻／口／耳の5種類、各10パターン。
// さらに各パーツごとに9色から色を選べる（%C%の部分に選んだ色が入る）。
// CPUキャラのイラストとは別物（プレイヤー自身がカスタマイズするアバター）。

const AVATAR_SKIN = '#f0c896';
const AVATAR_INK = '#231a12';

// ---- パーツの色パレット（9色・全パーツ共通） ----
const AVATAR_COLOR_PALETTE = [
  { id: 'c1', name: '黒', hex: '#231a12' },
  { id: 'c2', name: '茶', hex: '#6b4226' },
  { id: 'c3', name: '金', hex: '#d9b45a' },
  { id: 'c4', name: '赤', hex: '#b23b2a' },
  { id: 'c5', name: '青', hex: '#2166ac' },
  { id: 'c6', name: '緑', hex: '#1e8e5a' },
  { id: 'c7', name: '紫', hex: '#7d4fa3' },
  { id: 'c8', name: '桃', hex: '#e07ba0' },
  { id: 'c9', name: '銀', hex: '#c4c4c4' },
];
function getAvatarColor(id) {
  return (AVATAR_COLOR_PALETTE.find(c => c.id === id) || AVATAR_COLOR_PALETTE[0]).hex;
}
// テンプレート中の %C% をすべて指定色に置き換える
function applyPartColor(svgTemplate, colorId) {
  return svgTemplate.split('%C%').join(getAvatarColor(colorId));
}

// ---- 耳（10）：位置は左(31,68)・右(89,68)に統一。装飾がある柄のみ色が反映される ----
const AVATAR_EARS = [
  { id: 'ears01', label: '丸耳', svg: `<circle cx="31" cy="68" r="6" fill="${AVATAR_SKIN}"/><circle cx="89" cy="68" r="6" fill="${AVATAR_SKIN}"/>` },
  { id: 'ears02', label: 'とがり耳', svg: `<path d="M31 60 L37 70 L27 72Z" fill="${AVATAR_SKIN}"/><path d="M89 60 L83 70 L93 72Z" fill="${AVATAR_SKIN}"/>` },
  { id: 'ears03', label: 'スタッドピアス', svg: `<circle cx="31" cy="68" r="6" fill="${AVATAR_SKIN}"/><circle cx="89" cy="68" r="6" fill="${AVATAR_SKIN}"/><circle cx="31" cy="72" r="2.4" fill="%C%"/><circle cx="89" cy="72" r="2.4" fill="%C%"/>` },
  { id: 'ears04', label: 'フープピアス', svg: `<circle cx="31" cy="68" r="6" fill="${AVATAR_SKIN}"/><circle cx="89" cy="68" r="6" fill="${AVATAR_SKIN}"/><circle cx="30" cy="76" r="3.2" fill="none" stroke="%C%" stroke-width="1.6"/><circle cx="90" cy="76" r="3.2" fill="none" stroke="%C%" stroke-width="1.6"/>` },
  { id: 'ears05', label: 'ふわふわ耳', svg: `<circle cx="31" cy="68" r="7" fill="${AVATAR_SKIN}"/><circle cx="89" cy="68" r="7" fill="${AVATAR_SKIN}"/><path d="M26 62 q-4 2 -1 8 M96 62 q4 2 1 8" stroke="${AVATAR_SKIN}" stroke-width="3" fill="none" stroke-linecap="round"/>` },
  { id: 'ears06', label: '絆創膏耳', svg: `<circle cx="31" cy="68" r="6" fill="${AVATAR_SKIN}"/><circle cx="89" cy="68" r="6" fill="${AVATAR_SKIN}"/><rect x="27" y="65" width="8" height="4" rx="1.5" fill="%C%" transform="rotate(20 31 67)"/>` },
  { id: 'ears07', label: 'イヤーカフ', svg: `<circle cx="31" cy="68" r="6" fill="${AVATAR_SKIN}"/><circle cx="89" cy="68" r="6" fill="${AVATAR_SKIN}"/><path d="M27 62 Q24 68 27 74" stroke="%C%" stroke-width="2" fill="none"/><path d="M93 62 Q96 68 93 74" stroke="%C%" stroke-width="2" fill="none"/>` },
  { id: 'ears08', label: '大きめ耳', svg: `<circle cx="30" cy="68" r="8" fill="${AVATAR_SKIN}"/><circle cx="90" cy="68" r="8" fill="${AVATAR_SKIN}"/>` },
  { id: 'ears09', label: 'ヘッドホン耳', svg: `<circle cx="30" cy="66" r="9" fill="%C%"/><circle cx="90" cy="66" r="9" fill="%C%"/><circle cx="30" cy="66" r="4" fill="#e9e4d8"/><circle cx="90" cy="66" r="4" fill="#e9e4d8"/>` },
  { id: 'ears10', label: '控えめ耳', svg: `<circle cx="31" cy="70" r="4" fill="${AVATAR_SKIN}"/><circle cx="89" cy="70" r="4" fill="${AVATAR_SKIN}"/>` },
];

// ---- 頭（髪・帽子）（10）：主要な色が %C% ----
const AVATAR_HEAD = [
  { id: 'head01', label: 'ショートヘア', svg: `<path d="M30 50 Q30 18 60 18 Q90 18 90 50 Q90 34 60 32 Q30 34 30 50Z" fill="%C%"/>` },
  { id: 'head02', label: 'ツインテール', svg: `<path d="M28 60 Q26 16 60 16 Q94 16 92 60 Q94 88 82 90 Q88 60 78 40 Q60 30 42 40 Q32 60 38 90 Q26 88 28 60Z" fill="%C%"/><circle cx="22" cy="84" r="6" fill="#e07ba0"/><circle cx="98" cy="84" r="6" fill="#e07ba0"/>` },
  { id: 'head03', label: 'スパイキー', svg: `<path d="M30 55 Q35 15 60 20 Q85 15 90 55 Q75 30 60 34 Q45 30 30 55Z" fill="%C%"/>` },
  { id: 'head04', label: 'ボブ', svg: `<path d="M28 52 Q26 18 60 18 Q94 18 92 52 Q90 68 84 62 Q88 34 60 30 Q32 34 36 62 Q30 68 28 52Z" fill="%C%"/>` },
  { id: 'head05', label: 'モヒカン', svg: `<path d="M52 12 L54 40 L60 14 L66 40 L68 12 L64 42 Q60 46 56 42 Z" fill="%C%"/><rect x="30" y="52" width="60" height="8" rx="4" fill="#1a1a1a"/>` },
  { id: 'head06', label: 'ロングヘア', svg: `<path d="M26 66 Q24 16 60 16 Q96 16 94 66 L88 100 L80 66 Q84 32 60 30 Q36 32 40 66 L32 100 Z" fill="%C%"/>` },
  { id: 'head07', label: 'キャップ', svg: `<path d="M28 50 Q30 22 60 22 Q90 22 92 50 Q60 40 28 50Z" fill="%C%"/><rect x="18" y="46" width="30" height="8" rx="4" fill="#5a3a22"/>` },
  { id: 'head08', label: 'バンダナ', svg: `<path d="M28 48 Q30 20 60 20 Q90 20 92 48 L82 40 L72 46 L62 38 L52 46 L42 40 Z" fill="%C%"/><path d="M88 40 L104 30" stroke="%C%" stroke-width="6" stroke-linecap="round"/>` },
  { id: 'head09', label: 'ニット帽', svg: `<path d="M28 54 Q28 16 60 16 Q92 16 92 54 Q60 46 28 54Z" fill="%C%"/><rect x="26" y="46" width="68" height="10" rx="5" fill="#f2e9d3" opacity=".35"/><circle cx="60" cy="14" r="6" fill="#f2e9d3"/>` },
  { id: 'head10', label: '王冠', svg: `<path d="M32 34 L42 16 L52 30 L60 14 L68 30 L78 16 L88 34 L84 44 L36 44 Z" fill="%C%" stroke="#5a4a1a" stroke-width="1.5"/><path d="M30 48 Q30 30 60 32 Q90 30 90 48 Q88 38 60 38 Q32 38 30 48Z" fill="#241f1a"/>` },
];

// ---- 目（10）：主要な色が %C% ----
const AVATAR_EYES = [
  { id: 'eyes01', label: 'ふつうの目', svg: `<circle cx="47" cy="70" r="3.2" fill="%C%"/><circle cx="73" cy="70" r="3.2" fill="%C%"/>` },
  { id: 'eyes02', label: '丸メガネ', svg: `<circle cx="47" cy="70" r="9" fill="none" stroke="%C%" stroke-width="2.4"/><circle cx="73" cy="70" r="9" fill="none" stroke="%C%" stroke-width="2.4"/><line x1="56" y1="70" x2="64" y2="70" stroke="%C%" stroke-width="2.4"/><circle cx="47" cy="70" r="2.4" fill="%C%"/><circle cx="73" cy="70" r="2.4" fill="%C%"/>` },
  { id: 'eyes03', label: 'サングラス', svg: `<rect x="37" y="64" width="46" height="12" rx="6" fill="%C%"/>` },
  { id: 'eyes04', label: 'にっこり目', svg: `<path d="M42 70 Q47 64 52 70" stroke="%C%" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M68 70 Q73 64 78 70" stroke="%C%" stroke-width="2.6" fill="none" stroke-linecap="round"/>` },
  { id: 'eyes05', label: 'ウインク', svg: `<path d="M42 70 Q47 65 52 70" stroke="%C%" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="73" cy="70" r="3.2" fill="%C%"/>` },
  { id: 'eyes06', label: '星の目', svg: `<path d="M47 64 L49 69 L54 69 L50 72 L52 77 L47 74 L42 77 L44 72 L40 69 L45 69Z" fill="%C%"/><path d="M73 64 L75 69 L80 69 L76 72 L78 77 L73 74 L68 77 L70 72 L66 69 L71 69Z" fill="%C%"/>` },
  { id: 'eyes07', label: 'ハートの目', svg: `<path d="M47 68 C44 64 39 66 40 70 C41 74 47 78 47 78 C47 78 53 74 54 70 C55 66 50 64 47 68Z" fill="%C%"/><path d="M73 68 C70 64 65 66 66 70 C67 74 73 78 73 78 C73 78 79 74 80 70 C81 66 76 64 73 68Z" fill="%C%"/>` },
  { id: 'eyes08', label: 'ねむたい目', svg: `<path d="M42 71 Q47 74 52 71" stroke="%C%" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M68 71 Q73 74 78 71" stroke="%C%" stroke-width="2.6" fill="none" stroke-linecap="round"/>` },
  { id: 'eyes09', label: 'びっくり目', svg: `<circle cx="47" cy="70" r="5.5" fill="#fff" stroke="%C%" stroke-width="1.4"/><circle cx="73" cy="70" r="5.5" fill="#fff" stroke="%C%" stroke-width="1.4"/><circle cx="47" cy="70" r="2.4" fill="%C%"/><circle cx="73" cy="70" r="2.4" fill="%C%"/>` },
  { id: 'eyes10', label: '眼帯', svg: `<circle cx="47" cy="70" r="10" fill="%C%"/><path d="M37 62 L58 78" stroke="%C%" stroke-width="3"/><circle cx="73" cy="70" r="3.2" fill="${AVATAR_INK}"/>` },
];

// ---- 鼻（10）：主要な色が %C% ----
const AVATAR_NOSE = [
  { id: 'nose01', label: '小さな点', svg: `<circle cx="60" cy="78" r="1.6" fill="%C%" opacity=".8"/>` },
  { id: 'nose02', label: 'ライン鼻', svg: `<path d="M58 74 Q56 79 60 80" stroke="%C%" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".85"/>` },
  { id: 'nose03', label: 'ボタン鼻', svg: `<circle cx="60" cy="78" r="3" fill="none" stroke="%C%" stroke-width="1.6" opacity=".85"/>` },
  { id: 'nose04', label: '三角鼻', svg: `<path d="M57 74 L63 74 L60 80Z" fill="%C%" opacity=".8"/>` },
  { id: 'nose05', label: 'なし', svg: `` },
  { id: 'nose06', label: 'そばかす', svg: `<circle cx="52" cy="78" r="1" fill="%C%" opacity=".6"/><circle cx="56" cy="80" r="1" fill="%C%" opacity=".6"/><circle cx="60" cy="79" r="1" fill="%C%" opacity=".6"/><circle cx="64" cy="80" r="1" fill="%C%" opacity=".6"/><circle cx="68" cy="78" r="1" fill="%C%" opacity=".6"/>` },
  { id: 'nose07', label: '丸鼻', svg: `<circle cx="60" cy="78" r="3.4" fill="%C%" opacity=".9"/>` },
  { id: 'nose08', label: 'カーブ鼻', svg: `<path d="M57 72 Q54 79 61 81" stroke="%C%" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".85"/>` },
  { id: 'nose09', label: 'くしゃっと鼻', svg: `<path d="M56 76 L60 79 L64 76" stroke="%C%" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".85"/>` },
  { id: 'nose10', label: '絆創膏鼻', svg: `<rect x="55" y="75" width="10" height="4" rx="1.5" fill="%C%" transform="rotate(-8 60 77)"/>` },
];

// ---- 口（10）：主要な色が %C% ----
const AVATAR_MOUTH = [
  { id: 'mouth01', label: 'スマイル', svg: `<path d="M48 85 Q60 93 72 85" stroke="%C%" stroke-width="3" fill="none" stroke-linecap="round"/>` },
  { id: 'mouth02', label: '大きな笑顔', svg: `<path d="M45 84 Q60 96 75 84Z" fill="%C%"/><path d="M48 86 Q60 92 72 86" stroke="#fff" stroke-width="1.5" fill="none"/>` },
  { id: 'mouth03', label: 'ふつう', svg: `<path d="M48 87 Q60 89 72 87" stroke="%C%" stroke-width="3" fill="none" stroke-linecap="round"/>` },
  { id: 'mouth04', label: 'ニヤリ', svg: `<path d="M48 87 Q64 92 74 82" stroke="%C%" stroke-width="3" fill="none" stroke-linecap="round"/>` },
  { id: 'mouth05', label: 'びっくり口', svg: `<ellipse cx="60" cy="88" rx="6" ry="7" fill="%C%"/>` },
  { id: 'mouth06', label: 'ペロッ', svg: `<path d="M48 85 Q60 93 72 85" stroke="%C%" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M56 89 Q60 96 64 89Z" fill="#e07ba0"/>` },
  { id: 'mouth07', label: 'ひげスマイル', svg: `<path d="M40 84 Q60 100 80 84 Q60 92 40 84Z" fill="%C%"/><path d="M50 86 Q60 92 70 86" stroke="#fff" stroke-width="1.5" fill="none"/>` },
  { id: 'mouth08', label: 'ふくれっ面', svg: `<path d="M48 90 Q60 83 72 90" stroke="%C%" stroke-width="3" fill="none" stroke-linecap="round"/>` },
  { id: 'mouth09', label: '口笛', svg: `<circle cx="62" cy="87" r="3.4" fill="none" stroke="%C%" stroke-width="2"/>` },
  { id: 'mouth10', label: '八重歯グリン', svg: `<path d="M46 84 Q60 94 74 84" stroke="%C%" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M64 88 L66 93 L69 87Z" fill="#fff"/>` },
];

const AVATAR_CATEGORIES = { head: AVATAR_HEAD, eyes: AVATAR_EYES, nose: AVATAR_NOSE, mouth: AVATAR_MOUTH, ears: AVATAR_EARS };
const AVATAR_CATEGORY_ORDER = ['head', 'eyes', 'nose', 'mouth', 'ears'];
const AVATAR_CATEGORY_LABELS = { head: '頭（髪・帽子）', eyes: '目', nose: '鼻', mouth: '口', ears: '耳' };

function defaultAvatarParts() {
  return {
    head: 'head01', headColor: 'c1',
    eyes: 'eyes01', eyesColor: 'c1',
    nose: 'nose01', noseColor: 'c1',
    mouth: 'mouth01', mouthColor: 'c1',
    ears: 'ears01', earsColor: 'c1',
  };
}
function getAvatarPart(category, id) {
  const list = AVATAR_CATEGORIES[category] || [];
  return list.find(p => p.id === id) || list[0];
}
function normalizeAvatarParts(parts) {
  const def = defaultAvatarParts();
  const out = {};
  AVATAR_CATEGORY_ORDER.forEach(cat => {
    out[cat] = getAvatarPart(cat, parts && parts[cat]).id;
    const colorKey = cat + 'Color';
    const requested = parts && parts[colorKey];
    out[colorKey] = AVATAR_COLOR_PALETTE.some(c => c.id === requested) ? requested : def[colorKey];
  });
  return out;
}
// パーツ（形×色）を合成して1枚のアバターSVGを組み立てる（耳→顔→頭→目→鼻→口の順で重ねる）
function buildAvatarSvg(parts) {
  const p = normalizeAvatarParts(parts);
  const ears = getAvatarPart('ears', p.ears);
  const head = getAvatarPart('head', p.head);
  const eyes = getAvatarPart('eyes', p.eyes);
  const nose = getAvatarPart('nose', p.nose);
  const mouth = getAvatarPart('mouth', p.mouth);
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="58" fill="#2a3a33" stroke="#c9a227" stroke-width="2"/>
    ${applyPartColor(ears.svg, p.earsColor)}
    <circle cx="60" cy="66" r="30" fill="${AVATAR_SKIN}"/>
    ${applyPartColor(head.svg, p.headColor)}
    ${applyPartColor(eyes.svg, p.eyesColor)}
    ${applyPartColor(nose.svg, p.noseColor)}
    ${applyPartColor(mouth.svg, p.mouthColor)}
  </svg>`;
}
