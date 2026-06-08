import assert from 'node:assert/strict';
import test from 'node:test';
import { handler } from '../netlify/functions/api.mjs';

async function request(method, path, body){
  const response=await handler({httpMethod:method,path,body:body===undefined?undefined:JSON.stringify(body)});
  return {...response,json:JSON.parse(response.body)};
}

test('installer status route imports and returns a safe first-run response without a database URL', async()=>{
  const response=await request('GET','/api/install-status');
  assert.equal(response.statusCode,200);
  assert.equal(response.json.ok,true);
  assert.equal(response.json.needsInstall,true);
  assert.equal(response.json.databaseConfigured,false);
});

test('installer health route executes without throwing when database is not configured', async()=>{
  const response=await request('GET','/api/install/health');
  assert.equal(response.statusCode,200);
  assert.equal(response.json.ok,true);
  assert.equal(response.json.databaseReachable,false);
});

test('integration status route returns exact public-safe environment status metadata', async()=>{
  const response=await request('GET','/api/install/integration-status');
  assert.equal(response.statusCode,200);
  assert.equal(response.json.ok,true);
  assert.ok(response.json.integrations.some((item)=>item.key==='SERPAPI_API_KEY'));
  assert.equal(response.json.integrations.some((item)=>item.key==='SERPAPI_KEY'),false);
});
