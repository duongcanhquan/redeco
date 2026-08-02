'use client';

import { ModuleAiAskPanel } from '@/components/ai/module-ai-ask-panel';
import { askEquipmentAiAction } from '@/app/app/ai/actions';

const SUGGESTIONS = [
  'Máy nào đang dừng / OEE thấp?',
  'Meter nào vượt ngưỡng?',
  'Có bao nhiêu lệnh BT đang mở?',
] as const;

export function EquipmentAiPanel({
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
      title="Trợ lý Thiết bị"
      subtitle="Máy · BT · OEE · Meter"
      entitled={entitled}
      configured={configured}
      featureEnabled={featureEnabled}
      disabledReason="«Hỏi đáp TB» đang tắt trong Cài đặt AI."
      suggestions={SUGGESTIONS}
      askAction={askEquipmentAiAction}
    />
  );
}
