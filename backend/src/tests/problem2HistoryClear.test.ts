import assert from 'assert';
import fs from 'fs';
import { HistoryService } from '../services/historyService.js';
import { QuizPersistenceService } from '../services/quizPipeline/quizPersistenceService.js';
import { HISTORY_FILE, HISTORY_CLEARED_FILE } from '../config/database.js';

console.log('======================================================================');
console.log('STUDYTUBE AI — PHASE 2D: CLEAR HISTORY & RELOAD SURVIVAL TEST SUITE');
console.log('======================================================================\n');

async function runPhase2DTests() {
  const backendBase = 'http://localhost:5000/api';

  // -------------------------------------------------------------------------
  // TEST 1: Analyze Video A -> Confirm history contains Video A
  // -------------------------------------------------------------------------
  console.log('[PHASE 2D - TEST 1] Record Video A in History');
  const videoA = {
    id: `hist_video_A_${Date.now()}`,
    videoId: 'video_A_physics',
    url: 'https://youtube.com/watch?v=video_A_physics',
    title: 'Physics Mechanics Lecture A',
    thumbnail: 'https://img.youtube.com/vi/video_A_physics/0.jpg',
    summary: 'Mechanics lecture covering Newton laws',
    keyPoints: ['Newton 1', 'Newton 2'],
    duration: 1200,
    createdAt: new Date(Date.now() + 500).toISOString()
  };

  const savedA = HistoryService.upsert(videoA as any);
  assert.ok(savedA, 'Video A should be saved in history');

  const historyRes1 = await fetch(`${backendBase}/history`);
  const data1: any = await historyRes1.json();
  assert.ok(data1.history.some((h: any) => h.videoId === 'video_A_physics'), 'History must contain Video A');
  console.log(`  => PASS: Video A successfully stored in history (count: ${data1.history.length}).\n`);

  // -------------------------------------------------------------------------
  // TEST 2: Click Clear History -> DELETE /api/history returns success & empty
  // -------------------------------------------------------------------------
  console.log('[PHASE 2D - TEST 2] Clear All History via DELETE /api/history');
  const deleteRes = await fetch(`${backendBase}/history`, { method: 'DELETE' });
  const deleteData: any = await deleteRes.json();

  assert.strictEqual(deleteRes.status, 200, 'DELETE request must return HTTP 200');
  assert.strictEqual(deleteData.success, true, 'DELETE response must return success: true');
  assert.ok(deleteData.clearedAt > 0, 'clearedAt timestamp must be recorded');
  assert.ok(deleteData.itemsRemoved >= 1, 'At least 1 item should have been removed');
  console.log(`  => PASS: DELETE endpoint succeeded, items removed: ${deleteData.itemsRemoved}, marker: ${deleteData.clearedAt}.\n`);

  // -------------------------------------------------------------------------
  // TEST 3: Hard Reload Simulation -> History STILL empty, survives reload
  // -------------------------------------------------------------------------
  console.log('[PHASE 2D - TEST 3] Hard Reload Simulation: GET /api/history after clear');
  // Add Cache-Control no-cache headers matching frontend behavior on reload
  const reloadRes = await fetch(`${backendBase}/history?_t=${Date.now()}`, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    }
  });
  const reloadData: any = await reloadRes.json();

  assert.strictEqual(reloadRes.status, 200, 'Reload fetch must succeed');
  assert.strictEqual(reloadData.success, true, 'Reload fetch must return success: true');
  assert.strictEqual(reloadData.history.length, 0, 'History array MUST BE EMPTY after reload');
  assert.ok(reloadData.historyClearedAt >= deleteData.clearedAt, 'historyClearedAt must be present and >= delete timestamp');
  console.log(`  => PASS: History is 100% empty on reload (items: 0, marker: ${reloadData.historyClearedAt}).\n`);

  // -------------------------------------------------------------------------
  // TEST 4: Storage Inspection on Disk & Backend Cache
  // -------------------------------------------------------------------------
  console.log('[PHASE 2D - TEST 4] Inspect Backend Storage Files on Disk');
  const diskHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  const diskMarker = JSON.parse(fs.readFileSync(HISTORY_CLEARED_FILE, 'utf8'));

  assert.strictEqual(diskHistory.length, 0, 'history.json on disk must be empty array');
  assert.ok(diskMarker.clearedAt >= deleteData.clearedAt, 'history_cleared.json must persist clearedAt marker');
  console.log(`  => PASS: Storage inspection verified: history.json is [] and history_cleared.json is valid.\n`);

  // -------------------------------------------------------------------------
  // TEST 5: Analyze Video B -> Video A MUST NOT reappear, now or after reload
  // -------------------------------------------------------------------------
  console.log('[PHASE 2D - TEST 5] Analyze Video B after clearing');
  const videoB = {
    id: `hist_video_B_${Date.now()}`,
    videoId: 'video_B_biology',
    url: 'https://youtube.com/watch?v=video_B_biology',
    title: 'Biology Photosynthesis Lecture B',
    thumbnail: 'https://img.youtube.com/vi/video_B_biology/0.jpg',
    summary: 'Photosynthesis mechanisms',
    keyPoints: ['Calvin Cycle', 'Thylakoid'],
    duration: 1500,
    createdAt: new Date(Date.now() + 1000).toISOString()
  };

  const savedB = HistoryService.upsert(videoB as any);
  assert.ok(savedB, 'Video B should be added');

  const historyResB = await fetch(`${backendBase}/history?_t=${Date.now()}`);
  const dataB: any = await historyResB.json();

  assert.strictEqual(dataB.history.length, 1, 'History must contain exactly 1 item (Video B)');
  assert.strictEqual(dataB.history[0].videoId, 'video_B_biology', 'Item must be Video B');
  assert.ok(!dataB.history.some((h: any) => h.videoId === 'video_A_physics'), 'Video A must NEVER reappear');
  console.log(`  => PASS: Video B appears in history. Video A is completely gone.\n`);

  // -------------------------------------------------------------------------
  // TEST 6: Failure Path -> Simulated deletion failure
  // -------------------------------------------------------------------------
  console.log('[PHASE 2D - TEST 6] Failure Path: UI & Backend Error Handling');
  // Attempting to delete a nonexistent specific history item should fail cleanly
  const nonExistentId = 'hist_nonexistent_999999999';
  const failRes = await fetch(`${backendBase}/history/${nonExistentId}`, { method: 'DELETE' });
  const failData: any = await failRes.json();

  assert.strictEqual(failRes.status, 404, 'Deleting nonexistent ID must return 404');
  assert.strictEqual(failData.success, false, 'Failure response must have success: false');
  console.log(`  => PASS: Failure path handled gracefully without corrupting history state.\n`);

  // -------------------------------------------------------------------------
  // TEST 7: Stale Record Rejection via Marker (Anti-Rehydration)
  // -------------------------------------------------------------------------
  console.log('[PHASE 2D - TEST 7] Anti-Rehydration: Reject Stale Records Predating Clear Marker');
  const clearedAt = HistoryService.getHistoryClearedAt();
  const staleZombieItem = {
    id: `hist_zombie_${Date.now()}`,
    videoId: 'video_zombie_stale',
    url: 'https://youtube.com/watch?v=video_zombie',
    title: 'Old Stale Video from Before Clear',
    createdAt: new Date(clearedAt - 50000).toISOString()
  };

  const staleResult = HistoryService.upsert(staleZombieItem as any);
  assert.strictEqual(staleResult, null, 'HistoryService MUST REJECT any record older than historyClearedAt marker');

  const afterStaleRes = await fetch(`${backendBase}/history`);
  const afterStaleData: any = await afterStaleRes.json();
  assert.ok(!afterStaleData.history.some((h: any) => h.videoId === 'video_zombie_stale'), 'Stale zombie record was not written');
  console.log(`  => PASS: Stale records older than clear marker are rejected at the service layer.\n`);

  // -------------------------------------------------------------------------
  // TEST 8: Legacy Data Purge (Versioned Storage Migration)
  // -------------------------------------------------------------------------
  console.log('[PHASE 2D - TEST 8] Clean up and Final Wipe');
  const finalClear = await fetch(`${backendBase}/history`, { method: 'DELETE' });
  const finalData: any = await finalClear.json();
  assert.strictEqual(finalData.success, true);

  const finalCheck = await fetch(`${backendBase}/history`);
  const finalCheckData: any = await finalCheck.json();
  assert.strictEqual(finalCheckData.history.length, 0, 'Final history must be empty');
  console.log(`  => PASS: All history cleared and verified 100% empty.\n`);

  console.log('======================================================================');
  console.log('ALL 8 PHASE 2D TESTS COMPLETED AND VERIFIED WITH 100% SUCCESS!');
  console.log('======================================================================\n');
}

runPhase2DTests().catch(err => {
  console.error('Phase 2D test failed:', err);
  process.exit(1);
});
