/**
 * Firebase Console > Project settings > Your apps > Web app で取得した値を設定します。
 * これらは公開識別子です。パスワードや秘密鍵は絶対に記載しないでください。
 */
window.FFM_FIREBASE_CONFIG = Object.freeze({
  apiKey: '',
  authDomain: '',
  projectId: '',
  appId: '',
});

/**
 * 管理者アカウント作成後、Firebase Authentication画面に表示されるUIDを設定します。
 * firestore.rules内のADMIN_UIDも同じ値に置き換えてください。
 */
window.FFM_ADMIN_UID = '';
