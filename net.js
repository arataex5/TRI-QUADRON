// ===== TRI QUADRON — オンライン対戦ネットワーク層 =====
// ホスト権威型（ホストの手元にあるゲーム状態だけが正）で同期する。
// 通信手段（Transport）は差し替え可能：
//  - PeerJsTransport … PeerJSを使った本物のP2P通信（別の端末同士で対戦）
//  - BroadcastTransport … 同じブラウザの別タブ間だけで通信するフォールバック
//    （PeerJSの読み込みに失敗した場合や、オフライン環境での動作確認用）

// ---------------------------------------------------------
// Transport: PeerJS（本番用）
// ---------------------------------------------------------
class PeerJsTransport {
  constructor() {
    this.peer = null;
    this.conns = {}; // guestPeerId -> DataConnection（ホスト用）
    this.hostConn = null; // ゲスト用
  }
  static available() {
    return typeof window !== 'undefined' && typeof window.Peer !== 'undefined';
  }
  startHost(peerId, handlers) {
    return new Promise((resolve, reject) => {
      const peer = new window.Peer(peerId, { debug: 0 });
      this.peer = peer;
      let settled = false;
      peer.on('open', id => { settled = true; resolve(id); });
      peer.on('error', err => { if (!settled) { settled = true; reject(err); } else if (handlers.onError) handlers.onError(err); });
      peer.on('connection', conn => {
        conn.on('open', () => { this.conns[conn.peer] = conn; handlers.onGuestConnect(conn.peer); });
        conn.on('data', d => handlers.onGuestData(conn.peer, d));
        conn.on('close', () => { delete this.conns[conn.peer]; handlers.onGuestDisconnect(conn.peer); });
      });
    });
  }
  connectAsGuest(hostPeerId, handlers) {
    return new Promise((resolve, reject) => {
      const peer = new window.Peer(undefined, { debug: 0 });
      this.peer = peer;
      let settled = false;
      peer.on('open', () => {
        const conn = peer.connect(hostPeerId, { reliable: true });
        this.hostConn = conn;
        conn.on('open', () => { settled = true; resolve(); });
        conn.on('data', d => handlers.onHostData(d));
        conn.on('close', () => handlers.onHostDisconnect());
        conn.on('error', err => { if (!settled) { settled = true; reject(err); } });
      });
      peer.on('error', err => { if (!settled) { settled = true; reject(err); } else if (handlers.onError) handlers.onError(err); });
    });
  }
  sendToGuest(peerId, data) { const c = this.conns[peerId]; if (c && c.open) c.send(data); }
  sendToHost(data) { if (this.hostConn && this.hostConn.open) this.hostConn.send(data); }
  broadcastToGuests(data) { Object.values(this.conns).forEach(c => { if (c.open) c.send(data); }); }
  close() { try { if (this.peer) this.peer.destroy(); } catch (e) { /* noop */ } }
}

