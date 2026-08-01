import type { Brand } from '../shared/branded-types';

export type ModuleId = Brand<string, 'ModuleId'>;
export const asModuleId = (value: string): ModuleId => value as ModuleId;

export type ModuleKind = 'module' | 'feature';

/** Mức quyền của nhân sự trên một node module (ngữ nghĩa subtree — ADR-008). */
export type AccessLevel = 'view' | 'edit' | 'manage';

/** Một node trong cây danh mục module (module → module con/phần → tính năng). */
export interface ModuleNode {
  readonly id: ModuleId;
  readonly parentId: ModuleId | null;
  /** Dotted-path duy nhất toàn cục, ví dụ: kinh-doanh.bao-gia.duyet-bao-gia */
  readonly key: string;
  readonly name: string;
  readonly description: string | null;
  readonly kind: ModuleKind;
  readonly sortOrder: number;
  readonly isActive: boolean;
  readonly attributes: Readonly<Record<string, unknown>>;
}
