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
  { id: 'ears11', label: 'ダブルフープ', svg: `<circle cx="31" cy="68" r="6" fill="${AVATAR_SKIN}"/><circle cx="89" cy="68" r="6" fill="${AVATAR_SKIN}"/><circle cx="30" cy="74" r="2.6" fill="none" stroke="%C%" stroke-width="1.4"/><circle cx="30" cy="80" r="2.6" fill="none" stroke="%C%" stroke-width="1.4"/><circle cx="90" cy="74" r="2.6" fill="none" stroke="%C%" stroke-width="1.4"/><circle cx="90" cy="80" r="2.6" fill="none" stroke="%C%" stroke-width="1.4"/>` },
  { id: 'ears12', label: 'しずく型ピアス', svg: `<circle cx="31" cy="68" r="6" fill="${AVATAR_SKIN}"/><circle cx="89" cy="68" r="6" fill="${AVATAR_SKIN}"/><path d="M31 74 q-3 6 0 10 q3 -4 0 -10Z" fill="%C%"/><path d="M89 74 q3 6 0 10 q-3 -4 0 -10Z" fill="%C%"/>` },
  { id: 'ears13', label: '耳あて', svg: `<circle cx="28" cy="68" r="9" fill="%C%"/><circle cx="92" cy="68" r="9" fill="%C%"/><path d="M28 58 Q60 40 92 58" stroke="%C%" stroke-width="3" fill="none"/>` },
  { id: 'ears14', label: '包帯耳', svg: `<circle cx="31" cy="68" r="6" fill="${AVATAR_SKIN}"/><circle cx="89" cy="68" r="6" fill="${AVATAR_SKIN}"/><rect x="25" y="64" width="12" height="5" rx="1.5" fill="%C%" transform="rotate(-15 31 66)"/>` },
  { id: 'ears15', label: '宝石ピアス', svg: `<circle cx="31" cy="68" r="6" fill="${AVATAR_SKIN}"/><circle cx="89" cy="68" r="6" fill="${AVATAR_SKIN}"/><path d="M31 73 L34 77 L31 81 L28 77Z" fill="%C%"/><path d="M89 73 L92 77 L89 81 L86 77Z" fill="%C%"/>` },
  { id: 'ears16', label: 'けもみみ', svg: `<path d="M22 58 Q26 40 38 50 Q34 62 26 66Z" fill="%C%"/><path d="M98 58 Q94 40 82 50 Q86 62 94 66Z" fill="%C%"/>` },
  { id: 'ears17', label: 'メカ耳', svg: `<rect x="24" y="60" width="12" height="16" rx="3" fill="%C%"/><rect x="84" y="60" width="12" height="16" rx="3" fill="%C%"/><circle cx="30" cy="68" r="2" fill="#8fd6e0"/><circle cx="90" cy="68" r="2" fill="#8fd6e0"/>` },
  { id: 'ears18', label: '耳栓', svg: `<circle cx="31" cy="68" r="6" fill="${AVATAR_SKIN}"/><circle cx="89" cy="68" r="6" fill="${AVATAR_SKIN}"/><circle cx="31" cy="68" r="3" fill="%C%"/><circle cx="89" cy="68" r="3" fill="%C%"/>` },
  { id: 'ears19', label: 'チェーン耳飾り', svg: `<circle cx="31" cy="68" r="6" fill="${AVATAR_SKIN}"/><circle cx="89" cy="68" r="6" fill="${AVATAR_SKIN}"/><path d="M31 74 q-2 10 6 16" stroke="%C%" stroke-width="1.4" fill="none" stroke-dasharray="2 2"/><path d="M89 74 q2 10 -6 16" stroke="%C%" stroke-width="1.4" fill="none" stroke-dasharray="2 2"/>` },
  { id: 'ears20', label: 'なし', svg: `` },
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
  { id: 'head11', label: 'アフロ', svg: `<circle cx="60" cy="42" r="34" fill="%C%"/>` },
  { id: 'head12', label: 'サイドカット', svg: `<path d="M34 48 Q34 20 60 20 Q86 20 86 48 Q86 36 60 34 Q34 36 34 48Z" fill="%C%"/><rect x="30" y="46" width="10" height="14" rx="3" fill="${AVATAR_SKIN}"/><rect x="80" y="46" width="10" height="14" rx="3" fill="${AVATAR_SKIN}"/>` },
  { id: 'head13', label: 'ポニーテール', svg: `<path d="M30 52 Q28 18 60 18 Q92 18 90 52 Q88 36 60 34 Q32 36 30 52Z" fill="%C%"/><path d="M88 40 Q104 46 100 68 Q96 80 90 70 Q98 52 84 42Z" fill="%C%"/>` },
  { id: 'head14', label: '三つ編みツイン', svg: `<path d="M30 50 Q28 18 60 18 Q92 18 90 50 Q90 34 60 32 Q30 34 30 50Z" fill="%C%"/><path d="M26 56 q-4 8 2 14 q-6 4 0 12 q-6 4 2 12" stroke="%C%" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M94 56 q4 8 -2 14 q6 4 0 12 q6 4 -2 12" stroke="%C%" stroke-width="6" fill="none" stroke-linecap="round"/>` },
  { id: 'head15', label: 'ロング横分け', svg: `<path d="M26 60 Q24 16 62 16 Q98 18 92 60 L86 96 L80 62 Q86 30 58 28 Q34 30 38 62 L34 96 Z" fill="%C%"/>` },
  { id: 'head16', label: 'ヘッドバンド', svg: `<path d="M30 52 Q30 20 60 20 Q90 20 90 52 Q90 38 60 36 Q30 38 30 52Z" fill="%C%"/><rect x="28" y="44" width="64" height="8" rx="4" fill="%C%" opacity=".7"/>` },
  { id: 'head17', label: 'シルクハット', svg: `<rect x="38" y="10" width="44" height="26" rx="2" fill="%C%"/><rect x="26" y="34" width="68" height="8" rx="3" fill="%C%"/>` },
  { id: 'head18', label: 'くるくるウィッグ', svg: `<path d="M30 50 Q26 20 40 18 Q34 30 44 26 Q40 16 54 16 Q48 26 60 22 Q56 14 70 18 Q64 26 76 22 Q80 14 90 24 Q80 26 86 34 Q94 32 90 46 Q84 40 82 48 Q90 50 86 58 Q60 44 30 50Z" fill="%C%"/>` },
  { id: 'head19', label: 'ドレッド', svg: `<path d="M32 50 Q30 18 60 18 Q90 18 88 50" fill="none" stroke="%C%" stroke-width="10" stroke-linecap="round"/><path d="M34 46 q-4 20 0 34 M46 40 q-2 22 2 36 M60 38 q0 24 0 38 M74 40 q2 22 -2 36 M86 46 q4 20 0 34" stroke="%C%" stroke-width="5" fill="none" stroke-linecap="round"/>` },
  { id: 'head20', label: 'なし', svg: `` },
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
  { id: 'eyes11', label: 'たれ目', svg: `<path d="M42 68 Q47 74 52 71" stroke="%C%" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M68 68 Q73 74 78 71" stroke="%C%" stroke-width="2.6" fill="none" stroke-linecap="round"/>` },
  { id: 'eyes12', label: 'つり目', svg: `<path d="M42 72 Q47 65 53 68" stroke="%C%" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M67 68 Q73 65 78 72" stroke="%C%" stroke-width="2.6" fill="none" stroke-linecap="round"/>` },
  { id: 'eyes13', label: '六角メガネ', svg: `<path d="M40 70 L44 64 L52 64 L56 70 L52 76 L44 76Z" fill="none" stroke="%C%" stroke-width="2"/><path d="M64 70 L68 64 L76 64 L80 70 L76 76 L68 76Z" fill="none" stroke="%C%" stroke-width="2"/><line x1="56" y1="70" x2="64" y2="70" stroke="%C%" stroke-width="2"/>` },
  { id: 'eyes14', label: 'モノクル', svg: `<circle cx="73" cy="70" r="9" fill="none" stroke="%C%" stroke-width="2.2"/><path d="M82 76 Q86 84 82 92" stroke="%C%" stroke-width="1.6" fill="none"/><circle cx="47" cy="70" r="3.2" fill="%C%"/>` },
  { id: 'eyes15', label: '涙目', svg: `<circle cx="47" cy="70" r="3.2" fill="%C%"/><circle cx="73" cy="70" r="3.2" fill="%C%"/><path d="M73 76 q4 6 0 10 q-4 -4 0 -10Z" fill="#6cb6e8"/>` },
  { id: 'eyes16', label: 'ロボット目', svg: `<rect x="42" y="65" width="10" height="10" fill="%C%"/><rect x="68" y="65" width="10" height="10" fill="%C%"/>` },
  { id: 'eyes17', label: '三白眼', svg: `<circle cx="47" cy="70" r="7" fill="#fff" stroke="%C%" stroke-width="1.4"/><circle cx="73" cy="70" r="7" fill="#fff" stroke="%C%" stroke-width="1.4"/><circle cx="49" cy="72" r="2.2" fill="%C%"/><circle cx="75" cy="72" r="2.2" fill="%C%"/>` },
  { id: 'eyes18', label: 'アイマスク', svg: `<rect x="36" y="64" width="48" height="13" rx="6" fill="%C%"/><path d="M36 70 L20 66 M84 70 L100 66" stroke="%C%" stroke-width="2"/>` },
  { id: 'eyes19', label: '太眉', svg: `<rect x="41" y="60" width="12" height="3.4" rx="1.6" fill="%C%"/><rect x="67" y="60" width="12" height="3.4" rx="1.6" fill="%C%"/><circle cx="47" cy="70" r="2.6" fill="%C%"/><circle cx="73" cy="70" r="2.6" fill="%C%"/>` },
  { id: 'eyes20', label: 'なし', svg: `` },
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
  { id: 'nose11', label: 'ワシ鼻', svg: `<path d="M58 72 Q53 76 58 80 Q60 81 62 80" stroke="%C%" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".85"/>` },
  { id: 'nose12', label: '丸みのある鼻', svg: `<ellipse cx="60" cy="78" rx="4" ry="3.2" fill="%C%" opacity=".85"/>` },
  { id: 'nose13', label: '鼻ピアス', svg: `<circle cx="60" cy="79" r="1.6" fill="%C%" opacity=".8"/><circle cx="63" cy="80" r="1.6" fill="none" stroke="%C%" stroke-width="1"/>` },
  { id: 'nose14', label: 'ぷんすか', svg: `<path d="M64 74 L68 72 M64 77 L69 77" stroke="%C%" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".7"/>` },
  { id: 'nose15', label: '鼻筋ハイライト', svg: `<line x1="60" y1="70" x2="60" y2="80" stroke="%C%" stroke-width="1.4" opacity=".55"/>` },
  { id: 'nose16', label: 'しし鼻', svg: `<path d="M56 78 Q60 73 64 78 Q60 76 56 78Z" fill="%C%" opacity=".85"/>` },
  { id: 'nose17', label: 'たらこ鼻', svg: `<ellipse cx="60" cy="78" rx="5" ry="3.6" fill="%C%" opacity=".9"/>` },
  { id: 'nose18', label: '傷跡鼻', svg: `<path d="M63 73 L58 82" stroke="%C%" stroke-width="1.4" opacity=".7"/>` },
  { id: 'nose19', label: '赤み鼻', svg: `<circle cx="60" cy="79" r="3.4" fill="%C%" opacity=".55"/>` },
  { id: 'nose20', label: 'なし', svg: `` },
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
  { id: 'mouth11', label: 'への字', svg: `<path d="M48 88 Q54 85 60 87 Q66 85 72 88" stroke="%C%" stroke-width="3" fill="none" stroke-linecap="round"/>` },
  { id: 'mouth12', label: '犬歯ニヤリ', svg: `<path d="M47 85 Q60 92 73 83" stroke="%C%" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M50 87 L52 92 L55 86Z" fill="#fff"/>` },
  { id: 'mouth13', label: 'キス顔', svg: `<ellipse cx="60" cy="87" rx="4" ry="3" fill="%C%"/>` },
  { id: 'mouth14', label: '非対称笑み', svg: `<path d="M48 86 Q58 92 74 82" stroke="%C%" stroke-width="3" fill="none" stroke-linecap="round"/>` },
  { id: 'mouth15', label: 'パイプ', svg: `<path d="M48 87 Q60 90 68 86" stroke="%C%" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M68 86 L84 82" stroke="#6b4226" stroke-width="3" stroke-linecap="round"/><path d="M84 82 q6 -2 6 -8" stroke="#6b4226" stroke-width="3" fill="none" stroke-linecap="round"/>` },
  { id: 'mouth16', label: '布マスク', svg: `<path d="M40 80 Q60 96 80 80 L80 92 Q60 104 40 92Z" fill="%C%"/>` },
  { id: 'mouth17', label: '歯を食いしばる', svg: `<rect x="48" y="85" width="24" height="5" rx="1" fill="%C%"/><line x1="54" y1="85" x2="54" y2="90" stroke="#fff" stroke-width="1"/><line x1="60" y1="85" x2="60" y2="90" stroke="#fff" stroke-width="1"/><line x1="66" y1="85" x2="66" y2="90" stroke="#fff" stroke-width="1"/>` },
  { id: 'mouth18', label: 'あくび', svg: `<ellipse cx="60" cy="88" rx="8" ry="9" fill="%C%" transform="rotate(-6 60 88)"/>` },
  { id: 'mouth19', label: '薄笑み', svg: `<path d="M50 87 Q60 89 70 86" stroke="%C%" stroke-width="2" fill="none" stroke-linecap="round"/>` },
  { id: 'mouth20', label: 'なし', svg: `` },
];

