import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PersonRecord } from '../types';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select } from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { X, UserPlus, Heart } from 'lucide-react';
import { formatGivenName } from '../utils/nameUtils';
import {
  DateInput,
  formatGenealogyDate,
  type GenealogyDate,
} from '../../date-input';
import {
  PlaceInput,
  formatGenealogyPlace,
  type GenealogyPlace,
} from '../../place-input';

interface AddPersonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (personData: Partial<PersonRecord>) => void;
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
  const [name, setName] = useState('');
  const [courtesyName, setCourtesyName] = useState('');
  const [generation, setGeneration] = useState(1);
  const [generationWord, setGenerationWord] = useState('');
  const [rank, setRank] = useState('长子');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [status, setStatus] = useState<'living' | 'deceased'>('deceased');
  const [fatherId, setFatherId] = useState<string | null>(null);
  const [spouseName, setSpouseName] = useState('');
  const [birthDateValue, setBirthDateValue] = useState<GenealogyDate | null>(null);
  const [officialTitle, setOfficialTitle] = useState('');
  const [burialPlaceValue, setBurialPlaceValue] =
    useState<GenealogyPlace | null>(null);
  const [biography, setBiography] = useState('');

  useEffect(() => {
    if (parentPerson) {
      setFatherId(parentPerson.id);
      setGeneration(parentPerson.generation + 1);
      const existingChildren = existingPersons.filter(
        (p) => p.fatherId === parentPerson.id
      );
      const ranks = ['长子', '次子', '三子', '四子', '五子', '六子'];
      setRank(
        ranks[existingChildren.length] || `第${existingChildren.length + 1}子`
      );
    } else {
      setFatherId(null);
      setGeneration(1);
      setRank('始祖');
    }
  }, [parentPerson, existingPersons, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const father = existingPersons.find((p) => p.id === fatherId);

    const formattedBirth = formatGenealogyDate(birthDateValue).trim() || undefined;
    const formattedBurialPlace =
      formatGenealogyPlace(burialPlaceValue).trim() || undefined;

    onAdd({
      name: formatGivenName(name.trim(), clanSurname),
      courtesyName: courtesyName.trim() || undefined,
      generation,
      generationWord: generationWord.trim() || undefined,
      rank,
      gender,
      status,
      fatherId: fatherId || null,
      fatherName: father
        ? formatGivenName(father.name, clanSurname)
        : undefined,
      spouses: spouseName.trim() ? [{ name: spouseName.trim() }] : [],
      birthDate: formattedBirth,
      birth: birthDateValue
        ? {
            date: formattedBirth || '',
            structuredDate: birthDateValue,
          }
        : undefined,
      officialTitle: officialTitle.trim() || undefined,
      burialPlace: formattedBurialPlace,
      death: burialPlaceValue
        ? {
            burialPlace: formattedBurialPlace || '',
            structuredPlace: burialPlaceValue,
          }
        : undefined,
      biography: biography.trim() || undefined,
      branchId,
    });

    setName('');
    setCourtesyName('');
    setGenerationWord('');
    setSpouseName('');
    setBirthDateValue(null);
    setOfficialTitle('');
    setBurialPlaceValue(null);
    setBiography('');
    onClose();
  };

  const dialogContent = (
    <div
      className="fixed inset-0 z-[95] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-primary" />
            <h3 className="font-bold text-sm text-foreground">
              {parentPerson
                ? `为【${formatGivenName(parentPerson.name, clanSurname)}】添加子嗣`
                : '新增族人世系节点'}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <X size={14} />
          </Button>
        </div>

        {/* Modal Form */}
        <form
          onSubmit={handleSubmit}
          className="p-5 overflow-y-auto space-y-4 text-xs flex-1"
        >
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
              承祧父祖
            </label>
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
              {existingPersons.map((p) => (
                <option key={p.id} value={p.id} className="bg-card text-foreground">
                  第{p.generation}世：{formatGivenName(p.name, clanSurname)}{' '}
                  {p.courtesyName ? `(字${p.courtesyName})` : ''}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-foreground mb-1.5">
                族人姓名 <span className="text-primary">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：伯康"
                required
                className="h-8 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">
                字 / 号
              </label>
              <Input
                value={courtesyName}
                onChange={(e) => setCourtesyName(e.target.value)}
                placeholder="如: 子安"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">
                世次 (代)
              </label>
              <Input
                type="number"
                value={generation}
                onChange={(e) =>
                  setGeneration(parseInt(e.target.value, 10) || 1)
                }
                className="h-8 text-xs tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">
                排行
              </label>
              <Input
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                placeholder="如: 长子"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                性别
              </label>
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
              <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
                生存状态
              </label>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1 flex items-center gap-1">
                <Heart size={10} className="text-rose-500" /> 配偶姓氏
              </label>
              <Input
                value={spouseName}
                onChange={(e) => setSpouseName(e.target.value)}
                placeholder="如: 王氏"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">
                字辈派语
              </label>
              <Input
                value={generationWord}
                onChange={(e) => setGenerationWord(e.target.value)}
                placeholder="如: 伯"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="add-person-birth-date"
                className="block text-[11px] text-muted-foreground mb-1"
              >
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
              <label className="block text-[11px] text-muted-foreground mb-1">
                功名 / 官阶
              </label>
              <Input
                value={officialTitle}
                onChange={(e) => setOfficialTitle(e.target.value)}
                placeholder="如: 岁贡生"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="add-person-burial-place"
              className="block text-[11px] text-muted-foreground mb-1"
            >
              墓茔葬地与坐向
            </label>
            <PlaceInput
              id="add-person-burial-place"
              label="墓茔葬地与坐向"
              value={burialPlaceValue}
              onChange={setBurialPlaceValue}
              clanPersons={existingPersons}
              placeholder="输入省市区县或祖茔山名，点右侧细化坐向"
              detailPlaceholder="例如：凤凰山下象鼻嘴，坐东向西"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
              行状事略记述
            </label>
            <Textarea
              value={biography}
              onChange={(e) => setBiography(e.target.value)}
              rows={3}
              placeholder="例如：平生耕读传家，乐善好施..."
              className="min-h-[72px] p-2.5 text-xs resize-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" size="sm" className="px-5">
              确定录入
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return dialogContent;
  return createPortal(dialogContent, document.body);
};
