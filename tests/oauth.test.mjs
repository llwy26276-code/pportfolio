import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../oauth/worker.js';
const env={GITHUB_CLIENT_ID:'test-client',GITHUB_CLIENT_SECRET:'test-secret',STATE_SECRET:'test-state-secret',CMS_ORIGIN:'https://llwy26276-code.github.io'};
test('OAuth starts with a signed state cookie and public repository scope',async()=>{
  const response=await worker.fetch(new Request('https://oauth.example/auth'),env);
  assert.equal(response.status,302);
  const url=new URL(response.headers.get('location'));
  assert.equal(url.origin,'https://github.com');
  assert.equal(url.searchParams.get('scope'),'public_repo');
  assert.match(response.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);
  assert.ok(!response.headers.get('location').includes(env.GITHUB_CLIENT_SECRET));
});
test('OAuth rejects forged state without exchanging a token',async()=>{
  const response=await worker.fetch(new Request('https://oauth.example/callback?code=x&state=forged'),env);
  assert.equal(response.status,400);
});
test('OAuth exchanges only a valid callback and posts only to the configured origin',async()=>{
  const start=await worker.fetch(new Request('https://oauth.example/auth'),env);
  const state=new URL(start.headers.get('location')).searchParams.get('state');
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async(url,options)=>{
    assert.equal(url,'https://github.com/login/oauth/access_token');
    assert.equal(JSON.parse(options.body).client_secret,env.GITHUB_CLIENT_SECRET);
    return Response.json({access_token:'fake-test-token'});
  };
  try{
    const response=await worker.fetch(new Request(`https://oauth.example/callback?code=test&state=${state}`,{headers:{cookie:`__Host-cms-state=${state}`}}),env);
    assert.equal(response.status,200);
    const html=await response.text();
    assert.match(html,/event.origin!==target/);
    assert.match(html,/event.source!==window.opener/);
    assert.match(html,/authorization:github:success/);
    assert.ok(!html.includes(env.GITHUB_CLIENT_SECRET));
    assert.equal(response.headers.get('Cache-Control'),'no-store');
  }finally{globalThis.fetch=originalFetch;}
});
