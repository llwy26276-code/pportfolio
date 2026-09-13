import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { root, build } from './build.mjs';
import { SITE_BASE_PATH } from './render.mjs';
process.chdir(root);
build();
const proxy = spawn(process.execPath,['node_modules/decap-server/dist/index.js'],{cwd:root,stdio:'inherit',env:{...process.env,BIND_HOST:'127.0.0.1',PORT:'8081',MODE:'fs',ORIGIN:'http://localhost:4174'}});
proxy.on('exit', code => { if (code) { console.error('CMS proxy failed. Check port 8081.'); process.exitCode=1; server.close(); } });
const signature = () => ['content','assets/uploads','templates','admin'].map(dir=> {
  const walk = folder => fs.readdirSync(folder,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(folder,e.name)):[`${e.name}:${fs.statSync(path.join(folder,e.name)).mtimeMs}`]);
  return walk(path.join(root,dir)).join('|');
}).join('|');
let previous = signature();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.yml':'text/yaml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.wasm':'application/wasm'};
const server = http.createServer((req,res)=>{
  try {
    const current=signature();
    if(current!==previous){build();previous=current;}
    let url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    // Also preview GitHub project paths to catch base-path mistakes.
    if(url.startsWith(`${SITE_BASE_PATH}/`)) url=url.slice(SITE_BASE_PATH.length);
    if(url.endsWith('/')) url+='index.html';
    const base=path.join(root,'dist');
    const file=path.resolve(base,'.'+url);
    if(!file.startsWith(base+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    fs.createReadStream(file).pipe(res);
  }catch(error){res.writeHead(500,{'Content-Type':'text/plain; charset=utf-8'});res.end(`构建失败：${error.message}`);}
});
server.listen(4174,'127.0.0.1',()=>console.log('Preview: http://localhost:4174/  CMS: http://localhost:4174/admin/ (local writes only)'));
function stop(){proxy.kill();server.close();}
process.on('SIGINT',()=>{stop();process.exit();});
process.on('SIGTERM',()=>{stop();process.exit();});
process.on('exit',()=>proxy.kill());
