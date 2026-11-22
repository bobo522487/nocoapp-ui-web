import type { GenealogyDate } from '../date-input/date.types';
import type { GenealogyPlace } from '../place-input/place.types';

export type RelationKind =
  | '生子'
  | '抚子'
  | '养子'
  | '继子'
  | '赘子'
  | '义子'
  | '出继'
  | '出嗣'
  | '承嗣'
  | '出祧'
  | '兼祧'
  | '出绍'
  | '过继'
  | '承继'
  | '奉祀'
  | '无(断代)'
  | '生女'
  | '继女'
  | '养女'
  | string;

export interface SpouseInfo {
  id?: string;
  relationType?: RelationKind; // 关系：妻子、丈夫、配偶等
  relationLabel?: string; // 顺位称谓：原配、继配、三配
  prefix?: string; // 前缀补充称谓
  name: string;
  clanOrigin?: string; // 岳家籍贯/郡望 如: 妣李氏，系出清河
  title?: string; // 封号/孺人/宜人
  birthDate?: string;
  deathDate?: string;
  burialPlace?: string; // 葬地与合葬信息
  remarks?: string; // 补充备注
}

export interface PersonBirthInfo {
  date?: string; // 兼容投影展示字符串（由 structuredDate 自动生成或历史旧文本）
  structuredDate?: GenealogyDate | null; // 唯一权威结构化出生日期
  place?: string; // 出生地
  structuredPlace?: GenealogyPlace | null; // 唯一权威结构化出生地点
  summary?: string; // 出生描述
}

export interface PersonEducationEntry {
  id: string;
  period?: string; // 开始时间展示文本
  structuredPeriod?: GenealogyDate | null; // 唯一权威结构化开始时间
  level?: string; // 学历
  school?: string; // 学校
}

export interface PersonCareerEntry {
  id: string;
  period?: string; // 开始时间展示文本
  structuredPeriod?: GenealogyDate | null; // 唯一权威结构化开始时间
  location?: string; // 地点
  organization?: string; // 单位
  position?: string; // 职务
}

export interface PersonCareerInfo {
  educationPeriod?: string; // 教育时间
  educationLevel?: string; // 学历：小学~博士
  graduationStatus?: string; // 毕业 / 在读 / 肄业
  school?: string; // 就读学校
  major?: string; // 就读专业
  educationSummary?: string; // 文化程度综合描述
  educationHistory?: PersonEducationEntry[]; // 教育经历列表（时间/学历/学校）
  profession?: string; // 公司/单位名称+职务
  title?: string; // 荣誉称号、职称、头衔
  resume?: string; // 履历
  lifeSummary?: string; // 生平记述
  careerHistory?: PersonCareerEntry[]; // 职业经历列表（时间/单位/职务）
}

export interface PersonDeathInfo {
  date?: string; // 兼容投影展示字符串（由 structuredDate 自动生成或历史旧文本）
  structuredDate?: GenealogyDate | null; // 唯一权威结构化去世日期
  place?: string; // 去世地点
  structuredPlace?: GenealogyPlace | null; // 唯一权威结构化去世地点
  burialDate?: string; // 埋葬日期
  structuredBurialDate?: GenealogyDate | null; // 唯一权威结构化埋葬日期
  burialPlace?: string; // 埋葬地点
  structuredBurialPlace?: GenealogyPlace | null; // 唯一权威结构化埋葬地点
  cause?: string; // 死亡原因
  summary?: string; // 卒葬描述
  age?: number; // 享寿
}

export interface PersonRomanizedName {
  surname?: string;
  name?: string;
  suffix?: string;
}

export interface PersonSequenceMeta {
  mainLabel?: string; // 主世序（始祖名讳）
  mainNumber?: number; // 主世序序号
  subLabel?: string; // 子世序（分支名讳）
  subNumber?: number; // 子世序序号
  originalPage?: number; // 原谱页码
}

export interface PersonPrivateInfo {
  idCardName?: string; // 实名姓名
  idCardNum?: string; // 身份证号
  mobile?: string; // 联系电话
  address?: string; // 联系地址
}

