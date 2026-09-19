/**
 * Fiesta API Client & Centralized Real-Time State Store
 * Connects to the permanent backend server and keeps all devices synchronized in real-time.
 */

window.FiestaAPI = (function() {
  const API_BASE = '/api';
  let state = {
    settings: {},
    teams: [],
    programs: [],
    participants: [],
    results: [],
    items: [],
    news: [],
    gallery: [],
    notifications: []
  };

  const listeners = [];
  let socket = null;
  let isConnecting = false;
  let reconnectAttempts = 0;
  let reconnectTimer = null;
  let pollTimer = null;
  let lastEtag = null;
  let inFlightFetchPromise = null;
  let lastStateFingerprint = '';

  function getStateFingerprint(s) {
    if (!s) return '';
    try {
      // Fast structural fingerprint of state collections and settings
      const rSummary = (s.results || []).map(r => `${r.id}:${r.resultNumber}:${r.isPublic}:${(r.winners||[]).length}`).join('|');
      const tSummary = (s.teams || []).map(t => `${t.name}:${t.points}:${t.firstCount}`).join('|');
      const nSummary = (s.news || []).map(n => `${n.id}:${n.isPublic}:${n.title}`).join('|');
      const gSummary = (s.gallery || []).length;
      const iSummary = (s.items || []).length;
      const vSummary = (s.videos || []).length;
      const pSummary = (s.participants || []).length;
      const prSummary = (s.programs || []).length;
      const setSummary = JSON.stringify(s.settings || {});
      return `${s.settings?.maxVisibleResultNumber}_${rSummary}_${tSummary}_${nSummary}_${gSummary}_${iSummary}_${vSummary}_${pSummary}_${prSummary}_${setSummary}`;
    } catch (e) {
      return String(Date.now());
    }
  }

  function subscribe(fn) {
    listeners.push(fn);
  }

  function notify() {
    listeners.forEach(fn => {
      try {
        fn(state);
      } catch (err) {
        console.error("Listener error:", err);
      }
    });
  }

  function updateState(newState, forceNotify = false) {
    if (!newState) return state;
    const newFingerprint = getStateFingerprint(newState);
    const hasChanged = forceNotify || (newFingerprint !== lastStateFingerprint);
    state = newState;
    lastStateFingerprint = newFingerprint;
    if (hasChanged) {
      notify();
    }
    return state;
  }

  // Fetch complete state from central database with deduplication & 304 caching
  function fetchState(isSilent = false) {
    if (inFlightFetchPromise) {
      return inFlightFetchPromise;
    }

    inFlightFetchPromise = (async () => {
      try {
        const headers = {};
        if (lastEtag) {
          headers['If-None-Match'] = lastEtag;
        }

        const res = await fetch(`${API_BASE}/state`, { headers });
        
        // 304 Not Modified: Cache is 100% fresh, 0 DOM re-render needed
        if (res.status === 304) {
          return state;
        }

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        const etag = res.headers.get('etag');
        if (etag) lastEtag = etag;

        const data = await res.json();
        updateState(data);
        return state;
      } catch (err) {
        if (!isSilent) console.warn("Failed to load state from backend, using cached state:", err);
        return state;
      } finally {
        inFlightFetchPromise = null;
      }
    })();

    return inFlightFetchPromise;
  }

  function getState() {
    return state;
  }

  // --- WEBSOCKET REAL-TIME LIVE SYNCHRONIZATION ---
  function initWebSocket() {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (isConnecting) return;
    isConnecting = true;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host || 'localhost:3000';
      const wsUrl = `${protocol}//${host}`;

      socket = new WebSocket(wsUrl);

      socket.onopen = function() {
        isConnecting = false;
        reconnectAttempts = 0;
        console.log("⚡ Live WebSocket connection established with Fiesta central database.");
      };

      socket.onmessage = function(event) {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'STATE_UPDATE' || data.type === 'INITIAL_STATE') {
            if (data.state) {
              updateState(data.state);
            }
          }
        } catch (e) {
          // Handle non-JSON payload if any
        }
      };

      socket.onclose = function() {
        isConnecting = false;
        socket = null;
        scheduleReconnect();
      };

      socket.onerror = function(err) {
        isConnecting = false;
      };
    } catch (err) {
      isConnecting = false;
      scheduleReconnect();
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectAttempts++;
    const delay = Math.min(10000, 1000 * Math.pow(1.5, reconnectAttempts));
    reconnectTimer = setTimeout(() => {
      initWebSocket();
    }, delay);
  }

  // Start real-time sync immediately
  if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initWebSocket();
        startPeriodicSync();
      });
    } else {
      initWebSocket();
      startPeriodicSync();
    }
  }

  // Background fallback sync (guarantees update even behind strict firewalls)
  function startPeriodicSync() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      fetchState(true);
    }, 10000);
  }

  // --- AUTH (ADMIN CLEARANCE) ---
  async function login(username, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success && data.token) {
      sessionStorage.setItem('excellentia_auth_token', data.token);
      sessionStorage.setItem('excellentia_auth_role', data.role || 'ADMIN');
      sessionStorage.setItem('excellentia_auth_user', data.user?.username || data.user?.email || 'Administrator');
    }
    return data;
  }

  function logout() {
    sessionStorage.removeItem('excellentia_auth_token');
    sessionStorage.removeItem('excellentia_auth_role');
    sessionStorage.removeItem('excellentia_auth_user');
  }

  function isAdminLoggedIn() {
    return !!sessionStorage.getItem('excellentia_auth_token');
  }

  function isLoggedIn() {
    return !!sessionStorage.getItem('excellentia_auth_token');
  }

  // --- RESULTS ---
  async function addResult(resultData) {
    const res = await fetch(`${API_BASE}/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resultData)
    });
    const data = await res.json();
    if (data.state) {
      updateState(data.state, true);
    }
    return data;
  }

  async function updateResult(id, resultData) {
    const res = await fetch(`${API_BASE}/results/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resultData)
    });
    const data = await res.json();
    if (data.state) {
      updateState(data.state, true);
    }
    return data;
  }

  async function deleteResult(id) {
    const res = await fetch(`${API_BASE}/results/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.state) {
      updateState(data.state, true);
    }
    return data;
  }

  // --- PARTICIPANTS & BULK EXCEL ---
  async function addSingleParticipant(participant) {
    const res = await fetch(`${API_BASE}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(participant)
    });
    const data = await res.json();
    if (data.state) {
      updateState(data.state, true);
    }
    return data;
  }

  async function importBulkParticipants(participantsList, overwrite = false) {
    const res = await fetch(`${API_BASE}/participants/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participants: participantsList, overwrite })
    });
    const data = await res.json();
    if (data.state) {
      updateState(data.state, true);
    }
    return data;
  }

  async function deleteParticipant(id) {
    const res = await fetch(`${API_BASE}/participants/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.state) {
      updateState(data.state, true);
    }
    return data;
  }

  // --- PUBLIC REQUESTS & REPORTS ---
  async function submitResultRequest(requestData) {
    const res = await fetch(`${API_BASE}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });
    const data = await res.json();
    await fetchState();
    return data;
  }

  async function submitDiscrepancyReport(reportData) {
    const res = await fetch(`${API_BASE}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData)
    });
    const data = await res.json();
    await fetchState();
    return data;
  }

  async function handleNotificationAction(id, action) {
    const res = await fetch(`${API_BASE}/notifications/${id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    const data = await res.json();
    if (data.state) {
      updateState(data.state, true);
    }
    return data;
  }

  // --- NEWS & GALLERY ---
  async function addNews(newsData) {
    const res = await fetch(`${API_BASE}/news`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newsData)
    });
    const data = await res.json();
    if (data.state) {
      updateState(data.state, true);
    }
    return data;
  }

  async function updateNews(id, newsData) {
    const res = await fetch(`${API_BASE}/news/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newsData)
    });
    const data = await res.json();
    if (data.state) {
      updateState(data.state, true);
    }
    return data;
  }

  async function toggleNewsVisibility(id, isPublic) {
    const res = await fetch(`${API_BASE}/news/${id}/toggle-visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublic })
    });
    const data = await res.json();
    if (data.state) {
      updateState(data.state, true);
    }
    return data;
  }

  async function deleteNews(id) {
    const res = await fetch(`${API_BASE}/news/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.state) {
      updateState(data.state, true);
    }
    return data;
  }

  async function bulkDeleteNews(ids = [], all = false) {
    if (state && Array.isArray(state.news)) {
      if (all) {
        state.news = [];
      } else {
        const idSet = new Set(ids);
        state.news = state.news.filter(n => !idSet.has(n.id));
      }
      notify();
    }

    const res = await fetch(`${API_BASE}/news/bulk-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, all })
    });
    const data = await res.json();
    if (data.state) {
      updateState(data.state, true);
    }
    return data;
  }

  async function cleanUnuploadedNews() {
    const res = await fetch(`${API_BASE}/news/clean-unuploaded`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (data.state) {
      updateState(data.state, true);
    }
    return data;
  }

  async function addGalleryItem(item) {
    const res = await fetch(`${API_BASE}/gallery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
    const data = await res.json();
    if (data.state) {
      updateState(data.state, true);
    }
    return data;
  }

  async function deleteGalleryItem(id) {
    const res = await fetch(`${API_BASE}/gallery/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.state) {
      updateState(data.state, true);
    }
    return data;
  }

  async function bulkDeleteParticipants(ids = [], all = false) {
    if (state && Array.isArray(state.participants)) {
      if (all) {
        state.participants = [];
      } else {
        const idSet = new Set(ids);
        state.participants = state.participants.filter(p => !idSet.has(p.id));
      }
      notify();
    }

    const res = await fetch(`${API_BASE}/participants/bulk-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, all })
    });
    return await res.json();
  }

  async function bulkDeleteGallery(ids = [], all = false) {
    if (state && Array.isArray(state.gallery)) {
      if (all) {
        state.gallery = [];
      } else {
        const idSet = new Set(ids);
        state.gallery = state.gallery.filter(g => !idSet.has(g.id));
      }
      notify();
    }

    const res = await fetch(`${API_BASE}/gallery/bulk-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, all })
    });
    return await res.json();
  }

  // --- SETTINGS & VISIBILITY ---
  async function updateSettings(settingsData) {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsData)
    });
    const data = await res.json();
    if (data.state) {
      updateState(data.state, true);
    }
    return data;
  }

  async function renumberResults() {
    const res = await fetch(`${API_BASE}/results/renumber`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (data.state) {
      updateState(data.state, true);
    }
    return data;
  }

  async function toggleResultVisibility(id, isPublic) {
    const res = await fetch(`${API_BASE}/results/${id}/toggle-visibility`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(typeof isPublic !== 'undefined' ? { isPublic } : {})
    });
    const data = await res.json();
    if (data.state) {
      updateState(data.state, true);
    }
    return data;
  }

  // --- FILE & MEDIA UPLOADS (PHOTO, VIDEO, ITEMS, NEWS) ---

  // Upload PC Gallery Photos (single or multiple)
  async function uploadGalleryFiles(files, category = 'A-Zone') {
    const formData = new FormData();
    if (Array.isArray(files) || files instanceof FileList) {
      Array.from(files).forEach(f => formData.append('images', f));
    } else if (files instanceof File) {
      formData.append('images', files);
    }
    formData.append('category', category);

    const res = await fetch(`${API_BASE}/gallery/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.state) {
      updateState(data.state, true);
    }
    return data;
  }

  // Upload Generic Image (for thumbnails, news, posters)
  async function uploadImageFile(file) {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch(`${API_BASE}/upload/image`, {
      method: 'POST',
      body: formData
    });
    return await res.json();
  }

  // Upload Video File from PC
  function uploadVideoFile(file, onProgress) {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('videoFile', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/videos/upload`, true);

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent, event.loaded, event.total);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            reject(new Error('Invalid response from video upload endpoint'));
          }
        } else {
          try {
            const errRes = JSON.parse(xhr.responseText);
            reject(new Error(errRes.message || `Video upload failed (${xhr.status})`));
          } catch (e) {
            reject(new Error(`Video upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network connection error during video upload'));
      xhr.send(formData);
    });
  }

  // Upload Winning Work Media (Photo, Video, PDF)
  async function uploadItemFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/items/upload`, {
      method: 'POST',
      body: formData
    });
    return await res.json();
  }

  async function saveItem(itemData) {
    const res = await fetch(`${API_BASE}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData)
    });
    const data = await res.json();
    if (data.state) {
      updateState(data.state, true);
    }
    return data;
  }

  async function deleteItem(id) {
    const res = await fetch(`${API_BASE}/items/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.state) {
      updateState(data.state, true);
    }
    return data;
  }

  async function bulkDeleteItems(options = {}) {
    const res = await fetch(`${API_BASE}/items/bulk-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    const data = await res.json();
    if (data.state) {
      updateState(data.state, true);
    }
    return data;
  }

  return {
    fetchState,
    getState,
    subscribe,
    login,
    logout,
    isAdminLoggedIn,
    isLoggedIn,
    addResult,
    updateResult,
    deleteResult,
    toggleResultVisibility,
    renumberResults,
    updateSettings,
    addSingleParticipant,
    importBulkParticipants,
    deleteParticipant,
    bulkDeleteParticipants,
    submitResultRequest,
    submitDiscrepancyReport,
    handleNotificationAction,
    addNews,
    updateNews,
    toggleNewsVisibility,
    deleteNews,
    bulkDeleteNews,
    cleanUnuploadedNews,
    addGalleryItem,
    deleteGalleryItem,
    bulkDeleteGallery,
    uploadGalleryFiles,
    uploadImageFile,
    uploadVideoFile,
    uploadItemFile,
    saveItem,
    deleteItem,
    bulkDeleteItems
  };
})();