// ---------------------------------------------------------
// Transport: BroadcastChannel（同一ブラウザ内フォールバック）
// ---------------------------------------------------------
class BroadcastTransport {
  constructor() {
    this.channel = null;
    this.selfId = 'bc-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }
  static available() {
    return typeof window !== 'undefined' && typeof window.BroadcastChannel !== 'undefined';
  }
  startHost(roomKey, handlers) {
    return new Promise((resolve) => {
      this.channel = new BroadcastChannel('tq-room-' + roomKey);
      this.role = 'host';
      this.channel.onmessage = (ev) => {
        const msg = ev.data;
        if (!msg) return;
        if (msg.type === '__hello__' && msg.to === 'host') {
          handlers.onGuestConnect(msg.from);
          this.channel.postMessage({ type: '__hello_ack__', to: msg.from, from: this.selfId });
        } else if (msg.type === '__bye__' && msg.to === 'host') {
          handlers.onGuestDisconnect(msg.from);
        } else if (msg.to === 'host' && msg.from) {
          handlers.onGuestData(msg.from, msg.payload);
        }
      };
      resolve(this.selfId);
    });
  }
  connectAsGuest(roomKey, handlers) {
    return new Promise((resolve, reject) => {
      this.channel = new BroadcastChannel('tq-room-' + roomKey);
      this.role = 'guest';
      let opened = false;
      this.channel.onmessage = (ev) => {
        const msg = ev.data;
        if (!msg) return;
        if (msg.type === '__hello_ack__' && msg.to === this.selfId) {
          if (!opened) { opened = true; resolve(); }
        } else if (msg.to === this.selfId && msg.from === 'host') {
          handlers.onHostData(msg.payload);
        } else if (msg.type === '__broadcast__' && msg.from === 'host') {
          handlers.onHostData(msg.payload);
        } else if (msg.type === '__host_gone__') {
          handlers.onHostDisconnect();
        }
      };
      this.channel.postMessage({ type: '__hello__', to: 'host', from: this.selfId });
      setTimeout(() => { if (!opened) reject(new Error('ホストが見つかりませんでした（ルームIDを確認してください）')); }, 4000);
    });
  }
  sendToGuest(guestId, data) { this.channel.postMessage({ to: guestId, from: 'host', payload: data }); }
  sendToHost(data) { this.channel.postMessage({ to: 'host', from: this.selfId, payload: data }); }
  broadcastToGuests(data) { this.channel.postMessage({ type: '__broadcast__', from: 'host', payload: data }); }
  close() {
    if (this.channel) {
      if (this.role === 'guest') this.channel.postMessage({ type: '__bye__', to: 'host', from: this.selfId });
      if (this.role === 'host') this.channel.postMessage({ type: '__host_gone__' });
      try { this.channel.close(); } catch (e) { /* noop */ }
    }
  }
}

// ---------------------------------------------------------
// 共通ヘルパー
// ---------------------------------------------------------
const TURN_TIMER_OPTIONS = [0, 30, 60, 90, 180, 300]; // 0 = なし
function defaultRoomSettings() {
  return { turnTimerSec: 0, objectiveExcluded: [], objectiveChoiceCount: 2, turnOrderMode: 'random', turnOrderAssignment: [1, 2, 3, 4] };
}
function randomRoomId() {
  return String(Math.floor(10000 + Math.random() * 90000)); // 5桁
}
function hostPeerIdFor(roomId, generation) {
  return `tq-${roomId}-g${generation}`;
}
function getClientToken() {
  if (typeof window !== 'undefined' && window.__TEST_CLIENT_TOKEN__) return window.__TEST_CLIENT_TOKEN__;
  const KEY = 'tri-quadron-client-token-v1';
  let token = null;
  try { token = localStorage.getItem(KEY); } catch (e) { /* noop */ }
  if (!token) {
    token = 'ct-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    try { localStorage.setItem(KEY, token); } catch (e) { /* noop */ }
  }
  return token;
}

// ---------------------------------------------------------
// NetRoom：ホスト／ゲスト両対応の唯一のルームセッション管理
// ---------------------------------------------------------
const NetRoom = {
  role: null, // 'host' | 'guest' | null
  transport: null,
  usingFallbackTransport: false,
  roomId: null,
  roomName: '',
  settings: null,
  hostGeneration: 0,
  slots: [null, null, null, null], // 各席: {kind:'human'|'cpu', clientToken, name, parts, aiType, ready, connected, peerId}
  mySlotIndex: null,
  gameStarted: false,

  // UI側が差し替えるコールバック
  onRoomUpdate: null,     // (slots, roomName, roomId, settings)
  onGameState: null,      // (newState)  ゲストが受信したとき
  onGameStarting: null,   // ()
  onError: null,          // (message)
  onKicked: null,         // ()
  onHostMigrated: null,   // (isNowHost)
  onRemoteAction: null,   // (fromSlotIdx, {actionType, payload})  ホストが受信したとき
  onPlayerDisconnected: null, // (slotIdx)
  onPlayerReconnected: null,  // (slotIdx)

  reset() {
    if (this.transport) { try { this.transport.close(); } catch (e) { /* noop */ } }
    this._stopHeartbeat();
    this.role = null; this.transport = null; this.roomId = null; this.roomName = '';
    this.settings = defaultRoomSettings(); this.hostGeneration = 0;
    this.slots = [null, null, null, null]; this.mySlotIndex = null;
    this._peerToSlot = {}; this._peerLastSeen = {}; this.gameStarted = false;
  },

  // ---- ハートビート：正常なclose通知が来ない切断（クラッシュ・回線切断等）も検知する ----
  _startHostHeartbeatWatch() {
    this._stopHeartbeat();
    this._heartbeatIntervalId = setInterval(() => {
      const now = Date.now();
      Object.keys(this._peerToSlot).forEach(peerId => {
        const last = this._peerLastSeen[peerId] || 0;
        if (now - last > 15000) {
          this._handleGuestDisconnect(peerId);
        }
      });
      if (this.transport) this.transport.broadcastToGuests({ type: 'heartbeat' });
    }, 4000);
  },
  _startGuestPing() {
    this._stopHeartbeat();
    this._lastHostMessageAt = Date.now();
    this._heartbeatIntervalId = setInterval(() => {
      if (this.transport) this.transport.sendToHost({ type: 'ping' });
      if (Date.now() - this._lastHostMessageAt > 15000) {
        this._stopHeartbeat();
        this._handleHostDisconnect();
      }
    }, 5000);
  },
  _stopHeartbeat() {
    if (this._heartbeatIntervalId) clearInterval(this._heartbeatIntervalId);
    this._heartbeatIntervalId = null;
  },

  pickTransportClass() {
    return PeerJsTransport.available() ? PeerJsTransport : BroadcastTransport;
  },

  // ===== ホスト側 =====
  async createRoom(myProfileInfo) {
    this.reset();
    this.role = 'host';
    this.roomId = randomRoomId();
    this.roomName = `${displayNameFor(myProfileInfo, 1)}の部屋`;
    this.settings = defaultRoomSettings();
    this._peerToSlot = {};
    this._peerLastSeen = {};
    const TransportClass = this.pickTransportClass();
    this.transport = new TransportClass();
    this.usingFallbackTransport = TransportClass === BroadcastTransport;

    this.slots[0] = {
      kind: 'human', clientToken: getClientToken(), name: displayNameFor(myProfileInfo, 1),
      parts: myProfileInfo.parts, ready: false, connected: true, peerId: null,
    };
    this.mySlotIndex = 0;

    await this.transport.startHost(hostPeerIdFor(this.roomId, this.hostGeneration), {
      onGuestConnect: () => {},
      onGuestData: (peerId, data) => this._handleGuestMessage(peerId, data),
      onGuestDisconnect: (peerId) => this._handleGuestDisconnect(peerId),
    });
    this._startHostHeartbeatWatch();
    this._broadcastRoomState();
    return this.roomId;
  },

  hostSetRoomName(name) {
    if (this.role !== 'host') return;
    this.roomName = (name || '').slice(0, 24) || this.roomName;
    this._broadcastRoomState();
  },
  hostUpdateSettings(partial) {
    if (this.role !== 'host') return;
    this.settings = { ...this.settings, ...partial };
    this._broadcastRoomState();
  },
  hostAddCpu(slotIndex, aiType) {
    if (this.role !== 'host' || this.slots[slotIndex]) return;
    this.slots[slotIndex] = { kind: 'cpu', aiType, ready: true, connected: true };
    this._broadcastRoomState();
  },
  hostRemoveSeat(slotIndex) {
    if (this.role !== 'host' || slotIndex === this.mySlotIndex) return;
    const seat = this.slots[slotIndex];
    if (seat && seat.kind === 'human' && seat.peerId) {
      this.transport.sendToGuest(seat.peerId, { type: 'kicked' });
    }
    this.slots[slotIndex] = null;
    this._broadcastRoomState();
  },
  hostSetMyProfile(profile) {
    if (this.role !== 'host' || this.mySlotIndex === null) return;
    this.slots[this.mySlotIndex].name = displayNameFor(profile, 1);
    this.slots[this.mySlotIndex].parts = profile.parts;
    this._broadcastRoomState();
  },
  hostSetMyReady(ready) {
    if (this.role !== 'host' || this.mySlotIndex === null) return;
    this.slots[this.mySlotIndex].ready = !!ready;
    this._broadcastRoomState();
  },
  hostAllReady() {
    return this.slots.every(s => s === null || s.ready);
  },
  hostOccupiedCount() {
    return this.slots.filter(s => s).length;
  },

  _findEmptySlot() {
    return this.slots.findIndex(s => s === null);
  },
  _findSlotByToken(token) {
    return this.slots.findIndex(s => s && s.kind === 'human' && s.clientToken === token);
  },
  _handleGuestMessage(peerId, msg) {
    if (!msg || !msg.type) return;
    this._peerLastSeen[peerId] = Date.now();
    if (msg.type === 'ping') {
      return;
    }
    if (msg.type === 'hello') {
      let slotIdx = this._findSlotByToken(msg.payload.clientToken);
      if (slotIdx === -1) slotIdx = this._findEmptySlot();
      if (slotIdx === -1) {
        this.transport.sendToGuest(peerId, { type: 'error', payload: { message: 'ルームが満員です' } });
        return;
      }
      const wasReconnect = this.slots[slotIdx] && this.slots[slotIdx].clientToken === msg.payload.clientToken;
      this.slots[slotIdx] = {
        kind: 'human', clientToken: msg.payload.clientToken,
        name: msg.payload.name, parts: msg.payload.parts,
        ready: wasReconnect ? this.slots[slotIdx].ready : false,
        connected: true, peerId,
      };
      this._peerToSlot[peerId] = slotIdx;
      this.transport.sendToGuest(peerId, { type: 'welcome', payload: { slotIndex: slotIdx, hostGeneration: this.hostGeneration, roomId: this.roomId } });
      this._broadcastRoomState();
      if (this._gameState) this.transport.sendToGuest(peerId, { type: 'gameState', payload: this._gameState });
      if (wasReconnect && this.onPlayerReconnected) this.onPlayerReconnected(slotIdx);
    } else if (msg.type === 'updateProfile') {
      const idx = this._peerToSlot[peerId];
      if (idx === undefined || !this.slots[idx]) return;
      this.slots[idx].name = msg.payload.name;
      this.slots[idx].parts = msg.payload.parts;
      this._broadcastRoomState();
    } else if (msg.type === 'setReady') {
      const idx = this._peerToSlot[peerId];
      if (idx === undefined || !this.slots[idx]) return;
      this.slots[idx].ready = !!msg.payload.ready;
      this._broadcastRoomState();
    } else if (msg.type === 'gameAction') {
      const idx = this._peerToSlot[peerId];
      if (idx === undefined) return;
      if (this.onRemoteAction) this.onRemoteAction(idx, msg.payload);
    }
  },
  _handleGuestDisconnect(peerId) {
    const idx = this._peerToSlot[peerId];
    if (idx === undefined || !this.slots[idx]) return;
    this.slots[idx].connected = false;
    this.slots[idx].peerId = null;
    delete this._peerToSlot[peerId];
    this._broadcastRoomState();
    if (this.onPlayerDisconnected) this.onPlayerDisconnected(idx);
  },
  _broadcastRoomState() {
    const payload = this._roomStatePayload();
    if (this.transport) this.transport.broadcastToGuests({ type: 'roomState', payload });
    if (this.onRoomUpdate) this.onRoomUpdate(this.slots, this.roomName, this.roomId, this.settings);
  },
  _roomStatePayload() {
    return {
      roomName: this.roomName, roomId: this.roomId, settings: this.settings,
      hostGeneration: this.hostGeneration, slots: this.slots,
    };
  },

  hostBuildSeatConfig() {
    return this.slots.map(s => {
      if (!s) return null;
      if (s.kind === 'cpu') return { isCpu: true, aiType: s.aiType };
      return { isCpu: false, name: s.name, parts: s.parts, clientToken: s.clientToken };
    });
  },
  hostBroadcastGameState(state) {
    if (this.role !== 'host') return;
    this._gameState = state;
    if (this.transport) this.transport.broadcastToGuests({ type: 'gameState', payload: state });
  },
  // 各ゲストに、そのゲスト専用の（他人の手札・目標を隠した）状態を個別送信する
  hostSendFilteredStates(buildFilterFn) {
    if (this.role !== 'host') return;
    this.slots.forEach((s, idx) => {
      if (s && s.kind === 'human' && idx !== this.mySlotIndex && s.peerId) {
        this.transport.sendToGuest(s.peerId, { type: 'gameState', payload: buildFilterFn(idx) });
      }
    });
  },
  hostBroadcastGameStarting() {
    if (this.role !== 'host') return;
    this.gameStarted = true;
    if (this.transport) this.transport.broadcastToGuests({ type: 'gameStarting' });
  },
  hostMarkDisconnectedInState(state, slotIdx) {
    if (state.players[slotIdx]) state.players[slotIdx].connected = false;
  },
  hostMarkReconnectedInState(state, slotIdx) {
    if (state.players[slotIdx]) state.players[slotIdx].connected = true;
  },

  // ===== ゲスト側 =====
  async joinRoom(roomId, myProfileInfo) {
    this.reset();
    this.role = 'guest';
    this.roomId = roomId;
    this._myProfile = myProfileInfo;
    const TransportClass = this.pickTransportClass();
    this.transport = new TransportClass();
    this.usingFallbackTransport = TransportClass === BroadcastTransport;
    this.hostGeneration = 0;

    await this._connectToHostGeneration(0);
    this.transport.sendToHost({ type: 'hello', payload: { clientToken: getClientToken(), name: displayNameFor(myProfileInfo, 1), parts: myProfileInfo.parts } });
    this._startGuestPing();
  },
  _connectToHostGeneration(gen) {
    return this.transport.connectAsGuest(hostPeerIdFor(this.roomId, gen), {
      onHostData: (data) => this._handleHostMessage(data),
      onHostDisconnect: () => this._handleHostDisconnect(),
    });
  },
  _handleHostMessage(msg) {
    if (!msg || !msg.type) return;
    this._lastHostMessageAt = Date.now();
    if (msg.type === 'heartbeat') return;
    if (msg.type === 'welcome') {
      this.mySlotIndex = msg.payload.slotIndex;
      this.hostGeneration = msg.payload.hostGeneration;
    } else if (msg.type === 'roomState') {
      this.roomName = msg.payload.roomName; this.settings = msg.payload.settings;
      this.slots = msg.payload.slots; this.hostGeneration = msg.payload.hostGeneration;
      if (this.onRoomUpdate) this.onRoomUpdate(this.slots, this.roomName, this.roomId, this.settings);
    } else if (msg.type === 'gameState') {
      this.gameStarted = true;
      if (this.onGameState) this.onGameState(msg.payload);
    } else if (msg.type === 'gameStarting') {
      this.gameStarted = true;
      if (this.onGameStarting) this.onGameStarting();
    } else if (msg.type === 'kicked') {
      if (this.onKicked) this.onKicked();
    } else if (msg.type === 'error') {
      if (this.onError) this.onError(msg.payload.message);
    }
  },
  guestSetReady(ready) {
    if (this.role !== 'guest') return;
    this.transport.sendToHost({ type: 'setReady', payload: { ready } });
  },
  guestUpdateProfile(profile) {
    if (this.role !== 'guest') return;
    this.transport.sendToHost({ type: 'updateProfile', payload: { name: displayNameFor(profile, (this.mySlotIndex || 0) + 1), parts: profile.parts } });
  },
  sendAction(actionType, payload) {
    if (this.role === 'guest') {
      this.transport.sendToHost({ type: 'gameAction', payload: { actionType, payload } });
    } else if (this.role === 'host' && this.onRemoteAction) {
      this.onRemoteAction(this.mySlotIndex, { actionType, payload });
    }
  },
  _handleHostDisconnect() {
    if (this.onError) this.onError('ホストとの接続が切れました。新しいホストを探しています…');
    this._attemptMigration();
  },

  // ===== ホスト移行（簡易実装） =====
  async _attemptMigration() {
    if (this.role !== 'guest' || !this.slots) return;
    const survivors = this.slots
      .map((s, i) => ({ s, i }))
      .filter(({ s, i }) => s && s.kind === 'human' && (i === this.mySlotIndex || s.connected));
    if (survivors.length === 0) return;
    const newHostIdx = Math.min(...survivors.map(x => x.i));
    const nextGen = this.hostGeneration + 1;

    if (newHostIdx === this.mySlotIndex) {
      await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
      this.role = 'host';
      this.hostGeneration = nextGen;
      this.mySlotIndex = newHostIdx;
      this._peerToSlot = {};
      this._peerLastSeen = {};
      const TransportClass = this.pickTransportClass();
      this.transport = new TransportClass();
      try {
        await this.transport.startHost(hostPeerIdFor(this.roomId, nextGen), {
          onGuestConnect: () => {},
          onGuestData: (peerId, data) => this._handleGuestMessage(peerId, data),
          onGuestDisconnect: (peerId) => this._handleGuestDisconnect(peerId),
        });
        this._startHostHeartbeatWatch();
        this._broadcastRoomState();
        if (this.onHostMigrated) this.onHostMigrated(true);
      } catch (e) {
        if (this.onError) this.onError('新しいホストの起動に失敗しました');
      }
    } else {
      let attempts = 0;
      const tryConnect = async () => {
        attempts++;
        try {
          await this._connectToHostGeneration(nextGen);
          this.transport.sendToHost({ type: 'hello', payload: { clientToken: getClientToken(), name: displayNameFor(this._myProfile || {}, this.mySlotIndex + 1), parts: (this._myProfile || {}).parts } });
          this.hostGeneration = nextGen;
          this._startGuestPing();
          if (this.onHostMigrated) this.onHostMigrated(false);
        } catch (e) {
          if (attempts < 15) setTimeout(tryConnect, 1200);
          else if (this.onError) this.onError('新しいホストに接続できませんでした');
        }
      };
      setTimeout(tryConnect, 800);
    }
  },

  leaveRoom() {
    this.reset();
  },
};
