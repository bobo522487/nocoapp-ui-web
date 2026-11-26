import React, { useMemo } from 'react';
import { PersonRecord } from '../types';
import { Crown, Heart, MapPin, Award } from 'lucide-react';
import { formatGivenName } from '../utils/nameUtils';
import { getLineageGraph } from '../domain/lineageGraph';
import {
  computeAutoRankLabel,
  formatPersonAliases,
  getPersonPrimaryTitle,
} from '../utils/personHelpers';
import { getPersonPlaceDisplay } from '../../place-input';

interface LineageGridViewProps {
  persons: PersonRecord[];
  selectedPersonId: string | null;
  clanSurname?: string;
  onSelectPerson: (id: string) => void;
  onAddChild: (fatherId: string) => void;
}

export const LineageGridView: React.FC<LineageGridViewProps> = ({
  persons,
  selectedPersonId,
  clanSurname = '',
  onSelectPerson,
  onAddChild,
}) => {
  const graphIndex = useMemo(() => getLineageGraph(persons), [persons]);
  const maxGen = Math.max(...persons.map((p) => p.generation), 1);
  const generations = Array.from(
    { length: Math.max(Math.min(maxGen, 5), 1) },
    (_, i) => i + 1
  );

  return (
    <div className="w-full h-full overflow-auto bg-background p-6">
      {/* Intro Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="yp-h2 text-foreground">
            欧式五世一表 · 世系大表
          </h2>
          <p className="text-[13px] leading-5 text-muted-foreground mt-1">
            依宋代欧阳修世系表体例，五世一图，昭穆分明，每世详注名讳、字号、官衔、配偶生卒及葬茔坐向。
          </p>
        </div>
        <div className="text-[12px] text-muted-foreground font-mono tabular-nums whitespace-nowrap shrink-0">
          五世图谱 (1世 ~ {generations.length}世)
        </div>
      </div>

      {/* Five-Generation Column Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 min-w-[1040px]">
        {generations.map((gen) => {
          const genPersons = persons.filter((p) => p.generation === gen);
          return (
            <div
              key={gen}
              className="flex flex-col border border-border rounded-xl bg-card overflow-hidden shadow-[var(--shadow-card)]"
            >
              <div className="px-4 py-3 bg-[hsl(var(--surface-subtle))] border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-[14px] text-foreground font-mono tabular-nums">
                  {gen === 1 && (
                    <Crown size={15} className="text-primary" aria-hidden="true" />
                  )}
                  <span>第 {gen} 世</span>
                </div>
                <span className="text-[12px] text-muted-foreground font-medium font-mono tabular-nums">
                  {genPersons.length} 人
                </span>
              </div>

              <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
                {genPersons.length === 0 ? (
                  <div className="text-center py-10 text-[13px] text-muted-foreground">
                    暂无本世族人
                  </div>
                ) : (
                  genPersons.map((p) => {
                    const isSelected = p.id === selectedPersonId;
                    const father = p.fatherId
                      ? graphIndex.personById.get(p.fatherId)
                      : undefined;
                    const children = p.spouseOfId
                      ? []
                      : graphIndex.childrenByFatherId.get(p.id) || [];
                    const spouses = p.spouseOfId
                      ? []
                      : graphIndex.spousesByPartnerId.get(p.id) || [];
                    const aliasesText = formatPersonAliases(p);
                    const rankLabel = computeAutoRankLabel(p, persons);
                    const primaryTitle = getPersonPrimaryTitle(p);
                    const burialPlaceText = getPersonPlaceDisplay(p, 'burial').trim();

                    return (
                      <div
                        key={p.id}
                        onClick={() => onSelectPerson(p.id)}
                        className={`p-3 rounded-lg border transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-[hsl(var(--surface-active))] ring-1 ring-primary shadow-[var(--shadow-focus-halo)]'
                            : 'border-border/80 bg-background/85 hover:border-primary/40 hover:bg-[hsl(var(--surface-hover))/0.45]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-[14px] text-foreground truncate">
                                {p.spouseOfId
                                  ? [
                                      p.surname && !p.name.startsWith(p.surname)
                                        ? p.surname
                                        : '',
                                      p.name,
                                    ].join('') || '配偶'
                                  : formatGivenName(p.name, clanSurname)}
                              </span>
                              {aliasesText && (
                                <span className="text-[12px] text-muted-foreground truncate">
                                  {aliasesText}
                                </span>
                              )}
                            </div>
                            {father && (
                              <div className="text-[12px] text-muted-foreground mt-0.5 truncate">
                                父：{formatGivenName(father.name, clanSurname)}公
                              </div>
                            )}
                          </div>
                          {rankLabel && (
                            <span className="text-[12px] text-muted-foreground shrink-0">
                              {rankLabel}
                            </span>
                          )}
                        </div>

                        {primaryTitle && (
                          <div className="mt-1.5 flex items-center gap-1 text-[12px] text-primary font-medium truncate">
                            <Award size={12} className="shrink-0" aria-hidden="true" />
                            <span className="truncate">{primaryTitle}</span>
                          </div>
                        )}

                        {spouses.length > 0 && (
                          <div className="mt-1.5 flex items-center gap-1 text-[12px] text-muted-foreground">
                            <Heart
                              size={12}
                              className="text-rose-500 shrink-0"
                              aria-hidden="true"
                            />
                            <span className="truncate">
                              配：
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
                        )}

                        {burialPlaceText && (
                          <div className="mt-1 flex items-center gap-1 text-[12px] text-muted-foreground truncate">
                            <MapPin size={12} className="shrink-0" aria-hidden="true" />
                            <span className="truncate">{burialPlaceText}</span>
                          </div>
                        )}

                        {!p.spouseOfId && (
                          <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-[12px] text-muted-foreground font-mono tabular-nums">
                            <span>出 {children.length} 子</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddChild(p.id);
                              }}
                              className="font-sans text-primary hover:underline font-medium cursor-pointer"
                            >
                              + 添子嗣
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
