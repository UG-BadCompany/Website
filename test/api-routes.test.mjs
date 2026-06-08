import assert from 'node:assert/strict';
import test from 'node:test';
import { handler } from '../netlify/functions/api.mjs';

async function request(method, path, body){
  const previous={};
  for(const key of ['NETLIFY_DATABASE_URL','DATABASE_URL','POSTGRES_URL','POSTGRES_PRISMA_URL','POSTGRES_URL_NON_POOLING','NEON_DATABASE_URL','NETLIFY_DB_URL']){
    previous[key]=process.env[key];
    delete process.env[key];
  }
  try{
    const response=await handler({httpMethod:method,path,body:body===undefined?undefined:JSON.stringify(body)});
    return {...response,json:JSON.parse(response.body)};
  }finally{
    for(const [key,value] of Object.entries(previous)){
      if(value===undefined) delete process.env[key];
      else process.env[key]=value;
    }
  }
}

for(const [method,path,body] of [
  ['GET','/api/install-status'],
  ['GET','/api/install/health'],
  ['GET','/api/install/draft'],
  ['POST','/api/install/draft',{company:{name:'Test'}}],
  ['POST','/api/install/bootstrap-database'],
  ['POST','/api/install/finish',{company:{name:'Test'},owner:{email:'owner@example.com'}}],
  ['GET','/api/install/integration-status'],
]){
  test(`${method} ${path} returns safe JSON without database env`, async()=>{
    const response=await request(method,path,body);
    assert.equal(response.statusCode,200);
    assert.match(response.headers['content-type'],/application\/json/);
    assert.notEqual(response.body,'');
    assert.notEqual(response.json.statusCode,502);
    assert.notEqual(response.json.statusCode,503);
    assert.notEqual(response.statusCode,502);
    assert.notEqual(response.statusCode,503);
    assert.equal(typeof response.json.ok,'boolean');
    if(path.startsWith('/api/install')) assert.notEqual(response.json.code,'DATABASE_UNAVAILABLE');
  });
}

test('installer status route reports actionable first-run database state', async()=>{
  const response=await request('GET','/api/install-status');
  assert.equal(response.json.ok,false);
  assert.equal(response.json.installed,false);
  assert.equal(response.json.code,'DATABASE_NOT_CONFIGURED');
  assert.equal(response.json.message,'Database not detected. Attempting automatic bootstrap...');
  assert.equal(response.json.needsInstall,true);
  assert.equal(response.json.databaseConfigured,false);
  assert.equal(response.json.netlifyDatabaseDetected,false);
  assert.equal(response.json.manualSetupRequired,false);
  assert.equal(response.json.safeMode,true);
});

test('installer health route reports Netlify Database linking guidance and driver metadata', async()=>{
  const response=await request('GET','/api/install/health');
  assert.equal(response.json.ok,false);
  assert.equal(response.json.databaseReachable,false);
  assert.equal(response.json.code,'DATABASE_NOT_CONFIGURED');
  assert.equal(response.json.netlifyDatabaseDetected,false);
  assert.equal(response.json.manualSetupRequired,false);
  assert.equal(response.json.driverPackage,'pg');
  assert.ok(response.json.env.some((item)=>item.key==='NETLIFY_DATABASE_URL'));
});


test('bootstrap endpoint confirms manual link only after automatic bootstrap is attempted', async()=>{
  const response=await request('POST','/api/install/bootstrap-database');
  assert.equal(response.statusCode,200);
  assert.equal(response.json.ok,false);
  assert.equal(response.json.code,'DATABASE_MANUAL_LINK_REQUIRED');
  assert.equal(response.json.manualSetupRequired,true);
  assert.equal(response.json.attemptedAutomaticBootstrap,true);
  assert.ok(response.json.guide.some((item)=>item.includes('Netlify')));
});

test('integration status route returns exact public-safe environment status metadata', async()=>{
  const response=await request('GET','/api/install/integration-status');
  assert.equal(response.statusCode,200);
  assert.equal(response.json.ok,true);
  assert.ok(response.json.integrations.some((item)=>item.key==='SERPAPI_API_KEY'));
  assert.equal(response.json.integrations.some((item)=>item.key==='SERPAPI_KEY'),false);
});
