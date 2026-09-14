import fs from 'node:fs';
import { SITE_BASE_PATH } from './render.mjs';
const field = (name,label,widget='string',extra={}) => ({name,label,widget,required:false,...extra});
const list = (name,label,fields) => field(name,label,'list',{fields,default:[],collapsed:true,summary:'{{fields.title}}{{fields.caption}}'});
const image = (name,label) => field(name,label,'image',{choose_url:false,hint:'PNG、JPG、WEBP 或 GIF，单张不超过 5 MB。',pattern:['\\.([pP][nN][gG]|[jJ][pP][eE]?[gG]|[wW][eE][bB][pP]|[gG][iI][fF])$','请选择 PNG、JPG、WEBP 或 GIF 图片。'],media_library:{config:{max_file_size:5242880}}});
const images = () => list('images','案例图片（可添加多张）',[image('image','图片'),field('caption','图片说明')]);
const analysis = () => list('analysis','案例分析',[field('title','分析标题'),field('text','分析文字','text')]);
const stage = (name,label) => field(name,label,'object',{fields:[field('title','标题'),field('text','说明','text'),images(),field('analysis','创意说明','text')]});
const common = () => [field('title','作品标题','string',{required:true}),field('order','排序','number',{required:true,default:1,value_type:'int',min:0}),field('summary','一句话介绍','text'),field('introduction','项目介绍','text'),field('role','我的职责'),image('cover','封面图'),field('bilibili_bvid','B站 BV号','string',{hint:'只填写 BV 号，例如 BV1Kj7Q6NEAj。保存后前台可点击封面在页面内播放。',pattern:['^BV[1-9A-HJ-NP-Za-km-z]{10}$','请填写标准 BV 号，例如 BV1Kj7Q6NEAj，或留空。']}),field('video_url','视频外链（B 站等）','string',{hint:'填写 HTTPS 视频页面地址，不上传视频文件。已有外链会继续保留。',pattern:['^https://[^\\s]+$','请填写 https:// 开头的地址，或留空。']})];
const repository = 'llwy26276-code/pportfolio';
const siteUrl = `https://llwy26276-code.github.io${SITE_BASE_PATH}/`;
const mediaFolder = 'assets/uploads';
const config = {
  backend:{name:'github',repo:repository,branch:'main',base_url:'https://portfolio-cms-oauth.llwy26276.workers.dev',auth_endpoint:'auth'},
  site_url:siteUrl,display_url:siteUrl,
  locale:'zh_Hans',media_folder:mediaFolder,public_folder:`${SITE_BASE_PATH}/${mediaFolder}`,
  slug:{encoding:'ascii',clean_accents:true,sanitize_replacement:'-'},
  collections:[['game','游戏案例'],['brand','品牌视频'],['film','校园微电影']].map(([name,label])=>({
    name,label,folder:`content/${name}`,create:true,delete:true,extension:'json',format:'json',slug:'{{year}}{{month}}{{day}}{{hour}}{{minute}}{{second}}-{{slug}}',
    summary:'{{title}}',sortable_fields:['order','title'],editor:{preview:false},
    fields:[...common(),...(name==='game'?[field('task','核心任务','text'),stage('hook','A 钩子'),field('value_title','B 卖点总标题'),field('value_text','B 卖点总说明','text'),list('selling_points','B 卖点模块（可添加多个）',[field('title','模块标题'),field('text','模块说明','text'),images()]),stage('cta','C CTA'),list('iterations','迭代步骤',[field('title','版本 / 阶段'),field('text','调整说明','text')]),field('copyright','版权说明','text')]:[images()]),analysis(),field('review','复盘文字','text')]
  }))
};
fs.mkdirSync('admin',{recursive:true});
fs.writeFileSync('admin/config.yml','# JSON is valid YAML. Edit backend.base_url after deploying the OAuth worker.\n'+JSON.stringify(config,null,2)+'\n');
