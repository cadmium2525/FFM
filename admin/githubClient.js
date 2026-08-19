/**
 * Minimal client-side GitHub REST API wrapper for the /admin tool.
 * No backend — the browser calls api.github.com directly using a Personal
 * Access Token in the Authorization header (GitHub's REST API supports CORS
 * for authenticated requests). The token is only ever sent to
 * api.github.com and stored locally (see AdminAuth below); it never touches
 * any other server.
 */

const API_BASE = 'https://api.github.com';

/** UTF-8 safe base64 encode/decode — atob()/btoa() alone mangle Japanese text. */
function base64ToUtf8(base64) {
  const binary = atob(base64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

function utf8ToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

export class GitHubApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'GitHubApiError';
    this.status = status;
    this.body = body;
  }
}

export class GitHubClient {
  constructor({ token, owner, repo, branch = 'main' }) {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
    this.branch = branch;
  }

  async request(path, options = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
    if (!res.ok) {
      let body = null;
      try { body = await res.json(); } catch { /* ignore */ }
      throw new GitHubApiError(body?.message ?? `GitHub API error (${res.status})`, res.status, body);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  /** Confirms the token can read this repo (used by the connect flow). */
  async verifyAccess() {
    const repoInfo = await this.request(`/repos/${this.owner}/${this.repo}`);
    // Confirm the branch exists too, since a stale/typo'd branch name would
    // otherwise only surface as a confusing 404 much later.
    await this.request(`/repos/${this.owner}/${this.repo}/branches/${encodeURIComponent(this.branch)}`);
    return repoInfo;
  }

  /** Reads a text file's current content + sha (sha is required to update it later). */
  async getFile(path) {
    const data = await this.request(`/repos/${this.owner}/${this.repo}/contents/${path}?ref=${encodeURIComponent(this.branch)}`);
    return { sha: data.sha, content: base64ToUtf8(data.content), path };
  }

  /** Creates or updates a text file. `expectedSha` (omit for a new file) guards
   * against clobbering a concurrent change made outside this session. */
  async putFile(path, content, { message, expectedSha } = {}) {
    return this.request(`/repos/${this.owner}/${this.repo}/contents/${path}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: message ?? `Update ${path}`,
        content: utf8ToBase64(content),
        branch: this.branch,
        ...(expectedSha ? { sha: expectedSha } : {}),
      }),
    });
  }

  /** Creates or updates a binary file (images/audio) from an ArrayBuffer. */
  async putBinaryFile(path, arrayBuffer, { message, expectedSha } = {}) {
    let binary = '';
    new Uint8Array(arrayBuffer).forEach((b) => { binary += String.fromCharCode(b); });
    return this.request(`/repos/${this.owner}/${this.repo}/contents/${path}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: message ?? `Add ${path}`,
        content: btoa(binary),
        branch: this.branch,
        ...(expectedSha ? { sha: expectedSha } : {}),
      }),
    });
  }
}

const STORAGE_KEY = 'ffm-admin-github-config-v1';

/** Handles saving/loading/clearing the connection config (including the PAT)
 * in the browser's localStorage — this is a single-user internal tool, so
 * "remember me" is just localStorage; there is no server-side session. */
export const AdminAuth = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  save({ token, owner, repo, branch }) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, owner, repo, branch }));
  },
  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },
};
