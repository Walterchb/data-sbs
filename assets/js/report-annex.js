import {variableName} from './calculator-engine.js';

// A shared glossary avoids repeating the same account under every calculation.
// Keep scope, precision and provenance in the identity; equal amounts alone are not equal inputs.
export function formulaLabel(expression, aliases = {}) {
  return expression.replace(/(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?|[a-zA-Z]+/g,
    token => /^[a-z]/i.test(token) ? aliases[token.toLowerCase()] || token.toUpperCase() : token);
}
export function reportAnnex(items) {
  const unique=new Map(),inputs=[],formulas=[];
  for(const item of items){
    const aliases={};
    for(const [key,v] of Object.entries(item.variables)){
      const identity=JSON.stringify([v.kind,v.id,v.label,v.entity,v.entityName,v.date,v.currency,v.unit,v.value,v.source,v.reference,v.path]);
      if(!unique.has(identity)){
        const input={...v,symbol:variableName(inputs.length).toUpperCase()};
        unique.set(identity,input);inputs.push(input);
      }
      aliases[key.toLowerCase()]=unique.get(identity).symbol;
    }
    formulas.push({name:item.name,expression:formulaLabel(item.expression,aliases)});
  }
  const groups=new Map();
  for(const input of inputs){
    const key=input.kind==='constant'?'constants':JSON.stringify([input.entityName,input.date,input.currency,input.unit,input.kind]);
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(input);
  }
  return {inputs,groups:[...groups.values()],formulas};
}
