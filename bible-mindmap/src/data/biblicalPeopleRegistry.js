// T1 38명 + T2 44명 + T3 44명 = 통합 126명 레지스트리
// 2026-08-07: hosted Actions 서비스 장애 후 동일 계약 재검증
import { BIBLICAL_PEOPLE_T1 } from './biblicalPeople.js';
import { BIBLICAL_PEOPLE_T2 } from './biblicalPeopleT2.js';
import { BIBLICAL_PEOPLE_T3 } from './biblicalPeopleT3.js';

export const BIBLICAL_PEOPLE_TIERS=Object.freeze([
  Object.freeze({id:'T1',count:BIBLICAL_PEOPLE_T1.length,people:BIBLICAL_PEOPLE_T1}),
  Object.freeze({id:'T2',count:BIBLICAL_PEOPLE_T2.length,people:BIBLICAL_PEOPLE_T2}),
  Object.freeze({id:'T3',count:BIBLICAL_PEOPLE_T3.length,people:BIBLICAL_PEOPLE_T3}),
]);

export const BIBLICAL_PEOPLE=Object.freeze([
  ...BIBLICAL_PEOPLE_T1,
  ...BIBLICAL_PEOPLE_T2,
  ...BIBLICAL_PEOPLE_T3,
]);

export const BIBLICAL_PEOPLE_BY_ID=Object.freeze(
  Object.fromEntries(BIBLICAL_PEOPLE.map((person)=>[person.id,person])),
);

export function getBiblicalPersonById(id){
  return BIBLICAL_PEOPLE_BY_ID[id]||null;
}

export function searchBiblicalPeople(query,testament='all'){
  const normalized=String(query||'').trim().toLocaleLowerCase();
  if(!normalized)return [];
  return BIBLICAL_PEOPLE.filter((person)=>{
    if(testament!=='all'&&person.testament!==testament)return false;
    return person.name.toLocaleLowerCase().includes(normalized)
      ||person.id.includes(normalized)
      ||person.aliases.some((alias)=>alias.toLocaleLowerCase().includes(normalized));
  });
}
