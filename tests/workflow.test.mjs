import test from 'node:test'; import assert from 'node:assert/strict'; import { advance, counts } from '../netlify/functions/_shared/workflow-engine.mjs';
test('archive leaves active queues',()=>{let item={id:'1',state:'Payment Verified',active:true}; item=advance(item); assert.equal(item.state,'Archive'); assert.equal(item.active,false); assert.equal(counts([item]).activeWorkOrders,0);});
