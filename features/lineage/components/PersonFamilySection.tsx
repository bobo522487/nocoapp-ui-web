import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, User } from 'lucide-react';
import { PersonRecord, SpouseInfo } from '../types';
import { formatGivenName } from '../utils/nameUtils';
import {
  computeAutoRankLabel,
  formatSpouseSequenceLabel,
  getExtraRelationBadge,
} from '../utils/personHelpers';

interface PersonFamilySectionProps {
  person: PersonRecord;
  allPersons: PersonRecord[];
  clanSurname?: string;
  isWide?: boolean;
  onSelectPerson?: (personId: string) => void;
  onAddChild: (
    fatherId: string,
    motherInfo?: { motherId?: string; motherName?: string }
  ) => void;
  onAddSpouse: (personId: string) => void;
  onAddSibling?: (personId: string, gender?: 'male' | 'female') => void;
}

interface MemberDisplayItem {
  key: string;
  personId?: string;
  displayName: string;
  avatarUrl?: string;
  gender: 'male' | 'female' | 'unknown';
  lifespan: string;
  rankBadge?: string;
  extraRelationBadge?: string;
  isFocus: boolean;
}

interface SpouseDescriptor {
  key: string;
  matchId?: string;
  rawName: string;
  givenName?: string;
  sequenceLabel: string;
  item: MemberDisplayItem;
}

interface CoupleUnit {
  key: string;
  pairLabel: string;
  spouseItem?: MemberDisplayItem;
  children: MemberDisplayItem[];
  motherInfo?: { motherId?: string; motherName?: string };
}

function extractYearLabel(
  rawDate?: string,
  structuredDate?: {
    kind?: string;
    year?: number;
    dynastyName?: string;
    reignName?: string;
    originalText?: string | null;
  } | null
): string {
  if (structuredDate) {
    if (
      structuredDate.kind === 'exact' &&
      typeof structuredDate.year === 'number'
    ) {
      return `${structuredDate.year}年`;
    }
    if (structuredDate.kind === 'regnal' && structuredDate.dynastyName) {
      return `${structuredDate.dynastyName}${structuredDate.reignName || ''}${
        typeof structuredDate.year === 'number' ? `${structuredDate.year}年` : ''
      }`;
    }
    if (structuredDate.originalText?.trim()) {
      const m = structuredDate.originalText.match(/(-?\d{1,4})/);
      return m ? `${m[1]}年` : structuredDate.originalText.trim();
    }
  }
  const text = rawDate?.trim();
  if (!text) return '';
  const match = text.match(/(-?\d{1,4})/);
  return match ? `${match[1]}年` : text;
}

function formatLifespan(p: PersonRecord): string {
  const birth = extractYearLabel(
    p.birth?.date || p.birthDate,
    p.birth?.structuredDate
  );
  const death =
    p.status === 'living'
      ? '存'
      : extractYearLabel(
          p.death?.date || p.deathDate,
          p.death?.structuredDate
        ) || '歿';

  if (birth) return `${birth}–${death}`;
  if (death !== '存' && death !== '歿') return `–${death}`;
  return death;
}

function formatFullDisplayName(p: PersonRecord, clanSurname: string): string {
  const isSpouse = Boolean(p.spouseOfId);
  const effectiveSurname = isSpouse
    ? p.surname?.trim() || ''
    : p.surname?.trim() || clanSurname;
  const baseName = isSpouse
    ? [
        effectiveSurname && !p.name.startsWith(effectiveSurname)
          ? effectiveSurname
          : '',
        p.name,
      ].join('') || '配偶'
    : formatGivenName(p.name, effectiveSurname);
  return [baseName, p.nameSuffix?.trim() || ''].join('') || '未命名';
}

function doesNameMatchSpouse(
  targetName: string | undefined,
  sp: Pick<SpouseDescriptor, 'rawName' | 'givenName' | 'item'>
): boolean {
  const clean = targetName?.trim();
  if (!clean) return false;
  return (
    clean === sp.item.displayName ||
    clean === sp.rawName ||
    (Boolean(sp.givenName) && clean === sp.givenName)
  );
}

