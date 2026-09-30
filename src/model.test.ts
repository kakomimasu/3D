import { assertStrictEquals, assertEquals, assertThrows } from '@std/assert';
import type { Game } from './types.ts';
import { validateGame, demoGame, scores, streamUrl } from './model.ts';
Deno.test('demo frames fit board and contain valid tiles and agents',()=>{for(let i=1;i<=12;i++)assertStrictEquals(validateGame(demoGame(i)).turn,i);});
Deno.test('negative wall points stay negative; enclosed points count as absolute values',()=>{const g: Pick<Game, 'players'> & {field: Pick<Game['field'], 'points' | 'tiles'>}={field:{points:[-3,-4,6],tiles:[{type:1,player:0},{type:0,player:0},{type:1,player:1}]},players:[{agents:[]},{agents:[]}]};assertEquals(scores(g,0),{wall:-3,area:4});});
Deno.test('server score is authoritative',()=>{const g=demoGame();g.players[0].point={wallPoint:12,areaPoint:9};assertEquals(scores(g,0),{wall:12,area:9});});
Deno.test('match id is preserved in stream filter and new matches disabled',()=>{const u=new URL(streamUrl('abc-123'));assertStrictEquals(u.searchParams.get('q'),'id:abc-123');assertStrictEquals(u.searchParams.get('allowNewGame'),'false');});
Deno.test('invalid dimensions and malformed tiles rejected',()=>{const g=demoGame();g.field.width=10000;assertThrows(()=>validateGame(g));const h=demoGame();const malformed={...h,field:{...h.field,tiles:[null,...h.field.tiles.slice(1)]}};assertThrows(()=>validateGame(malformed));});
Deno.test('official API uses null for neutral ownership',()=>{const g=demoGame();g.field.tiles[0]={type:0,player:null};assertStrictEquals(validateGame(g),g);});

Deno.test('match list retains match identity, sorts recent first and deduplicates',async()=>{
  const {matchSummaries}=await import('./model.ts');
  const result=matchSummaries([{id:'old',name:'古い対戦',startedAtUnixTime:100,status:'ended',players:[{id:'A'},{id:'B'}]},{id:'new',startedAtUnixTime:200},{id:'old'},null,{}]);
  assertEquals(result.map(m=>m.id),['new','old']);
  assertStrictEquals(result[1].players,'A vs B');assertStrictEquals(result[1].status,'終了');
});
Deno.test('empty and waiting match lists are supported',async()=>{
  const {matchSummaries,matchListUrl}=await import('./model.ts');
  assertEquals(matchSummaries([]),[]);assertThrows(()=>matchSummaries(null));
  assertStrictEquals(matchSummaries([{id:'waiting',startedAtUnixTime:null}])[0].status,'開始待ち');
  const url=new URL(matchListUrl());assertStrictEquals(url.searchParams.get('allowNewGame'),'false');assertStrictEquals(url.searchParams.get('q'),'sort:startAtUnixTime-desc type:normal');
});

Deno.test('startup picks latest game but explicit match id takes priority', async()=>{
  const {selectMatch}=await import('./model.ts');
  const old={id:'old',startedAtUnixTime:100},recent={id:'recent',startedAtUnixTime:200};
  const initial={type:'initial',games:[old,recent]};
  assertStrictEquals(selectMatch(initial,null),recent);
  assertStrictEquals(selectMatch(initial,'old'),old);
  assertStrictEquals(selectMatch(initial,'missing'),null);
  assertStrictEquals(selectMatch({type:'initial',games:[]},null),null);
});
Deno.test('stream only updates selected match and does not replace it with new games',async()=>{
  const {selectMatch}=await import('./model.ts');const game={id:'chosen'};
  assertStrictEquals(selectMatch({type:'update',game},'chosen'),game);
  assertStrictEquals(selectMatch({type:'update',game},'other'),null);
  assertStrictEquals(selectMatch({type:'add',game},'chosen'),null);
});

Deno.test('untrusted API metadata and logs are validated before rendering',()=>{
  const game=demoGame();
  assertThrows(()=>validateGame({...game,id:42}));
  assertThrows(()=>validateGame({...game,players:[{agents:[],point:{wallPoint:'12',areaPoint:0}},game.players[1]]}));
  assertThrows(()=>validateGame({...game,log:[{players:[{actions:[{res:1,x:'0',y:0}]}]}]}));
  assertStrictEquals(validateGame({...game,log:[{players:[{actions:[{res:1,x:0,y:0}]}]}]}).id,'demo');
});
