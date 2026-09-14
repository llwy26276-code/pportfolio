import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderGame, renderBrand, renderFilm, mediaPath, videoUrl, bilibiliPlayerUrl } from './render.mjs';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function readWorks(category) {
  const directory=path.join(root,'content',category);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory).filter(n=>n.endsWith('.json')).map(name=>{
    const work = JSON.parse(fs.readFileSync(path.join(root,'content',category,name),'utf8'));
    if (!work.title?.trim() || !Number.isFinite(work.order)) throw new Error(`Invalid title/order in ${name}`);
    videoUrl(work.video_url);
    if (work.bilibili_bvid && !bilibiliPlayerUrl(work.bilibili_bvid)) throw new Error(`Invalid Bilibili BV id in ${name}`);
    const check = value => {
      if (!value || typeof value !== 'object') return;
      for (const [key,v] of Object.entries(value)) {
        if ((key==='image'||key==='cover') && v) {
          const repositoryPath = mediaPath(v);
          const filePath = path.resolve(root, repositoryPath);
          if (!fs.existsSync(filePath)) throw new Error(`Missing image: ${v} (expected ${repositoryPath})`);
        }
        if (typeof v === 'object') check(v);
      }
    };
    check(work);
    const id = path.basename(name,'.json');
    if (!/^[a-z0-9_-]+$/i.test(id)) throw new Error(`Invalid filename: ${name}`);
    return {...work,id};
  }).sort((a,b)=>a.order-b.order || a.id.localeCompare(b.id));
}
export function build() {
  let html = fs.readFileSync(path.join(root,'templates/page.html'),'utf8');
  for (const [category,render] of Object.entries({game:renderGame,brand:renderBrand,film:renderFilm})) html = html.replace(`<!-- WORKS:${category} -->`,render(readWorks(category)));
  html = html.replace(/[\t ]+$/gm,'');
  fs.writeFileSync(path.join(root,'index.html'),html);
  const dist = path.join(root,'dist');
  if (path.dirname(dist) !== root) throw new Error('Invalid output directory');
  fs.rmSync(dist,{recursive:true,force:true});
  fs.mkdirSync(dist,{recursive:true});
  // Copy only public assets. Old videos and reference files remain in Git, not the deployment.
  for (const name of ['index.html','assets','admin']) fs.cpSync(path.join(root,name),path.join(dist,name),{recursive:true});
  const bundle = path.join(root,'node_modules/decap-cms/dist');
  fs.mkdirSync(path.join(dist,'admin/vendor'),{recursive:true});
  for (const name of fs.readdirSync(bundle).filter(n=>!n.endsWith('.map'))) fs.copyFileSync(path.join(bundle,name),path.join(dist,'admin/vendor',name));
  fs.writeFileSync(path.join(dist,'.nojekyll'),'');
  return html;
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  build(); console.log('Built index.html and dist/');
}
