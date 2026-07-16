const APP_BASE = location.pathname === '/podcast' || location.pathname.startsWith('/podcast/') ? '/podcast' : '';
const api = value => APP_BASE + value;
const app = document.querySelector('#app');
const pageTitle = document.querySelector('#pageTitle');
let state = null;
let loadError = false;
let searchValue = '';

const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const route = () => {
  const parts = (location.hash.replace(/^#\/?/, '') || 'today').split('/').map(decodeURIComponent);
  return { name: parts[0], id: parts.slice(1).join('/') };
};
const dateText = value => {
  const date = String(value || '').match(/\d{4}-\d{2}-\d{2}/)?.[0];
  return date ? new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(`${date}T00:00:00Z`)) : '';
};
const statusLabels = { discovered: '已发现', transcript_ready: '转录就绪', note_ready: '待 QC', qc_passed: 'QC 通过' };
function statusBadge(episode) {
  const tone = episode.readerReady ? 'green' : episode.transcriptReady ? 'amber' : episode.canonicalNoteAvailable ? 'blue' : 'neutral';
  return `<span class="status ${tone}"><i></i>${esc(statusLabels[episode.productionStatus] || episode.productionStatus)}</span>`;
}
function empty(title, body) { return `<section class="state-card"><h2>${esc(title)}</h2><p>${esc(body)}</p></section>`; }
function sectionHead(title, aside = '') { return `<div class="section-head"><h2>${esc(title)}</h2>${aside ? `<span>${esc(aside)}</span>` : ''}</div>`; }
function updateNavigation(name) {
  const active = name === 'episode' ? 'library' : name === 'show' ? 'shows' : name;
  document.querySelectorAll('[data-route]').forEach(link => {
    const selected = link.dataset.route === active; link.classList.toggle('active', selected);
    if (selected) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
}
function episodeCard(episode) {
  return `<article class="episode-card"><div class="card-kicker"><span>${esc(episode.show)}</span>${statusBadge(episode)}</div>
    <h3><a href="#/episode/${encodeURIComponent(episode.id)}">${esc(episode.title)}</a></h3>
    ${episode.whyItMatters || episode.description ? `<p>${esc(episode.whyItMatters || episode.description)}</p>` : ''}
    <footer><span>${esc(dateText(episode.publishedDate || episode.publishedAt))}</span><a class="text-link" href="#/episode/${encodeURIComponent(episode.id)}">阅读全文 →</a></footer></article>`;
}
function catalogRow(episode) {
  const title = episode.readerReady ? `<a href="#/episode/${encodeURIComponent(episode.id)}">${esc(episode.title)}</a>` : esc(episode.title);
  const reasons = (episode.blockReasons || []).slice(0, 3).map(reason => `<span class="reason-code">${esc(reason)}</span>`).join('');
  return `<article class="catalog-row ${episode.readerReady ? 'ready' : 'blocked'}"><div><div class="card-kicker"><span>${esc(episode.show)}</span>${statusBadge(episode)}</div>
    <h2>${title}</h2><p>${esc(dateText(episode.publishedDate))}${episode.transcriptReady ? ' · 转录可用' : ''}${episode.canonicalNoteAvailable ? ' · 纪要可用' : ''}</p>${reasons ? `<div class="reason-row">${reasons}</div>` : ''}</div>
    ${episode.readerReady ? `<a class="text-link" href="#/episode/${encodeURIComponent(episode.id)}">阅读 →</a>` : '<span class="blocked-label">不可点击 · 等待生产</span>'}</article>`;
}
function renderToday() {
  const latest = state.episodes.slice(0, 6); const totals = state.coverage.totals;
  return `<section class="today-intro"><div><p class="overline">LIBRARY-READY-V2 · ${esc(new Date(state.generatedAt).toLocaleString('zh-CN'))}</p>
    <h2>播客研究数据库</h2><p>QC 精选阅读只包含来源边界、研究价值与正文均完整的纪要；未完成节目不会产生空详情页。</p></div>
    <dl class="metric-grid"><div><dt>纪要库</dt><dd>${state.audit.ready}</dd></div><div><dt>官方节目</dt><dd>${totals.officialEpisodes}</dd></div><div><dt>转录覆盖</dt><dd>${totals.transcriptReady}</dd></div><div><dt>生产队列</dt><dd>${totals.queued}</dd></div></dl></section>
    ${sectionHead('最新完整纪要', `${state.libraryTotal} 篇可读`)}${latest.length ? `<div class="card-grid">${latest.map(episodeCard).join('')}</div>` : empty('暂无完整纪要', '完成确定性 QC 后才会出现在这里。')}`;
}
function filteredLibrary() {
  const query = searchValue.trim().toLocaleLowerCase();
  return state.episodes.filter(episode => !query || [episode.title, episode.show, episode.description, episode.whyItMatters].join(' ').toLocaleLowerCase().includes(query));
}
function renderLibrary() {
  const episodes = filteredLibrary();
  return `<form class="filters" id="librarySearch"><label class="search-field"><span class="sr-only">搜索纪要</span><input type="search" value="${esc(searchValue)}" placeholder="搜索嘉宾、节目或纪要主题"></label></form>
    ${sectionHead('纪要库', `${episodes.length} 篇 · 全部通过 QC`)}${episodes.length ? `<div class="library-list">${episodes.map(episode => `<article><div>${statusBadge(episode)}<h2><a href="#/episode/${encodeURIComponent(episode.id)}">${esc(episode.title)}</a></h2><p>${esc(episode.show)} · ${esc(dateText(episode.publishedDate))} · ${episode.noteChars.toLocaleString()} 字符</p></div><a class="text-link" href="#/episode/${encodeURIComponent(episode.id)}">阅读全文 →</a></article>`).join('')}</div>` : empty('没有匹配纪要', '换一个关键词试试。')}`;
}
async function renderCatalog() {
  if (!state.privateMode) { location.hash = '#/library'; return; }
  app.innerHTML = '<div class="state-card" role="status">正在读取全部节目…</div>';
  const response = await fetch(api('/api/catalog?since=2026-07-01&limit=200'));
  if (!response.ok) { app.innerHTML = empty('全部节目不可用', '该视图只在私有产品启用。'); return; }
  const catalog = await response.json();
  app.innerHTML = `${sectionHead('全部节目', `${catalog.total} 集 · 未完成行不可点击`)}<div class="catalog-list">${catalog.episodes.map(catalogRow).join('')}</div>`;
}
function renderCoverage() {
  const coverage = state.coverage;
  return `<section class="coverage-summary"><div><span>起始日期</span><strong>${esc(coverage.since)}</strong></div><div><span>官方节目</span><strong>${coverage.totals.officialEpisodes}</strong></div>
    <div><span>纪要就绪</span><strong>${coverage.totals.noteReady}</strong></div><div><span>转录就绪</span><strong>${coverage.totals.transcriptReady}</strong></div>
    <div><span>QC 就绪</span><strong>${coverage.totals.qcReady}</strong></div><div><span>待生产</span><strong>${coverage.totals.queued}</strong></div></section>
    ${sectionHead('按节目覆盖', `${coverage.shows.length} 个监控源`)}<div class="coverage-table-wrap"><table class="coverage-table"><thead><tr><th>节目</th><th>官方</th><th>转录</th><th>纪要</th><th>QC</th><th>队列</th><th>别名合并</th></tr></thead><tbody>
    ${coverage.shows.map(show => `<tr><th><a href="#/show/${encodeURIComponent(show.id)}">${esc(show.show)}</a></th><td>${show.officialEpisodes}</td><td>${show.transcriptReady}</td><td>${show.noteReady}</td><td>${show.qcReady}</td><td>${show.queued}</td><td>${show.candidateAliasesMerged}</td></tr>`).join('')}</tbody></table></div>`;
}
function renderShows() {
  return `${sectionHead('节目', `${state.shows.length} 个来源`)}<div class="show-list">${state.shows.map(show => `<article><div class="show-avatar">${esc(show.name.slice(0, 2).toUpperCase())}</div>
    <div class="show-main"><h2><a href="#/show/${encodeURIComponent(show.id)}">${esc(show.name)}</a></h2><p>${esc(show.tier)}</p></div><dl><div><dt>完整纪要</dt><dd>${show.readyCount}</dd></div>${state.privateMode ? `<div><dt>目录</dt><dd>${show.catalogCount}</dd></div>` : ''}</dl><a class="text-link" href="#/show/${encodeURIComponent(show.id)}">查看 →</a></article>`).join('')}</div>`;
}
async function renderShow(id) {
  app.innerHTML = '<div class="state-card" role="status">正在读取节目资料…</div>';
  const response = await fetch(api(`/api/shows/${encodeURIComponent(id)}`));
  if (!response.ok) { app.innerHTML = empty('节目不存在', '没有找到这个节目。'); return; }
  const show = await response.json();
  app.innerHTML = `<a class="back-link" href="#/shows">← 返回节目</a><section class="episode-detail"><p class="overline">${esc(show.tier)}</p><h2>${esc(show.name)}</h2>
    <p class="muted">${show.counts.ready} 篇完整纪要${state.privateMode ? ` · ${show.counts.catalog} 集目录记录` : ''}</p></section>
    ${sectionHead('完整纪要', `${show.readyNotes.length} 篇`)}${show.readyNotes.length ? `<div class="card-grid">${show.readyNotes.map(episodeCard).join('')}</div>` : empty('暂无完整纪要', '该节目还没有通过 QC 的纪要。')}
    ${state.privateMode && show.catalog.some(episode => !episode.readerReady) ? `${sectionHead('未完成节目', '仅元数据，不可点击')}<div class="catalog-list">${show.catalog.filter(episode => !episode.readerReady).map(catalogRow).join('')}</div>` : ''}`;
}
function markdownToHtml(markdown) {
  const inline = value => esc(value).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  const lines = String(markdown || '').split(/\r?\n/); let result = ''; let paragraph = []; let list = false;
  const flush = () => { if (paragraph.length) { result += `<p>${paragraph.map(inline).join('<br>')}</p>`; paragraph = []; } };
  const closeList = () => { if (list) { result += '</ul>'; list = false; } };
  for (const line of lines) {
    const heading = line.match(/^(#{1,4})\s+(.+)/); const bullet = line.match(/^\s*[-*]\s+(.+)/);
    if (heading) { flush(); closeList(); const level = Math.min(heading[1].length + 1, 5); result += `<h${level}>${inline(heading[2])}</h${level}>`; }
    else if (bullet) { flush(); if (!list) { result += '<ul>'; list = true; } result += `<li>${inline(bullet[1])}</li>`; }
    else if (!line.trim()) { flush(); closeList(); }
    else if (/^---+$/.test(line.trim())) { flush(); closeList(); result += '<hr>'; }
    else paragraph.push(line);
  }
  flush(); closeList(); return result;
}
async function renderEpisode(id) {
  app.innerHTML = '<div class="state-card" role="status">正在读取完整纪要…</div>';
  const response = await fetch(api(`/api/episodes/${encodeURIComponent(id)}`));
  if (!response.ok) { app.innerHTML = empty('内容不存在或尚未通过 QC', '未完成节目没有可点击详情页。'); return; }
  const episode = await response.json();
  const versions = episode.noteVersions.map(version => `<li><strong>${esc(version.versionLabel)}</strong> · ${version.charCount.toLocaleString()} 字符${version.canonical ? ' · canonical' : ' · superseded'}</li>`).join('');
  const artifacts = episode.artifacts.filter(artifact => ['docx', 'pdf', 'note_md'].includes(artifact.type)).map(artifact => `<a class="button" href="${api(artifact.downloadUrl)}">下载 ${esc(artifact.type.toUpperCase())}</a>`).join('');
  const claims = episode.claims.length ? `<section><h3>Claim ledger</h3><ul class="claim-list">${episode.claims.slice(0, 30).map(claim => `<li><strong>${esc(claim.speaker)}</strong>${claim.timestamp ? ` · ${esc(claim.timestamp)}` : ''}<p>${esc(claim.claim)}</p>${claim.implication ? `<small>${esc(claim.implication)}</small>` : ''}</li>`).join('')}</ul></section>` : '';
  app.innerHTML = `<a class="back-link" href="#/library">← 返回纪要库</a><article class="episode-detail"><header><div class="detail-meta">${statusBadge(episode)}<span>${esc(episode.show)}</span><span>${esc(dateText(episode.publishedDate))}</span></div><h2>${esc(episode.title)}</h2></header>
    <div class="detail-columns"><section><h3>为什么值得关注</h3><p>${esc(episode.whyItMatters)}</p></section><section><h3>来源与转录边界</h3><p>${esc(episode.sourceBoundary)}</p></section></div>
    <div class="tag-row">${episode.entities.map(entity => `<span class="tag entity ${esc(entity.type)}">${esc(entity.name)}</span>`).join('')}${episode.themes.map(theme => `<span class="tag theme">${esc(theme.name)}</span>`).join('')}</div>
    <div class="detail-actions"><a class="button primary" href="${esc(episode.originalUrl)}" target="_blank" rel="noreferrer">打开官方来源</a>${artifacts}</div></article>
    <div class="reading-layout"><article class="note"><div class="note-label">完整来源保真纪要 · ${episode.noteChars.toLocaleString()} 字符</div>${markdownToHtml(episode.noteMarkdown)}</article>
    <aside><section><h3>版本来源</h3><ul class="version-list">${versions}</ul></section>${claims}</aside></div>`;
}
function bindLibrarySearch() {
  const input = document.querySelector('#librarySearch input'); if (!input) return;
  input.addEventListener('input', () => { searchValue = input.value; app.innerHTML = renderLibrary(); bindLibrarySearch(); const next = document.querySelector('#librarySearch input'); next.focus(); next.setSelectionRange(next.value.length, next.value.length); });
}
async function renderRoute() {
  const current = route(); updateNavigation(current.name);
  if (!state) {
    pageTitle.textContent = 'Podcast Intelligence';
    app.innerHTML = loadError ? empty('无法加载研究库', '数据库暂时不可用。') : '<div class="state-card" role="status">正在读取播客研究数据库…</div>'; return;
  }
  document.querySelectorAll('[data-private]').forEach(element => { element.hidden = !state.privateMode; });
  const titles = { today: '今日', library: '纪要库', catalog: '全部节目', coverage: '覆盖率', shows: '节目', show: '节目详情', episode: '纪要详情' };
  pageTitle.textContent = titles[current.name] || '今日';
  if (current.name === 'catalog') return renderCatalog();
  if (current.name === 'show') return renderShow(current.id);
  if (current.name === 'episode') return renderEpisode(current.id);
  const renderers = { today: renderToday, library: renderLibrary, coverage: renderCoverage, shows: renderShows };
  app.innerHTML = (renderers[current.name] || renderToday)();
  if (current.name === 'library') bindLibrarySearch();
  window.scrollTo({ top: 0, behavior: 'instant' });
}
async function load() {
  state = null; loadError = false; await renderRoute();
  try { const response = await fetch(api('/api/state')); if (!response.ok) throw new Error(); state = await response.json(); await renderRoute(); }
  catch (_) { loadError = true; await renderRoute(); }
}

window.addEventListener('hashchange', () => renderRoute());
document.querySelector('#refreshButton').addEventListener('click', load);
load();
