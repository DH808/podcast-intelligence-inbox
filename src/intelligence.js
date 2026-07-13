const ENTITY_REGISTRY = Object.freeze([
  { id: 'cerebras', name: 'Cerebras', type: 'company', aliases: ['Cerebras Systems'] },
  { id: 'black-forest-labs', name: 'Black Forest Labs', type: 'company', aliases: ['Black Forest Lab', 'BFL'] },
  { id: 'sk-hynix', name: 'SK Hynix', type: 'company', aliases: ['SK hynix'] },
  { id: 'samsung', name: 'Samsung', type: 'company', aliases: ['Samsung Electronics'] },
  { id: 'disney', name: 'Disney', type: 'company', aliases: ['The Walt Disney Company', 'Walt Disney'] },
  { id: 'nvidia', name: 'NVIDIA', type: 'company', aliases: ['Nvidia'] },
  { id: 'amd', name: 'AMD', type: 'company', aliases: ['Advanced Micro Devices'] },
  { id: 'openai', name: 'OpenAI', type: 'organization', aliases: ['Open AI'] },
  { id: 'anthropic', name: 'Anthropic', type: 'company', aliases: [] },
  { id: 'microsoft', name: 'Microsoft', type: 'company', aliases: [] },
  { id: 'alphabet-google', name: 'Alphabet / Google', type: 'company', aliases: ['Alphabet', 'Google'] },
  { id: 'amazon-aws', name: 'Amazon / AWS', type: 'company', aliases: ['Amazon', 'AWS', 'Amazon Web Services'] },
  { id: 'meta', name: 'Meta', type: 'company', aliases: ['Meta Platforms'] },
  { id: 'bitcoin', name: 'Bitcoin', type: 'asset', aliases: ['BTC'] },
  { id: 'peter-thiel', name: 'Peter Thiel', type: 'person', aliases: [] },
  { id: 'andrew-feldman', name: 'Andrew Feldman', type: 'person', aliases: [] },
  { id: 'robin-rombach', name: 'Robin Rombach', type: 'person', aliases: [] },
  { id: 'martin-scorsese', name: 'Martin Scorsese', type: 'person', aliases: [] },
  { id: 'chey-tae-won', name: 'Chey Tae-won', type: 'person', aliases: ['Chey Tae Won'] },
  { id: 'davidad-dalrymple', name: 'Davidad Dalrymple', type: 'person', aliases: ['davidad', 'David Dalrymple'] },
  { id: 'sarah-paine', name: 'Sarah Paine', type: 'person', aliases: [] },
  { id: 'adam-brown', name: 'Adam Brown', type: 'person', aliases: [] },
  { id: 'matthew-berman', name: 'Matthew Berman', type: 'person', aliases: ['matthewberman'] },
  { id: 'shawn-wang', name: 'Shawn Wang', type: 'person', aliases: ['swyx', 'swyxtv'] },
]);

const CORE_SHOWS = Object.freeze([
  { id: 'invest-like-the-best', name: 'Invest Like the Best', aliases: ["Invest Like the Best with Patrick O'Shaughnessy", 'Invest Like the Best with Patrick O’Shaughnessy'] },
  { id: 'acquired', name: 'Acquired', aliases: ['Acquired Podcast'] },
  { id: 'odd-lots', name: 'Odd Lots', aliases: ['Odd Lots Podcast'] },
  { id: '20vc', name: '20VC', aliases: ['The Twenty Minute VC', 'The 20VC'] },
  { id: 'no-priors', name: 'No Priors', aliases: ['No Priors: Artificial Intelligence'] },
  { id: 'dwarkesh', name: 'Dwarkesh Podcast', aliases: ['Dwarkesh Patel', 'Dwarkesh'] },
  { id: 'latent-space', name: 'Latent Space', aliases: ['Latent Space Podcast'] },
  { id: 'founders', name: 'Founders', aliases: ['Founders Podcast'] },
  { id: 'capital-allocators', name: 'Capital Allocators', aliases: ['Capital Allocators with Ted Seides'] },
  { id: 'a16z', name: 'a16z', aliases: ['a16z Podcast', 'Andreessen Horowitz'] },
  { id: 'training-data', name: 'Training Data / Sequoia', aliases: ['Training Data', 'Training Data by Sequoia Capital', 'Sequoia Capital'] },
]);

const PRIORITY_SHOWS = Object.freeze([
  { id: 'all-in', name: 'All-In Podcast', aliases: ['All-In', 'All In Podcast'] },
  { id: 'cognitive-revolution', name: 'The Cognitive Revolution', aliases: ['Cognitive Revolution'] },
  { id: 'hard-fork', name: 'Hard Fork', aliases: [] },
  { id: 'bg2', name: 'BG2Pod', aliases: ['BG2'] },
  { id: 'lex-fridman', name: 'Lex Fridman Podcast', aliases: ['Lex Fridman'] },
]);