// ---- アクセサリー（20）：顔まわりの追加装飾。位置は主に頬・首元・額 ----
const AVATAR_ACCESSORY = [
  { id: 'acc01', label: 'なし', svg: `` },
  { id: 'acc02', label: '蝶ネクタイ', svg: `<path d="M48 108 L58 102 L58 114 Z M72 108 L62 102 L62 114 Z" fill="%C%"/><circle cx="60" cy="108" r="2.4" fill="%C%"/>` },
  { id: 'acc03', label: 'ネクタイ', svg: `<path d="M56 100 L64 100 L61 106 L64 122 L60 128 L56 122 L59 106Z" fill="%C%"/>` },
  { id: 'acc04', label: 'マフラー', svg: `<path d="M32 96 Q60 108 88 96 L88 104 Q60 116 32 104Z" fill="%C%"/><rect x="70" y="100" width="8" height="20" rx="2" fill="%C%"/>` },
  { id: 'acc05', label: '星ほくろ', svg: `<path d="M42 80 L43 82.5 L45.5 82.5 L43.5 84 L44.5 86.5 L42 85 L39.5 86.5 L40.5 84 L38.5 82.5 L41 82.5Z" fill="${AVATAR_INK}"/>` },
  { id: 'acc06', label: 'そばかす', svg: `<circle cx="40" cy="72" r="1" fill="%C%" opacity=".6"/><circle cx="44" cy="76" r="1" fill="%C%" opacity=".6"/><circle cx="80" cy="72" r="1" fill="%C%" opacity=".6"/><circle cx="76" cy="76" r="1" fill="%C%" opacity=".6"/><circle cx="38" cy="68" r="1" fill="%C%" opacity=".6"/><circle cx="82" cy="68" r="1" fill="%C%" opacity=".6"/>` },
  { id: 'acc07', label: '三日月の傷', svg: `<path d="M78 68 Q82 74 78 80" stroke="%C%" stroke-width="1.6" fill="none" opacity=".8"/>` },
  { id: 'acc08', label: '首元リボン', svg: `<path d="M52 100 L60 106 L68 100 L68 112 L60 118 L52 112Z" fill="%C%"/>` },
  { id: 'acc09', label: '金の首飾り', svg: `<path d="M40 96 Q60 112 80 96" stroke="%C%" stroke-width="2" fill="none"/><circle cx="60" cy="112" r="4" fill="%C%"/>` },
  { id: 'acc10', label: '稲妻フェイスペイント', svg: `<path d="M76 62 L70 72 L75 72 L68 84 L78 70 L73 70Z" fill="%C%"/>` },
  { id: 'acc11', label: '花飾り', svg: `<circle cx="40" cy="78" r="2.4" fill="%C%"/><circle cx="36" cy="78" r="2.4" fill="%C%"/><circle cx="44" cy="78" r="2.4" fill="%C%"/><circle cx="40" cy="74" r="2.4" fill="%C%"/><circle cx="40" cy="82" r="2.4" fill="%C%"/><circle cx="40" cy="78" r="1.6" fill="#f5d54a"/>` },
  { id: 'acc12', label: '汗マーク', svg: `<path d="M84 58 q4 6 0 10 q-4 -2 0 -10Z" fill="#8fd6e0"/>` },
  { id: 'acc13', label: 'マスク下げ', svg: `<path d="M40 96 Q60 106 80 96 L80 106 Q60 116 40 106Z" fill="%C%" opacity=".92"/>` },
  { id: 'acc14', label: 'モノクルチェーン', svg: `<path d="M80 78 Q90 90 84 104" stroke="%C%" stroke-width="1.4" fill="none" stroke-dasharray="2 2"/>` },
  { id: 'acc15', label: 'サイドリボン', svg: `<path d="M24 46 L32 42 L32 50 Z M24 46 L16 42 L16 50Z" fill="%C%"/><circle cx="24" cy="46" r="2" fill="%C%"/>` },
  { id: 'acc16', label: '額の宝石', svg: `<path d="M60 38 L63 42 L60 46 L57 42Z" fill="%C%"/>` },
  { id: 'acc17', label: '眼帯ストラップ', svg: `<path d="M30 62 L90 74" stroke="%C%" stroke-width="2" opacity=".8"/>` },
  { id: 'acc18', label: '鈴の首輪', svg: `<path d="M42 98 Q60 108 78 98" stroke="%C%" stroke-width="3" fill="none"/><circle cx="60" cy="106" r="3.4" fill="#e8c94a" stroke="${AVATAR_INK}" stroke-width="0.8"/>` },
  { id: 'acc19', label: 'マイク', svg: `<rect x="56" y="92" width="8" height="14" rx="4" fill="%C%"/><path d="M52 100 Q52 110 60 110 Q68 110 68 100" stroke="%C%" stroke-width="1.6" fill="none"/><line x1="60" y1="110" x2="60" y2="116" stroke="%C%" stroke-width="1.6"/>` },
  { id: 'acc20', label: '星の飾り', svg: `<path d="M60 36 L62 41 L67 41 L63 44 L65 49 L60 46 L55 49 L57 44 L53 41 L58 41Z" fill="%C%"/>` },
];

