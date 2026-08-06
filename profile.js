// ===== プレイヤープロフィール（名前・アバター）の永続化 =====
// localStorageを使用（ブラウザに保存され、次回接続時も引き継がれる）
const PROFILE_STORAGE_KEY = 'tri-quadron-profile-v2';

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return { name: '', parts: defaultAvatarParts() };
    const parsed = JSON.parse(raw);
    return {
      name: typeof parsed.name === 'string' ? parsed.name.slice(0, 12) : '',
      parts: normalizeAvatarParts(parsed.parts),
    };
  } catch (e) {
    return { name: '', parts: defaultAvatarParts() };
  }
}
function saveProfile(profile) {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({
      name: (profile.name || '').slice(0, 12),
      parts: normalizeAvatarParts(profile.parts),
    }));
    return true;
  } catch (e) {
    return false;
  }
}
// 表示名を確定する：未設定なら「プレイヤーN」にフォールバックする
function displayNameFor(profile, fallbackIndex) {
  const name = (profile && profile.name || '').trim();
  return name || `プレイヤー${fallbackIndex}`;
}
