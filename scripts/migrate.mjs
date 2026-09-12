// One-time migration. Refuses to overwrite already migrated content.
import fs from 'node:fs';
import { load } from 'cheerio';
if (fs.existsSync('content/game')) throw new Error('Content already migrated');
const source = fs.readFileSync('index.html', 'utf8');
fs.mkdirSync('reference', { recursive: true });
fs.writeFileSync('reference/pre-cms-index.html.txt', source);
const $ = load(source);
const text = (el, selector) => el.find(selector).first().text().trim().replace(/\s+/g, ' ');
const imageList = el => el.find('figure').toArray().map(node => ({image: $(node).find('img').attr('src') || '', caption: text($(node), 'figcaption')}));
const stage = el => ({title: text(el, 'h5'), text: text(el, '.structure-copy p'), images: imageList(el), analysis: text(el, '.analysis-note')});
function save(category, id, data) {
  fs.mkdirSync(`content/${category}`, { recursive: true });
  fs.writeFileSync(`content/${category}/${id}.json`, JSON.stringify(data, null, 2) + '\n');
}
$('.case-panel').each((i, node) => {
  const el = $(node);
  save('game', `case-${i+1}`, {
    title: text(el, 'h3'), order: i+1, summary: text(el, '.case-summary'), role: text(el, '.case-role strong'),
    introduction: el.find('.case-meta-grid p').eq(0).text().trim(), task: el.find('.case-meta-grid p').eq(1).text().trim(),
    cover: '', video_url: '', hook: stage(el.find('.structure-card.a')), cta: stage(el.find('.structure-card.c')),
    value_title: text(el, '.structure-card.b h5'), value_text: text(el, '.structure-card.b .structure-copy p'),
    selling_points: el.find('.value-item').toArray().map(n => ({title: text($(n), 'em'), text: $(n).children('p').text().trim(), images: imageList($(n))})),
    analysis: el.find('.thinking-card').toArray().map(n => ({title: text($(n), 'h4'), text: text($(n), 'p')})),
    iterations: el.find('.iteration-flow > div').toArray().map(n => ({title: text($(n), 'b'), text: text($(n), 'p')})),
    review: text(el, '.iteration-summary'), copyright: text(el, '.copyright')
  });
});
$('.brand-card').each((i, node) => {
  const el = $(node);
  save('brand', `brand-${i+1}`, {title: text(el,'h3'), order: i+1, summary: el.find('.brand-body > p').text().trim(), introduction: '', role:'', cover:'', video_url: el.find('a').attr('href'), analysis: [{title:'制作思路',text:text(el,'.detail p')}], review:'', images:[]});
});
const film = $('.film-layout');
save('film', 'qing-jiang', {title: text(film,'h3'), order:1, summary:'', introduction: film.find('.film-info > p').text().trim().replace(/\s+/g,' '), role:'负责人 / 导演 / 剪辑', cover:'', video_url:film.find('a').attr('href'), analysis:film.find('.film-point').toArray().map(n=>({title:text($(n),'span'),text:text($(n),'p')})), review:'', images:[]});
$('.case-switcher').next('.case-panels').remove();
$('.case-switcher').replaceWith('<!-- WORKS:game -->');
$('.brand-grid').replaceWith('<!-- WORKS:brand -->');
$('.film-layout').replaceWith('<!-- WORKS:film -->');
$('[contenteditable]').removeAttr('contenteditable');
fs.mkdirSync('templates', {recursive:true});
fs.writeFileSync('templates/page.html', $.html());
