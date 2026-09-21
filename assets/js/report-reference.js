// F in the legacy catalogue meant fila, never Excel column F.
export function sourceReference(v) {
 const match=/^(balance|income):(\d+)$/.exec(v.id||'');
 if(match)return `B-2201 · hoja ${match[1]==='balance'?'1 (Balance)':'2 (Resultados)'} · fila ${match[2]}`;
 return v.reference||v.id||'';
}
export const sourceColumn=v=>v.kind==='constant'?'CONSTANTE':v.unit==='PERCENT'?'%':v.currency===undefined?'Total · S/ miles':['MN · S/ miles','ME · S/ miles','Total · S/ miles'][Number(v.currency)];
