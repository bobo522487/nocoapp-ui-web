import assert from 'node:assert/strict';
import { migrateLineagePersistedState } from '../../store/useLineageStore';
import { createSeedPersonsForChart } from './lineageData';
import { computeLineageStats } from './utils/lineageStats';
import {
  buildLineageGraphIndex,
  computeAutoRankLabel,
  computeSpouseOrderIndex,
  formatSpouseSequenceLabel,
  getDerivedChildren,
  getDerivedSpouses,
  getPersonAliasItems,
  getPersonPrimaryTitle,
  normalizePersonForSave,
  syncAliasesFromItems,
} from './utils/personHelpers';
import {
  applyUnifiedEventToPerson,
  buildPersonTimelineEvents,
  removeUnifiedEventFromPerson,
  resolvePersonRelationshipHeader,
} from './utils/personTimeline';
import { formatGenealogyDate, parseQuickDateInput } from '../date-input';
import { formatGenealogyPlace, parsePlaceText } from '../place-input';
import type { PersonEventType, PersonRecord } from './types';

const VALID_UNIFIED_EVENT_TYPES = new Set<PersonEventType>([
  'birth',
  'education',
  'career',
  'marriage',
  'residence',
  'death',
  'other',
]);

function assertNoShadowKeys(record: PersonRecord) {
  const obj = record as unknown as Record<string, unknown>;
  const forbiddenTopKeys = [
    'spouses',
    'courtesyName',
    'rank',
    'fatherName',
    'motherName',
    'spouseRelationLabel',
    'birthDate',
    'deathDate',
    'burialPlace',
    'age',
    'officialTitle',
    'biographyPage',
    'career',
  ];
  for (const key of forbiddenTopKeys) {
    assert.equal(key in obj, false, `Unexpected legacy key "${key}" on ${record.id}`);
  }
  if (record.birth) {
    const b = record.birth as unknown as Record<string, unknown>;
    assert.equal('date' in b, false, `Unexpected birth.date on ${record.id}`);
    assert.equal('place' in b, false, `Unexpected birth.place on ${record.id}`);
  }
  if (record.death) {
    const d = record.death as unknown as Record<string, unknown>;
    assert.equal('date' in d, false, `Unexpected death.date on ${record.id}`);
    assert.equal('place' in d, false, `Unexpected death.place on ${record.id}`);
    assert.equal('burialDate' in d, false, `Unexpected death.burialDate on ${record.id}`);
    assert.equal('burialPlace' in d, false, `Unexpected death.burialPlace on ${record.id}`);
  }
  if (record.privateInfo) {
    const priv = record.privateInfo as unknown as Record<string, unknown>;
    assert.equal('idCardName' in priv, false, `Unexpected privateInfo.idCardName on ${record.id}`);
  }
  if (record.events) {
    const forbiddenEventKeys = [
      'customTypeLabel',
      'organization',
      'position',
      'educationLevel',
      'deathCause',
      'relatedPersonId',
      'relatedPersonName',
      'date',
      'place',
    ];
    for (const ev of record.events) {
      assert.ok(
        VALID_UNIFIED_EVENT_TYPES.has(ev.type),
        `Invalid unified event type "${String(ev.type)}" on ${record.id}`
      );
      const evObj = ev as unknown as Record<string, unknown>;
      for (const ek of forbiddenEventKeys) {
        assert.equal(
          ek in evObj,
          false,
          `Unexpected legacy event key "${ek}" on ${record.id}#${ev.id}`
        );
      }
    }
  }
}

