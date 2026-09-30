import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateGame, demoGame, scores, streamUrl } from './model.js';
test('demo frames fit board and contain valid tiles and agents',()=>{for(let i=1;i<=12;i++)assert.equal(validateGame(demoGame(i)).turn,i);});
test('negative wall points stay negative; enclosed points count as absolute values',()=>{const g={field:{points:[-3,-4,6],tiles:[{type:1,player:0},{type:0,player:0},{type:1,player:1}]},players:[{},{}]};assert.deepEqual(scores(g,0),{wall:-3,area:4});});
test('server score is authoritative',()=>{const g=demoGame();g.players[0].point={wallPoint:12,areaPoint:9};assert.deepEqual(scores(g,0),{wall:12,area:9});});
test('match id is preserved in stream filter and new matches disabled',()=>{const u=new URL(streamUrl('abc-123'));assert.equal(u.searchParams.get('q'),'id:abc-123');assert.equal(u.searchParams.get('allowNewGame'),'false');});
test('invalid dimensions and malformed tiles rejected',()=>{const g=demoGame();g.field.width=10000;assert.throws(()=>validateGame(g));const h=demoGame();h.field.tiles[0]=null;assert.throws(()=>validateGame(h));});
test('official API uses null for neutral ownership',()=>{const g=demoGame();g.field.tiles[0]={type:0,player:null};assert.equal(validateGame(g),g);});
