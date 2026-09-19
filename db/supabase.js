/**
 * Supabase Database Integration & Real-Time Sync Provider
 * Excellentia Arts Fiesta 2026
 * 
 * Provides cloud PostgreSQL persistence via Supabase with instant
 * zero-latency in-memory caching and automatic bi-directional sync.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

class SupabaseProvider {
  constructor() {
    this.client = null;
    this.url = process.env.SUPABASE_URL || '';
    this.key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
    this.isConnected = false;
    this.lastSyncTime = null;

    this.initClient();
  }

  initClient(url = null, key = null) {
    if (url) this.url = url;
    if (key) this.key = key;

    if (this.url && this.key) {
      try {
        this.client = createClient(this.url, this.key, {
          auth: { persistSession: false }
        });
        this.isConnected = true;
        console.log('⚡ Supabase Client initialized successfully.');
      } catch (err) {
        console.warn('⚠️ Supabase client initialization warning:', err.message);
        this.client = null;
        this.isConnected = false;
      }
    } else {
      this.client = null;
      this.isConnected = false;
    }
  }

  isConfigured() {
    return !!(this.client && this.url && this.key);
  }

  async testConnection() {
    if (!this.isConfigured()) {
      return { success: false, message: 'Supabase URL and Key are not configured.' };
    }
    try {
      // Test basic connectivity via query
      const { data, error } = await this.client.from('settings').select('*').limit(1);
      if (error && error.code !== 'PGRST116') {
        // Table might not exist yet or permission issue
        return { success: false, error: error.message, code: error.code };
      }
      this.isConnected = true;
      return { success: true, message: 'Successfully connected to Supabase PostgreSQL database.' };
    } catch (err) {
      this.isConnected = false;
      return { success: false, error: err.message };
    }
  }

  async loadStateFromSupabase() {
    if (!this.isConfigured()) return null;

    try {
      const [
        teamsRes,
        resultsRes,
        programsRes,
        participantsRes,
        videosRes,
        galleryRes,
        newsRes,
        itemsRes,
        settingsRes,
        reportsRes
      ] = await Promise.allSettled([
        this.client.from('teams').select('*'),
        this.client.from('results').select('*').order('resultNumber', { ascending: false }),
        this.client.from('programs').select('*'),
        this.client.from('participants').select('*'),
        this.client.from('videos').select('*'),
        this.client.from('gallery').select('*'),
        this.client.from('news').select('*'),
        this.client.from('items').select('*'),
        this.client.from('settings').select('*').limit(1),
        this.client.from('reports').select('*')
      ]);

      const state = {};

      if (teamsRes.status === 'fulfilled' && !teamsRes.value.error && teamsRes.value.data) {
        state.teams = teamsRes.value.data;
      }
      if (resultsRes.status === 'fulfilled' && !resultsRes.value.error && resultsRes.value.data) {
        state.results = resultsRes.value.data;
      }
      if (programsRes.status === 'fulfilled' && !programsRes.value.error && programsRes.value.data) {
        state.programs = programsRes.value.data;
      }
      if (participantsRes.status === 'fulfilled' && !participantsRes.value.error && participantsRes.value.data) {
        state.participants = participantsRes.value.data;
      }
      if (videosRes.status === 'fulfilled' && !videosRes.value.error && videosRes.value.data) {
        state.videos = videosRes.value.data;
      }
      if (galleryRes.status === 'fulfilled' && !galleryRes.value.error && galleryRes.value.data) {
        state.gallery = galleryRes.value.data;
      }
      if (newsRes.status === 'fulfilled' && !newsRes.value.error && newsRes.value.data) {
        state.news = newsRes.value.data;
      }
      if (itemsRes.status === 'fulfilled' && !itemsRes.value.error && itemsRes.value.data) {
        state.items = itemsRes.value.data;
      }
      if (settingsRes.status === 'fulfilled' && !settingsRes.value.error && settingsRes.value.data?.[0]) {
        state.settings = settingsRes.value.data[0].config || settingsRes.value.data[0];
      }
      if (reportsRes.status === 'fulfilled' && !reportsRes.value.error && reportsRes.value.data) {
        state.reports = reportsRes.value.data;
      }

      this.lastSyncTime = new Date().toISOString();
      return state;
    } catch (err) {
      console.warn('Failed to load state from Supabase:', err.message);
      return null;
    }
  }

  async syncTableToSupabase(table, data) {
    if (!this.isConfigured() || !data) return { success: false, message: 'Not configured or no data' };
    try {
      if (Array.isArray(data) && data.length === 0) return { success: true, count: 0 };
      
      let res;
      if (table === 'teams') {
        res = await this.client.from('teams').upsert(data, { onConflict: 'name' });
      } else if (table === 'settings') {
        res = await this.client.from('settings').upsert({ id: 'main', config: data }, { onConflict: 'id' });
      } else {
        res = await this.client.from(table).upsert(data, { onConflict: 'id' });
      }
      
      if (res && res.error) {
        console.warn(`Supabase sync warning for table ${table}:`, res.error.message);
        return { success: false, error: res.error.message };
      }
      return { success: true, table, syncedAt: new Date().toISOString() };
    } catch (err) {
      console.warn(`Supabase single-table sync exception (${table}):`, err.message);
      return { success: false, error: err.message };
    }
  }

  // Debounced queue sync to prevent API flooding
  debounceTimer = null;
  pendingSyncTables = new Set();

  queueTableSync(table, localState, delay = 1500) {
    if (!this.isConfigured() || !localState) return;
    if (table) this.pendingSyncTables.add(table);
    else Object.keys(localState).forEach(k => this.pendingSyncTables.add(k));

    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(async () => {
      const tablesToSync = Array.from(this.pendingSyncTables);
      this.pendingSyncTables.clear();
      
      if (tablesToSync.length > 5 || tablesToSync.includes('all')) {
        await this.syncAllToSupabase(localState);
      } else {
        await Promise.allSettled(tablesToSync.map(tbl => {
          const tblData = localState[tbl];
          if (tblData) return this.syncTableToSupabase(tbl, tblData);
          return Promise.resolve();
        }));
      }
    }, delay);
  }

  async syncAllToSupabase(localState) {
    if (!this.isConfigured() || !localState) return { success: false, message: 'Not configured' };

    try {
      const operations = [];

      if (Array.isArray(localState.teams) && localState.teams.length > 0) {
        operations.push(this.client.from('teams').upsert(localState.teams, { onConflict: 'name' }));
      }
      if (Array.isArray(localState.results) && localState.results.length > 0) {
        operations.push(this.client.from('results').upsert(localState.results, { onConflict: 'id' }));
      }
      if (Array.isArray(localState.programs) && localState.programs.length > 0) {
        operations.push(this.client.from('programs').upsert(localState.programs, { onConflict: 'id' }));
      }
      if (Array.isArray(localState.participants) && localState.participants.length > 0) {
        operations.push(this.client.from('participants').upsert(localState.participants, { onConflict: 'id' }));
      }
      if (Array.isArray(localState.videos) && localState.videos.length > 0) {
        operations.push(this.client.from('videos').upsert(localState.videos, { onConflict: 'id' }));
      }
      if (Array.isArray(localState.gallery) && localState.gallery.length > 0) {
        operations.push(this.client.from('gallery').upsert(localState.gallery, { onConflict: 'id' }));
      }
      if (Array.isArray(localState.news) && localState.news.length > 0) {
        operations.push(this.client.from('news').upsert(localState.news, { onConflict: 'id' }));
      }
      if (Array.isArray(localState.items) && localState.items.length > 0) {
        operations.push(this.client.from('items').upsert(localState.items, { onConflict: 'id' }));
      }
      if (localState.settings) {
        operations.push(this.client.from('settings').upsert({ id: 'main', config: localState.settings }, { onConflict: 'id' }));
      }

      await Promise.all(operations);
      this.lastSyncTime = new Date().toISOString();
      return { success: true, count: operations.length, syncedAt: this.lastSyncTime };
    } catch (err) {
      console.error('Supabase full sync error:', err.message);
      return { success: false, error: err.message };
    }
  }

  async upsertEntity(table, entity) {
    if (!this.isConfigured() || !entity) return null;
    try {
      const { data, error } = await this.client.from(table).upsert(entity);
      if (error) console.warn(`Supabase upsert into ${table} warning:`, error.message);
      return data;
    } catch (e) {
      console.warn(`Supabase error on ${table}:`, e.message);
      return null;
    }
  }

  async deleteEntity(table, id) {
    if (!this.isConfigured() || !id) return null;
    try {
      const { data, error } = await this.client.from(table).delete().eq('id', id);
      if (error) console.warn(`Supabase delete from ${table} warning:`, error.message);
      return data;
    } catch (e) {
      console.warn(`Supabase error on ${table} delete:`, e.message);
      return null;
    }
  }
}

module.exports = new SupabaseProvider();
