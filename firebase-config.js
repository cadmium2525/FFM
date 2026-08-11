/**
 * Firebase Console > Project settings > Your apps > Web app で取得した値を設定します。
 * これらは公開識別子です。パスワードや秘密鍵は絶対に記載しないでください。
 */
window.FFM_FIREBASE_CONFIG = Object.freeze({
  apiKey: 'AIzaSyBigXjgar3aK3S8_vkCXqezIJa8KWaOOh4',
  authDomain: 'ffmf-25.firebaseapp.com',
  projectId: 'ffmf-25',
  appId: '1:884239720242:web:8bff17e42ccef476a8012b',
});

/**
 * 管理者アカウント作成後、Firebase Authentication画面に表示されるUIDを設定します。
 * firestore.rules内のADMIN_UIDも同じ値に置き換えてください。
 */
window.FFM_ADMIN_UID = '';
