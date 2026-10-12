// D-097 rule 8: the sent log keeps a reply's text alongside its status.
import 'fake-indexeddb/auto'

import { describe, expect, it } from 'vitest'

import { appendSentLog, listSentLog, setSentLogStatus } from '../src/db/index.ts'

describe('sent log reply', () => {
  it('stores the reply with the status, and leaves it out when there is none', async () => {
    await appendSentLog({ id: 'a', at: '2026-10-11T09:00:00.000Z', kind: 'update', privacyLevel: 'minimal', payloadSummary: '', payload: '{}' })
    await appendSentLog({ id: 'b', at: '2026-10-11T09:01:00.000Z', kind: 'update', privacyLevel: 'minimal', payloadSummary: '', payload: '{}' })
    await setSentLogStatus('a', 'sent', undefined, { usage: { inputTokens: 1, outputTokens: 2 } }, '{"week":5}')
    await setSentLogStatus('b', 'failed', 'HTTP 500')
    const [a, b] = await listSentLog()
    expect(a.reply).toBe('{"week":5}')
    expect(a.status).toBe('sent')
    expect(b.reply).toBeUndefined()
    expect(b.error).toBe('HTTP 500')
  })
})