const AVATAR_CATEGORIES = { head: AVATAR_HEAD, eyes: AVATAR_EYES, nose: AVATAR_NOSE, mouth: AVATAR_MOUTH, ears: AVATAR_EARS, accessory: AVATAR_ACCESSORY };
const AVATAR_CATEGORY_ORDER = ['head', 'eyes', 'nose', 'mouth', 'ears', 'accessory'];
const AVATAR_CATEGORY_LABELS = { head: '頭（髪・帽子）', eyes: '目', nose: '鼻', mouth: '口', ears: '耳', accessory: 'アクセサリー' };

function defaultAvatarParts() {
  return {
    head: 'head01', headColor: 'c1',
    eyes: 'eyes01', eyesColor: 'c1',
    nose: 'nose01', noseColor: 'c1',
    mouth: 'mouth01', mouthColor: 'c1',
    ears: 'ears01', earsColor: 'c1',
    accessory: 'acc01', accessoryColor: 'c1',
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
  const accessory = getAvatarPart('accessory', p.accessory);
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="58" fill="#2a3a33" stroke="#c9a227" stroke-width="2"/>
    ${applyPartColor(ears.svg, p.earsColor)}
    <circle cx="60" cy="66" r="30" fill="${AVATAR_SKIN}"/>
    ${applyPartColor(head.svg, p.headColor)}
    ${applyPartColor(eyes.svg, p.eyesColor)}
    ${applyPartColor(nose.svg, p.noseColor)}
    ${applyPartColor(mouth.svg, p.mouthColor)}
    ${applyPartColor(accessory.svg, p.accessoryColor)}
  </svg>`;
}
