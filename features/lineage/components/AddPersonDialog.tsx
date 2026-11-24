import React, { useEffect, useId, useState } from 'react';
import { Heart, UserPlus } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalShell,
} from '../../../components/ui/modal';
import { Select } from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { DateInput, type GenealogyDate } from '../../date-input';
import { PlaceInput, type GenealogyPlace } from '../../place-input';
import { PersonRecord } from '../types';
import { formatGivenName } from '../utils/nameUtils';
import {
  computeAutoRankLabel,
  formatPersonAliases,
  parseAliasInput,
} from '../utils/personHelpers';

interface AddPersonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (
    personData: Partial<PersonRecord> & { initialSpouseName?: string }
  ) => void;
  parentPerson?: PersonRecord | null;
  existingPersons: PersonRecord[];
  branchId: string;
  clanSurname?: string;
}

export const AddPersonDialog: React.FC<AddPersonDialogProps> = ({
  isOpen,
  onClose,
  onAdd,
  parentPerson,
  existingPersons,
  branchId,
  clanSurname = '',
}) => {
  const titleId = useId();
  const [name, setName] = useState('');
  const [aliasInput, setAliasInput] = useState('');
  const [generation, setGeneration] = useState(1);
  const [generationWord, setGenerationWord] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [status, setStatus] = useState<'living' | 'deceased'>('deceased');
  const [fatherId, setFatherId] = useState<string | null>(null);
  const [spouseName, setSpouseName] = useState('');
  const [birthDateValue, setBirthDateValue] = useState<GenealogyDate | null>(
    null
  );
  const [officialTitle, setOfficialTitle] = useState('');
  const [burialPlaceValue, setBurialPlaceValue] =
    useState<GenealogyPlace | null>(null);
  const [biography, setBiography] = useState('');

  useEffect(() => {
    if (parentPerson) {
      setFatherId(parentPerson.id);
      setGeneration(parentPerson.generation + 1);
    } else {
      setFatherId(null);
      setGeneration(1);
    }
  }, [parentPerson, isOpen]);

  if (!isOpen) return null;

  const fatherCandidates = existingPersons.filter((p) => !p.spouseOfId);

  const computedRankPreview = (() => {
    if (!fatherId) return generation === 1 ? '始祖' : '首节点';
    const tempId = '__new_person_preview__';
    const siblingCount = existingPersons.filter(
      (p) => p.fatherId === fatherId && !p.spouseOfId
    ).length;
    const previewPerson: PersonRecord = {
      id: tempId,
      branchId,
      name: name.trim() || '新录族人',
      generation,
      gender,
      status,
      fatherId,
      siblingOrder: siblingCount + 1,
      birth: birthDateValue ? { structuredDate: birthDateValue } : undefined,
    };
    return computeAutoRankLabel(previewPerson, [
      ...existingPersons,
      previewPerson,
    ]);
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedAliases = parseAliasInput(aliasInput);
    const siblingOrder = fatherId
      ? existingPersons.filter((p) => p.fatherId === fatherId && !p.spouseOfId)
          .length + 1
      : undefined;
    const cleanTitle = officialTitle.trim();

    onAdd({
      name: formatGivenName(name.trim(), clanSurname),
      aliases: parsedAliases.length > 0 ? parsedAliases : undefined,
      generation,
      generationWord: generationWord.trim() || undefined,
      gender,
      status,
      siblingOrder,
      fatherId: fatherId || null,
      birth: birthDateValue
        ? {
            structuredDate: birthDateValue,
          }
        : undefined,
      events: cleanTitle
        ? [
            {
              id: `ev-career-${Date.now()}`,
              type: 'career',
              description: cleanTitle,
            },
          ]
        : undefined,
      death: burialPlaceValue
        ? {
            structuredBurialPlace: burialPlaceValue,
          }
        : undefined,
      biography: biography.trim() || undefined,
      branchId,
      initialSpouseName: spouseName.trim() || undefined,
    });

    setName('');
    setAliasInput('');
    setGenerationWord('');
    setSpouseName('');
    setBirthDateValue(null);
    setOfficialTitle('');
    setBurialPlaceValue(null);
    setBiography('');
    onClose();
  };

  const labelClass = 'block text-[13px] font-medium text-foreground mb-1.5';

  return (
    <ModalShell
      open={isOpen}
      onClose={onClose}
      size="lg"
      zIndexClass="z-[95]"
      ariaLabelledBy={titleId}
    >
      <ModalHeader
        titleId={titleId}
        icon={<UserPlus size={18} className="text-primary" />}
        title={
          parentPerson
            ? `为【${formatGivenName(parentPerson.name, clanSurname)}】添加子嗣`
            : '新增族人世系节点'
        }
        onClose={onClose}
      />

      <form
        onSubmit={handleSubmit}
        className="flex-1 flex flex-col min-h-0 overflow-hidden"
      >
        <ModalBody className="space-y-4">
          <div>
            <label className={labelClass}>承祧父祖</label>
            <Select
              value={fatherId || ''}
              isPlaceholder={false}
              onChange={(e) => {
                const val = e.target.value;
                setFatherId(val || null);
                const selectedFather = existingPersons.find(
                  (p) => p.id === val
                );
                if (selectedFather) {
                  setGeneration(selectedFather.generation + 1);
                }
              }}
            >
              <option value="" className="bg-card text-foreground">
                -- 始祖 / 无父节点 (第一世) --
              </option>
              {fatherCandidates.map((p) => {
                const aliases = formatPersonAliases(p);
                return (
                  <option
                    key={p.id}
                    value={p.id}
                    className="bg-card text-foreground"
                  >
                    第{p.generation}世：{formatGivenName(p.name, clanSurname)}{' '}
                    {aliases ? `(${aliases})` : ''}
                  </option>
                );
              })}
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className={labelClass}>
                族人姓名 <span className="text-destructive ml-0.5">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：伯康"
                required
                className="font-medium"
              />
            </div>
            <div>
              <label className={labelClass}>字 / 号 / 别名</label>
              <Input
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                placeholder="如: 子安、竹溪（逗号分隔）"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className={labelClass}>世次 (代)</label>
              <Input
                type="number"
                value={generation}
                onChange={(e) =>
                  setGeneration(parseInt(e.target.value, 10) || 1)
                }
                className="font-mono tabular-nums"
              />
            </div>
            <div>
              <label className={labelClass}>排行（自动）</label>
              <Input
                value={computedRankPreview}
                readOnly
                disabled
                className="bg-muted/40 text-muted-foreground"
              />
            </div>
            <div>
              <label className={labelClass}>性别</label>
              <Select
                value={gender}
                onChange={(e) =>
                  setGender(e.target.value as 'male' | 'female')
                }
              >
                <option value="male" className="bg-card text-foreground">
                  男
                </option>
                <option value="female" className="bg-card text-foreground">
                  女
                </option>
              </Select>
            </div>
            <div>
              <label className={labelClass}>生存状态</label>
              <Select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as 'living' | 'deceased')
                }
              >
                <option value="deceased" className="bg-card text-foreground">
                  已故
                </option>
                <option value="living" className="bg-card text-foreground">
                  健在
                </option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[13px] font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <Heart size={12} className="text-rose-500" aria-hidden="true" />
                <span>配偶姓氏</span>
              </label>
              <Input
                value={spouseName}
                onChange={(e) => setSpouseName(e.target.value)}
                placeholder="如: 王氏"
              />
            </div>
            <div>
              <label className={labelClass}>字辈派语</label>
              <Input
                value={generationWord}
                onChange={(e) => setGenerationWord(e.target.value)}
                placeholder="如: 伯"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="add-person-birth-date" className={labelClass}>
                生辰年月
              </label>
              <DateInput
                id="add-person-birth-date"
                label="生辰年月"
                value={birthDateValue}
                onChange={setBirthDateValue}
                enableTime
                enableOriginal
                placeholder="输入如 1990-05-12，或点右侧选择"
              />
            </div>
            <div>
              <label className={labelClass}>功名 / 官阶</label>
              <Input
                value={officialTitle}
                onChange={(e) => setOfficialTitle(e.target.value)}
                placeholder="如: 岁贡生"
              />
            </div>
          </div>

          <div>
            <label htmlFor="add-person-burial-place" className={labelClass}>
              墓茔葬地与坐向
            </label>
            <PlaceInput
              id="add-person-burial-place"
              label="墓茔葬地与坐向"
              value={burialPlaceValue}
              onChange={setBurialPlaceValue}
              clanPersons={existingPersons}
              placeholder="输入省市区县或原始地名，或点右侧选择"
            />
          </div>

          <div>
            <label className={labelClass}>行状事略记述</label>
            <Textarea
              value={biography}
              onChange={(e) => setBiography(e.target.value)}
              rows={3}
              placeholder="例如：平生耕读传家，乐善好施..."
              className="min-h-[84px] resize-none leading-relaxed"
            />
          </div>
        </ModalBody>

        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button type="submit">确定录入</Button>
        </ModalFooter>
      </form>
    </ModalShell>
  );
};
