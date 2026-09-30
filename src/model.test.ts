import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Game } from './types.ts';
import { validateGame, demoGame, scores, streamUrl } from './model.ts';
test('demo frames fit board and contain valid tiles and agents',()=>{for(let i=1;i<=12;i++)assert.equal(validateGame(demoGame(i)).turn,i);});
test('negative wall points stay negative; enclosed points count as absolute values',()=>{const g: Pick<Game, 'players'> & {field: Pick<Game['field'], 'points' | 'tiles'>}={field:{points:[-3,-4,6],tiles:[{type:1,player:0},{type:0,player:0},{type:1,player:1}]},players:[{agents:[]},{agents:[]}]};assert.deepEqual(scores(g,0),{wall:-3,area:4});});
test('server score is authoritative',()=>{const g=demoGame();g.players[0].point={wallPoint:12,areaPoint:9};assert.deepEqual(scores(g,0),{wall:12,area:9});});
test('match id is preserved in stream filter and new matches disabled',()=>{const u=new URL(streamUrl('abc-123'));assert.equal(u.searchParams.get('q'),'id:abc-123');assert.equal(u.searchParams.get('allowNewGame'),'false');});
test('invalid dimensions and malformed tiles rejected',()=>{const g=demoGame();g.field.width=10000;assert.throws(()=>validateGame(g));const h=demoGame();const malformed={...h,field:{...h.field,tiles:[null,...h.field.tiles.slice(1)]}};assert.throws(()=>validateGame(malformed));});
test('official API uses null for neutral ownership',()=>{const g=demoGame();g.field.tiles[0]={type:0,player:null};assert.equal(validateGame(g),g);});

test('match list retains match identity, sorts recent first and deduplicates',async()=>{
  const {matchSummaries}=await import('./model.ts');
  const result=matchSummaries([{id:'old',name:'古い対戦',startedAtUnixTime:100,status:'ended',players:[{id:'A'},{id:'B'}]},{id:'new',startedAtUnixTime:200},{id:'old'},null,{}]);
  assert.deepEqual(result.map(m=>m.id),['new','old']);
  assert.equal(result[1].players,'A vs B');assert.equal(result[1].status,'終了');
});
test('empty and waiting match lists are supported',async()=>{
  const {matchSummaries,matchListUrl}=await import('./model.ts');
  assert.deepEqual(matchSummaries([]),[]);assert.throws(()=>matchSummaries(null));
  assert.equal(matchSummaries([{id:'waiting',startedAtUnixTime:null}])[0].status,'開始待ち');
  const url=new URL(matchListUrl());assert.equal(url.searchParams.get('allowNewGame'),'false');assert.equal(url.searchParams.get('q'),'sort:startAtUnixTime-desc type:normal');
});

test('startup picks latest game but explicit match id takes priority', async()=>{
  const {selectMatch}=await import('./model.ts');
  const old={id:'old',startedAtUnixTime:100},recent={id:'recent',startedAtUnixTime:200};
  const initial={type:'initial',games:[old,recent]};
  assert.equal(selectMatch(initial,null),recent);
  assert.equal(selectMatch(initial,'old'),old);
  assert.equal(selectMatch(initial,'missing'),null);
  assert.equal(selectMatch({type:'initial',games:[]},null),null);
});
test('stream only updates selected match and does not replace it with new games',async()=>{
  const {selectMatch}=await import('./model.ts');const game={id:'chosen'};
  assert.equal(selectMatch({type:'update',game},'chosen'),game);
  assert.equal(selectMatch({type:'update',game},'other'),null);
  assert.equal(selectMatch({type:'add',game},'chosen'),null);
});

test('untrusted API metadata and logs are validated before rendering',()=>{
  const game=demoGame();
  assert.throws(()=>validateGame({...game,id:42}));
  assert.throws(()=>validateGame({...game,players:[{agents:[],point:{wallPoint:'12',areaPoint:0}},game.players[1]]}));
  assert.throws(()=>validateGame({...game,log:[{players:[{actions:[{res:1,x:'0',y:0}]}]}]}));
  assert.equal(validateGame({...game,log:[{players:[{actions:[{res:1,x:0,y:0}]}]}]}).id,'demo');
});
