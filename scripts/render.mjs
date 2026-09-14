export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const SITE_BASE_PATH = '/pportfolio';
export function mediaPath(value) {
  if (!value) return '';
  const publicPath = String(value).trim();
  const path = publicPath.startsWith(`${SITE_BASE_PATH}/`)
    ? publicPath.slice(SITE_BASE_PATH.length + 1)
    : publicPath.replace(/^\//, '');
  if (!/^assets\/uploads\/[^\\?#%\u0000-\u001f]+\.(png|jpe?g|webp|gif)$/i.test(path) || path.split('/').some(part=>part==='..'||part==='.')) throw new Error(`Invalid image path: ${value}`);
  return path;
}
export function videoUrl(value) {
  if (!value) return '';
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Video URL must use HTTPS');
  return url.href;
}
const BILIBILI_BVID_PATTERN = /^BV[1-9A-HJ-NP-Za-km-z]{10}$/;
export function bilibiliBvid(value) {
  if (!value) return '';
  const bvid = String(value).trim();
  return BILIBILI_BVID_PATTERN.test(bvid) ? bvid : '';
}
export function bilibiliPlayerUrl(value) {
  const bvid = bilibiliBvid(value);
  return bvid ? `https://player.bilibili.com/player.html?bvid=${bvid}&page=1` : '';
}
const p = text => text ? `<p class="content-text">${escape(text)}</p>` : '';
const link = work => work.video_url ? `<a class="contact-link work-video-link" href="${escape(videoUrl(work.video_url))}" target="_blank" rel="noopener noreferrer">查看完整视频 ↗</a>` : '';
const cover = work => work.cover ? `<img class="work-cover clickable-thumb" src="${escape(mediaPath(work.cover))}" alt="${escape(work.title)}" loading="lazy">` : '';
const primaryMedia = work => {
  const bvid = bilibiliBvid(work.bilibili_bvid);
  if (!bvid) return cover(work);
  const poster = cover(work) || '<div class="bilibili-poster-fallback"><span>BILIBILI VIDEO</span></div>';
  return `<div class="bilibili-embed" data-bilibili-player data-bvid="${escape(bvid)}">${poster}<button class="bilibili-play" type="button" aria-label="播放 ${escape(work.title)}"><span class="bilibili-play-icon" aria-hidden="true">▶</span><span>查看视频</span></button></div>`;
};
const gallery = (items = []) => items.length ? `<div class="media-grid">${items.map(item => `<figure>${item.image ? `<img class="clickable-thumb" src="${escape(mediaPath(item.image))}" alt="${escape(item.caption)}" loading="lazy">` : '<div class="media-placeholder">图片待补充</div>'}<figcaption>${escape(item.caption)}</figcaption></figure>`).join('')}</div>` : '';
function stage(key, label, data = {}) {
  return `<div class="structure-card ${key.toLowerCase()}"><div class="structure-label"><b>${key}</b><span>${label}</span></div><div class="structure-copy"><h5>${escape(data.title)}</h5>${p(data.text)}</div>${gallery(data.images)}${data.analysis ? `<div class="analysis-note">${p(data.analysis)}</div>` : ''}</div>`;
}
const analysis = (items = []) => items.length ? `<div class="thinking-grid">${items.map((item,i)=>`<div class="thinking-card"><span>${String(i+1).padStart(2,'0')}</span><h4>${escape(item.title)}</h4>${p(item.text)}</div>`).join('')}</div>` : '';
const review = work => (work.review || work.iterations?.length) ? `<div class="iteration-block"><div class="block-heading"><h4>迭代复盘</h4></div><div class="iteration-flow">${(work.iterations || []).map(item=>`<div><b>${escape(item.title)}</b>${p(item.text)}</div>`).join('')}</div>${p(work.review)}</div>` : '';
export function renderGame(works) {
  if (!works.length) return '<p class="empty-state">作品整理中。</p>';
  return `<div class="case-switcher" role="tablist" aria-label="游戏案例导航">${works.map((w,i)=>`<button class="case-tab ${i===0?'active':''}" id="tab-${escape(w.id)}" data-case="game-${escape(w.id)}" role="tab" aria-controls="game-${escape(w.id)}" aria-selected="${i===0}" tabindex="${i===0?0:-1}"><span class="tab-no">${String(i+1).padStart(2,'0')}</span><strong>${escape(w.title)}</strong></button>`).join('')}</div><div class="case-panels">${works.map((w,i)=>`<article class="case-panel ${i===0?'active':''}" id="game-${escape(w.id)}" role="tabpanel" aria-labelledby="tab-${escape(w.id)}"><div class="case-title-row"><div><span class="case-index">CASE ${String(i+1).padStart(2,'0')}</span><h3>${escape(w.title)}</h3><p class="case-summary content-text">${escape(w.summary)}</p></div><div class="case-role"><span>ROLE</span><strong>${escape(w.role)}</strong></div></div>${primaryMedia(w)}${link(w)}<div class="case-meta-grid"><div><span>项目概述</span>${p(w.introduction)}</div><div><span>核心任务</span>${p(w.task)}</div></div><div class="structure-block"><div class="block-heading"><h4>视频结构拆解</h4></div>${stage('A','钩子 Hook',w.hook)}<div class="structure-card b"><div class="structure-label"><b>B</b><span>卖点 Value</span></div><div class="structure-copy"><h5>${escape(w.value_title)}</h5>${p(w.value_text)}</div><div class="value-list">${(w.selling_points||[]).map((item,j)=>`<div class="value-item"><div class="value-title"><span>卖点 ${String(j+1).padStart(2,'0')}</span><em>${escape(item.title)}</em></div>${gallery(item.images)}${p(item.text)}</div>`).join('')}</div></div>${stage('C','结尾引导 CTA',w.cta)}</div>${analysis(w.analysis)}${review(w)}<div class="copyright">${escape(w.copyright)}</div></article>`).join('')}</div>`;
}
export function renderBrand(works) {
  return `<div class="brand-grid">${works.map(w=>`<article class="brand-card reveal">${primaryMedia(w)}<div class="brand-body"><div class="brand-topline"><span>COMMERCIAL</span></div><h3>${escape(w.title)}</h3>${p(w.summary)}${p(w.introduction)}${p(w.role)}${(w.analysis||[]).map(item=>`<div class="detail"><strong>${escape(item.title)}</strong>${p(item.text)}</div>`).join('')}${gallery(w.images)}${review(w)}${link(w)}</div></article>`).join('') || '<p class="empty-state">作品整理中。</p>'}</div>`;
}
export function renderFilm(works) {
  return works.map(w=>`<article class="film-layout reveal"><div class="film-video">${primaryMedia(w)}${link(w)}</div><div class="film-info"><div class="mini-label">DIRECTING / STORYTELLING</div><h3>${escape(w.title)}</h3>${p(w.summary)}${p(w.introduction)}${p(w.role)}<div class="film-points">${(w.analysis||[]).map(item=>`<div class="film-point"><span>${escape(item.title)}</span>${p(item.text)}</div>`).join('')}</div>${gallery(w.images)}${review(w)}</div></article>`).join('') || '<p class="empty-state">作品整理中。</p>';
}