const MemberAvatar: React.FC<{
  avatarUrl?: string;
  displayName: string;
  gender: 'male' | 'female' | 'unknown';
}> = ({ avatarUrl, displayName, gender }) => {
  const toneClass =
    gender === 'female'
      ? 'bg-[#ED5481]/12 dark:bg-[#D16686]/15 text-[#B6335A] dark:text-[#E590AA] border-[#ED5481]/25 dark:border-[#D16686]/25'
      : gender === 'male'
        ? 'bg-[#2097B7]/12 dark:bg-[#3E9EB8]/15 text-[#057091] dark:text-[#6EC2DB] border-[#2097B7]/25 dark:border-[#3E9EB8]/25'
        : 'bg-muted text-muted-foreground border-border';

  return (
    <div
      aria-hidden="true"
      className={`w-9 h-9 rounded-full overflow-hidden border flex items-center justify-center shrink-0 text-xs font-semibold ${toneClass}`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      ) : displayName ? (
        <span>{displayName.slice(0, 1)}</span>
      ) : (
        <User size={15} />
      )}
    </div>
  );
};

const MemberRow: React.FC<{
  item: MemberDisplayItem;
  onSelect?: (id: string) => void;
}> = ({ item, onSelect }) => {
  const clickable = Boolean(item.personId && onSelect && !item.isFocus);

  const cardToneClass = item.isFocus
    ? 'bg-primary/[0.08] border-primary/40 dark:bg-primary/[0.12] dark:border-primary/40'
    : item.gender === 'male'
      ? `bg-[#2097B7]/[0.06] border-[#2097B7]/25 dark:bg-[#3E9EB8]/[0.08] dark:border-[#3E9EB8]/25 ${
          clickable
            ? 'hover:bg-[#2097B7]/[0.12] hover:border-[#057091]/45 dark:hover:bg-[#3E9EB8]/[0.15] dark:hover:border-[#58B1CD]/45'
            : ''
        }`
      : item.gender === 'female'
        ? `bg-[#ED5481]/[0.06] border-[#ED5481]/25 dark:bg-[#D16686]/[0.08] dark:border-[#D16686]/25 ${
            clickable
              ? 'hover:bg-[#ED5481]/[0.12] hover:border-[#ED5481]/45 dark:hover:bg-[#D16686]/[0.15] dark:hover:border-[#D16686]/45'
              : ''
          }`
        : `bg-card/60 border-border/75 ${
            clickable ? 'hover:bg-[hsl(var(--surface-hover))] hover:border-border' : ''
          }`;

  const content = (
    <div className="flex items-center gap-2.5 min-w-0 w-full">
      <MemberAvatar
        avatarUrl={item.avatarUrl}
        displayName={item.displayName}
        gender={item.gender}
      />
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center flex-wrap gap-1.5 min-w-0">
          <span
            className={`text-xs font-semibold truncate ${
              clickable
                ? 'text-foreground group-hover:text-primary group-hover:underline underline-offset-2'
                : 'text-foreground'
            }`}
          >
            {item.displayName}
          </span>
          {item.rankBadge && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none bg-background/85 dark:bg-background/50 border border-border/80 text-foreground/85 whitespace-nowrap shrink-0">
              {item.rankBadge}
            </span>
          )}
          {item.extraRelationBadge && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none bg-primary/10 border border-primary/25 text-primary whitespace-nowrap shrink-0">
              {item.extraRelationBadge}
            </span>
          )}
        </div>
        {item.lifespan && (
          <div className="text-[11px] text-muted-foreground truncate tabular-nums mt-0.5">
            {item.lifespan}
          </div>
        )}
      </div>
    </div>
  );

  if (clickable && item.personId) {
    return (
      <button
        type="button"
        onClick={() => onSelect?.(item.personId!)}
        className={`group w-full flex items-center px-2.5 py-2 rounded-md border transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:shadow-[var(--shadow-focus-halo)] ${cardToneClass}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`w-full flex items-center px-2.5 py-2 rounded-md border transition-colors duration-150 ${cardToneClass}`}
    >
      {content}
    </div>
  );
};

export const PersonFamilySection: React.FC<PersonFamilySectionProps> = ({
  person,
  allPersons,
  clanSurname = '',
  isWide = false,
  onSelectPerson,
  onAddChild,
  onAddSpouse,
  onAddSibling,
}) => {
  const [expandedChildrenByUnit, setExpandedChildrenByUnit] = useState<
    Record<string, boolean>
  >({});
  const [parentChildrenExpanded, setParentChildrenExpanded] = useState(true);

  const isUnitExpanded = (unitKey: string) =>
    expandedChildrenByUnit[unitKey] !== false;

  const toggleUnitExpanded = (unitKey: string) => {
    setExpandedChildrenByUnit((prev) => ({
      ...prev,
      [unitKey]: prev[unitKey] === false,
    }));
  };

  // 将当前抽屉草稿合并进全量列表，确保行内排行与关系实时响应编辑
  const livePersons = useMemo(() => {
    const exists = allPersons.some((p) => p.id === person.id);
    return exists
      ? allPersons.map((p) => (p.id === person.id ? person : p))
      : [...allPersons, person];
  }, [allPersons, person]);

  const isSpouseNode = Boolean(person.spouseOfId);
  const primaryId = person.spouseOfId || person.id;

  const primaryPerson = useMemo(() => {
    return livePersons.find((p) => p.id === primaryId) || person;
  }, [livePersons, primaryId, person]);

  // 夫妻卡片中的主位行：不显示关系和排行徽章
  const primaryCoupleItem = useMemo<MemberDisplayItem>(
    () => ({
      key: primaryPerson.id,
      personId: primaryPerson.id,
      displayName: formatFullDisplayName(primaryPerson, clanSurname),
      avatarUrl: primaryPerson.avatarUrl,
      gender: primaryPerson.gender,
      lifespan: formatLifespan(primaryPerson),
      isFocus: primaryPerson.id === person.id,
    }),
    [primaryPerson, clanSurname, person.id]
  );

  // 1. 收集配偶描述并按原配、继配顺序构建夫妻对（夫妻卡片内不显示关系和排行徽章）
  const spouseDescriptors = useMemo<SpouseDescriptor[]>(() => {
    const nodeSpouses = livePersons
      .filter((p) => p.spouseOfId === primaryPerson.id)
      .sort(
        (a, b) =>
          (a.siblingOrder ?? a.biographyOrder ?? 99) -
          (b.siblingOrder ?? b.biographyOrder ?? 99)
      );

    const nodeIds = new Set(nodeSpouses.map((s) => s.id));
    const descriptors: SpouseDescriptor[] = nodeSpouses.map((sp) => {
      const displayName = formatFullDisplayName(sp, clanSurname);
      const rawFull = [sp.surname?.trim() || '', sp.name?.trim() || '']
        .filter(Boolean)
        .join('');
      return {
        key: sp.id,
        matchId: sp.id,
        rawName: rawFull || displayName,
        givenName: sp.name?.trim() || undefined,
        sequenceLabel: computeAutoRankLabel(sp, livePersons),
        item: {
          key: sp.id,
          personId: sp.id,
          displayName,
          avatarUrl: sp.avatarUrl,
          gender: sp.gender,
          lifespan: formatLifespan(sp),
          isFocus: sp.id === person.id,
        },
      };
    });

    // 补充历史内嵌配偶（无独立节点时）
    const legacySpouses: SpouseInfo[] = primaryPerson.spouses || [];
    legacySpouses.forEach((sp, idx) => {
      if (sp.id && nodeIds.has(sp.id)) return;
      const nameClean = sp.name?.trim();
      if (!nameClean) return;
      const duplicateByName = descriptors.some((d) =>
        doesNameMatchSpouse(nameClean, d)
      );
      if (duplicateByName) return;
      const bYear = extractYearLabel(sp.birthDate);
      const dYear = extractYearLabel(sp.deathDate);
      const lifespan = bYear
        ? `${bYear}–${dYear || '存'}`
        : dYear
          ? `–${dYear}`
          : '';
      const key = sp.id || `legacy-sp-${idx}`;
      const inferredGender: 'male' | 'female' | 'unknown' =
        primaryPerson.gender === 'male'
          ? 'female'
          : primaryPerson.gender === 'female'
            ? 'male'
            : 'unknown';
      const orderNum = descriptors.length + 1;
      const sequenceLabel =
        sp.relationLabel?.trim() || formatSpouseSequenceLabel(orderNum);

      descriptors.push({
        key,
        matchId: sp.id,
        rawName: nameClean,
        sequenceLabel,
        item: {
          key,
          displayName: nameClean,
          gender: inferredGender,
          lifespan,
          isFocus: false,
        },
      });
    });

    return descriptors;
  }, [livePersons, primaryPerson, clanSurname, person.id]);

  const ownChildrenRecords = useMemo(() => {
    return livePersons
      .filter((p) => p.fatherId === primaryPerson.id && !p.spouseOfId)
      .sort(
        (a, b) =>
          (a.siblingOrder ?? a.biographyOrder ?? 99) -
          (b.siblingOrder ?? b.biographyOrder ?? 99)
      );
  }, [livePersons, primaryPerson.id]);

  const coupleUnits = useMemo<CoupleUnit[]>(() => {
    const toChildItem = (child: PersonRecord): MemberDisplayItem => ({
      key: child.id,
      personId: child.id,
      displayName: formatFullDisplayName(child, clanSurname),
      avatarUrl: child.avatarUrl,
      gender: child.gender,
      lifespan: formatLifespan(child),
      rankBadge: computeAutoRankLabel(child, livePersons),
      extraRelationBadge: getExtraRelationBadge(child),
      isFocus: child.id === person.id,
    });

    if (spouseDescriptors.length === 0) {
      return [
        {
          key: 'couple-primary-only',
          pairLabel: '',
          spouseItem: undefined,
          children: ownChildrenRecords.map(toChildItem),
          motherInfo: undefined,
        },
      ];
    }

    const buckets: PersonRecord[][] = spouseDescriptors.map(() => []);

    ownChildrenRecords.forEach((child) => {
      let matchedIndex = -1;

      if (child.motherId) {
        matchedIndex = spouseDescriptors.findIndex(
          (sp) => sp.matchId && sp.matchId === child.motherId
        );
      }

      if (matchedIndex === -1 && child.motherName?.trim()) {
        matchedIndex = spouseDescriptors.findIndex((sp) =>
          doesNameMatchSpouse(child.motherName, sp)
        );
      }

      if (matchedIndex === -1) {
        matchedIndex = 0;
      }

      buckets[matchedIndex].push(child);
    });

    const spouseRoleWord =
      primaryPerson.gender === 'female' ? '丈夫' : '妻子';

    return spouseDescriptors.map((sp, idx) => {
      const relationSuffix =
        sp.sequenceLabel && sp.sequenceLabel !== '配偶'
          ? ` · ${sp.sequenceLabel}`
          : '';
      return {
        key: `couple-${sp.key}`,
        pairLabel: `${spouseRoleWord}${idx + 1}${relationSuffix}`,
        spouseItem: sp.item,
        children: buckets[idx].map(toChildItem),
        motherInfo: {
          motherId: sp.matchId,
          motherName: sp.item.displayName,
        },
      };
    });
  }, [
    spouseDescriptors,
    ownChildrenRecords,
    clanSurname,
    livePersons,
    person.id,
    primaryPerson.gender,
  ]);

  // 2. 父母与兄妹数据（父母卡片内不显示关系和排行；子女卡片显示关系与排行）
  const fatherRecord = useMemo(() => {
    if (!person.fatherId) return null;
    return livePersons.find((p) => p.id === person.fatherId) || null;
  }, [livePersons, person.fatherId]);

  const parentPairItems = useMemo<MemberDisplayItem[]>(() => {
    const list: MemberDisplayItem[] = [];
    if (fatherRecord) {
      list.push({
        key: fatherRecord.id,
        personId: fatherRecord.id,
        displayName: formatFullDisplayName(fatherRecord, clanSurname),
        avatarUrl: fatherRecord.avatarUrl,
        gender: fatherRecord.gender,
        lifespan: formatLifespan(fatherRecord),
        isFocus: false,
      });

      const motherNodes = livePersons
        .filter((p) => p.spouseOfId === fatherRecord.id)
        .sort(
          (a, b) =>
            (a.siblingOrder ?? a.biographyOrder ?? 99) -
            (b.siblingOrder ?? b.biographyOrder ?? 99)
        );

      const hasExplicitMother = Boolean(
        person.motherId || person.motherName?.trim()
      );

      if (hasExplicitMother) {
        const matchedNode = motherNodes.find((m) => {
          if (person.motherId && m.id === person.motherId) return true;
          if (!person.motherName?.trim()) return false;
          const cleanMother = person.motherName.trim();
          const full = formatFullDisplayName(m, clanSurname);
          const rawFull = [m.surname?.trim() || '', m.name?.trim() || '']
            .filter(Boolean)
            .join('');
          return (
            cleanMother === full ||
            cleanMother === rawFull ||
            cleanMother === m.name?.trim()
          );
        });

        if (matchedNode) {
          list.push({
            key: matchedNode.id,
            personId: matchedNode.id,
            displayName: formatFullDisplayName(matchedNode, clanSurname),
            avatarUrl: matchedNode.avatarUrl,
            gender: matchedNode.gender,
            lifespan: formatLifespan(matchedNode),
            isFocus: false,
          });
        } else {
          const legacyList = fatherRecord.spouses || [];
          const matchedLegacy = legacyList.find(
            (sp) =>
              (person.motherId && sp.id === person.motherId) ||
              (person.motherName?.trim() &&
                sp.name?.trim() === person.motherName.trim())
          );
          const displayMotherName =
            person.motherName?.trim() || matchedLegacy?.name?.trim();
          if (displayMotherName) {
            list.push({
              key: matchedLegacy?.id || 'mother-matched-text',
              displayName: displayMotherName,
              gender: 'female',
              lifespan: '',
              isFocus: false,
            });
          }
        }
      } else if (motherNodes.length > 0) {
        motherNodes.forEach((m) => {
          list.push({
            key: m.id,
            personId: m.id,
            displayName: formatFullDisplayName(m, clanSurname),
            avatarUrl: m.avatarUrl,
            gender: m.gender,
            lifespan: formatLifespan(m),
            isFocus: false,
          });
        });
      } else if (fatherRecord.spouses?.[0]?.name) {
        list.push({
          key: 'father-legacy-spouse',
          displayName: fatherRecord.spouses[0].name,
          gender: 'female',
          lifespan: '',
          isFocus: false,
        });
      }
    } else {
      if (person.fatherName?.trim()) {
        list.push({
          key: 'father-text',
          displayName: person.fatherName.trim(),
          gender: 'male',
          lifespan: '',
          isFocus: false,
        });
      }
      if (person.motherName?.trim()) {
        list.push({
          key: 'mother-text',
          displayName: person.motherName.trim(),
          gender: 'female',
          lifespan: '',
          isFocus: false,
        });
      }
    }
    return list;
  }, [
    fatherRecord,
    livePersons,
    clanSurname,
    person.fatherName,
    person.motherId,
    person.motherName,
  ]);

  const siblingItems = useMemo<MemberDisplayItem[]>(() => {
    if (!fatherRecord) return [];
    return livePersons
      .filter((p) => p.fatherId === fatherRecord.id && !p.spouseOfId)
      .sort(
        (a, b) =>
          (a.siblingOrder ?? a.biographyOrder ?? 99) -
          (b.siblingOrder ?? b.biographyOrder ?? 99)
      )
      .map((sib) => ({
        key: sib.id,
        personId: sib.id,
        displayName: formatFullDisplayName(sib, clanSurname),
        avatarUrl: sib.avatarUrl,
        gender: sib.gender,
        lifespan: formatLifespan(sib),
        rankBadge: computeAutoRankLabel(sib, livePersons),
        extraRelationBadge: getExtraRelationBadge(sib),
        isFocus: sib.id === person.id,
      }));
  }, [fatherRecord, livePersons, clanSurname, person.id]);

  return (
    <div
      className={`grid gap-5 ${
        isWide ? 'grid-cols-2' : 'grid-cols-1'
      }`}
    >
      {/* 分组一：配偶与子女 */}
      <div className="space-y-2 min-w-0">
        <h5 className="text-xs font-semibold text-foreground px-0.5">
          配偶与子女
        </h5>

        <div className="space-y-3">
          {coupleUnits.map((unit) => {
            const expanded = isUnitExpanded(unit.key);
            return (
              <div key={unit.key} className="space-y-1.5">
                {coupleUnits.length > 1 && unit.pairLabel && (
                  <div className="px-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                    {unit.pairLabel}
                  </div>
                )}

                {/* 夫妻卡片（不显示关系与排行徽章） */}
                <div className="rounded-md bg-[hsl(var(--surface-subtle))] p-2">
                  <ul className="space-y-1.5">
                    <li>
                      <MemberRow
                        item={primaryCoupleItem}
                        onSelect={onSelectPerson}
                      />
                    </li>
                    {unit.spouseItem && (
                      <li>
                        <MemberRow
                          item={unit.spouseItem}
                          onSelect={onSelectPerson}
                        />
                      </li>
                    )}
                  </ul>
                </div>

                {/* 对应子女卡片：显示关系与排行徽章 */}
                <div className="ml-5 rounded-md bg-[hsl(var(--surface-active))]/70 dark:bg-[hsl(var(--surface-active))]/45 p-2 space-y-1.5">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => toggleUnitExpanded(unit.key)}
                    className="w-full flex items-center justify-between gap-2 px-2 py-1 rounded text-xs font-medium text-foreground hover:bg-card/60 transition-colors cursor-pointer"
                  >
                    <span className="tabular-nums">
                      子女（{unit.children.length}）
                    </span>
                    {expanded ? (
                      <ChevronDown
                        size={14}
                        className="text-muted-foreground shrink-0"
                        aria-hidden="true"
                      />
                    ) : (
                      <ChevronRight
                        size={14}
                        className="text-muted-foreground shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </button>

                  {expanded && (
                    <div className="space-y-1.5">
                      {unit.children.length > 0 ? (
                        <ol className="space-y-1.5">
                          {unit.children.map((child) => (
                            <li key={child.key}>
                              <MemberRow
                                item={child}
                                onSelect={onSelectPerson}
                              />
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="px-2.5 py-2 text-[11px] text-muted-foreground">
                          暂无子女记录
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          onAddChild(primaryPerson.id, unit.motherInfo)
                        }
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-primary hover:bg-primary/10 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Plus size={13} aria-hidden="true" />
                        <span>添加子女</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onAddSpouse(primaryPerson.id)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-primary hover:bg-primary/10 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus size={13} aria-hidden="true" />
          <span>添加配偶</span>
        </button>
      </div>

      {/* 分组二：父母与兄妹 */}
      <div className="space-y-2 min-w-0">
        <h5 className="text-xs font-semibold text-foreground px-0.5">
          父母与兄妹
        </h5>

        {parentPairItems.length > 0 || siblingItems.length > 0 ? (
          <div className="space-y-1.5">
            {/* 父母卡片（不显示关系与排行徽章） */}
            {parentPairItems.length > 0 && (
              <div className="rounded-md bg-[hsl(var(--surface-subtle))] p-2">
                <ul className="space-y-1.5">
                  {parentPairItems.map((parent) => (
                    <li key={parent.key}>
                      <MemberRow
                        item={parent}
                        onSelect={onSelectPerson}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 整个同辈子女卡片：显示关系与排行徽章 */}
            {fatherRecord && (
              <div className="ml-5 rounded-md bg-[hsl(var(--surface-active))]/70 dark:bg-[hsl(var(--surface-active))]/45 p-2 space-y-1.5">
                <button
                  type="button"
                  aria-expanded={parentChildrenExpanded}
                  onClick={() => setParentChildrenExpanded((v) => !v)}
                  className="w-full flex items-center justify-between gap-2 px-2 py-1 rounded text-xs font-medium text-foreground hover:bg-card/60 transition-colors cursor-pointer"
                >
                  <span className="tabular-nums">
                    子女（{siblingItems.length}）
                  </span>
                  {parentChildrenExpanded ? (
                    <ChevronDown
                      size={14}
                      className="text-muted-foreground shrink-0"
                      aria-hidden="true"
                    />
                  ) : (
                    <ChevronRight
                      size={14}
                      className="text-muted-foreground shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </button>

                {parentChildrenExpanded && (
                  <ol className="space-y-1.5">
                    {siblingItems.map((sib) => (
                      <li key={sib.key}>
                        <MemberRow
                          item={sib}
                          onSelect={onSelectPerson}
                        />
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-md bg-[hsl(var(--surface-subtle))]/50 px-3 py-3.5 text-[11px] text-muted-foreground">
            {isSpouseNode
              ? '当前为配偶节点，未关联原生父母世系。'
              : '暂无父母与同胞记录（开基始祖或尚未关联父母）。'}
          </div>
        )}

        {!isSpouseNode && onAddSibling && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onAddSibling(primaryPerson.id, 'male')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-primary hover:bg-primary/10 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus size={13} aria-hidden="true" />
              <span>加入兄弟</span>
            </button>
            <button
              type="button"
              onClick={() => onAddSibling(primaryPerson.id, 'female')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-primary hover:bg-primary/10 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus size={13} aria-hidden="true" />
              <span>加入姐妹</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
