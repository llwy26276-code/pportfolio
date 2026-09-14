import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { load } from 'cheerio';
import { renderGame, renderBrand, renderFilm, mediaPath, videoUrl, bilibiliBvid, bilibiliPlayerUrl, SITE_BASE_PATH } from '../scripts/render.mjs';
import { readWorks } from '../scripts/build.mjs';
test('all current works validate without fixing the number of entries',()=>{
  for (const category of ['game','brand','film']) assert.ok(Array.isArray(readWorks(category)));
});
test('multiple selling points and images render with safe content',()=>{
  const work={id:'test',title:'<script>alert(1)</script>',selling_points:[{title:'one',images:[{image:'/assets/uploads/a.png'},{image:'/pportfolio/assets/uploads/b.png'}]},{title:'two',images:[{image:'assets/uploads/c.png'}]}]};
  const $=load(renderGame([work]));
  assert.equal($('.value-item').length,2);
  assert.equal($('.value-item img').length,3);
  assert.deepEqual($('.value-item img').toArray().map(node=>$(node).attr('src')),['assets/uploads/a.png','assets/uploads/b.png','assets/uploads/c.png']);
  assert.equal($('script').length,0);
  assert.equal($('h3').text(),work.title);
  assert.equal($('.case-tab').attr('aria-controls'),$('.case-panel').attr('id'));
});
test('empty sections and deletion are supported',()=>{
  assert.deepEqual(readWorks('__missing-category-test__'),[]);
  for (const render of [renderGame,renderBrand,renderFilm]) assert.match(render([]),/作品整理中/);
  const $=load(renderGame([{id:'new',title:'New'}]));
  assert.equal($('.case-tab').length,1);
  assert.equal($('.case-panel.active').length,1);
});
test('CMS and repository image paths normalize to repository-relative paths',()=>{
  assert.equal(SITE_BASE_PATH,'/pportfolio');
  for (const path of ['/pportfolio/assets/uploads/a.png','/assets/uploads/a.png','assets/uploads/a.png']) {
    assert.equal(mediaPath(path),'assets/uploads/a.png');
  }
});
test('URLs reject scripts, the old base path, and filesystem traversal',()=>{
  for(const path of ['../secret.png','/assets/uploads/../../secret.png','https://evil.test/a.png','assets/uploads/a.svg','/portfolio/assets/uploads/a.png']) assert.throws(()=>mediaPath(path));
  assert.throws(()=>videoUrl('javascript:alert(1)'));
  assert.throws(()=>videoUrl('http://example.com'));
});
test('Bilibili BV ids render safe lazy players only when valid',()=>{
  const valid='BV1Kj7Q6NEAj';
  assert.equal(bilibiliBvid(` ${valid} `),valid);
  assert.equal(bilibiliPlayerUrl(valid),`https://player.bilibili.com/player.html?bvid=${valid}&page=1`);

  for (const render of [renderGame,renderBrand,renderFilm]) {
    const withPlayer=load(render([{id:'bilibili-test',title:'Bilibili test',bilibili_bvid:valid}]));
    assert.equal(withPlayer('[data-bilibili-player]').attr('data-bvid'),valid);
    assert.equal(withPlayer('.bilibili-play').length,1);
    assert.equal(withPlayer('iframe').length,0);

    const withoutPlayer=load(render([{id:'no-bilibili',title:'No Bilibili'}]));
    assert.equal(withoutPlayer('[data-bilibili-player], iframe').length,0);

    const invalid=load(render([{id:'invalid-bilibili',title:'Invalid Bilibili',bilibili_bvid:'<iframe src="https://evil.test">'}]));
    assert.equal(invalid('[data-bilibili-player], iframe').length,0);
  }
  assert.equal(bilibiliPlayerUrl('BV-invalid'), '');
  assert.equal(bilibiliPlayerUrl('<iframe src="https://evil.test">'), '');
});
test('CMS schema covers folder CRUD and nested image lists',()=>{
  const config=JSON.parse(fs.readFileSync('admin/config.yml','utf8').replace(/^#.*\n/,''));
  assert.equal(config.backend.repo,'llwy26276-code/pportfolio');
  assert.equal(config.media_folder,'assets/uploads');
  assert.equal(config.public_folder,`${SITE_BASE_PATH}/${config.media_folder}`);
  assert.equal(new URL(config.site_url).pathname,`${SITE_BASE_PATH}/`);
  for(const collection of config.collections){
    assert.ok(collection.create && collection.delete);
    assert.equal(collection.format,'json');
    const bvid=collection.fields.find(field=>field.name==='bilibili_bvid');
    assert.equal(bvid.label,'B站 BV号');
    assert.equal(bvid.required,false);
    assert.ok(new RegExp(bvid.pattern[0]).test('BV1Kj7Q6NEAj'));
    assert.equal(new RegExp(bvid.pattern[0]).test('https://www.bilibili.com/video/BV1Kj7Q6NEAj/'),false);
  }
  const fields=config.collections[0].fields;
  const checkPatterns = fields => fields.forEach(field => {
    if (field.pattern) new RegExp(field.pattern[0]);
    if (field.fields) checkPatterns(field.fields);
  });
  config.collections.forEach(collection=>checkPatterns(collection.fields));
  const selling=fields.find(f=>f.name==='selling_points');
  assert.equal(selling.widget,'list');
  assert.equal(selling.fields.find(f=>f.name==='images').widget,'list');
  assert.ok(fields.some(f=>f.name==='hook') && fields.some(f=>f.name==='cta'));
});
