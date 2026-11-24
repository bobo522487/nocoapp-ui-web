import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  FileText,
  FolderOpen,
  FolderPlus,
  GitFork,
  Plus,
  ScrollText,
  Settings,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '../../../components/ui/button';
import { findItemDeep } from '../../../components/common/Tree/utilities';
import { useRouteContext } from '../../../hooks/useRouteContext';
import { useResizable } from '../../../hooks/useResizable';
import { useWorkspaceStore } from '../../../store/useWorkspaceStore';
import {
  DEFAULT_LINEAGE_TREE,
  findFirstChartId,
  makeChartStorageKey,
  useLineageStore,
} from '../../../store/useLineageStore';
import { createSeedPersonsForChart } from '../../lineage/lineageData';
import { PersonLifeEvent, PersonRecord } from '../../lineage/types';
import { LineageTreeView } from '../../lineage/components/LineageTreeView';
import { PersonDetailPanel } from '../../lineage/components/PersonDetailPanel';
import {
  AddRelativeContext,
  AddRelativeModal,
  AddRelativeSubmitPayload,
} from '../../lineage/components/AddRelativeModal';
import { normalizePersonForSave } from '../../lineage/utils/personHelpers';
import { LineageEditorModal } from '../components/LineageEditorModal';
import { useArticleStore } from '../../../store/useArticleStore';
import {
  extractPlainTextFromHtml,
  findFirstArticleId,
  makeArticleStorageKey,
} from '../../articles/articleData';
import { WordArticleEditor } from '../../articles/components/WordArticleEditor';
import { ArticleMetaModal } from '../../articles/components/ArticleMetaModal';
import { BookWorkspace } from '../../books/components/BookWorkspace';

export type GenealogySectionType = 'lineage' | 'articles' | 'books';

interface GenealogySectionPageProps {
  section: GenealogySectionType;
}

const SECTION_CONFIG: Record<
  GenealogySectionType,
  {
    title: string;
    subtitle: string;
    icon: React.FC<{ size?: number; className?: string }>;
    emptyTitle: string;
    emptyDesc: string;
    outlineItems: { name: string; desc: string }[];
  }
> = {
  lineage: {
    title: '世系',
    subtitle: '梳理家族世代传承、支派脉络与成员亲属关系树。',
    icon: GitFork,
    emptyTitle: '世系图谱工作区',
    emptyDesc:
      '可在左侧世系目录中拖拽排序、折叠分组或切换任意世系图谱。',
    outlineItems: [
      { name: '世系总图', desc: '按世代与支系查看家族树形脉络' },
      { name: '房支管理', desc: '梳理各房分派渊源与迁徙记录' },
      { name: '成员名录', desc: '维护字辈、行第、配偶与生平纪略' },
    ],
  },
  articles: {
    title: '谱文',
    subtitle: '编修序言、凡例、姓氏源流、家训族规与人物传记。',
    icon: ScrollText,
    emptyTitle: '谱文编修工作台',
    emptyDesc:
      '可在左侧谱文目录中拖拽排序、按卷目归档并切换任意谱文进行排版编辑。',
    outlineItems: [
      { name: '谱序与凡例', desc: '记录修谱缘起、体例说明与编委会名录' },
      { name: '源流与家训', desc: '汇编姓氏得姓源流、祖训家规与祠规' },
      { name: '传记与艺文', desc: '收录先贤行状、诗词歌赋与大事记' },
    ],
  },
  books: {
    title: '谱书',
    subtitle: '组织分卷目录、版式排版预览与线装谱书成品输出。',
    icon: BookOpen,
    emptyTitle: '谱书模块准备中',
    emptyDesc:
      '后续可将已完成的世系与谱文自动汇集编排，生成传统欧式、苏式或现代双栏版式谱书。',
    outlineItems: [
      { name: '封面与题签', desc: '沿用当前家族主题名、姓氏印章与配色' },
      { name: '分卷目录', desc: '编排卷首、世系表、谱文及附录页码顺序' },
      { name: '版式与印制', desc: '预览电子版谱书并导出高清印刷成册文件' },
    ],
  },
};

