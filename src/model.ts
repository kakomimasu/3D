import type { Game, MatchSummary, PlayerId, Tile } from './types.ts';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function integer(value: unknown): value is number { return finite(value) && Number.isInteger(value); }
export function validateGame(value: unknown): Game {
  if (!isRecord(value) || !isRecord(value.field)) throw new Error('盤面データの形式が不正です。');
  const f=value.field;
  if (!integer(f.width) || !integer(f.height) || f.width<1 || f.height<1 || f.width>64 || f.height>64) throw new Error('盤面サイズが不正です（最大64×64）。');
  const width=f.width, height=f.height, size=width*height;
  if (!Array.isArray(f.points) || f.points.length!==size || !f.points.every(finite) || !Array.isArray(f.tiles) || f.tiles.length!==size || !f.tiles.every((t: unknown)=>isRecord(t) && (t.type===0||t.type===1) && (t.player===null||t.player===-1||t.player===0||t.player===1))) throw new Error('盤面データの形式が不正です。');
  if (!Array.isArray(value.players) || value.players.length!==2 || !value.players.every((p: unknown)=>isRecord(p) && Array.isArray(p.agents) && p.agents.every((a: unknown)=>isRecord(a) && integer(a.x) && integer(a.y) && ((a.x===-1&&a.y===-1)||(a.x>=0&&a.x<width&&a.y>=0&&a.y<height))) && (p.id===undefined||typeof p.id==='string') && (p.name===undefined||typeof p.name==='string') && (p.point===undefined||(isRecord(p.point)&&finite(p.point.wallPoint)&&finite(p.point.areaPoint))))) throw new Error('プレイヤーデータの形式が不正です。');
  if(typeof value.id!=='string' || (value.turn!==undefined&&!integer(value.turn)) || (value.status!==undefined&&typeof value.status!=='string') || (value.ending!==undefined&&typeof value.ending!=='boolean') || (value.name!==undefined&&typeof value.name!=='string') || (value.startedAtUnixTime!=null&&!finite(value.startedAtUnixTime))) throw new Error('対戦情報の形式が不正です。');
  if(value.log!==undefined && (!Array.isArray(value.log)||!value.log.every((entry: unknown)=>isRecord(entry)&&Array.isArray(entry.players)&&entry.players.every((p: unknown)=>isRecord(p)&&(p.actions===undefined||(Array.isArray(p.actions)&&p.actions.every((a: unknown)=>isRecord(a)&&finite(a.res)&&integer(a.x)&&integer(a.y)))))))) throw new Error('対戦ログの形式が不正です。');
  // The runtime guards above validate the complete shape before this boundary cast.
  return value as unknown as Game;
}

export function streamUrl(id: string) {
  const url = new URL('https://api.kakomimasu.com/v1/matches/stream');
  url.searchParams.set('q', `id:${id}`); url.searchParams.set('allowNewGame', 'false'); return url.toString();
}
export function scores(game: Pick<Game, 'players'> & { field: Pick<Game['field'], 'points' | 'tiles'> }, pid: number) {
  let wall = 0, area = 0;
  game.field.tiles.forEach((t,i) => { if (t.player === pid) { if (t.type === 1) wall += game.field.points[i]; else area += Math.abs(game.field.points[i]); } });
  const p = game.players[pid].point;
  return { wall: Number.isFinite(p?.wallPoint) ? p!.wallPoint : wall, area: Number.isFinite(p?.areaPoint) ? p!.areaPoint : area };
}
export function demoGame(turn = 1): Game {
  const width = 12, height = 12;
  const points = Array.from({length:144},(_,i) => { const x=i%12,y=Math.floor(i/12); return ((Math.min(x,11-x)*13+Math.min(y,11-y)*7+3)%13)-3; });
  const tiles: Tile[] = points.map(() => ({type:0,player:-1}));
  const paths = [[[1,2],[2,2],[3,2],[4,2],[4,3],[4,4],[4,5],[3,5],[2,5],[1,5],[1,4],[1,3]],[[7,6],[8,6],[9,6],[10,6],[10,7],[10,8],[10,9],[9,9],[8,9],[7,9],[7,8],[7,7]]];
  const players = paths.map((path,pid) => {
    const n = Math.min(12,turn+4);
    path.slice(0,n).forEach(([x,y])=>{tiles[x+y*12]={type:1,player:pid as PlayerId};});
    if(n===12) for(let y=path[0][1]+1;y<path[0][1]+3;y++) for(let x=path[0][0]+1;x<path[0][0]+3;x++) tiles[x+y*12]={type:0,player:pid as PlayerId};
    const [x,y]=path[(turn+3)%12];
    return {name:pid?'RED':'BLUE',agents:[{x,y},{x:path[0][0],y:path[0][1]}]};
  });
  return {id:'demo',turn,field:{width,height,points,tiles},players};
}

export function matchListUrl() {
  const url = new URL('https://api.kakomimasu.com/v1/matches/stream');
  url.searchParams.set('q', 'sort:startAtUnixTime-desc type:normal');
  url.searchParams.set('allowNewGame', 'false');
  return url.toString();
}

export function matchSummaries(games: unknown): MatchSummary[] {
  if (!Array.isArray(games)) throw new Error('一覧データの形式が不正です。');
  const seen = new Set<string>();
  const result: MatchSummary[] = [];
  for(const g of games as unknown[]) {
    if(!isRecord(g)||typeof g.id!=='string'||!g.id||seen.has(g.id)) continue;
    seen.add(g.id);
    const startedAt=finite(g.startedAtUnixTime)?g.startedAtUnixTime:null;
    result.push({
      id:g.id,
      name:typeof g.name==='string'&&g.name?g.name:'公開対戦',
      players:(Array.isArray(g.players)?g.players:[]).map((p: unknown)=>isRecord(p)?(typeof p.name==='string'&&p.name? p.name: typeof p.id==='string'&&p.id?p.id:'参加待ち'):'参加待ち').join(' vs ')||'参加待ち',
      status:g.status==='ended'?'終了':startedAt===null||startedAt>Date.now()/1000?'開始待ち':'対戦中',
      startedAt,
      turn:integer(g.turn)?g.turn:0,
    });
  }
  return result.sort((a,b)=>(b.startedAt??0)-(a.startedAt??0));
}

export function selectMatch(event: unknown, selectedId: string | null): Record<string, unknown> | null {
  if (!isRecord(event)) return null;
  if (event.type === 'initial') {
    if(!Array.isArray(event.games)) throw new Error('一覧データの形式が不正です。');
    const id = selectedId || matchSummaries(event.games)[0]?.id;
    return event.games.find((game: unknown) => isRecord(game) && game.id === id) ?? null;
  }
  if (event.type === 'update' && selectedId && isRecord(event.game) && event.game.id === selectedId) return event.game;
  return null;
}
