const assert = require('assert');

const {
  extractEntities,
  classifySource,
  computeRouting,
  CORE_SHOWS,
} = require('../src/intelligence');

function names(textByField) {
  return extractEntities(textByField).map(entity => entity.name);
}

const exact = extractEntities({
  title: 'SK Hynix and Meta',
  description: 'Chey Tae-won discussed SK Hynix; metadata was also available.',
  note: 'Peter Thiel met Andrew Feldman of Cerebras.',
  metadata: 'Meta',
});
assert(exact.some(entity => entity.name === 'SK Hynix' && entity.type === 'company'));
assert(!exact.some(entity => entity.name === 'SK'), 'SK Hynix must not degrade into SK');
assert.strictEqual(exact.filter(entity => entity.name === 'Meta').length, 1, 'metadata must not match Meta and duplicate aliases must collapse');
assert(exact.some(entity => entity.name === 'Chey Tae-won' && entity.type === 'person'));
assert(exact.some(entity => entity.name === 'Cerebras' && entity.type === 'company'));
assert(exact.some(entity => entity.name === 'Andrew Feldman' && entity.type === 'person'), 'person and company types must remain distinct');
assert.deepStrictEqual(extractEntities({ title: 'company investor model AI market metadata' }), [], 'generic words are never entities');
assert.deepStrictEqual(extractEntities({ title: 'Cerebras Cerebras', note: 'Cerebras' }), extractEntities({ title: 'Cerebras Cerebras', note: 'Cerebras' }), 'extraction must be deterministic');
assert.deepStrictEqual(names({ title: "China's Belt and Road Problem - Sarah Paine" }), ['Sarah Paine']);
assert.deepStrictEqual(names({ title: 'Alignment with Awakening: Davidad on Moral Realism' }), ['Davidad Dalrymple']);
assert.deepStrictEqual(names({ title: 'General relativity from first principles – Adam Brown' }), ['Adam Brown']);
assert.strictEqual(extractEntities({ title: 'Davidad on moral realism', note: 'OpenAI and Anthropic' })[0].name, 'Davidad Dalrymple', 'title-grounded entities must precede note-only entities');

assert.strictEqual(classifySource('Invest Like the Best with Patrick O’Shaughnessy').tier, 'core');
assert.strictEqual(classifySource('Training Data by Sequoia Capital').tier, 'core');
assert(CORE_SHOWS.some(show => show.name === 'Invest Like the Best'), 'core registry must project absent shows');

const rich = computeRouting({
  productionStatus: 'note_ready', materiality: 'high', sourceTier: 'core',
  entities: extractEntities({ title: 'Cerebras and Black Forest Labs with Andrew Feldman' }),
  transcriptStatus: 'ready', description: 'A complete description of the discussion and its current relevance.',
  whyItMatters: 'Material implications for AI infrastructure supply and competition.',
});
assert.strictEqual(rich.lowInformation, false);
assert.match(rich.reason, /深度纪要完成/);
assert.match(rich.reason, /Cerebras/);

const suppressed = computeRouting({ productionStatus: 'new', materiality: 'monitor', sourceTier: 'standard', entities: [], transcriptStatus: 'missing', description: 'brief', whyItMatters: '' });
assert.strictEqual(suppressed.lowInformation, true);
assert.strictEqual(suppressed.todayVisible, false);

for (const override of [
  { sourceTier: 'core' }, { materiality: 'high' }, { entities: extractEntities({ title: 'NVIDIA' }) },
  { transcriptStatus: 'ready' }, { description: 'A sufficiently complete description that gives a reader concrete context about this episode.', whyItMatters: 'A sufficiently complete explanation of why this episode matters for current research.' },
]) {
  const kept = computeRouting({ productionStatus: 'new', materiality: 'monitor', sourceTier: 'standard', entities: [], transcriptStatus: 'missing', description: 'brief', whyItMatters: '', ...override });
  assert.strictEqual(kept.lowInformation, false, `suppression must require every condition: ${JSON.stringify(override)}`);
}
const coreSparse = computeRouting({ productionStatus: 'new', materiality: 'monitor', sourceTier: 'core', entities: [], transcriptStatus: 'missing', description: '', whyItMatters: '' });
assert.strictEqual(coreSparse.reason, '信息待补齐 · 核心节目保留');
assert.strictEqual(coreSparse.label, '研究路由优先级');

console.log('intelligence tests passed');
