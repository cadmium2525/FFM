const FIREBASE_SDK_VERSION = '12.16.0';
const FIREBASE_CDN_ROOT = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;

function configured(config) {
  return ['apiKey', 'authDomain', 'projectId', 'appId'].every((key) => Boolean(config?.[key]));
}

function publicProfile(profile, loginId, loginIdKey, createdAt, updatedAt) {
  return {
    playerName: String(profile.name || 'PLAYER').slice(0, 12),
    loginId,
    loginIdKey,
    level: Math.max(1, Math.trunc(profile.level || 1)),
    gil: Math.max(0, Math.trunc(profile.gil || 0)),
    diamonds: Math.max(0, Math.trunc(profile.diamonds || 0)),
    potions: Math.max(0, Math.trunc(profile.potions || 0)),
    items: Object.fromEntries(Object.entries(profile.items ?? {}).map(([id, count]) => [
      String(id).slice(0, 64),
      Math.max(0, Math.min(99, Math.trunc(Number(count) || 0))),
    ])),
    volume: Math.min(100, Math.max(0, Math.trunc(profile.volume ?? 70))),
    windowHue: Math.min(359, Math.max(0, Math.trunc(profile.windowHue ?? 220))),
    shards: [],
    discs: Array.isArray(profile.discs)
      ? profile.discs.slice(0, 200).map(({ uid, name, shardIds }) => ({
          uid: String(uid),
          name: String(name).slice(0, 16),
          shardIds: Array.isArray(shardIds) ? shardIds.slice(0, 4).map(String) : [],
        }))
      : [],
    ...(createdAt ? { createdAt } : {}),
    updatedAt,
  };
}

export class FirebaseAccountService {
  constructor({ onStateChange } = {}) {
    this.config = window.FFM_FIREBASE_CONFIG ?? {};
    this.adminUid = window.FFM_ADMIN_UID ?? '';
    this.onStateChange = onStateChange ?? (() => {});
    this.status = configured(this.config) ? 'idle' : 'unconfigured';
    this.user = null;
    this.api = null;
    this.auth = null;
    this.db = null;
    this.initializing = null;
  }

  get isConfigured() {
    return configured(this.config);
  }

  get isSignedIn() {
    return Boolean(this.user);
  }

  get isAdmin() {
    return Boolean(this.user && this.adminUid && this.user.uid === this.adminUid);
  }

  get snapshot() {
    return {
      status: this.status,
      user: this.user,
      isConfigured: this.isConfigured,
      isSignedIn: this.isSignedIn,
      isAdmin: this.isAdmin,
    };
  }

  emit() {
    this.onStateChange(this.snapshot);
  }

  async initialize() {
    if (!this.isConfigured) {
      this.status = 'unconfigured';
      this.emit();
      return this.snapshot;
    }
    if (this.api) return this.snapshot;
    if (this.initializing) return this.initializing;

    this.status = 'connecting';
    this.emit();
    this.initializing = (async () => {
      try {
        const [appApi, authApi, firestoreApi] = await Promise.all([
          import(`${FIREBASE_CDN_ROOT}/firebase-app.js`),
          import(`${FIREBASE_CDN_ROOT}/firebase-auth.js`),
          import(`${FIREBASE_CDN_ROOT}/firebase-firestore.js`),
        ]);
        const app = appApi.initializeApp(this.config);
        this.auth = authApi.getAuth(app);
        this.db = firestoreApi.getFirestore(app);
        this.api = { authApi, firestoreApi };
        await authApi.setPersistence(this.auth, authApi.browserLocalPersistence);
        authApi.onAuthStateChanged(this.auth, (user) => {
          this.user = user;
          this.status = user ? 'signed_in' : 'signed_out';
          this.emit();
        });
        return this.snapshot;
      } catch (error) {
        this.status = 'error';
        this.emit();
        throw error;
      }
    })();
    return this.initializing;
  }

  normalizeLoginId(loginId) {
    const normalized = String(loginId).normalize('NFKC').trim().toLowerCase();
    if (!/^[a-z0-9_-]{4,24}$/.test(normalized)) {
      throw new Error('ログインIDは半角英数字・_・-を使い、4〜24文字で入力してください。');
    }
    return normalized;
  }

  async loginIdKey(loginId) {
    const normalized = this.normalizeLoginId(loginId);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  async authEmail(loginId) {
    return `${await this.loginIdKey(loginId)}@players.ffm.app`;
  }

  async requireReady() {
    await this.initialize();
    if (!this.api) throw new Error('Firebaseが設定されていません。');
  }

  async register(loginId, password, profile) {
    await this.requireReady();
    if (String(password).length < 6) throw new Error('パスワードは6文字以上で入力してください。');
    const normalizedLoginId = this.normalizeLoginId(loginId);
    const email = await this.authEmail(normalizedLoginId);
    const credential = await this.api.authApi.createUserWithEmailAndPassword(this.auth, email, password);
    await this.api.authApi.updateProfile(credential.user, { displayName: profile.name });
    this.user = credential.user;
    await this.saveProfile({ ...profile, loginId: normalizedLoginId }, { create: true });
    return credential.user;
  }

  async signIn(loginId, password) {
    await this.requireReady();
    const email = await this.authEmail(loginId);
    const credential = await this.api.authApi.signInWithEmailAndPassword(this.auth, email, password);
    this.user = credential.user;
    return credential.user;
  }

  async changePassword(password) {
    await this.requireReady();
    if (!this.user) throw new Error('先にログインしてください。');
    if (String(password).length < 6) throw new Error('パスワードは6文字以上で入力してください。');
    await this.api.authApi.updatePassword(this.user, password);
  }

  async signOut() {
    await this.requireReady();
    await this.api.authApi.signOut(this.auth);
  }

  async saveProfile(profile, { create = false } = {}) {
    if (!this.api || !this.user) return false;
    if (!profile.loginId) return false;
    const loginId = this.normalizeLoginId(profile.loginId);
    const key = await this.loginIdKey(loginId);
    const { doc, serverTimestamp, setDoc } = this.api.firestoreApi;
    const data = publicProfile(
      profile,
      loginId,
      key,
      create ? serverTimestamp() : null,
      serverTimestamp(),
    );
    await setDoc(doc(this.db, 'users', this.user.uid), data, { merge: !create });
    return true;
  }

  async loadProfile() {
    await this.requireReady();
    if (!this.user) return null;
    const { doc, getDoc } = this.api.firestoreApi;
    const snapshot = await getDoc(doc(this.db, 'users', this.user.uid));
    return snapshot.exists() ? snapshot.data() : null;
  }
}
