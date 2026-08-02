'use client';

import { ModuleAiAskPanel } from '@/components/ai/module-ai-ask-panel';
import { askHrAiAction } from '@/app/app/ai/actions';

const SUGGESTIONS = [
  'Tóm tắt nhân sự đang làm',
  'Có bao nhiêu HĐ sắp hết hạn?',
  'Chấm công gần đây thế nào?',
] as const;

export function HrAiPanel({
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
      title="Trợ lý Nhân sự"
      subtitle="NV · HĐ · chấm công"
      entitled={entitled}
      configured={configured}
      featureEnabled={featureEnabled}
      disabledReason="«Hỏi đáp NS» đang tắt trong Cài đặt AI."
      suggestions={SUGGESTIONS}
      askAction={askHrAiAction}
    />
  );
}
