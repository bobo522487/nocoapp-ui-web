import React, { useEffect, useMemo, useState } from 'react';
import { PersonRecord } from '../types';
import {
  Search,
  Plus,
  Heart,
  MapPin,
  Award,
  Trash2,
  Edit3,
  Printer,
  Check,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { getPersonDateDisplay } from '../../date-input';
import { getPersonPlaceDisplay } from '../../place-input';
import { formatGivenName } from '../utils/nameUtils';
import {
  buildLineageGraphIndex,
  computeAutoRankLabel,
  formatPersonAliases,
  getPersonPrimaryTitle,
} from '../utils/personHelpers';

interface LineageTableViewProps {
  persons: PersonRecord[];
  selectedPersonId: string | null;
  clanSurname?: string;
  onSelectPerson: (id: string) => void;
  onAddPerson: () => void;
  onDeletePerson: (id: string) => void;
}

export const LineageTableView: React.FC<LineageTableViewProps> = ({
  persons,
  selectedPersonId,
  clanSurname = '',
  onSelectPerson,
  onAddPerson,
  onDeletePerson,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [genFilter, setGenFilter] = useState<string>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmDeleteId) return;
    const timer = setTimeout(() => setConfirmDeleteId(null), 2500);
    return () => clearTimeout(timer);
  }, [confirmDeleteId]);

  const graphIndex = useMemo(() => buildLineageGraphIndex(persons), [persons]);
  const maxGen = Math.max(...persons.map((p) => p.generation || 1), 1);

  const normalizedQuery = searchTerm.trim().toLowerCase();
  const filteredPersons = persons.filter((p) => {
    const aliasesText = formatPersonAliases(p).toLowerCase();
    const titleText = getPersonPrimaryTitle(p).toLowerCase();
    const burialText = getPersonPlaceDisplay(p, 'burial').toLowerCase();
    const birthPlaceText = getPersonPlaceDisplay(p, 'birth').toLowerCase();

    const matchesSearch =
      !normalizedQuery ||
      p.name.toLowerCase().includes(normalizedQuery) ||
      aliasesText.includes(normalizedQuery) ||
      titleText.includes(normalizedQuery) ||
      burialText.includes(normalizedQuery) ||
      birthPlaceText.includes(normalizedQuery);

    const matchesGen =
      genFilter === 'all' || p.generation.toString() === genFilter;
    return matchesSearch && matchesGen;
  });

  return (
    <div className="w-full h-full flex flex-col bg-background p-6 overflow-hidden">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 shrink-0">
        <div>
          <h2 className="yp-h2 text-foreground">宗谱族人名录总表</h2>
          <p className="text-[13px] leading-5 text-muted-foreground mt-0.5">
            全量世系人员结构化档案明细，支持跨世代、字号、功名及墓葬方位检索。
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search
              size={14}
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜姓名、字号或葬地..."
              className="pl-8.5"
            />
          </div>

          <Select
            value={genFilter}
            onChange={(e) => setGenFilter(e.target.value)}
            containerClassName="w-36 shrink-0"
            className="tabular-nums"
          >
            <option value="all" className="bg-card text-foreground">
              全部世次
            </option>
            {Array.from({ length: maxGen }, (_, i) => i + 1).map((g) => (
              <option
                key={g}
                value={String(g)}
                className="bg-card text-foreground"
              >
                第{g}世{g === 1 ? ' (始祖)' : ''}
              </option>
            ))}
          </Select>

          <Button onClick={onAddPerson} className="gap-1.5">
            <Plus size={15} aria-hidden="true" />
            <span>新增族人</span>
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 border border-border rounded-xl bg-card overflow-auto shadow-[var(--shadow-card)]">
        <table className="w-full text-left text-[13px] border-collapse">
          <thead className="bg-[hsl(var(--surface-subtle))] border-b border-border sticky top-0 z-10 text-muted-foreground font-medium">
            <tr>
              <th className="py-3 px-4 w-20 text-[12px]">世次</th>
              <th className="py-3 px-4 w-36 text-[12px]">姓名 / 字号</th>
              <th className="py-3 px-4 w-20 text-[12px]">排行</th>
              <th className="py-3 px-4 w-28 text-[12px]">承祧父祖</th>
              <th className="py-3 px-4 w-36 text-[12px]">配偶</th>
              <th className="py-3 px-4 w-44 text-[12px]">功名官阶</th>
              <th className="py-3 px-4 min-w-[200px] text-[12px]">
                生平与行状纪略
              </th>
              <th className="py-3 px-4 w-44 text-[12px]">墓茔坐向</th>
              <th className="py-3 px-4 w-20 text-center text-[12px]">状态</th>
              <th className="py-3 px-4 w-24 text-right text-[12px]">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredPersons.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="py-12 text-center text-[13px] text-muted-foreground"
                >
                  未匹配到族人记录
                </td>
              </tr>
            ) : (
              filteredPersons.map((p) => {
                const isSelected = p.id === selectedPersonId;
                const isConfirming = confirmDeleteId === p.id;
                const aliasesText = formatPersonAliases(p);
                const rankLabel = computeAutoRankLabel(p, persons);
                const father = p.fatherId
                  ? graphIndex.personById.get(p.fatherId)
                  : undefined;
                const spouses = p.spouseOfId
                  ? []
                  : graphIndex.spousesByPartnerId.get(p.id) || [];
                const primaryTitle = getPersonPrimaryTitle(p);
                const burialPlaceText = getPersonPlaceDisplay(p, 'burial').trim();

                return (
                  <tr
                    key={p.id}
                    onClick={() => onSelectPerson(p.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[hsl(var(--surface-active))] text-foreground font-medium'
                        : 'hover:bg-[hsl(var(--surface-hover))/0.45] text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <td className="py-3 px-4 font-semibold text-foreground font-mono tabular-nums whitespace-nowrap">
                      第{p.generation}世
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground text-[14px]">
                        {p.spouseOfId
                          ? [
                              p.surname && !p.name.startsWith(p.surname)
                                ? p.surname
                                : '',
                              p.name,
                            ].join('') || '配偶'
                          : formatGivenName(p.name, clanSurname)}
                      </div>
                      {aliasesText && (
                        <div className="text-[12px] text-muted-foreground mt-0.5">
                          {aliasesText}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">{rankLabel || '—'}</td>
                    <td className="py-3 px-4">
                      {father
                        ? `${formatGivenName(father.name, clanSurname)} 公`
                        : p.spouseOfId
                          ? '配偶节点'
                          : p.generation === 1
                            ? '始迁祖'
                            : '待考'}
                    </td>
                    <td className="py-3 px-4">
                      {spouses.length > 0 ? (
                        <div className="flex items-center gap-1.5 text-foreground">
                          <Heart
                            size={12}
                            aria-hidden="true"
                            className="text-rose-500 shrink-0"
                          />
                          <span>
                            {spouses
                              .map((s) =>
                                [
                                  s.surname && !s.name.startsWith(s.surname)
                                    ? s.surname
                                    : '',
                                  s.name,
                                ]
                                  .filter(Boolean)
                                  .join('')
                              )
                              .join('、')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">待注</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {primaryTitle ? (
                        <span className="inline-flex items-center gap-1 text-primary font-medium">
                          <Award size={12} className="shrink-0" aria-hidden="true" />
                          <span>{primaryTitle}</span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="line-clamp-2 max-w-md text-[12px] leading-relaxed">
                        {p.biography ||
                          (getPersonDateDisplay(p, 'birth')
                            ? `生于：${getPersonDateDisplay(p, 'birth')}`
                            : '暂无详细事略')}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {burialPlaceText ? (
                        <div className="flex items-center gap-1 text-[12px] truncate max-w-[180px]">
                          <MapPin
                            size={12}
                            aria-hidden="true"
                            className="shrink-0 text-muted-foreground"
                          />
                          <span className="truncate">{burialPlaceText}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[12px] font-medium ${
                          p.status === 'living'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {p.status === 'living' ? '健在' : '已故'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-primary"
                          onClick={() => onSelectPerson(p.id)}
                          title="编辑档案"
                          aria-label="编辑档案"
                        >
                          <Edit3 size={14} />
                        </Button>
                        {(p.generation > 1 || Boolean(p.spouseOfId)) && (
                          <Button
                            variant={isConfirming ? 'destructive' : 'ghost'}
                            size={isConfirming ? 'sm' : 'icon'}
                            className={
                              isConfirming
                                ? 'px-2 text-[12px]'
                                : 'text-muted-foreground hover:text-destructive'
                            }
                            onClick={() => {
                              if (isConfirming) {
                                setConfirmDeleteId(null);
                                onDeletePerson(p.id);
                              } else {
                                setConfirmDeleteId(p.id);
                              }
                            }}
                            title={isConfirming ? '确认删除' : '删除'}
                            aria-label={isConfirming ? '确认删除' : '删除'}
                          >
                            {isConfirming ? (
                              <>
                                <Check size={12} className="mr-0.5" /> 删
                              </>
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[12px] text-muted-foreground mt-3 shrink-0 font-mono tabular-nums">
        <span>
          当前显示 {filteredPersons.length} 条记录 / 总计 {persons.length} 位族人
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.print()}
          className="font-sans gap-1.5"
        >
          <Printer size={13} aria-hidden="true" />
          <span>打印名录</span>
        </Button>
      </div>
    </div>
  );
};