export type PersonEventType =
  | 'birth'
  | 'death'
  | 'burial'
  | 'marriage'
  | 'education'
  | 'career'
  | 'residence'
  | 'honor'
  | 'other';

export interface PersonLifeEvent {
  id: string;
  type: PersonEventType;
  customTypeLabel?: string;
  date?: string;
  structuredDate?: GenealogyDate | null;
  place?: string;
  structuredPlace?: GenealogyPlace | null;
  description?: string;
  relatedPersonId?: string;
  relatedPersonName?: string;
  organization?: string;
  position?: string;
  educationLevel?: string;
  deathCause?: string;
}

export interface PersonRecord {
  id: string;
  branchId: string; // 所属世系图ID

  // 1. 核心身份与名讳
  avatarUrl?: string; // 人物照片 DataURL 或路径
  surname?: string; // 姓氏
  name: string; // 名字（谱名）
  nameSuffix?: string; // 后缀称号（氏、夫人、先生、娘）
  romanizedName?: PersonRomanizedName; // 拼音/罗马字
  legalName?: string; // 常用名（身份证姓名）
  courtesyName?: string; // 字/号/别名/谥号（逗号/顿号拼接投影）
  aliases?: string[]; // 多个别名列表
  childhoodName?: string; // 乳名/幼名
  gender: 'male' | 'female' | 'unknown';
  status: 'living' | 'deceased'; // 存（健在）/ 歿（已故）

  // 2. 世系与宗法关系（子女由 fatherId 单源派生，不在此冗余存储）
  generation: number; // 世次 如: 1 (第1世)
  generationWord?: string; // 派语字辈
  hangOrder?: string; // 行第 如: 行十八
  rank?: string; // 排行显示 如: 长子、次子、长女
  siblingOrder?: number; // 同父兄弟姊妹排序权重
  fatherId: string | null; // 父亲ID
  fatherName?: string;
  motherId?: string; // 生母ID（对应配偶节点或配偶条目ID）
  motherName?: string; // 生母
  spouseOfId?: string; // 若作为配偶独立节点，指向主配偶ID
  spouseRelationLabel?: string; // 配偶称谓：原配 / 继配 / 配偶
  relationType?: RelationKind; // 与父母关系：生子/嗣子/继子...
  fatherRelationType?: RelationKind; // 与父亲关系（生子/过继/养子/继子...）
  motherRelationType?: RelationKind; // 与母亲关系（生子/过继/养子/继子...）
  relationTitle?: string; // 关系称谓：如 始迁祖
  relationPrefix?: string; // 前缀：如 左徒
  relationNotes?: string; // 关系备注
  lineageRemarks?: string; // 世系备注：如 迁江西
  branchLabel?: string; // 分房
  headingLine?: string; // 题行

  // 3. 配偶（轻量有序结构体列表）
  spouses: SpouseInfo[];

  // 4. 生命周期内聚子对象
  birth?: PersonBirthInfo;
  career?: PersonCareerInfo;
  death?: PersonDeathInfo;
  events?: PersonLifeEvent[]; // 统一生平事件列表（迁居、功名、补充婚姻/教育/工作等）
  sequenceMeta?: PersonSequenceMeta;
  privateInfo?: PersonPrivateInfo;

  // 5. 顶层兼容展示字段（供世系图节点、表格、行传录直接读取）
  birthDate?: string; // 生于
  deathDate?: string; // 卒于
  age?: number; // 享寿
  burialPlace?: string; // 墓茔葬地及坐向
  officialTitle?: string; // 功名/官阶/头衔

  // 6. 传记、页码与末尾备注
  biography?: string; // 传记简介/生平事略
  biographyPage?: number; // 行传页码
  biographyOrder?: number; // 行传录号/分房序号
  notes?: string; // 末尾备注
}

export type LineageViewMode = 'tree' | 'biography' | 'grid' | 'table';

export type DrawerLayoutMode = 'narrow' | 'wide';

export interface BiographyPreviewPreferences {
  showBirth: boolean;
  showBirthDetail: boolean;
  showLife: boolean;
  showDeath: boolean;
  showDeathDetail: boolean;
  showBiography: boolean;
  showChildren: boolean;
  showRemarks: boolean;
  showPrivateInfo: boolean;
}
