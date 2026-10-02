import { useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { useT } from '../i18n'
import { API_BASE } from '../api'

// Button + answer box for one /ai/* endpoint. Remount (key=...) to clear the answer for a new subject.
export default function AskAI({ endpoint, body, label }) {
  const { t, lang } = useT()
  const [ai, setAi] = useState(null)   // { loading } | { text } | { error }

  async function ask() {
    setAi({ loading: true })
    try {
      const r = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, lang }),
      })
      const data = await r.json()
      if (r.ok) setAi({ text: data.text })
      else if (data.error === 'no_key') setAi({ error: t('ai_no_key', data.key_file) })
      else setAi({ error: t('ai_failed') })
    } catch {
      setAi({ error: t('ai_failed') })
    }
  }

  return (
    <>
      <button
        onClick={ask}
        disabled={ai?.loading}
        style={{
          marginTop: 12, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '6px 0', fontSize: 11, color: '#cbd5e1', background: '#1e293b',
          border: '1px solid #334155', borderRadius: 6, cursor: ai?.loading ? 'default' : 'pointer',
        }}
      >
        <Sparkles size={12} />
        {ai?.loading ? t('ai_explaining') : label}
      </button>
      {(ai?.text || ai?.error) && (
        <button
          onClick={() => setAi(null)}
          aria-label={t('ai_close')}
          title={t('ai_close')}
          style={{ display: 'block', marginLeft: 'auto', marginTop: 8, background: 'none', border: 'none', padding: 2, color: '#64748b', cursor: 'pointer' }}
        >
          <X size={14} />
        </button>
      )}
      {ai?.text && (
        <div className="scroll-visible" style={{ marginTop: 2, maxHeight: 220, overflowY: 'auto', paddingRight: 6, fontSize: 11, lineHeight: 1.5, color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>
          {ai.text}
        </div>
      )}
      {ai?.error && (
        <div style={{ marginTop: 10, fontSize: 10, lineHeight: 1.5, color: '#f59e0b', wordBreak: 'break-all' }}>
          {ai.error}
        </div>
      )}
    </>
  )
}
