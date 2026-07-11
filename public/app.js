const APP_BASE = location.pathname === '/podcast' || location.pathname.startsWith('/podcast/') ? '/podcast' : '';
const api = path => APP_BASE + path;
const app = document.querySelector('#app');
const pageTitle = document.querySelector('#pageTitle');
let state = null;
let loadError = false;
const filters = { status: '', materiality: '', q: '', date: '', show: '', theme: '' };

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
function tags(values) { return (values || []).slice(0, 3).map(value => `<span class="tag">${esc(value)}</span>`).join(''); }
function statusBadge(status) { const meta = statusMeta[status] || [status, 'neutral']; return `<span class="status ${meta[1]}"><i></i>${esc(meta[0])}</span>`; }
function empty(title, copy) { return `<section class="state-card"><h2>${esc(title)}</h2><p>${esc(copy)}</p></section>`; }
function sectionHead(title, aside = '') { return `<div class="section-head"><h2>${esc(title)}</h2>${aside ? `<span>${esc(aside)}</span>` : ''}</div>`; }
function episodeCard(episode, compact = false) {
  const desc = episode.whyItMatters || episode.description || (episode.artifactOnly ? '已识别到来源保真成品，但未匹配到候选记录。' : '尚无内容简介。');
  const actionLabel = episode.productionStatus === 'qc_passed' || episode.productionStatus === 'note_ready'
    ? '阅读深度纪要'
    : episode.productionStatus === 'transcript_ready'
      ? '查看转录资料'
      : '查看节目详情';
  return `<article class="episode-card ${compact ? 'compact' : ''}">
    <div class="card-kicker"><span>${esc(episode.show)}</span>${statusBadge(episode.productionStatus)}</div>
    <h3><a href="#/episode/${encodeURIComponent(episode.id)}">${esc(episode.title)}</a></h3>
    ${compact ? '' : `<p>${esc(desc)}</p>`}
    <div class="tag-row">${episode.materiality !== 'unknown' ? `<span class="tag priority">${esc(materialityLabels[episode.materiality] || episode.materiality)}</span>` : ''}${tags(episode.themes)}</div>
    <footer><span>${esc(dateText(episode.publishedAt || episode.dateDetected))}</span><a class="text-link" href="#/episode/${encodeURIComponent(episode.id)}">${actionLabel} <span aria-hidden="true">→</span></a></footer>
  </article>`;
}
function latestEpisodes() { const date = state.days[0]?.date; return state.episodes.filter(e => e.dateDetected === date); }