function runLineageSsotTests() {
  // 1. Store v2 -> v5 migration: lifts embedded spouses[], absorbs shadow fields, upgrades regions, unifies events
  const legacyPersisted = {
    treesByProject: {
      'proj-1': [
        {
          id: 'chart-1',
          type: 'chart',
          children: [],
          data: {
            name: '陈氏宗图',
            surname: '陈',
            region: '江西省/九江市/德安县',
          },
        },
      ],
    },
    personsByChart: {
      'proj-1::chart-1': [
        {
          id: 'anc-1',
          branchId: 'chart-1',
          name: '陈伯康',
          courtesyName: '字子安，号竹溪',
          gender: 'male',
          status: 'deceased',
          generation: 1,
          fatherId: null,
          birthDate: '1900-05-12',
          deathDate: '1978-11-03',
          burialPlace: '江西省/九江市/德安县',
          officialTitle: '乡贤',
          biographyPage: 20,
          privateInfo: {
            idCardName: '陈伯康',
          },
          spouses: [
            {
              name: '王氏',
              relationLabel: '原配',
              birthDate: '1902-03-01',
              burialPlace: '江西省/九江市/德安县',
              clanOrigin: '太原王氏',
            },
          ],
        },
        {
          id: 'child-1',
          branchId: 'chart-1',
          name: '陈仲文',
          gender: 'male',
          status: 'living',
          generation: 2,
          siblingOrder: 1,
          fatherId: 'anc-1',
          fatherName: '陈伯康',
          motherName: '王氏',
          spouses: [],
        },
      ],
    },
  };

  const migrated = migrateLineagePersistedState(legacyPersisted, 2);
  const migratedTree = migrated.treesByProject?.['proj-1'] ?? [];
  const chartRegion = migratedTree[0]?.data?.region;
  assert.equal(chartRegion?.kind, 'structured');
  assert.equal(chartRegion?.provinceCode, '360000');
  assert.equal(chartRegion?.cityCode, '360400');
  assert.equal(chartRegion?.districtCode, '360426');

  const migratedPersons = migrated.personsByChart?.['proj-1::chart-1'] ?? [];
  assert.equal(migratedPersons.length, 3, 'Embedded spouse should be promoted to a 3rd node');

  for (const p of migratedPersons) {
    assertNoShadowKeys(p);
  }

  const anc = migratedPersons.find((p) => p.id === 'anc-1')!;
  assert.deepEqual(anc.aliases, ['字子安', '号竹溪']);
  assert.equal(anc.legalName, '陈伯康');
  assert.equal(anc.sequenceMeta?.originalPage, 20);
  assert.equal(getPersonPrimaryTitle(anc), '乡贤');
  assert.equal(formatGenealogyDate(anc.birth?.structuredDate), '1900年5月12日');
  assert.equal(formatGenealogyDate(anc.death?.structuredDate), '1978年11月3日');
  assert.equal(formatGenealogyPlace(anc.death?.structuredBurialPlace), '江西省九江市德安县');

  const promotedSpouse = migratedPersons.find((p) => p.spouseOfId === 'anc-1')!;
  assert.ok(promotedSpouse, 'Promoted spouse node must exist');
  assert.equal(promotedSpouse.name, '王氏');
  assert.equal(promotedSpouse.siblingOrder, 1);
  assert.equal(promotedSpouse.notes, '太原王氏');
  assert.equal(formatGenealogyDate(promotedSpouse.birth?.structuredDate), '1902年3月1日');

  const child = migratedPersons.find((p) => p.id === 'child-1')!;
  assert.equal(child.motherId, promotedSpouse.id, 'Child motherName should resolve to promoted spouse ID');

  // Idempotency check at version 5
  const migratedTwice = migrateLineagePersistedState(migrated, 5);
  assert.equal(migratedTwice.personsByChart?.['proj-1::chart-1']?.length, 3);

  // 2. Store v4 -> v5 migration: collapses career + special event keys into unified 4-field events
  const v4Persisted = {
    personsByChart: {
      'proj-v4::chart-v4': [
        {
          id: 'v4-p1',
          branchId: 'chart-v4',
          name: '李明远',
          gender: 'male',
          status: 'deceased',
          generation: 5,
          fatherId: null,
          biography: '原有传记',
          career: {
            educationHistory: [
              {
                id: 'edu-1',
                period: '1932',
                school: '金陵大学',
                major: '文史',
                level: '本科',
                graduationStatus: '毕业',
              },
            ],
            careerHistory: [
              {
                id: 'job-1',
                period: '1938',
                location: '湖北省/武汉市',
                organization: '武昌中学',
                position: '教谕',
              },
            ],
            resume: '执教二十载',
            lifeSummary: '门生遍布荆楚',
          },
          events: [
            {
              id: 'ev-old-honor',
              type: 'honor',
              date: '1945',
              organization: '省文史馆',
              position: '馆员',
              description: '编修地方志',
            },
            {
              id: 'ev-old-burial',
              type: 'burial',
              date: '1980',
              place: '湖北省/武汉市',
              deathCause: '寿终',
              description: '归葬祖山',
            },
            {
              id: 'ev-old-other',
              type: 'other',
              customTypeLabel: '修谱',
              relatedPersonName: '宗亲',
              description: '主修六修家谱',
            },
          ],
        },
      ],
    },
  };

  const migratedV5 = migrateLineagePersistedState(v4Persisted, 4);
  const v5Persons = migratedV5.personsByChart?.['proj-v4::chart-v4'] ?? [];
  assert.equal(v5Persons.length, 1);
  const v5P1 = v5Persons[0];
  assertNoShadowKeys(v5P1);
  assert.equal(v5P1.biography, '原有传记\n执教二十载\n门生遍布荆楚');
  assert.equal(v5P1.events?.length, 5);
  assert.equal(v5P1.events?.[0].type, 'education');
  assert.equal(v5P1.events?.[0].description, '金陵大学 · 文史 · 本科 · 毕业');
  assert.equal(v5P1.events?.[1].type, 'career');
  assert.equal(v5P1.events?.[1].description, '武昌中学 · 教谕');
  assert.equal(v5P1.events?.[2].type, 'career');
  assert.ok(v5P1.events?.[2].description?.includes('省文史馆'));
  assert.equal(v5P1.events?.[3].type, 'death');
  assert.ok(v5P1.events?.[3].description?.includes('死因：寿终'));
  assert.equal(v5P1.events?.[4].type, 'other');
  assert.ok(v5P1.events?.[4].description?.includes('修谱'));
  assert.equal(getPersonPrimaryTitle(v5P1), '武昌中学 · 教谕');

  // 3. Unified event apply/remove & timeline building
  const testPerson: PersonRecord = {
    id: 'u-1',
    branchId: 'c-1',
    name: '测试人物',
    gender: 'male',
    status: 'living',
    generation: 1,
    fatherId: null,
  };
  const parsed2000 = parseQuickDateInput('2000-06-01');
  const parsed2022 = parseQuickDateInput('2022');
  const date2000 = parsed2000.ok ? parsed2000.value : null;
  const date2022 = parsed2022.ok ? parsed2022.value : null;
  const placeBj = parsePlaceText('北京市');

  // Adding birth when vital birth is empty fills person.birth
  const birthPayload = {
    type: 'birth' as const,
    structuredDate: date2000,
    structuredPlace: placeBj,
    description: '生于京师',
  };
  const withBirth = {
    ...testPerson,
    ...applyUnifiedEventToPerson(testPerson, [testPerson], birthPayload, {
      mode: 'create',
      targetPersonId: testPerson.id,
      initialEvent: birthPayload,
    }),
  } as PersonRecord;
  assert.equal(withBirth.birth?.summary, '生于京师');
  assert.equal(withBirth.events?.length ?? 0, 0);

  // Adding career event appends strictly 4-field event
  const careerPayload = {
    type: 'career' as const,
    structuredDate: date2022,
    structuredPlace: placeBj,
    description: '翰林院编修',
  };
  const withCareer = {
    ...withBirth,
    ...applyUnifiedEventToPerson(withBirth, [withBirth], careerPayload, {
      mode: 'create',
      targetPersonId: withBirth.id,
      initialEvent: careerPayload,
    }),
  } as PersonRecord;
  assertNoShadowKeys(withCareer);
  assert.equal(withCareer.events?.length, 1);
  assert.equal(withCareer.events?.[0].type, 'career');
  assert.equal(withCareer.events?.[0].description, '翰林院编修');

  const timeline = buildPersonTimelineEvents(withCareer, [withCareer]);
  assert.ok(timeline.some((ev) => ev.eventType === 'birth' && ev.title === '出生'));
  assert.ok(timeline.some((ev) => ev.eventType === 'career' && ev.title === '任职'));

  const careerTimelineItem = timeline.find((ev) => ev.eventType === 'career')!;
  const afterRemovePatch = removeUnifiedEventFromPerson(withCareer, [withCareer], {
    mode: 'edit',
    sourceKind: careerTimelineItem.sourceKind,
    sourceId: careerTimelineItem.sourceId,
    targetPersonId: withCareer.id,
    initialEvent: {
      type: careerTimelineItem.eventType,
      structuredDate: careerTimelineItem.structuredDate ?? null,
      structuredPlace: careerTimelineItem.structuredPlace ?? null,
      description: careerTimelineItem.description ?? '',
    },
  });
  assert.ok(afterRemovePatch, 'Unified event deletion must return updated record patch');
  assert.equal(afterRemovePatch.events?.length ?? 0, 0);

  // 4. O(N) Graph index, rank derivation & independent spouse statistics
  const graphPersons: PersonRecord[] = [
    ...migratedPersons,
    {
      id: 'child-1-wife',
      branchId: 'chart-1',
      name: '李氏',
      gender: 'female',
      status: 'living',
      generation: 2,
      siblingOrder: 1,
      fatherId: null,
      spouseOfId: 'child-1',
      relationType: '妻子',
    },
    {
      id: 'child-2',
      branchId: 'chart-1',
      name: '陈季芳',
      gender: 'female',
      status: 'living',
      generation: 2,
      siblingOrder: 2,
      fatherId: 'anc-1',
    },
    {
      id: 'child-2-husband',
      branchId: 'chart-1',
      name: '张明',
      gender: 'male',
      status: 'living',
      generation: 2,
      siblingOrder: 1,
      fatherId: null,
      spouseOfId: 'child-2',
      relationType: '丈夫',
    },
  ];

  const index = buildLineageGraphIndex(graphPersons);
  assert.equal(index.personById.get('anc-1')?.name, '陈伯康');
  assert.equal(index.childrenByFatherId.get('anc-1')?.length, 2);
  assert.equal(index.spousesByPartnerId.get('anc-1')?.length, 1);

  assert.equal(getDerivedSpouses(graphPersons, anc.id).length, 1);
  assert.equal(
    formatSpouseSequenceLabel(computeSpouseOrderIndex(promotedSpouse, graphPersons)),
    '原配'
  );
  assert.equal(computeAutoRankLabel(promotedSpouse, graphPersons), '');
  assert.equal(
    resolvePersonRelationshipHeader(promotedSpouse, graphPersons),
    '第 1 世 · 妻子'
  );
  assert.equal(computeAutoRankLabel(child, graphPersons), '之男');
  assert.equal(
    computeAutoRankLabel(
      graphPersons.find((p) => p.id === 'child-2')!,
      graphPersons
    ),
    '之女'
  );

  // 4b. Chronological child rank computation (长子 / 次子 derived from birth dates regardless of insertion order)
  const birth1988 = parseQuickDateInput('1988-03-10');
  const birth1992 = parseQuickDateInput('1992-05-01');
  const sonLater = {
    id: 'son-1992',
    branchId: 'c-rank',
    name: '次子测试',
    gender: 'male' as const,
    status: 'living' as const,
    generation: 2,
    siblingOrder: 1, // added first
    fatherId: 'anc-1',
    birth: { structuredDate: birth1992.ok ? birth1992.value : null },
  };
  const sonOlder = {
    id: 'son-1988',
    branchId: 'c-rank',
    name: '长子测试',
    gender: 'male' as const,
    status: 'living' as const,
    generation: 2,
    siblingOrder: 2, // added second
    fatherId: 'anc-1',
    birth: { structuredDate: birth1988.ok ? birth1988.value : null },
  };
  const rankTestPersons: PersonRecord[] = [anc, sonLater, sonOlder];
  const orderedKids = getDerivedChildren(rankTestPersons, anc.id);
  assert.equal(orderedKids[0].id, 'son-1988');
  assert.equal(orderedKids[1].id, 'son-1992');
  assert.equal(computeAutoRankLabel(sonOlder, rankTestPersons), '长子');
  assert.equal(computeAutoRankLabel(sonLater, rankTestPersons), '次子');

  const stats = computeLineageStats(graphPersons, 1);
  assert.equal(stats.totalPersons, 6);
  assert.equal(stats.maleCount, 2); // 陈伯康, 陈仲文
  assert.equal(stats.femaleCount, 1); // 陈季芳
  assert.equal(stats.maleLivingMarried, 1); // 陈仲文
  assert.equal(stats.femaleLivingMarried, 1); // 陈季芳
  assert.equal(stats.daughterInLawCount, 2); // 王氏 (deceased), 李氏 (living)
  assert.equal(stats.daughterInLawLiving, 1);
  assert.equal(stats.daughterInLawDeceased, 1);
  assert.equal(stats.sonInLawCount, 1); // 张明 (living)
  assert.equal(stats.sonInLawLiving, 1);

  // 5. Built-in seed data must strictly conform to SSOT with no legacy keys
  for (const chartId of ['lineage-royal-1', 'lineage-other-1', 'custom-chart']) {
    const seed = createSeedPersonsForChart(chartId, '测试世系', '刘');
    assert.ok(seed.length > 0);
    for (const p of seed) {
      assertNoShadowKeys(p);
    }
  }

  // 6. Structured alias items & legacy string alias compatibility
  const legacyAliasItems = getPersonAliasItems(anc);
  assert.equal(legacyAliasItems.length, 2);
  assert.equal(legacyAliasItems[0].type, '字');
  assert.equal(legacyAliasItems[0].name, '子安');
  assert.equal(legacyAliasItems[1].type, '号');
  assert.equal(legacyAliasItems[1].name, '竹溪');

  const withStructuredAliases = normalizePersonForSave(
    {
      ...anc,
      aliasItems: [
        {
          id: 'al-1',
          type: '字',
          name: '伯宣',
          romanizedName: { name: 'Boxuan' },
        },
        {
          id: 'al-2',
          type: '曾用名',
          surname: '陈',
          name: '明远',
          romanizedName: { surname: 'Chen', name: 'Mingyuan' },
        },
      ],
    },
    migratedPersons
  );
  assert.deepEqual(withStructuredAliases.aliases, ['字伯宣', '陈明远']);
  assert.equal(withStructuredAliases.aliasItems?.length, 2);
  assert.deepEqual(
    syncAliasesFromItems(withStructuredAliases.aliasItems || []),
    ['字伯宣', '陈明远']
  );

  console.log('All lineage SSOT, store migration & stats tests PASSED.');
}

runLineageSsotTests();
