const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createRequestHandler } = require('../server');

function write(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)); }
function completeNote() {
  return '# 完整纪要\n\n## 一页定位：为什么值得研究\n\n这期访谈系统解释了企业智能体落地的技术约束、组织影响与竞争边界，并给出可核验的具体论据、反方意见和现实案例，因此值得纳入研究阅读，并可帮助读者判断相关主张的适用范围。\n\n## 来源保真正文\n\n' + '这是依据逐字稿整理的来源保真中文正文，保留嘉宾论证、反例、数字语境以及不确定性边界。'.repeat(35) + '\n\nOnly-in-full-note evidence phrase.';
}
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'podcast-inbox-server-'));
  const day = path.join(root, '2026-07-11');
  write(path.join(root, 'state.json'), { sources: { latent: { show_title: 'Latent Space', tier: 'Tier A', last_status: 200 } } });
  write(path.join(day, 'candidates.json'), [
    { id: 'yt_SERVER1234', video_id: 'SERVER1234', type: 'youtube', title: 'Open Models for Enterprise Agents', show: 'Latent Space', source_key: 'latent', url: 'https://youtube.com/watch?v=SERVER1234', description: 'High signal NVIDIA AI infrastructure discussion', materiality: 'high', status: 'new_detected' },
    { id: 'new-2', title: 'Market Structure Weekly', show: 'Odd Lots', url: 'https://example.com/two', description: 'Macro markets', materiality: 'selective', status: 'new_detected' },
    { id: 'new-3', title: 'Short update', show: 'Unknown Daily', url: 'https://example.com/three', description: 'Brief', materiality: 'monitor', status: 'new_detected' },
  ]);
  const episode = path.join(day, 'Open_Models');
  write(path.join(episode, 'metadata.json'), { video_id: 'SERVER1234', title: 'Open Models for Enterprise Agents', channel: 'Latent Space', url: 'https://youtube.com/watch?v=SERVER1234', source_boundary: 'Third-party transcript' });
  write(path.join(episode, 'notes_cn_source_faithful.md'), completeNote());
  write(path.join(episode, 'notes_cn_source_faithful.docx'), 'docx');
  write(path.join(episode, 'notes_cn_source_faithful.qc.json'), { file: path.join(episode, 'notes_cn_source_faithful.docx'), md_chars: 1800, paragraph_count: 40, passed: true });
  write(path.join(episode, 'transcript_timestamped.txt'), '00:00 transcript');
  write(path.join(episode, 'investment_extraction.json'), { status: 'dedicated-layer', claims: [] });
  return root;
}
function req(handler, route, options = {}) {
  const headers = {};
  const res = { writeHead(status, next) { this.status = status; Object.assign(headers, next); }, end(body) { this.body = Buffer.isBuffer(body) ? body : Buffer.from(body || ''); } };
  handler({ url: route, method: options.method || 'GET', headers: { host: 'localhost' } }, res);
  const text = res.body.toString('utf8');
  return { status: res.status, text, json: () => JSON.parse(text), headers: { get: key => headers[String(key).toLowerCase()] || null } };
}