function renderToday() {
  const day = state.days[0];
  if (!day) return empty('还没有可用数据', '索引中尚未发现日期目录。');
  const today = latestEpisodes();
  const top = [...today].sort((a, b) => {
    const rank = { qc_passed: 5, note_ready: 4, transcript_ready: 3, selected: 2, new: 1 };
    return (rank[b.productionStatus] - rank[a.productionStatus]) || ((b.materiality === 'high') - (a.materiality === 'high'));
  }).slice(0, 4);
  const remaining = today.filter(e => !top.includes(e));
  return `<section class="today-intro">
    <div><p class="overline">${esc(day.date)} · 索引于 ${esc(new Date(state.generatedAt).toLocaleString('zh-CN'))}</p><h2>今天值得关注什么</h2><p>先看完成纪要与高优先级候选，再处理其余新节目。</p></div>
    <dl class="metric-grid"><div><dt>今日节目</dt><dd>${day.itemCount}</dd></div><div><dt>高优先级</dt><dd>${day.highMaterialityCount}</dd></div><div><dt>转录完成</dt><dd>${day.transcriptReadyCount}</dd></div><div><dt>深度纪要</dt><dd>${day.noteReadyCount}</dd></div></dl>
  </section>
  ${state.pipelineAlerts.length ? `<aside class="alert" role="status"><strong>流水线提醒</strong><span>${esc(state.pipelineAlerts.join('；'))}</span></aside>` : ''}
  ${sectionHead('今日首选阅读', `${top.length} 项`)}<div class="card-grid featured">${top.map(e => episodeCard(e)).join('')}</div>
  ${sectionHead('待处理收件箱', `${remaining.length} 项`)}${remaining.length ? `<div class="card-grid">${remaining.map(e => episodeCard(e, true)).join('')}</div>` : empty('今日收件箱已清空', '没有剩余候选。')}`;
}
function optionList(values, selected, placeholder) {
  return `<option value="">${esc(placeholder)}</option>${values.map(value => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(value)}</option>`).join('')}`;
}
function filterEpisodes(source) {
  const q = filters.q.trim().toLocaleLowerCase();
  return source.filter(e => (!filters.status || e.productionStatus === filters.status) && (!filters.materiality || e.materiality === filters.materiality) && (!filters.date || e.dateDetected === filters.date) && (!filters.show || e.show === filters.show) && (!filters.theme || e.themes.includes(filters.theme)) && (!q || [e.title, e.show, e.description, e.whyItMatters, ...(e.themes || [])].join(' ').toLocaleLowerCase().includes(q)));
}
function filterBar(showStatus = true) {
  const shows = [...new Set(state.episodes.map(e => e.show))].sort();
  return `<form class="filters" id="filterForm">
    <label class="search-field"><span class="sr-only">搜索</span><input type="search" name="q" value="${esc(filters.q)}" placeholder="搜索标题、节目、主题"></label>
    ${showStatus ? `<div class="chips" aria-label="生产状态"><button type="button" data-filter-status="" class="${!filters.status ? 'active' : ''}">全部</button>${Object.entries(statusMeta).map(([key, meta]) => `<button type="button" data-filter-status="${key}" class="${filters.status === key ? 'active' : ''}">${meta[0]}</button>`).join('')}</div>` : ''}
    <div class="select-row"><label>日期<select name="date">${optionList(state.days.map(d => d.date), filters.date, '全部日期')}</select></label><label>节目<select name="show">${optionList(shows, filters.show, '全部节目')}</select></label><label>主题<select name="theme">${optionList(state.themes.map(t => t.label), filters.theme, '全部主题')}</select></label><label>优先级<select name="materiality">${optionList(['high', 'selective', 'monitor'], filters.materiality, '全部优先级').replace(/>high</, '>高优先级<').replace(/>selective</, '>选择性关注<').replace(/>monitor</, '>持续观察<')}</select></label></div>
  </form>`;
}
function renderInbox() {
  const episodes = filterEpisodes(state.episodes);
  return `${filterBar(true)}${sectionHead('统一收件箱', `${episodes.length} 项`)}${episodes.length ? `<div class="card-grid">${episodes.map(e => episodeCard(e)).join('')}</div>` : empty('没有匹配的节目', '调整筛选条件后重试。')}`;
}
function renderLibrary() {
  const ready = state.episodes.filter(e => ['transcript_ready', 'note_ready', 'qc_passed'].includes(e.productionStatus));
  const episodes = filterEpisodes(ready);
  return `${filterBar(false)}${sectionHead('纪要与转录库', `${episodes.length} 项可读资料`)}${episodes.length ? `<div class="library-list">${episodes.map(e => `<article><div>${statusBadge(e.productionStatus)}<h2><a href="#/episode/${encodeURIComponent(e.id)}">${esc(e.title)}</a></h2><p>${esc(e.show)} · ${esc(dateText(e.publishedAt || e.dateDetected))}</p></div><div class="library-actions">${e.files.docx ? `<a href="${fileHref(e.id, 'docx')}">Word</a>` : ''}${e.files.markdown ? `<a href="${fileHref(e.id, 'markdown')}">Markdown</a>` : ''}${e.files.transcript ? `<a href="${fileHref(e.id, 'transcript')}">Transcript</a>` : ''}${e.originalUrl ? `<a href="${esc(e.originalUrl)}" target="_blank" rel="noreferrer">原始来源</a>` : ''}</div></article>`).join('')}</div>` : empty('纪要库为空', '当前筛选下没有已完成转录或深度纪要。')}`;
}
function renderThemes() {
  return `${sectionHead('研究主题', '规则标签，不代表投资结论')}<div class="theme-grid">${state.themes.map(theme => {
    const related = state.episodes.filter(e => e.themes.includes(theme.label)); const recent = related[0]; const shows = new Set(related.map(e => e.show)).size;
    return `<a class="theme-card" href="#/inbox" data-theme="${esc(theme.label)}"><span class="theme-count">${theme.count}</span><h2>${esc(theme.label)}</h2><p>${shows} 个节目来源${recent ? ` · 最近：${esc(recent.title)}` : ''}</p><span>查看相关节目 →</span></a>`;
  }).join('')}</div>`;
}
function renderShows() {
  return `${sectionHead('节目覆盖', `${state.sources.length} 个来源`)}<div class="show-list">${state.sources.map(show => `<article><div class="show-avatar">${esc(show.title.slice(0, 2).toUpperCase())}</div><div class="show-main"><h2>${esc(show.title)}</h2><p>${esc(show.tier)} · 最近扫描 ${esc(show.lastScanAt ? new Date(show.lastScanAt).toLocaleString('zh-CN') : '未记录')}</p><small>${show.latestEpisode ? `最近一期：${esc(show.latestEpisode)}` : '暂无本地节目记录'}</small></div><dl><div><dt>候选</dt><dd>${show.candidateCount}</dd></div><div><dt>纪要</dt><dd>${show.noteCount}</dd></div></dl><span class="health ${show.health === '正常' ? 'ok' : show.health === '待检查' ? 'warn' : ''}">${esc(show.health)}</span></article>`).join('')}</div>`;
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
      <article class="episode-detail"><header><div class="detail-meta">${statusBadge(e.productionStatus)}<span>${esc(e.show)}</span><span>${esc(dateText(e.publishedAt || e.dateDetected))}</span><span>${esc(materialityLabels[e.materiality] || '优先级未标注')}</span></div><h2>${esc(e.title)}</h2><div class="tag-row">${tags(e.themes)}</div></header>
      <section class="production"><h3>生产状态</h3>${stepper(e.productionStatus)}</section>
      <div class="detail-columns"><section><h3>为什么值得关注</h3><p>${esc(e.whyItMatters || e.description || '尚未提供价值说明。')}</p></section><section><h3>来源与转录边界</h3><p>${esc(e.transcriptBoundary || '来源边界尚未记录。')}</p></section></div>
      <div class="detail-actions">${e.originalUrl ? `<a class="button primary" href="${esc(e.originalUrl)}" target="_blank" rel="noreferrer">打开原始来源</a>` : ''}${e.audioUrl ? `<a class="button" href="${esc(e.audioUrl)}" target="_blank" rel="noreferrer">收听音频</a>` : ''}${e.files.docx ? `<a class="button" href="${fileHref(e.id, 'docx')}">下载 Word</a>` : ''}${e.files.transcript ? `<a class="button" href="${fileHref(e.id, 'transcript')}">下载转录</a>` : ''}</div></article>
      <div class="reading-layout"><article class="note"><div class="note-label">来源保真中文深度纪要</div>${e.noteMarkdown ? markdownToHtml(e.noteMarkdown) : empty('深度纪要尚未生成', '可先查看转录或原始来源。')}</article><aside><section><h3>QC 信息</h3>${e.qcPassed ? `<p>已发现 QC 成品记录。</p><dl class="qc-list">${Object.entries(e.qcSummary || {}).filter(([, value]) => typeof value !== 'object').map(([key, value]) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>` : '<p>尚无 QC 记录。</p>'}</section><section><h3>投资提取</h3>${e.investmentExtraction ? `<p>${esc(typeof e.investmentExtraction === 'string' ? e.investmentExtraction : JSON.stringify(e.investmentExtraction, null, 2))}</p>` : '<p>尚未生成。此区域不会用来源纪要自动冒充投资结论。</p>'}</section></aside></div>`;
    document.querySelector('#backButton').addEventListener('click', () => history.back());
  } catch (_) { app.innerHTML = empty('无法读取节目', '请返回列表后重试。'); }
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
  const renderers = { today: ['今日', renderToday], inbox: ['收件箱', renderInbox], library: ['纪要库', renderLibrary], themes: ['主题', renderThemes], shows: ['节目', renderShows] };
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
