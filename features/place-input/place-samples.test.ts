import assert from 'node:assert/strict';
import type { PersonRecord } from '../lineage/types';
import {
  extractClanPlaceStats,
  formatGenealogyPlace,
  generatePlaceSuggestions,
  isLosslessPlaceCarry,
  matchRegionFromText,
  readGenealogyPlace,
  writeGenealogyPlace,
} from './index';

function runPlaceTests() {
  // 1. Traditional & Simplified search -> 中国贵州省贵阳市观山湖区
  const s1 = generatePlaceSuggestions('觀山湖');
  assert.ok(s1.length > 0, 'Expected suggestions for 觀山湖');
  assert.equal(s1[0].primaryLabel, '中国贵州省贵阳市观山湖区');
  assert.equal(s1[0].value.kind, 'structured');
  assert.equal(s1[0].value.province, '贵州省');
  assert.equal(s1[0].value.city, '贵阳市');
  assert.equal(s1[0].value.district, '观山湖区');

  const s1Full = generatePlaceSuggestions('中國貴州省貴陽市觀山湖區');
  assert.equal(s1Full[0].primaryLabel, '中国贵州省贵阳市观山湖区');

  // 2. Municipality flattening -> 中国北京市东城区 (no 市辖区)
  const s2 = generatePlaceSuggestions('东城');
  assert.ok(s2.some((item) => item.primaryLabel === '中国北京市东城区'));
  const dongcheng = s2.find((item) => item.primaryLabel === '中国北京市东城区')!;
  assert.equal(dongcheng.value.province, '北京市');
  assert.equal(dongcheng.value.city, undefined);
  assert.equal(dongcheng.value.district, '东城区');
  assert.equal(formatGenealogyPlace(dongcheng.value), '中国北京市东城区');

  // 3. Space-separated region + detail & full prefix + detail
  const s3 = generatePlaceSuggestions('泰和 澄江镇');
  const taiheDetail = s3.find(
    (item) =>
      item.value.kind === 'structured' &&
      item.value.district === '泰和县' &&
      item.value.detail === '澄江镇'
  );
  assert.ok(taiheDetail, 'Expected 泰和 澄江镇 to match structured region + detail');
  assert.equal(taiheDetail.primaryLabel, '中国江西省吉安市泰和县澄江镇');

  const s3Multi = generatePlaceSuggestions('江西 泰和 澄江镇');
  assert.equal(s3Multi[0].primaryLabel, '中国江西省吉安市泰和县澄江镇');
  assert.equal(s3Multi[0].value.detail, '澄江镇');

  const prefixMatched = matchRegionFromText('中国江西省吉安市泰和县澄江镇');
  assert.ok(prefixMatched);
  assert.equal(prefixMatched.province, '江西省');
  assert.equal(prefixMatched.city, '吉安市');
  assert.equal(prefixMatched.district, '泰和县');
  assert.equal(prefixMatched.detail, '澄江镇');

  // 4. Clan frequent places extraction & prioritization
  const mockPersons: PersonRecord[] = [
    {
      id: 'p1',
      name: '始祖',
      generation: 1,
      branchId: 'b1',
      fatherId: null,
      spouses: [],
      gender: 'male',
      status: 'deceased',
      birth: { place: '中国江西省吉安市泰和县澄江镇' },
      death: { burialPlace: '泰和县狮子山金钗穴，坐北朝南' },
    },
    {
      id: 'p2',
      name: '二世',
      generation: 2,
      branchId: 'b1',
      fatherId: 'p1',
      spouses: [],
      gender: 'male',
      status: 'deceased',
      birth: { place: '中国江西省吉安市泰和县澄江镇' },
      death: { burialPlace: '中国贵州省贵阳市观山湖区' },
    },
    {
      id: 'p3',
      name: '三世',
      generation: 3,
      branchId: 'b1',
      fatherId: 'p2',
      spouses: [],
      gender: 'male',
      status: 'living',
      birth: { place: '中国江西省吉安市泰和县澄江镇' },
    },
  ];
  const clanStats = extractClanPlaceStats(mockPersons);
  assert.equal(clanStats[0].label, '中国江西省吉安市泰和县澄江镇');
  assert.equal(clanStats[0].count, 3);

  const sClan = generatePlaceSuggestions('泰和', { clanPlaces: clanStats });
  assert.equal(sClan[0].kind, 'clan');
  assert.equal(sClan[0].primaryLabel, '中国江西省吉安市泰和县澄江镇');
  assert.ok(sClan[0].metaLabel.includes('已用3次'));

  // 5. Lossless blur guard: arbitrary burial phrase must not be overwritten, shorthand can auto-adopt
  assert.equal(isLosslessPlaceCarry('观山湖', s1[0]), true);
  const arbitrarySuggestions = generatePlaceSuggestions('老家后山，坐北朝南');
  assert.equal(arbitrarySuggestions[arbitrarySuggestions.length - 1].kind, 'phrase');
  if (arbitrarySuggestions[0].kind !== 'phrase') {
    assert.equal(
      isLosslessPlaceCarry('老家后山，坐北朝南', arbitrarySuggestions[0]),
      false
    );
  }

  // 6. Legacy adapter round-trip with birth.place & death.burialPlace / burialPlace
  const readBirth = readGenealogyPlace(mockPersons[0], 'birth');
  assert.ok(readBirth);
  assert.equal(readBirth.kind, 'structured');
  assert.equal(readBirth.detail, '澄江镇');

  const readBurial = readGenealogyPlace(mockPersons[0], 'death');
  assert.ok(readBurial);
  assert.equal(readBurial.kind, 'phrase');
  assert.equal(readBurial.originalText, '泰和县狮子山金钗穴，坐北朝南');

  const updated = writeGenealogyPlace(mockPersons[0], 'death', {
    schemaVersion: 1,
    kind: 'structured',
    country: '中国',
    province: '贵州省',
    city: '贵阳市',
    district: '观山湖区',
    detail: '狮子山金钗穴，坐北朝南',
    originalText: '桐梓县狮子山金钗穴',
  });
  assert.equal(
    updated.burialPlace,
    '中国贵州省贵阳市观山湖区狮子山金钗穴，坐北朝南'
  );
  assert.equal(
    updated.death?.burialPlace,
    '中国贵州省贵阳市观山湖区狮子山金钗穴，坐北朝南'
  );
  assert.equal(updated.death?.structuredPlace?.originalText, '桐梓县狮子山金钗穴');

  console.log('All 6 place-input & combobox tests PASSED.');
}

runPlaceTests();