const GenealogySectionPage: React.FC<GenealogySectionPageProps> = ({
  section,
}) => {
  const navigate = useNavigate();
  const { activeProjectId } = useRouteContext();
  const projects = useWorkspaceStore((s) => s.projects);
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const treesByProject = useLineageStore((s) => s.treesByProject);
  const selectedNodeIdByProject = useLineageStore(
    (s) => s.selectedNodeIdByProject
  );
  const personsByChart = useLineageStore((s) => s.personsByChart);
  const selectedPersonIdByChart = useLineageStore(
    (s) => s.selectedPersonIdByChart
  );
  const selectNode = useLineageStore((s) => s.selectNode);
  const addChart = useLineageStore((s) => s.addChart);
  const selectPersonStore = useLineageStore((s) => s.selectPerson);
  const addPersonStore = useLineageStore((s) => s.addPerson);
  const addPersonsBatchStore = useLineageStore((s) => s.addPersonsBatch);
  const addParentForPersonStore = useLineageStore((s) => s.addParentForPerson);
  const updatePersonStore = useLineageStore((s) => s.updatePerson);
  const deletePersonStore = useLineageStore((s) => s.deletePerson);

  const [isCreateLineageOpen, setIsCreateLineageOpen] = useState(false);
  const [isCreateArticleOpen, setIsCreateArticleOpen] = useState(false);

  const articleTreesByProject = useArticleStore((s) => s.treesByProject);
  const selectedArticleNodeIdByProject = useArticleStore(
    (s) => s.selectedNodeIdByProject
  );
  const articlesByKey = useArticleStore((s) => s.articlesByKey);
  const ensureArticleInitialized = useArticleStore(
    (s) => s.ensureProjectInitialized
  );
  const selectArticleNode = useArticleStore((s) => s.selectNode);
  const addArticleFolder = useArticleStore((s) => s.addFolder);
  const addArticle = useArticleStore((s) => s.addArticle);
  const updateArticleContent = useArticleStore((s) => s.updateArticleContent);

  const { width: inspectorWidth, startResizing } = useResizable({
    initialWidth: 440,
    minWidth: 360,
    maxWidth: 640,
    edge: 'right',
  });

  const activeProject =
    projects.find((p) => p.id === activeProjectId) ||
    projects.find((p) => p.workspaceId === activeWorkspaceId) ||
    projects[0];

  useEffect(() => {
    if (section !== 'articles' || !activeProjectId) return;
    ensureArticleInitialized(activeProjectId, {
      familyName: activeProject?.name,
      surname: activeProject?.primarySurname,
      hallName: activeProject?.primaryName,
      ancestor: activeProject?.ancestor,
      region: activeProject?.region,
    });
  }, [
    section,
    activeProjectId,
    activeProject?.name,
    activeProject?.primarySurname,
    activeProject?.primaryName,
    activeProject?.ancestor,
    activeProject?.region,
    ensureArticleInitialized,
  ]);

  const articleTree = useMemo(
    () => articleTreesByProject[activeProjectId] || [],
    [articleTreesByProject, activeProjectId]
  );

  const defaultArticleId = useMemo(
    () =>
      findFirstArticleId(articleTree) ||
      (articleTree[0]?.id ? String(articleTree[0].id) : ''),
    [articleTree]
  );

  const selectedArticleNodeId =
    selectedArticleNodeIdByProject[activeProjectId] ?? defaultArticleId;

  const selectedArticleNode = useMemo(
    () =>
      (selectedArticleNodeId
        ? findItemDeep(articleTree, selectedArticleNodeId)
        : null) ||
      (defaultArticleId ? findItemDeep(articleTree, defaultArticleId) : null) ||
      articleTree[0] ||
      null,
    [articleTree, selectedArticleNodeId, defaultArticleId]
  );

  const activeArticleDoc = useMemo(() => {
    if (!selectedArticleNode || selectedArticleNode.type !== 'article') {
      return null;
    }
    const id = String(selectedArticleNode.id);
    const key = makeArticleStorageKey(activeProjectId, id);
    return (
      articlesByKey[key] || {
        id,
        title: selectedArticleNode.data?.name || '未命名谱文',
        subtitle: '',
        author: activeProject?.primaryName
          ? `${activeProject.primaryName}编委会`
          : '家族编委会',
        contentHtml: '<p></p>',
        wordCount: 0,
        updatedAt: '刚刚',
      }
    );
  }, [
    selectedArticleNode,
    activeProjectId,
    articlesByKey,
    activeProject?.primaryName,
  ]);

  const lineageTree = useMemo(
    () => treesByProject[activeProjectId] || DEFAULT_LINEAGE_TREE,
    [treesByProject, activeProjectId]
  );

  const defaultChartId = useMemo(
    () =>
      findFirstChartId(lineageTree) ||
      String(lineageTree[0]?.id || 'lineage-group-royal'),
    [lineageTree]
  );

  const selectedLineageId =
    selectedNodeIdByProject[activeProjectId] ?? defaultChartId;

  const selectedLineageNode = useMemo(
    () =>
      findItemDeep(lineageTree, selectedLineageId) ||
      findItemDeep(lineageTree, defaultChartId) ||
      lineageTree[0],
    [lineageTree, selectedLineageId, defaultChartId]
  );

  const chartId = String(selectedLineageNode?.id || '');
  const chartName = selectedLineageNode?.data?.name || '世系图谱';
  const chartStorageKey = makeChartStorageKey(activeProjectId, chartId);

  const effectiveSurname = useMemo(() => {
    if (selectedLineageNode?.data?.surname !== undefined) {
      return selectedLineageNode.data.surname;
    }
    if (chartId.startsWith('lineage-royal-')) return '刘';
    if (
      chartId.startsWith('lineage-other-') ||
      chartId.startsWith('lineage-ancestor-')
    ) {
      return '';
    }
    return activeProject?.primarySurname || '';
  }, [selectedLineageNode?.data?.surname, chartId, activeProject?.primarySurname]);

  const chartPersons = useMemo(() => {
    if (!chartId || selectedLineageNode?.type === 'folder') return [];
    return (
      personsByChart[chartStorageKey] ||
      createSeedPersonsForChart(chartId, chartName, effectiveSurname)
    );
  }, [
    chartId,
    chartName,
    chartStorageKey,
    effectiveSurname,
    personsByChart,
    selectedLineageNode?.type,
  ]);

  const selectedPersonId =
    selectedPersonIdByChart[chartStorageKey] ?? null;

  const selectedPerson = useMemo(
    () =>
      selectedPersonId
        ? chartPersons.find((p) => p.id === selectedPersonId) ?? null
        : null,
    [chartPersons, selectedPersonId]
  );

  const [addRelativeContext, setAddRelativeContext] =
    useState<AddRelativeContext | null>(null);

  useEffect(() => {
    setAddRelativeContext(null);
  }, [activeProjectId, chartId]);

  const handleSelectPerson = (personId: string | null) => {
    if (!chartId) return;
    selectPersonStore(activeProjectId, chartId, personId);
  };

  const handleUpdatePerson = (
    personId: string,
    updates: Partial<PersonRecord>
  ) => {
    if (!chartId) return;
    updatePersonStore(
      activeProjectId,
      chartId,
      personId,
      updates,
      chartName,
      effectiveSurname
    );
  };

  const handleDeletePerson = (personId: string) => {
    if (!chartId) return;
    deletePersonStore(
      activeProjectId,
      chartId,
      personId,
      chartName,
      effectiveSurname
    );
  };

  const handleOpenAddChild = (
    fatherId: string,
    gender: 'male' | 'female' = 'male',
    motherInfo?: { motherId?: string; motherName?: string }
  ) => {
    if (!chartId) return;
    const rawParent = chartPersons.find((p) => p.id === fatherId);
    if (!rawParent) return;
    const isMotherTrigger = Boolean(rawParent.spouseOfId);
    const resolvedFatherId = rawParent.spouseOfId || rawParent.id;
    const father = chartPersons.find((p) => p.id === resolvedFatherId) || rawParent;
    const resolvedMotherId =
      motherInfo?.motherId ||
      (isMotherTrigger ? rawParent.id : undefined);
    const resolvedMotherName =
      motherInfo?.motherName ||
      (isMotherTrigger
        ? [rawParent.surname?.trim() || '', rawParent.name?.trim() || '']
            .filter(Boolean)
            .join('') || undefined
        : undefined);

    setAddRelativeContext({
      relation: 'child',
      targetPerson: father,
      defaultGender: gender,
      initiatedFrom: isMotherTrigger ? 'mother' : 'father',
      motherInfo:
        resolvedMotherId || resolvedMotherName
          ? { motherId: resolvedMotherId, motherName: resolvedMotherName }
          : undefined,
    });
  };

  const handleOpenAddSibling = (
    refPersonId: string,
    gender: 'male' | 'female' = 'male'
  ) => {
    if (!chartId) return;
    const rawTarget = chartPersons.find((p) => p.id === refPersonId);
    if (!rawTarget) return;
    const resolvedRefId = rawTarget.spouseOfId || rawTarget.id;
    const refPerson =
      chartPersons.find((p) => p.id === resolvedRefId) || rawTarget;

    setAddRelativeContext({
      relation: 'sibling',
      targetPerson: refPerson,
      defaultGender: gender,
    });
  };

  const handleOpenAddSpouse = (personId: string) => {
    if (!chartId) return;
    const rawTarget = chartPersons.find((p) => p.id === personId);
    if (!rawTarget) return;
    const partnerId = rawTarget.spouseOfId || rawTarget.id;
    const partner = chartPersons.find((p) => p.id === partnerId) || rawTarget;

    setAddRelativeContext({
      relation: 'spouse',
      targetPerson: partner,
      defaultGender: partner.gender === 'male' ? 'female' : 'male',
    });
  };

  const handleOpenAddParent = (personId: string) => {
    if (!chartId) return;
    const target = chartPersons.find((p) => p.id === personId);
    if (!target) return;

    const existingFather = target.fatherId
      ? chartPersons.find((p) => p.id === target.fatherId)
      : null;

    const existingFatherSpouses = existingFather
      ? chartPersons.filter((p) => p.spouseOfId === existingFather.id)
      : [];

    const defaultGender: 'male' | 'female' =
      existingFather && existingFatherSpouses.length === 0 ? 'female' : 'male';

    setAddRelativeContext({
      relation: 'parent',
      targetPerson: target,
      defaultGender,
    });
  };

  const handleConfirmAddRelative = (
    context: AddRelativeContext,
    payload: AddRelativeSubmitPayload
  ) => {
    if (!chartId) return;

    const newId = `person-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const keepSelection = Boolean(selectedPersonId);

    const birth =
      payload.birthDate || payload.birthPlace
        ? {
            structuredDate: payload.birthDate ?? undefined,
            structuredPlace: payload.birthPlace ?? undefined,
          }
        : undefined;

    const isDeceased = payload.status === 'deceased';
    const death =
      isDeceased &&
      (payload.deathDate ||
        payload.deathPlace ||
        payload.deathCause ||
        payload.burialPlace)
        ? {
            structuredDate: payload.deathDate ?? undefined,
            structuredPlace: payload.deathPlace ?? undefined,
            cause: payload.deathCause,
            structuredBurialPlace: payload.burialPlace ?? undefined,
          }
        : undefined;

    if (context.relation === 'child') {
      const father = context.targetPerson;
      const siblingCount = chartPersons.filter(
        (p) => p.fatherId === father.id && !p.spouseOfId
      ).length;
      const generation = father ? father.generation + 1 : 1;

      const personsToInsert: PersonRecord[] = [];
      let referencePersons = chartPersons;
      let resolvedMotherId =
        payload.motherId ?? context.motherInfo?.motherId;

      if (payload.shouldAutoCreateMother && father) {
        const autoMotherId = `person-mother-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const cleanMotherName = payload.motherName?.trim() || '不详';
        const existingSpouseCount = chartPersons.filter(
          (p) => p.spouseOfId === father.id
        ).length;
        const autoMotherDraft: PersonRecord = {
          id: autoMotherId,
          branchId: chartId,
          name: cleanMotherName,
          generation: father.generation,
          gender: 'female',
          status: father.status || 'living',
          siblingOrder: existingSpouseCount + 1,
          fatherId: null,
          spouseOfId: father.id,
          relationType: '妻子',
          biographyOrder: chartPersons.length + 1,
        };
        const normalizedMother = normalizePersonForSave(
          autoMotherDraft,
          referencePersons
        );
        personsToInsert.push(normalizedMother);
        referencePersons = [...referencePersons, normalizedMother];
        resolvedMotherId = normalizedMother.id;
      }

      const defaultRelationType =
        payload.gender === 'female' ? '生女' : '生子';

      const draftChild: PersonRecord = {
        id: newId,
        branchId: chartId,
        surname: payload.surname,
        name: payload.name,
        romanizedName: payload.romanizedName,
        generation,
        gender: payload.gender,
        status: payload.status,
        siblingOrder: father ? siblingCount + 1 : undefined,
        fatherId: father ? father.id : null,
        motherId: resolvedMotherId,
        relationType: payload.relationType || defaultRelationType,
        fatherRelationType:
          payload.fatherRelationType ||
          payload.relationType ||
          defaultRelationType,
        motherRelationType:
          payload.motherRelationType ||
          payload.relationType ||
          defaultRelationType,
        birth,
        death,
        biographyOrder: referencePersons.length + 1,
      };
      const normalizedChild = normalizePersonForSave(
        draftChild,
        referencePersons
      );
      personsToInsert.push(normalizedChild);

      if (personsToInsert.length > 1) {
        addPersonsBatchStore(
          activeProjectId,
          chartId,
          personsToInsert,
          chartName,
          effectiveSurname,
          { selectId: keepSelection ? normalizedChild.id : null }
        );
      } else {
        addPersonStore(
          activeProjectId,
          chartId,
          normalizedChild,
          chartName,
          effectiveSurname,
          { select: keepSelection }
        );
      }
    } else if (context.relation === 'sibling') {
      const refPerson = context.targetPerson;
      const siblingCount = refPerson.fatherId
        ? chartPersons.filter(
            (p) => p.fatherId === refPerson.fatherId && !p.spouseOfId
          ).length
        : chartPersons.filter(
            (p) =>
              !p.fatherId &&
              !p.spouseOfId &&
              p.generation === refPerson.generation
          ).length;
      const draftSibling: PersonRecord = {
        id: newId,
        branchId: chartId,
        surname: payload.surname,
        name: payload.name,
        romanizedName: payload.romanizedName,
        generation: refPerson.generation || 1,
        gender: payload.gender,
        status: payload.status,
        siblingOrder: siblingCount + 1,
        fatherId: refPerson.fatherId ?? null,
        motherId: refPerson.motherId,
        relationType: payload.gender === 'female' ? '生女' : '生子',
        birth,
        death,
        biographyOrder: chartPersons.length + 1,
      };
      const normalized = normalizePersonForSave(draftSibling, chartPersons);
      addPersonStore(
        activeProjectId,
        chartId,
        normalized,
        chartName,
        effectiveSurname,
        { select: keepSelection }
      );
    } else if (context.relation === 'spouse') {
      const partner = context.targetPerson;
      const existingSpouseCount = chartPersons.filter(
        (p) => p.spouseOfId === partner.id
      ).length;
      const relationType =
        payload.gender === 'male'
          ? '丈夫'
          : payload.gender === 'female'
            ? '妻子'
            : '配偶';

      const hasMarriageEvent = Boolean(
        payload.marriageDate || payload.marriagePlace
      );

      const partnerSurname =
        partner.surname?.trim() || (!partner.spouseOfId ? effectiveSurname : '');
      const partnerGiven = partner.name?.trim() || '';
      const partnerDisplayName =
        partnerSurname &&
        partnerGiven &&
        !partnerGiven.startsWith(partnerSurname)
          ? `${partnerSurname}${partnerGiven}`
          : partnerGiven || partnerSurname || '配偶';

      const spouseSurname = payload.surname?.trim() || '';
      const spouseGiven = payload.name?.trim() || '';
      const spouseDisplayName =
        spouseSurname && spouseGiven && !spouseGiven.startsWith(spouseSurname)
          ? `${spouseSurname}${spouseGiven}`
          : spouseGiven || spouseSurname || '配偶';

      const spouseMarriageEvents: PersonLifeEvent[] = hasMarriageEvent
        ? [
            {
              id: `ev-marriage-${partner.id}`,
              type: 'marriage',
              structuredDate: payload.marriageDate ?? undefined,
              structuredPlace: payload.marriagePlace ?? undefined,
              description: `与${partnerDisplayName}结缡`,
            },
          ]
        : [];

      const draftSpouse: PersonRecord = {
        id: newId,
        branchId: chartId,
        surname: payload.surname,
        name: payload.name,
        romanizedName: payload.romanizedName,
        generation: partner.generation,
        gender: payload.gender,
        status: payload.status,
        siblingOrder: existingSpouseCount + 1,
        fatherId: null,
        spouseOfId: partner.id,
        relationType,
        birth,
        death,
        events:
          spouseMarriageEvents.length > 0 ? spouseMarriageEvents : undefined,
        biographyOrder: chartPersons.length + 1,
      };
      const normalized = normalizePersonForSave(draftSpouse, chartPersons);
      addPersonStore(
        activeProjectId,
        chartId,
        normalized,
        chartName,
        effectiveSurname,
        { select: keepSelection }
      );

      if (hasMarriageEvent) {
        const partnerMarriageEvent: PersonLifeEvent = {
          id: `ev-marriage-${newId}`,
          type: 'marriage',
          structuredDate: payload.marriageDate ?? undefined,
          structuredPlace: payload.marriagePlace ?? undefined,
          description: `与${spouseDisplayName}结缡`,
        };
        updatePersonStore(
          activeProjectId,
          chartId,
          partner.id,
          {
            events: [...(partner.events || []), partnerMarriageEvent],
          },
          chartName,
          effectiveSurname
        );
      }
    } else if (context.relation === 'parent') {
      const target = context.targetPerson;
      const existingFather = target.fatherId
        ? chartPersons.find((p) => p.id === target.fatherId) || null
        : null;

      if (target.spouseOfId) {
        const parentGen = Math.max(1, (target.generation || 1) - 1);
        if (payload.gender === 'female') {
          if (existingFather) {
            const existingFatherSpouses = chartPersons.filter(
              (p) => p.spouseOfId === existingFather.id
            );
            const draftMother: PersonRecord = {
              id: newId,
              branchId: chartId,
              surname: payload.surname,
              name: payload.name,
              romanizedName: payload.romanizedName,
              generation: existingFather.generation,
              gender: 'female',
              status: payload.status,
              siblingOrder: existingFatherSpouses.length + 1,
              fatherId: null,
              spouseOfId: existingFather.id,
              relationType: '妻子',
              birth,
              death,
              biographyOrder: chartPersons.length + 1,
            };
            const normalizedMother = normalizePersonForSave(
              draftMother,
              chartPersons
            );
            addPersonStore(
              activeProjectId,
              chartId,
              normalizedMother,
              chartName,
              effectiveSurname,
              { select: false }
            );
            updatePersonStore(
              activeProjectId,
              chartId,
              target.id,
              {
                motherId: normalizedMother.id,
              },
              chartName,
              effectiveSurname
            );
          } else {
            const draftMother: PersonRecord = {
              id: newId,
              branchId: chartId,
              surname: payload.surname,
              name: payload.name,
              romanizedName: payload.romanizedName,
              generation: parentGen,
              gender: 'female',
              status: payload.status,
              fatherId: null,
              birth,
              death,
              biographyOrder: chartPersons.length + 1,
            };
            const normalizedMother = normalizePersonForSave(
              draftMother,
              chartPersons
            );
            addPersonStore(
              activeProjectId,
              chartId,
              normalizedMother,
              chartName,
              effectiveSurname,
              { select: false }
            );
            updatePersonStore(
              activeProjectId,
              chartId,
              target.id,
              {
                motherId: normalizedMother.id,
              },
              chartName,
              effectiveSurname
            );
          }
        } else {
          const draftFather: PersonRecord = {
            id: newId,
            branchId: chartId,
            surname: payload.surname,
            name: payload.name,
            romanizedName: payload.romanizedName,
            generation: parentGen,
            gender: payload.gender,
            status: payload.status,
            fatherId: null,
            birth,
            death,
            biographyOrder: chartPersons.length + 1,
          };
          const normalizedFather = normalizePersonForSave(
            draftFather,
            chartPersons
          );
          addPersonStore(
            activeProjectId,
            chartId,
            normalizedFather,
            chartName,
            effectiveSurname,
            { select: false }
          );
          updatePersonStore(
            activeProjectId,
            chartId,
            target.id,
            {
              fatherId: normalizedFather.id,
            },
            chartName,
            effectiveSurname
          );
        }
      } else if (existingFather && payload.gender === 'female') {
        const existingFatherSpouses = chartPersons.filter(
          (p) => p.spouseOfId === existingFather.id
        );
        const draftMother: PersonRecord = {
          id: newId,
          branchId: chartId,
          surname: payload.surname,
          name: payload.name,
          romanizedName: payload.romanizedName,
          generation: existingFather.generation,
          gender: 'female',
          status: payload.status,
          siblingOrder: existingFatherSpouses.length + 1,
          fatherId: null,
          spouseOfId: existingFather.id,
          relationType: '妻子',
          birth,
          death,
          biographyOrder: chartPersons.length + 1,
        };
        const normalizedMother = normalizePersonForSave(
          draftMother,
          chartPersons
        );
        addPersonStore(
          activeProjectId,
          chartId,
          normalizedMother,
          chartName,
          effectiveSurname,
          { select: keepSelection }
        );
        updatePersonStore(
          activeProjectId,
          chartId,
          target.id,
          {
            motherId: normalizedMother.id,
          },
          chartName,
          effectiveSurname
        );
      } else if (!existingFather && payload.gender === 'female') {
        const unknownFatherId = `person-father-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const unknownFatherDraft: PersonRecord = {
          id: unknownFatherId,
          branchId: chartId,
          surname: target.surname?.trim() || effectiveSurname || undefined,
          name: '不详',
          generation: target.generation <= 1 ? 1 : target.generation - 1,
          gender: 'male',
          status: 'deceased',
          fatherId: null,
          biographyOrder: 1,
        };
        const normalizedUnknownFather = normalizePersonForSave(
          unknownFatherDraft,
          chartPersons
        );
        addParentForPersonStore(
          activeProjectId,
          chartId,
          target.id,
          normalizedUnknownFather,
          chartName,
          effectiveSurname,
          { select: false }
        );
        const draftMother: PersonRecord = {
          id: newId,
          branchId: chartId,
          surname: payload.surname,
          name: payload.name,
          romanizedName: payload.romanizedName,
          generation: normalizedUnknownFather.generation,
          gender: 'female',
          status: payload.status,
          siblingOrder: 1,
          fatherId: null,
          spouseOfId: normalizedUnknownFather.id,
          relationType: '妻子',
          birth,
          death,
          biographyOrder: chartPersons.length + 2,
        };
        const normalizedMother = normalizePersonForSave(draftMother, [
          ...chartPersons,
          normalizedUnknownFather,
        ]);
        addPersonStore(
          activeProjectId,
          chartId,
          normalizedMother,
          chartName,
          effectiveSurname,
          { select: keepSelection }
        );
        updatePersonStore(
          activeProjectId,
          chartId,
          target.id,
          {
            motherId: normalizedMother.id,
          },
          chartName,
          effectiveSurname
        );
      } else {
        const draftParent: PersonRecord = {
          id: newId,
          branchId: chartId,
          surname: payload.surname,
          name: payload.name,
          romanizedName: payload.romanizedName,
          generation: target.generation <= 1 ? 1 : target.generation - 1,
          gender: payload.gender,
          status: payload.status,
          fatherId: null,
          birth,
          death,
          biographyOrder: 1,
        };
        const normalized = normalizePersonForSave(draftParent, chartPersons);
        addParentForPersonStore(
          activeProjectId,
          chartId,
          target.id,
          normalized,
          chartName,
          effectiveSurname,
          { select: keepSelection }
        );
      }
    }

    setAddRelativeContext(null);
  };

  const handleAddPersonDirectly = (initialData: Partial<PersonRecord>) => {
    if (!chartId) return;
    const newId = `person-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newPerson: PersonRecord = {
      id: newId,
      surname: effectiveSurname || undefined,
      name: initialData.name || '新录族人',
      generation: initialData.generation || 1,
      gender: initialData.gender || 'male',
      status: initialData.status || 'living',
      fatherId: initialData.fatherId ?? null,
      relationType:
        initialData.relationType ??
        (initialData.gender === 'female' ? '生女' : '生子'),
      branchId: chartId,
      biographyOrder: chartPersons.length + 1,
    };
    addPersonStore(
      activeProjectId,
      chartId,
      newPerson,
      chartName,
      effectiveSurname,
      { select: true }
    );
  };

  const handleUpdatePersonFather = (
    childId: string,
    fatherId: string | null
  ) => {
    const father = chartPersons.find((p) => p.id === fatherId);
    handleUpdatePerson(childId, {
      fatherId,
      generation: father ? father.generation + 1 : 1,
    });
  };

  const config = SECTION_CONFIG[section];
  const Icon = config.icon;

  // Interactive Genealogy Canvas Workspace when viewing a lineage chart
  if (section === 'lineage' && selectedLineageNode?.type !== 'folder') {
    return (
      <div className="fs-lineage-theme flex-1 flex flex-col min-h-0 h-full min-w-0 overflow-hidden bg-background">
        {/* Main Content & Right Resizable Inspector */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden relative bg-muted/10">
            <LineageTreeView
              persons={chartPersons}
              selectedPersonId={selectedPerson?.id ?? null}
              branchTitle={chartName}
              clanSurname={effectiveSurname}
              onSelectPerson={handleSelectPerson}
              onAddChild={handleOpenAddChild}
              onAddSibling={handleOpenAddSibling}
              onAddSpouse={handleOpenAddSpouse}
              onAddParent={handleOpenAddParent}
              onDeletePerson={handleDeletePerson}
              onAddPersonDirectly={handleAddPersonDirectly}
              onUpdatePersonFather={handleUpdatePersonFather}
            />
          </div>

          {selectedPerson && (
            <>
              <div
                className="w-[1px] bg-border hover:bg-primary cursor-col-resize z-40 relative transition-colors shrink-0"
                onMouseDown={startResizing}
              >
                <div className="absolute inset-y-0 -left-1 w-3 cursor-col-resize z-40" />
              </div>

              <PersonDetailPanel
                person={selectedPerson}
                allPersons={chartPersons}
                clanSurname={effectiveSurname}
                onSelectPerson={handleSelectPerson}
                onUpdatePerson={handleUpdatePerson}
                onDeletePerson={handleDeletePerson}
                onAddChild={handleOpenAddChild}
                onAddSpouse={handleOpenAddSpouse}
                onAddSibling={handleOpenAddSibling}
                onAddParent={handleOpenAddParent}
                width={inspectorWidth}
                onClose={() => handleSelectPerson(null)}
              />
            </>
          )}
        </div>

        <AddRelativeModal
          context={addRelativeContext}
          allPersons={chartPersons}
          clanSurname={effectiveSurname}
          onClose={() => setAddRelativeContext(null)}
          onSubmit={handleConfirmAddRelative}
        />
      </div>
    );
  }

  // Word-style Rich Text Editor Workspace when viewing a specific article
  if (section === 'articles' && activeArticleDoc) {
    return (
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-background">
        <WordArticleEditor
          article={activeArticleDoc}
          familyName={activeProject?.name}
          hallName={activeProject?.primaryName}
          onUpdateArticle={(updates) =>
            updateArticleContent(activeProjectId, activeArticleDoc.id, updates)
          }
        />
      </div>
    );
  }

  // Three-step Genealogy Book Workspace
  if (section === 'books') {
    return <BookWorkspace />;
  }

  return (
    <div className="flex-1 h-full overflow-y-auto bg-background">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-7 space-y-6">
        {/* Top Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl border border-border bg-[hsl(var(--surface-subtle))] flex items-center justify-center text-primary shrink-0">
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="yp-h2 text-foreground truncate">
                  {section === 'lineage' && selectedLineageNode
                    ? selectedLineageNode.data?.name || config.title
                    : config.title}
                </h1>
                <span className="text-[12px] text-muted-foreground truncate">
                  {activeProject?.primaryName || activeProject?.name}
                </span>
              </div>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {config.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void navigate({
                  to: '/projects/$projectId',
                  params: { projectId: activeProjectId },
                })
              }
              className="h-8 gap-1.5 text-[13px] whitespace-nowrap"
            >
              <ArrowLeft size={14} /> 返回工作台概览
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                void navigate({
                  to: '/projects/$projectId/settings',
                  params: { projectId: activeProjectId },
                })
              }
              className="h-8 gap-1.5 text-[13px] whitespace-nowrap"
            >
              <Settings size={14} /> 家族设置
            </Button>
          </div>
        </div>

        {/* Main Section Content */}
        {section === 'lineage' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
                <FolderOpen size={16} className="text-primary" />
                <span>{selectedLineageNode?.data?.name}</span>
                <span className="text-[12px] font-medium text-muted-foreground tabular-nums">
                  ({selectedLineageNode?.children?.length || 0} 份世系图)
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCreateLineageOpen(true)}
                className="h-8 gap-1.5 text-[13px]"
              >
                <Plus size={14} /> 新增世系图
              </Button>
            </div>

            {selectedLineageNode?.children?.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedLineageNode.children.map((child) => (
                  <button
                    key={String(child.id)}
                    type="button"
                    onClick={() =>
                      selectNode(activeProjectId, String(child.id))
                    }
                    className="flex items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card hover:border-[hsl(var(--border-strong))] hover:shadow-[var(--shadow-card-hover)] transition-all text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[hsl(var(--surface-subtle))] border border-border flex items-center justify-center text-primary shrink-0">
                        <GitFork size={15} />
                      </div>
                      <span className="text-[13px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {child.data?.name || String(child.id)}
                      </span>
                    </div>
                    <ArrowRight
                      size={14}
                      className="text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card/50 py-12 px-6 text-center space-y-3">
                <p className="text-[13px] text-muted-foreground">
                  该分组下暂无世系图，可直接点击上方「新增世系图」或从左侧拖拽节点移入。
                </p>
              </div>
            )}
          </div>
        ) : section === 'articles' ? (
          selectedArticleNode?.type === 'folder' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[14px] font-semibold text-foreground min-w-0">
                  <FolderOpen size={16} className="text-primary shrink-0" />
                  <span className="truncate">
                    {selectedArticleNode.data?.name || '谱文卷目'}
                  </span>
                  <span className="text-[12px] font-medium text-muted-foreground tabular-nums shrink-0">
                    ({selectedArticleNode.children?.length || 0} 篇)
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCreateArticleOpen(true)}
                  className="h-8 gap-1.5 text-[13px] whitespace-nowrap shrink-0"
                >
                  <Plus size={14} /> 新建谱文
                </Button>
              </div>

              {selectedArticleNode.children?.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {selectedArticleNode.children.map((child) => {
                    const childId = String(child.id);
                    const doc =
                      articlesByKey[
                        makeArticleStorageKey(activeProjectId, childId)
                      ];
                    const snippet = extractPlainTextFromHtml(
                      doc?.contentHtml || ''
                    ).slice(0, 88);
                    return (
                      <button
                        key={childId}
                        type="button"
                        onClick={() =>
                          selectArticleNode(activeProjectId, childId)
                        }
                        className="flex flex-col justify-between gap-3 p-4 rounded-xl border border-border bg-card hover:border-[hsl(var(--border-strong))] hover:shadow-[var(--shadow-card-hover)] transition-all text-left cursor-pointer group"
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText
                                size={15}
                                className="text-primary shrink-0"
                              />
                              <span className="text-[14px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                {doc?.title || child.data?.name || childId}
                              </span>
                            </div>
                            <ArrowRight
                              size={14}
                              className="text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0"
                            />
                          </div>
                          {snippet && (
                            <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2">
                              {snippet}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[12px] text-muted-foreground tabular-nums pt-2 border-t border-border/60">
                          <span>{doc?.author || '家族编委会'}</span>
                          <span aria-hidden="true">·</span>
                          <span>{doc?.wordCount ?? 0} 字</span>
                          {doc?.updatedAt && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">{doc.updatedAt}</span>
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-card/50 py-12 px-6 text-center space-y-3">
                  <p className="text-[13px] text-muted-foreground">
                    该卷目下暂无谱文，点击右上角「新建谱文」或从左侧目录拖拽篇章移入。
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsCreateArticleOpen(true)}
                    className="h-8 gap-1.5 text-[13px]"
                  >
                    <Plus size={14} /> 新建谱文
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card/60 py-12 px-6 text-center space-y-4">
              <div className="w-11 h-11 rounded-xl bg-[hsl(var(--surface-subtle))] border border-border mx-auto flex items-center justify-center text-primary">
                <ScrollText size={20} />
              </div>
              <div className="space-y-1">
                <h2 className="yp-h2 text-foreground">
                  开始编修家族谱文
                </h2>
                <p className="text-[13px] text-muted-foreground max-w-md mx-auto leading-relaxed">
                  可在左侧谱文目录中新建卷目与谱文篇章，使用右侧简易 Word 编辑器撰写谱序、凡例、家训与传记。
                </p>
              </div>
              <div className="flex items-center justify-center gap-2.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addArticleFolder(activeProjectId)}
                  className="h-8 gap-1.5 text-[13px]"
                >
                  <FolderPlus size={14} /> 新建卷目
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsCreateArticleOpen(true)}
                  className="h-8 gap-1.5 text-[13px]"
                >
                  <Plus size={14} /> 新建谱文
                </Button>
              </div>
            </div>
          )
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card/60 p-8 space-y-6">
            <div className="max-w-xl mx-auto text-center space-y-2">
              <div className="w-11 h-11 rounded-xl bg-[hsl(var(--surface-subtle))] border border-border mx-auto flex items-center justify-center text-primary">
                <Icon size={20} />
              </div>
              <h2 className="yp-h2 text-foreground">
                {config.emptyTitle}
              </h2>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {config.emptyDesc}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {config.outlineItems.map((item, idx) => (
                <div
                  key={item.name}
                  className="rounded-lg border border-border bg-card p-4 space-y-1.5"
                >
                  <div className="text-[13px] font-semibold text-foreground">
                    0{idx + 1}. {item.name}
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <LineageEditorModal
        open={isCreateLineageOpen}
        mode="create"
        initialValue={{
          name: '',
          surname: activeProject?.primarySurname || '',
          hallName: activeProject?.primaryName || '',
          progenitor: '',
          region: null,
        }}
        onClose={() => setIsCreateLineageOpen(false)}
        onSubmit={(values) => {
          if (selectedLineageNode) {
            addChart(activeProjectId, String(selectedLineageNode.id), values);
          }
          setIsCreateLineageOpen(false);
        }}
      />

      <ArticleMetaModal
        open={isCreateArticleOpen}
        mode="create"
        initialValue={{
          title: '',
          subtitle: selectedArticleNode?.type === 'folder'
            ? selectedArticleNode.data?.name
            : '',
          author: activeProject?.primaryName
            ? `${activeProject.primaryName}编委会`
            : '家族编委会',
        }}
        onClose={() => setIsCreateArticleOpen(false)}
        onSubmit={(values) => {
          const targetParentId =
            selectedArticleNode?.type === 'folder'
              ? String(selectedArticleNode.id)
              : undefined;
          addArticle(activeProjectId, targetParentId, values);
          setIsCreateArticleOpen(false);
        }}
      />
    </div>
  );
};

export default GenealogySectionPage;
