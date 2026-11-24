import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PersonRecord } from '../../lineage/types';
import {
  buildBiographyMentionHtml,
  filterPersonMentions,
  resolvePersonMentionLabel,
} from './personMention.ts';

const people = [
  { personId: 'p1', chartId: 'c1', name: '陈伯温', generation: 1 },
  { personId: 'p2', chartId: 'c1', name: '陈元亮', generation: 2 },
];

test('按姓名过滤并限制 8 条', () => {
  assert.equal(filterPersonMentions('伯温', people)[0]?.personId, 'p1');
  assert.equal(filterPersonMentions('', people).length, 2);
});

test('改名读最新姓名，删人退回 fallbackName', () => {
  assert.deepEqual(resolvePersonMentionLabel({ personId: 'p1', fallbackName: '伯温' }, [{ id: 'p1', name: '陈伯温' }]), {
    text: '陈伯温',
    missing: false,
  });
  assert.deepEqual(resolvePersonMentionLabel({ personId: 'gone', fallbackName: '伯温' }, []), {
    text: '伯温',
    missing: true,
  });
});

test('传略 HTML 带有 personMention 属性', () => {
  const person = {
    id: 'p1',
    branchId: 'c1',
    name: '伯温',
    gender: 'male',
    status: 'deceased',
    generation: 1,
    fatherId: null,
  } as PersonRecord;
  const html = buildBiographyMentionHtml(person, 'c1', '一世。耕读传家。');
  assert.match(html, /data-person-id="p1"/);
  assert.match(html, /data-chart-id="c1"/);
  assert.match(html, /data-fallback-name="伯温"/);
  assert.match(html, /data-generation="1"/);
  assert.match(html, /耕读传家/);
});