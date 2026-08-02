'use server';

import type { ActionResult } from '@/services/sales-context';
import { revalidateWorkspace } from '@/lib/revalidate-workspace';
import {
  archiveRagDocument,
  createRagDocument,
  ingestRagDocument,
  listRagDocuments,
  type RagDocumentRow,
} from '@/services/rag.service';
import {
  enableRagEasyMode,
  type AiRagSettings,
} from '@/services/tenant-settings.service';

export async function listRagDocumentsAction(): Promise<
  ActionResult<RagDocumentRow[]>
> {
  try {
    const data = await listRagDocuments();
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Không tải được tài liệu.' };
  }
}

export async function createAndIngestRagDocumentAction(input: {
  moduleKey: string;
  title: string;
  bodyText: string;
}): Promise<ActionResult<{ id: string; chunkCount: number; rag: AiRagSettings }>> {
  try {
    // Easy Mode: tự bật RAG + defaults trước khi index
    const enabled = await enableRagEasyMode();
    if (!enabled.ok) return enabled;

    const created = await createRagDocument(input);
    if (!created.ok) return created;
    const indexed = await ingestRagDocument(created.data.id);
    if (!indexed.ok) {
      return {
        ok: false,
        error: indexed.error,
      };
    }
    await revalidateWorkspace(['/app/settings', '/app/ai']);
    return {
      ok: true,
      data: {
        id: created.data.id,
        chunkCount: indexed.data.chunkCount,
        rag: enabled.data,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Index thất bại.' };
  }
}

export async function archiveRagDocumentAction(
  documentId: string,
): Promise<ActionResult> {
  try {
    const result = await archiveRagDocument(documentId);
    if (result.ok) await revalidateWorkspace(['/app/settings', '/app/ai']);
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Xóa thất bại.' };
  }
}

export async function enableRagEasyModeAction(): Promise<ActionResult<AiRagSettings>> {
  try {
    const result = await enableRagEasyMode();
    if (result.ok) await revalidateWorkspace(['/app/settings', '/app/ai']);
    return result;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Không bật được RAG.' };
  }
}
