const required=['OPENAI_API_KEY','RESEND_API_KEY','SITE_URL'];
const optional=['SQUARE_ACCESS_TOKEN','SQUARE_API_VERSION','SQUARE_ENVIRONMENT','SQUARE_LOCATION_ID','SERPAPI_API_KEY','LICENSE_SERVER_URL','LICENSE_SERVER_API_KEY','LICENSE_VALIDATION_ENABLED'];
const missing=required.filter(k=>!process.env[k]);
const mode=process.argv.includes('--build')?'build':'verify';
if(missing.length){
  const msg=`Missing required environment variables: ${missing.join(', ')}`;
  if(mode==='build' && process.env.NETLIFY){ console.error(msg); process.exit(1); }
  console.warn(`WARNING: ${msg}. Local non-Netlify ${mode} continues for repository validation.`);
}else console.log('Required environment variables are configured.');
console.log(`Optional configured: ${optional.filter(k=>process.env[k]).join(', ') || 'none'}`);
