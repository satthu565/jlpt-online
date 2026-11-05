import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { singleDisplayPlan } from './deduplicate-n3-images.js';
const source=JSON.parse(readFileSync(new URL('./n3-content-repair-plan.json',import.meta.url),'utf8'));
describe('single image display',()=>{
 it('removes only the 18 reviewed image-only inline passages',()=>{
  const before=JSON.stringify(source),plan=singleDisplayPlan(source);
  expect(plan.patches).toHaveLength(18);
  for(const p of plan.patches){expect(p.field).toBe('passage');expect(p.before).toHaveLength(1);expect(p.after).toEqual([]);}
  expect(JSON.stringify(source)).toBe(before);
 });
 it('never changes stems, options, explanations or answers',()=>{
  const plan=singleDisplayPlan(source);
  expect(new Set(plan.patches.map(p=>p.field))).toEqual(new Set(['passage']));
  expect(plan.images).toEqual(source.images);
 });
 it('rejects a passage containing text rather than silently dropping it',()=>{
  const changed=structuredClone(source);
  const imagePatch=changed.patches.find((p:{field:string;after:{type:string}[]})=>p.field==='passage'&&p.after[0]?.type==='image');
  imagePatch.after.push({type:'paragraph',content:[{t:'text',text:'Preserve this text'}]});
  expect(()=>singleDisplayPlan(changed)).toThrow('image-only');
 });
});
