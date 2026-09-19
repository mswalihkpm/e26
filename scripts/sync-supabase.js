#!/usr/bin/env node

/**
 * Supabase Migration & Sync CLI Utility
 * Excellentia Arts Fiesta 2026
 * 
 * Usage:
 *   node scripts/sync-supabase.js --url=<SUPABASE_URL> --key=<SUPABASE_KEY>
 *   or with environment variables: SUPABASE_URL=... SUPABASE_KEY=... node scripts/sync-supabase.js
 */

const fs = require('fs');
const path = require('path');
const supabaseProvider = require('../db/supabase');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

async function runSync() {
  console.log('========================================================================');
  console.log('EXCELLENTIA ARTS FIESTA 2026 - SUPABASE DATABASE SYNCHRONIZER');
  console.log('========================================================================\n');

  // Read arguments
  const args = process.argv.slice(2);
  let url = process.env.SUPABASE_URL;
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  args.forEach(arg => {
    if (arg.startsWith('--url=')) url = arg.split('=')[1];
    if (arg.startsWith('--key=')) key = arg.split('=')[1];
  });

  if (url && key) {
    supabaseProvider.initClient(url, key);
  }

  if (!supabaseProvider.isConfigured()) {
    console.log('ℹ️ Supabase credentials not provided in command line or environment.');
    console.log('To sync to a live Supabase project, run:');
    console.log('  node scripts/sync-supabase.js --url=https://xyz.supabase.co --key=your-anon-or-service-key\n');
    console.log('Local db.json file is intact and ready for deployment.');
    process.exit(0);
  }

  console.log(`📡 Connecting to Supabase at: ${url}...`);
  const connTest = await supabaseProvider.testConnection();
  if (!connTest.success) {
    console.error('❌ Supabase connection test failed:', connTest.error || connTest.message);
    process.exit(1);
  }
  console.log('✅ Supabase connected successfully!\n');

  // Read local db.json
  if (!fs.existsSync(DB_PATH)) {
    console.error('❌ Local db.json not found at', DB_PATH);
    process.exit(1);
  }

  const localData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  console.log(`📦 Local State Loaded:`);
  console.log(`  - Teams: ${localData.teams?.length || 0}`);
  console.log(`  - Results: ${localData.results?.length || 0}`);
  console.log(`  - Programs: ${localData.programs?.length || 0}`);
  console.log(`  - Participants: ${localData.participants?.length || 0}`);
  console.log(`  - Videos: ${localData.videos?.length || 0}`);
  console.log(`  - Gallery: ${localData.gallery?.length || 0}`);
  console.log(`  - News: ${localData.news?.length || 0}`);
  console.log(`  - Winning Items: ${localData.items?.length || 0}`);

  console.log('\n🚀 Starting full synchronization to Supabase cloud tables...');
  const syncResult = await supabaseProvider.syncAllToSupabase(localData);

  if (syncResult.success) {
    console.log(`\n🎉 SYNC COMPLETED SUCCESSFULLY at ${syncResult.syncedAt}!`);
    console.log(`All tables are now live and synchronized on Supabase.`);
  } else {
    console.error('❌ Sync encountered an issue:', syncResult.error);
    process.exit(1);
  }
}

runSync().catch(err => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
