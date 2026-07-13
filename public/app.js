const APP_BASE = location.pathname === '/podcast' || location.pathname.startsWith('/podcast/') ? '/podcast' : '';
const api = path => APP_BASE + path;
const app = document.querySelector('#app');
const pageTitle = document.querySelector('#pageTitle');
let state = null;
let loadError = false;
const filters = { status: '', materiality: '', q: '', date: '', show: '', theme: '', entity: '', sourceTier: '', lowInformation: '' };

const statusMeta = {
  new: ['仅发现', 'neutral'], selected: ['已选中', 'violet'], transcript_ready: ['转录就绪', 'amber'], note_ready: ['深度纪要', 'blue'], qc_passed: ['QC 通过', 'green'],
};
const materialityLabels = { high: '高优先级', selective: '选择性关注', monitor: '持续观察', unknown: '未标注' };
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const labelStatus = status => statusMeta[status]?.[0] || status;
const route = () => {
  const parts = (location.hash.replace(/^#\/?/, '') || 'today').split('/').map(decodeURIComponent);
  return { name: parts[0], id: parts.slice(1).join('/') };
};
const dateText = value => {
  if (!value) return '日期未标注';
  const day = String(value).match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (!day) return String(value);
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${day}T00:00:00Z`));
};
const fileHref = (id, kind) => api(`/api/episodes/${encodeURIComponent(id)}/files/${kind}`);

function updateNavigation(name) {
  const active = name === 'episode' ? '' : name;
  document.querySelectorAll('[data-route]').forEach(link => {
    const selected = link.dataset.route === active;
    link.classList.toggle('active', selected);
    if (selected) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
}
function themeTags(values) {
  const clean = (values || []).filter(value => value !== 'General'); const shown = clean.slice(0, 2);
  return shown.map(value => `<span class="tag theme">${esc(value)}</span>`).join('') + (clean.length > shown.length ? `<span class="tag-overflow">+${clean.length - shown.length}</span>` : '');
}
function entityTags(values, limit = 3) {
  const shown = (values || []).slice(0, limit);
  return shown.map(entity => `<span class="tag entity ${entity.type === 'person' ? 'person' : 'company'}">${esc(entity.name)}</span>`).join('') + ((values || []).length > shown.length ? `<span class="tag-overflow">+${values.length - shown.length}</span>` : '');
}
function statusBadge(status) { const meta = statusMeta[status] || [status, 'neutral']; return `<span class="status ${meta[1]}"><i></i>${esc(meta[0])}</span>`; }
function empty(title, copy) { return `<section class="state-card"><h2>${esc(title)}</h2><p>${esc(copy)}</p></section>`; }
function sectionHead(title, aside = '') { return `<div class="section-head"><h2>${esc(title)}</h2>${aside ? `<span>${esc(aside)}</span>` : ''}</div>`; }
function episodeCard(episode, compact = false, showRouting = false) {
  const desc = episode.whyItMatters;
  const actionLabel = '阅读深度纪要';
  return `<article class="episode-card ${compact ? 'compact' : ''}">
    <div class="card-kicker"><span>${esc(episode.show)}</span>${statusBadge(episode.productionStatus)}</div>
    <h3><a href="#/episode/${encodeURIComponent(episode.id)}">${esc(episode.title)}</a></h3>
    ${compact ? '' : `<p>${esc(desc)}</p>`}
    <div class="tag-row">${entityTags(episode.entities)}${themeTags(episode.themes)}</div>
    ${showRouting ? `<p class="routing-reason"><strong>${esc(episode.routingLabel || '研究路由优先级')}</strong> · ${esc(episode.routingReason)}</p>` : ''}
    <footer><span>${esc(dateText(episode.publishedAt || episode.dateDetected))}</span><a class="text-link" href="#/episode/${encodeURIComponent(episode.id)}">${actionLabel} <span aria-hidden="true">→</span></a></footer>
  </article>`;
}
function latestEpisodes() { const date = state.days[0]?.date; return state.episodes.filter(e => e.dateDetected === date); }

function renderToday() {
  const day = state.days[0];
  if (!day) return empty('当前没有 QC 通过的阅读内容', '只有来源纪要、边界、价值说明与 QC 均完整的节目才会在这里发布。');
  const today = latestEpisodes();
  const ordered = [...today].sort((a, b) => b.routingScore - a.routingScore || a.title.localeCompare(b.title));
  const top = ordered.slice(0, 4);
  const remaining = ordered.slice(4);
  return `<section class="today-intro">
    <div><p class="overline">${esc(day.date)} · 校验于 ${esc(new Date(state.generatedAt).toLocaleString('zh-CN'))}</p><h2>最新 QC 精选阅读</h2><p>这里只发布内容完整、来源边界明确且通过确定性质量门的深度纪要。</p></div>
    <dl class="metric-grid"><div><dt>精选阅读</dt><dd>${day.itemCount}</dd></div><div><dt>高优先级</dt><dd>${day.highMaterialityCount}</dd></div><div><dt>来源边界完整</dt><dd>${day.transcriptReadyCount}</dd></div><div><dt>QC 通过</dt><dd>${day.qcPassedCount}</dd></div></dl>
  </section>
  ${state.pipelineAlerts.length ? `<aside class="alert" role="status"><strong>流水线提醒</strong><span>${esc(state.pipelineAlerts.join('；'))}</span></aside>` : ''}
  ${sectionHead('首选阅读', `${top.length} 项 · 全部通过内容完整性 QC`)}<div class="card-grid featured">${top.map(e => episodeCard(e, false, true)).join('')}</div>
  ${remaining.length ? `${sectionHead('更多完整纪要', `${remaining.length} 项`)}<div class="card-grid">${remaining.map(e => episodeCard(e, true)).join('')}</div>` : ''}`;
}
function optionList(values, selected, placeholder) {
  return `<option value="">${esc(placeholder)}</option>${values.map(value => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(value)}</option>`).join('')}`;
}
function filterEpisodes(source) {
  const q = filters.q.trim().toLocaleLowerCase();
  return source.filter(e => (!filters.status || e.productionStatus === filters.status) && (!filters.materiality || e.materiality === filters.materiality) && (!filters.date || e.dateDetected === filters.date) && (!filters.show || e.show === filters.show) && (!filters.theme || e.themes.includes(filters.theme)) && (!filters.entity || e.entities.some(entity => entity.id === filters.entity)) && (!filters.sourceTier || e.sourceTier === filters.sourceTier) && (!filters.lowInformation || String(e.lowInformation) === filters.lowInformation) && (!q || [e.title, e.show, e.description, e.whyItMatters, ...(e.themes || []), ...e.entities.map(entity => entity.name)].join(' ').toLocaleLowerCase().includes(q)));
}
function filterBar(showStatus = true) {
  const shows = [...new Set(state.episodes.map(e => e.show))].sort();
  return `<form class="filters" id="filterForm">
    <label class="search-field"><span class="sr-only">搜索</span><input type="search" name="q" value="${esc(filters.q)}" placeholder="搜索标题、节目、实体或主题"></label>
    ${showStatus ? `<div class="chips" aria-label="生产状态"><button type="button" data-filter-status="" class="${!filters.status ? 'active' : ''}">全部</button>${Object.entries(statusMeta).map(([key, meta]) => `<button type="button" data-filter-status="${key}" class="${filters.status === key ? 'active' : ''}">${meta[0]}</button>`).join('')}</div>` : ''}
    <div class="select-row"><label>日期<select name="date">${optionList(state.days.map(d => d.date), filters.date, '全部日期')}</select></label><label>节目<select name="show">${optionList(shows, filters.show, '全部节目')}</select></label><label>实体<select name="entity">${optionList(state.entities.map(e => e.id), filters.entity, '全部公司与人物').replace(/<option value="([^"]+)"([^>]*)>\1<\/option>/g, (match, id, attrs) => `<option value="${esc(id)}"${attrs}>${esc(state.entities.find(entity => entity.id === id)?.name || id)}</option>`)}</select></label><label>来源层级<select name="sourceTier">${optionList(['core', 'priority', 'standard'], filters.sourceTier, '全部来源').replace(/>core</, '>核心节目<').replace(/>priority</, '>优先节目<').replace(/>standard</, '>标准节目<')}</select></label><label>主题<select name="theme">${optionList(state.themes.map(t => t.label), filters.theme, '全部主题')}</select></label><label>优先级<select name="materiality">${optionList(['high', 'selective', 'monitor'], filters.materiality, '全部优先级').replace(/>high</, '>高优先级<').replace(/>selective</, '>选择性关注<').replace(/>monitor</, '>持续观察<')}</select></label></div>
  </form>`;
}
function renderInbox() {
  const episodes = filterEpisodes(state.episodes);
  return `${filterBar(false)}${sectionHead('QC 精选阅读', `${episodes.length} 项`)}${episodes.length ? `<div class="card-grid">${episodes.map(e => episodeCard(e)).join('')}</div>` : empty('没有匹配的精选内容', '当前筛选条件下没有通过完整性 QC 的节目。')}`;
}
function renderLibrary() {
  const episodes = filterEpisodes(state.episodes);
  return `${filterBar(false)}${sectionHead('QC 纪要库', `${episodes.length} 项完整资料`)}${episodes.length ? `<div class="library-list">${episodes.map(e => `<article><div>${statusBadge(e.productionStatus)}<h2><a href="#/episode/${encodeURIComponent(e.id)}">${esc(e.title)}</a></h2><p>${esc(e.show)} · ${esc(dateText(e.publishedAt || e.dateDetected))}</p></div><div class="library-actions">${e.files.docx ? `<a href="${fileHref(e.id, 'docx')}">Word</a>` : ''}${e.files.markdown ? `<a href="${fileHref(e.id, 'markdown')}">Markdown</a>` : ''}${e.files.transcript ? `<a href="${fileHref(e.id, 'transcript')}">Transcript</a>` : ''}<a href="${esc(e.originalUrl)}" target="_blank" rel="noreferrer">原始来源</a></div></article>`).join('')}</div>` : empty('没有匹配的完整纪要', '当前筛选条件下没有通过完整性 QC 的资料。')}`;
}
function renderThemes() {
  if (!state.themes.length) return empty('当前没有可展示主题', '主题只从通过完整性 QC 的阅读内容中生成。');
  return `${sectionHead('研究主题', '仅统计 QC 通过内容；规则标签不代表投资结论')}<div class="theme-grid">${state.themes.map(theme => {
    const related = state.episodes.filter(e => e.themes.includes(theme.label)); const recent = related[0]; const shows = new Set(related.map(e => e.show)).size;
    return `<a class="theme-card" href="#/inbox" data-theme="${esc(theme.label)}"><span class="theme-count">${theme.count}</span><h2>${esc(theme.label)}</h2><p>${shows} 个节目来源${recent ? ` · 最近：${esc(recent.title)}` : ''}</p><span>查看相关节目 →</span></a>`;
  }).join('')}</div>`;
}
function renderShows() {
  return `${sectionHead('节目覆盖', `${state.sources.length} 个来源 · 仅统计 QC 通过内容`)}<p class="source-prior-note">来源层级仅作为研究路由先验，不代表单集内容质量；未完成发现不会显示为节目内容。</p><div class="show-list">${state.sources.map(show => `<article><div class="show-avatar">${esc(show.title.slice(0, 2).toUpperCase())}</div><div class="show-main"><h2>${esc(show.title)}</h2><p><span class="source-tier ${esc(show.sourceTier)}">${esc(show.sourceQualityLabel)}</span> · 最近扫描 ${esc(show.lastScanAt ? new Date(show.lastScanAt).toLocaleString('zh-CN') : '未记录')}</p><small>${show.latestEpisode ? `最近 QC 纪要：${esc(show.latestEpisode)}` : '暂无 QC 通过纪要'}</small></div><dl><div><dt>已发布</dt><dd>${show.episodeCount}</dd></div><div><dt>完整纪要</dt><dd>${show.noteCount}</dd></div></dl><span class="health ${show.health === '正常' ? 'ok' : show.health === '待检查' ? 'warn' : ''}">${esc(show.health)}</span></article>`).join('')}</div>`;
}

function markdownToHtml(markdown) {
  const inline = value => {
    const links = [];
    let result = esc(value).replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_, label, url) => { links.push(`<a href="${url}" target="_blank" rel="noreferrer">${label}</a>`); return `@@LINK${links.length - 1}@@`; });
    result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noreferrer">$1</a>');
    return result.replace(/@@LINK(\d+)@@/g, (_, index) => links[Number(index)]);
  };
  const lines = String(markdown || '').split(/\r?\n/); let html = ''; let list = false; let paragraph = [];
  const flushParagraph = () => { if (paragraph.length) { html += `<p>${paragraph.map(inline).join('<br>')}</p>`; paragraph = []; } };
  const closeList = () => { if (list) { html += '</ul>'; list = false; } };
  for (const line of lines) {
    const heading = line.match(/^(#{1,3})\s+(.+)/); const bullet = line.match(/^\s*[-*]\s+(.+)/);
    if (heading) { flushParagraph(); closeList(); const level = heading[1].length + 1; html += `<h${level}>${inline(heading[2])}</h${level}>`; }
    else if (bullet) { flushParagraph(); if (!list) { html += '<ul>'; list = true; } html += `<li>${inline(bullet[1])}</li>`; }
    else if (!line.trim()) { flushParagraph(); closeList(); }
    else if (/^---+$/.test(line.trim())) { flushParagraph(); closeList(); html += '<hr>'; }
    else paragraph.push(line);
  }
  flushParagraph(); closeList(); return html;
}
function stepper(status) {
  const steps = [['new', '发现'], ['transcript_ready', '转录'], ['note_ready', '纪要'], ['qc_passed', 'QC']]; const rank = { new: 0, selected: 0, transcript_ready: 1, note_ready: 2, qc_passed: 3 }[status] ?? 0;
  return `<ol class="stepper">${steps.map(([key, label], index) => `<li class="${index <= rank ? 'done' : ''}" ${key === status ? 'aria-current="step"' : ''}><i>${index < rank ? '✓' : index + 1}</i><span>${label}</span></li>`).join('')}</ol>`;
}
async function renderEpisode(id) {
  pageTitle.textContent = '节目详情'; app.innerHTML = '<div class="state-card" role="status">正在读取完整纪要…</div>';
  try {
    const response = await fetch(api(`/api/episodes/${encodeURIComponent(id)}`));
    if (!response.ok) throw new Error();
    const e = await response.json();
    app.innerHTML = `<button class="back-link quiet-button" id="backButton" type="button">← 返回</button>
      <article class="episode-detail"><header><div class="detail-meta">${statusBadge(e.productionStatus)}<span>${esc(e.show)}</span><span>${esc(e.sourceQualityLabel)}</span><span>${esc(dateText(e.publishedAt || e.dateDetected))}</span>${materialityLabels[e.materiality] && e.materiality !== 'unknown' ? `<span>${esc(materialityLabels[e.materiality])}</span>` : ''}</div><h2>${esc(e.title)}</h2><div class="tag-row">${entityTags(e.entities)}${themeTags(e.themes)}</div></header>
      <div class="detail-columns"><section><h3>为什么值得关注</h3><p>${esc(e.whyItMatters)}</p></section><section><h3>来源与转录边界</h3><p>${esc(e.transcriptBoundary)}</p></section></div>
      ${e.entities.length ? `<section class="entity-section"><h3>关键公司与人物</h3><div class="entity-groups">${e.entities.some(entity => entity.type !== 'person') ? `<div><strong>公司 / 组织 / 资产</strong><div class="tag-row">${entityTags(e.entities.filter(entity => entity.type !== 'person'), Number.POSITIVE_INFINITY)}</div></div>` : ''}${e.entities.some(entity => entity.type === 'person') ? `<div><strong>人物</strong><div class="tag-row">${entityTags(e.entities.filter(entity => entity.type === 'person'), Number.POSITIVE_INFINITY)}</div></div>` : ''}</div><p class="evidence-boundary">实体来自标题、简介、元数据或来源保真纪要中的确定文本匹配，不代表背书、持仓或投资建议。</p></section>` : ''}
      <div class="detail-actions">${e.originalUrl ? `<a class="button primary" href="${esc(e.originalUrl)}" target="_blank" rel="noreferrer">打开原始来源</a>` : ''}${e.audioUrl ? `<a class="button" href="${esc(e.audioUrl)}" target="_blank" rel="noreferrer">收听音频</a>` : ''}${e.files.docx ? `<a class="button" href="${fileHref(e.id, 'docx')}">下载 Word</a>` : ''}${e.files.transcript ? `<a class="button" href="${fileHref(e.id, 'transcript')}">下载转录</a>` : ''}</div></article>
      <div class="reading-layout"><article class="note"><div class="note-label">来源保真中文深度纪要</div>${markdownToHtml(e.noteMarkdown)}</article><aside><section><h3>QC 信息</h3><p>已通过内容完整性质量门（${esc(e.publicationQc.gateVersion)}）。</p><dl class="qc-list">${Object.entries(e.qcSummary || {}).filter(([, value]) => typeof value !== 'object').map(([key, value]) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl></section>${e.investmentExtraction ? `<section><h3>投资提取</h3><p>${esc(typeof e.investmentExtraction === 'string' ? e.investmentExtraction : JSON.stringify(e.investmentExtraction, null, 2))}</p></section>` : ''}</aside></div>`;
    document.querySelector('#backButton').addEventListener('click', () => history.back());
  } catch (_) { app.innerHTML = empty('内容不存在或尚未通过 QC', '该链接没有可公开阅读的完整纪要，请返回精选阅读列表。'); }
}

function bindFilters() {
  const form = document.querySelector('#filterForm'); if (!form) return;
  form.addEventListener('change', event => { if (event.target.name) { filters[event.target.name] = event.target.value; renderRoute(); } });
  const search = form.querySelector('input[name="q"]'); let timer;
  search?.addEventListener('input', () => { filters.q = search.value; clearTimeout(timer); timer = setTimeout(() => { renderRoute(); const next = document.querySelector('input[name="q"]'); next?.focus(); next?.setSelectionRange(next.value.length, next.value.length); }, 180); });
  form.querySelectorAll('[data-filter-status]').forEach(button => button.addEventListener('click', () => { filters.status = button.dataset.filterStatus; renderRoute(); }));
}
function renderRoute() {
  const current = route(); updateNavigation(current.name);
  if (!state) {
    pageTitle.textContent = 'Podcast Intelligence';
    app.innerHTML = loadError ? '<section class="state-card"><h2>无法加载收件箱</h2><p>服务暂时不可用，请稍后重试。</p><button class="button" id="retryButton">重试</button></section>' : '<div class="state-card" role="status">正在建立研究收件箱…</div>';
    document.querySelector('#retryButton')?.addEventListener('click', () => load(true)); return;
  }
  const renderers = { today: ['今日', renderToday], inbox: ['精选阅读', renderInbox], library: ['纪要库', renderLibrary], themes: ['主题', renderThemes], shows: ['节目', renderShows] };
  if (current.name === 'episode') return renderEpisode(current.id);
  const selected = renderers[current.name] || renderers.today; pageTitle.textContent = selected[0]; app.innerHTML = selected[1](); bindFilters();
  document.querySelectorAll('[data-theme]').forEach(link => link.addEventListener('click', () => { filters.theme = link.dataset.theme; }));
  window.scrollTo({ top: 0, behavior: 'instant' });
}
async function load(refresh = false) {
  state = null; loadError = false; renderRoute();
  try {
    const response = await fetch(api(`/api/state${refresh ? '?refresh=1' : ''}`)); if (!response.ok) throw new Error(); state = await response.json(); renderRoute();
  } catch (_) { loadError = true; renderRoute(); }
}
window.addEventListener('hashchange', renderRoute);
document.querySelector('#refreshButton').addEventListener('click', () => load(true));
load();
