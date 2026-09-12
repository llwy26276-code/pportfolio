// Deploy separately from Pages. Client secret exists only as a Worker secret.
const encoder = new TextEncoder();
const hex = bytes => Array.from(new Uint8Array(bytes), b=>b.toString(16).padStart(2,'0')).join('');
async function sign(value, secret) {
  const key = await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return hex(await crypto.subtle.sign('HMAC',key,encoder.encode(value)));
}
function cookie(value, age=600) { return `__Host-cms-state=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`; }
const headers = {'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== 'GET') return new Response('Method not allowed',{status:405,headers});
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.STATE_SECRET || !env.CMS_ORIGIN) return new Response('OAuth service is not configured',{status:503,headers});
    const origin = new URL(env.CMS_ORIGIN).origin;
    if (!origin.startsWith('https://')) return new Response('HTTPS required',{status:503,headers});
    if (url.pathname === '/auth') {
      const raw = `${Date.now()}.${crypto.randomUUID()}`;
      const state = `${raw}.${await sign(raw,env.STATE_SECRET)}`;
      const authorize = new URL('https://github.com/login/oauth/authorize');
      authorize.search = new URLSearchParams({client_id:env.GITHUB_CLIENT_ID,redirect_uri:`${url.origin}/callback`,scope:'public_repo',state}).toString();
      return new Response(null,{status:302,headers:{...headers,Location:authorize.href,'Set-Cookie':cookie(state)}});
    }
    if (url.pathname !== '/callback') return new Response('Not found',{status:404,headers});
    const state=url.searchParams.get('state') || '';
    const stored=request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('__Host-cms-state='))?.slice('__Host-cms-state='.length);
    const [time,nonce,signature]=state.split('.');
    if (!state || state!==stored || !nonce || !signature || !Number.isFinite(Number(time)) || Number(time)>Date.now() || Date.now()-Number(time)>600000 || signature!==await sign(`${time}.${nonce}`,env.STATE_SECRET)) return new Response('Invalid or expired OAuth state',{status:400,headers:{...headers,'Set-Cookie':cookie('',0)}});
    if (!url.searchParams.get('code') || url.searchParams.has('error')) return new Response('GitHub authorization was cancelled. Close this window and retry.',{status:400,headers:{...headers,'Set-Cookie':cookie('',0)}});
    try {
      const response = await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code:url.searchParams.get('code'),redirect_uri:`${url.origin}/callback`})});
      const result=await response.json();
      if (!response.ok || !result.access_token) throw new Error('exchange failed');
      // Decap's standard handshake. Never send the token to a wildcard origin.
      const nonceCsp=crypto.randomUUID();
      const message=JSON.stringify(`authorization:github:success:${JSON.stringify({token:result.access_token,provider:'github'})}`).replace(/</g,'\\u003c');
      const html=`<!doctype html><meta charset="utf-8"><title>GitHub 授权完成</title><p>授权完成，请返回作品集后台。</p><script nonce="${nonceCsp}">const target=${JSON.stringify(origin)};window.addEventListener('message',function receive(event){if(event.origin!==target||event.source!==window.opener||event.data!=='authorizing:github')return;window.removeEventListener('message',receive);window.opener.postMessage(${message},target);window.close();});if(window.opener)window.opener.postMessage('authorizing:github',target);</script>`;
      return new Response(html,{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Set-Cookie':cookie('',0),'Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonceCsp}'; frame-ancestors 'none'; base-uri 'none'`}});
    } catch { return new Response('GitHub authorization failed. Close this window and retry.',{status:502,headers:{...headers,'Set-Cookie':cookie('',0)}}); }
  }
};
