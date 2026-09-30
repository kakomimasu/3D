export function validateGame(game) {
  const f = game?.field;
  if (!f || !Number.isInteger(f.width) || !Number.isInteger(f.height) || f.width < 1 || f.height < 1 || f.width > 64 || f.height > 64) throw new Error('盤面サイズが不正です（最大64×64）。');
  const size = f.width * f.height;
  if (!Array.isArray(f.points) || f.points.length !== size || !f.points.every(Number.isFinite) || !Array.isArray(f.tiles) || f.tiles.length !== size || !f.tiles.every(t => t && [0, 1].includes(t.type) && [null, -1, 0, 1].includes(t.player))) throw new Error('盤面データの形式が不正です。');
  if (!Array.isArray(game.players) || game.players.length !== 2 || !game.players.every(p => Array.isArray(p.agents) && p.agents.every(a => Number.isInteger(a.x) && Number.isInteger(a.y) && ((a.x === -1 && a.y === -1) || (a.x >= 0 && a.x < f.width && a.y >= 0 && a.y < f.height))))) throw new Error('プレイヤーデータの形式が不正です。');
  return game;
}
export function streamUrl(id) {
  const url = new URL('https://api.kakomimasu.com/v1/matches/stream');
  url.searchParams.set('q', `id:${id}`); url.searchParams.set('allowNewGame', 'false'); return url.toString();
}
export function scores(game, pid) {
  let wall = 0, area = 0;
  game.field.tiles.forEach((t,i) => { if (t.player === pid) { if (t.type === 1) wall += game.field.points[i]; else area += Math.abs(game.field.points[i]); } });
  const p = game.players[pid].point;
  return { wall: Number.isFinite(p?.wallPoint) ? p.wallPoint : wall, area: Number.isFinite(p?.areaPoint) ? p.areaPoint : area };
}
export function demoGame(turn = 1) {
  const width = 12, height = 12;
  const points = Array.from({length:144},(_,i) => { const x=i%12,y=Math.floor(i/12); return ((Math.min(x,11-x)*13+Math.min(y,11-y)*7+3)%13)-3; });
  const tiles = points.map(() => ({type:0,player:-1}));
  const paths = [[[1,2],[2,2],[3,2],[4,2],[4,3],[4,4],[4,5],[3,5],[2,5],[1,5],[1,4],[1,3]],[[7,6],[8,6],[9,6],[10,6],[10,7],[10,8],[10,9],[9,9],[8,9],[7,9],[7,8],[7,7]]];
  const players = paths.map((path,pid) => {
    const n = Math.min(12,turn+4);
    path.slice(0,n).forEach(([x,y])=>{tiles[x+y*12]={type:1,player:pid};});
    if(n===12) for(let y=path[0][1]+1;y<path[0][1]+3;y++) for(let x=path[0][0]+1;x<path[0][0]+3;x++) tiles[x+y*12]={type:0,player:pid};
    const [x,y]=path[(turn+3)%12];
    return {name:pid?'RED':'BLUE',agents:[{x,y},{x:path[0][0],y:path[0][1]}]};
  });
  return {id:'demo',turn,field:{width,height,points,tiles},players};
}
