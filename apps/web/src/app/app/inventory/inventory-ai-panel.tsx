'use client';

import { ModuleAiAskPanel } from '@/components/ai/module-ai-ask-panel';
import { askInventoryAiAction } from '@/app/app/ai/actions';

const SUGGESTIONS = [
  'Tóm tắt tồn thấp hiện tại',
  'Các kho đang hoạt động thế nào?',
  'Phiếu kho gần đây có gì đáng chú ý?',
] as const;

export function InventoryAiPanel({
  basePath,
  entitled,
  configured,
  featureEnabled,
}: {
  basePath: string;
  entitled: boolean;
  configured: boolean;
  featureEnabled: boolean;
}) {
  return (
    <ModuleAiAskPanel
      basePath={basePath}
      title="Trợ lý Kho"
      subtitle="Tồn · ATP · phiếu gần đây"
      entitled={entitled}
      configured={configured}
      featureEnabled={featureEnabled}
      disabledReason="«Hỏi đáp Kho» đang tắt trong Cài đặt AI."
      suggestions={SUGGESTIONS}
      askAction={askInventoryAiAction}
    />
  );
}
