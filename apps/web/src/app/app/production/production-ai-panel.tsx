'use client';

import { ModuleAiAskPanel } from '@/components/ai/module-ai-ask-panel';
import { askProductionAiAction } from '@/app/app/ai/actions';

const SUGGESTIONS = [
  'Có bao nhiêu lệnh sản xuất đang mở?',
  'Tóm tắt trạng thái LSX',
  'BOM active hiện có những gì?',
] as const;

export function ProductionAiPanel({
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
      title="Trợ lý Sản xuất"
      subtitle="LSX · BOM"
      entitled={entitled}
      configured={configured}
      featureEnabled={featureEnabled}
      disabledReason="«Hỏi đáp SX» đang tắt trong Cài đặt AI."
      suggestions={SUGGESTIONS}
      askAction={askProductionAiAction}
    />
  );
}