(async () => {
  const root = fixture(); const handler = createRequestHandler({ root });
  try {
    const health = req(handler, '/api/health'); assert.strictEqual(health.status, 200); assert(!health.text.includes(root));
    const stateRes = req(handler, '/api/state'); const state = stateRes.json();
    assert(state.days[0]);
    assert.strictEqual(state.days[0].itemCount, 1); assert(!stateRes.text.includes(root)); assert(!stateRes.text.includes('Only-in-full-note'));
    assert.strictEqual(state.episodes.length, 1, 'state is a ready-only reader dataset');
    assert(!stateRes.text.includes('Market Structure Weekly') && !stateRes.text.includes('Short update'), 'blocked identities are absent from every state page dataset');
    assert(state.episodes.every(episode => episode.publicReady && episode.publicationQc.ready));
    assert(state.days.every(day => day.itemIds.every(itemId => state.episodes.some(episode => episode.id === itemId))));
    assert.strictEqual(state.stats.episodeCount, state.episodes.length);
    assert(state.sources.some(source => source.title === 'Invest Like the Best' && source.sourceTier === 'core' && source.episodeCount === 0));
    assert.deepStrictEqual(state.audit, { gateVersion: state.audit.gateVersion, totalIndexed: 3, ready: 1, blocked: 2, reasonCounts: state.audit.reasonCounts });
    const listRes = req(handler, '/api/episodes?date=2026-07-11&status=qc_passed&theme=AI%20Agents&materiality=high&limit=1');
    const list = listRes.json(); assert.strictEqual(list.total, 1); assert.strictEqual(list.episodes.length, 1); assert(!listRes.text.includes(root));
    assert.strictEqual(list.episodes[0].sourceTier, 'core');
    assert(Array.isArray(list.episodes[0].entities));
    assert.strictEqual(req(handler, '/api/episodes?sourceTier=core').json().total, 1);
    assert.strictEqual(req(handler, '/api/episodes?entity=nvidia').json().total, 1);
    assert.strictEqual(req(handler, '/api/episodes?lowInformation=true').json().total, 0);
    assert.strictEqual(req(handler, '/api/episodes?lowInformation=false').json().total, 1);
    const entities = req(handler, '/api/entities').json(); assert(Array.isArray(entities.entities));
    const id = list.episodes[0].id;
    const detailRes = req(handler, '/api/episodes/' + id); const detail = detailRes.json();
    assert.match(detail.noteMarkdown, /Only-in-full-note/); assert.strictEqual(detail.productionStatus, 'qc_passed'); assert(!detailRes.text.includes(root));
    assert.strictEqual(detail.investmentExtraction.status, 'dedicated-layer');
    assert(detail.files.docx && detail.files.transcript);
    const search = req(handler, '/api/search?q=Only-in-full-note&limit=5'); assert.strictEqual(search.json().total, 1);
    assert.strictEqual(req(handler, '/api/search?q=Market%20Structure').json().total, 0, 'blocked discoveries cannot appear in search');
    const download = req(handler, `/api/episodes/${id}/files/docx`); assert.strictEqual(download.status, 200); assert.match(download.headers.get('content-disposition'), /notes_cn/);
    const blocked = require('../src/indexer').buildIndex(root).episodes.find(episode => episode.candidateId === 'new-2');
    assert(blocked && !blocked.publicReady);
    assert.strictEqual(req(handler, `/api/episodes/${blocked.id}`).status, 404, 'old blocked detail URLs return not found');
    assert.strictEqual(req(handler, `/api/episodes/${blocked.id}/files/markdown`).status, 404, 'blocked episode files return not found');
    const blockedCandidatePath = path.join(root, '2026-07-11', 'candidates.json');
    assert.strictEqual(req(handler, '/api/raw?path=' + encodeURIComponent(blockedCandidatePath)).status, 404, 'generic raw access cannot bypass publication readiness');
    assert.strictEqual(req(handler, '/api/file?path=' + encodeURIComponent(blockedCandidatePath)).status, 404, 'generic file access cannot bypass publication readiness');
    const audit = req(handler, '/api/audit'); assert.strictEqual(audit.status, 200); assert.deepStrictEqual(audit.json(), state.audit); assert(!audit.text.includes(root));
    assert.strictEqual(req(handler, '/api/file?path=' + encodeURIComponent('/etc/passwd')).status, 403);
    assert.strictEqual(req(handler, '/api/raw?path=' + encodeURIComponent('/etc/passwd')).status, 403);
    assert.strictEqual(req(handler, '/api/state', { method: 'POST' }).status, 405);
    assert.strictEqual(req(handler, '/podcast/api/episodes?limit=1').status, 200);
    const home = req(handler, '/podcast/'); assert.strictEqual(home.status, 200); assert.match(home.text, /Podcast Intelligence/);
    const app = req(handler, '/podcast/app.js'); assert.match(app.text, /QC 精选阅读/);
    for (const placeholder of ['尚未提供价值说明', '来源边界尚未记录', '无可靠匹配', '未识别到可靠实体']) assert(!app.text.includes(placeholder), `reader UI must omit placeholder: ${placeholder}`);
  } finally {}
  console.log('server tests passed');
})().catch(error => { console.error(error); process.exit(1); });