const SOURCE_LABELS = Object.freeze({ core: '核心节目', priority: '优先节目', standard: '标准节目' });
const FIELD_ORDER = ['title', 'description', 'note', 'metadata'];

function normalize(value) {
  return String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
}
function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function exactAliasMatch(text, alias) {
  if (!text || !alias) return false;
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegex(alias)}(?=$|[^\\p{L}\\p{N}])`, 'iu').test(text);
}

function extractEntities(fields = {}) {
  const normalizedFields = Object.fromEntries(FIELD_ORDER.map(field => [field, normalize(fields[field])]));
  const found = [];
  for (const entity of ENTITY_REGISTRY) {
    const candidates = [entity.name, ...(entity.aliases || [])];
    let match = null;
    for (const field of FIELD_ORDER) {
      for (const alias of candidates) {
        if (exactAliasMatch(normalizedFields[field], normalize(alias))) {
          match = { alias, field };
          break;
        }
      }
      if (match) break;
    }
    if (match) found.push({
      id: entity.id, name: entity.name, type: entity.type, aliases: [...entity.aliases],
      confidence: normalize(match.alias) === normalize(entity.name) ? 'exact' : 'alias', evidenceField: match.field,
    });
  }
  return found;
}

function matchShow(show, entry) {
  const value = normalize(show);
  return [entry.name, ...(entry.aliases || [])].some(alias => {
    const candidate = normalize(alias);
    return value === candidate || exactAliasMatch(value, candidate);
  });
}
function classifySource(show, legacyTier = '') {
  const core = CORE_SHOWS.find(entry => matchShow(show, entry));
  if (core) return { sourceId: core.id, sourceName: core.name, tier: 'core', label: SOURCE_LABELS.core };
  const priority = PRIORITY_SHOWS.find(entry => matchShow(show, entry));
  if (priority || /tier\s*[ab]|priority|优先/i.test(String(legacyTier))) {
    return { sourceId: priority?.id || `source-${normalize(show).replace(/[^\p{L}\p{N}]+/gu, '-')}`, sourceName: priority?.name || show, tier: 'priority', label: SOURCE_LABELS.priority };
  }
  return { sourceId: `source-${normalize(show).replace(/[^\p{L}\p{N}]+/gu, '-')}`, sourceName: show || '未知节目', tier: 'standard', label: SOURCE_LABELS.standard };
}

function isComplete(value) { return normalize(value).length >= 60; }
function computeRouting(episode = {}) {
  const entities = episode.entities || [];
  const hasNote = ['note_ready', 'qc_passed'].includes(episode.productionStatus) || Number(episode.noteChars || 0) > 0;
  const hasTranscript = episode.transcriptStatus === 'ready' || episode.productionStatus === 'transcript_ready';
  const sparse = !isComplete(episode.description) && !isComplete(episode.whyItMatters);
  const lowInformation = !hasNote && !hasTranscript && entities.length === 0 && sparse && episode.sourceTier !== 'core' && episode.materiality !== 'high';
  const productionPoints = { new: 0, selected: 6, transcript_ready: 14, note_ready: 25, qc_passed: 30 }[episode.productionStatus] || 0;
  const materialityPoints = { high: 20, selective: 10, monitor: 3, unknown: 0 }[episode.materiality] || 0;
  const sourcePoints = { core: 15, priority: 8, standard: 0 }[episode.sourceTier] || 0;
  const score = productionPoints + materialityPoints + sourcePoints + Math.min(entities.length, 4) * 4 + (hasNote ? 8 : hasTranscript ? 4 : 0) + (isComplete(episode.description) ? 3 : 0) + (isComplete(episode.whyItMatters) ? 3 : 0);
  let reason;
  const names = entities.slice(0, 2).map(entity => entity.name).join(' / ');
  if (hasNote) reason = names ? `深度纪要完成 · 涉及 ${names}` : '深度纪要完成';
  else if (episode.sourceTier === 'core' && sparse) reason = '信息待补齐 · 核心节目保留';
  else if (episode.sourceTier === 'core' && episode.materiality === 'high') reason = '核心节目 · 高优先级候选';
  else if (names) reason = `涉及 ${names}`;
  else if (episode.materiality === 'high') reason = '高优先级候选';
  else if (hasTranscript) reason = '转录就绪 · 可进入研究';
  else reason = '等待研究资料补齐';
  return { label: '研究路由优先级', score, reason, routingScore: score, routingReason: reason, lowInformation, todayVisible: !lowInformation, informationPending: episode.sourceTier === 'core' && !hasNote && !hasTranscript && sparse };
}

module.exports = { ENTITY_REGISTRY, CORE_SHOWS, PRIORITY_SHOWS, SOURCE_LABELS, extractEntities, classifySource, computeRouting };
