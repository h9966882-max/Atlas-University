import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Filter, X, ChevronRight, ChevronDown, LayoutList, GaugeCircle, GitBranch, AlertTriangle, Clock, CircleDot, CheckCircle2, PauseCircle, Circle, Crosshair, Plus, Trash2 } from 'lucide-react';
import RAW_TASKS from './tasks.json';

const STORAGE_KEY = 'atlas-tasks-v1';

const STATUS_ORDER = ['進行中', '保留', '未着手', '完了'];
const STATUS_STYLE = {
  '未着手': { bg: '#DCE6EE', fg: '#3E5266', dot: '#7C93A8', icon: Circle },
  '進行中': { bg: '#FBE3B8', fg: '#8A5A0E', dot: '#E2A23C', icon: CircleDot },
  '完了':   { bg: '#CFE8D6', fg: '#28633B', dot: '#5DA675', icon: CheckCircle2 },
  '保留':   { bg: '#F4CFC6', fg: '#9A3B26', dot: '#D4694E', icon: PauseCircle },
};
const PRIORITY_ORDER = ['Must', 'Better', 'Best', 'Beyond Best'];
const PRIORITY_STYLE = {
  'Must':        { fg: '#B23A2A', bg: '#F4D9D2', label: 'MUST' },
  'Better':      { fg: '#8A5A0E', bg: '#FBE9C8', label: 'BETTER' },
  'Best':        { fg: '#1F6E63', bg: '#D3E9E4', label: 'BEST' },
  'Beyond Best': { fg: '#3E4E8C', bg: '#DBE0F2', label: 'BEYOND BEST' },
};
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL'];

const INK = '#0F2A44';
const INK_DEEP = '#0A1E33';
const GRID_LINE = 'rgba(158,196,224,0.16)';
const PAPER = '#F5F8FA';
const PAPER_LINE = '#C9D7E2';
const AMBER = '#E2A23C';
const REDLINE = '#C8503A';

const EMPTY_TASK = {
  id: '', name: '', phase: '', blocker: 'No', risk: '', createdAt: '', dependency: '',
  note: '', priority: 'Must', category: '', children: '', doneCondition: '', execOrder: '',
  assignee: '', dailyDisplay: '今後', lastEdited: '', dueDate: '', summary: '', status: '未着手',
  auditType: '実行タスク', sizeEstimate: 'M', parent: '', progress: '', startDate: '', deliverable: '', domain: '',
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeTask(t) {
  const progressNum = t.progress === '' || t.progress === null || t.progress === undefined
    ? null : Number(t.progress);
  return { ...t, progressNum };
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    // フォールバックして元データを使う
  }
  return RAW_TASKS;
}

function nextTaskId(tasks) {
  let max = 0;
  tasks.forEach((t) => {
    const m = /^ATLAS-T-(\d+)$/.exec(t.id || '');
    if (m) max = Math.max(max, Number(m[1]));
  });
  return `ATLAS-T-${max + 1}`;
}

function CornerMarks({ color }) {
  const c = color || PAPER_LINE;
  const style = (pos) => ({ position: 'absolute', width: 9, height: 9, ...pos });
  return (
    <>
      <span style={{ ...style({ top: 6, left: 6, borderTop: `1.5px solid ${c}`, borderLeft: `1.5px solid ${c}` }) }} />
      <span style={{ ...style({ top: 6, right: 6, borderTop: `1.5px solid ${c}`, borderRight: `1.5px solid ${c}` }) }} />
      <span style={{ ...style({ bottom: 6, left: 6, borderBottom: `1.5px solid ${c}`, borderLeft: `1.5px solid ${c}` }) }} />
      <span style={{ ...style({ bottom: 6, right: 6, borderBottom: `1.5px solid ${c}`, borderRight: `1.5px solid ${c}` }) }} />
    </>
  );
}

function ProgressBar({ value, color }) {
  const v = value === null || value === undefined ? 0 : value;
  return (
    <div style={{ width: '100%', height: 5, background: PAPER_LINE, borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ width: `${v}%`, height: '100%', background: color || AMBER, borderRadius: 2, transition: 'width 0.3s ease' }} />
    </div>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE['未着手'];
  const Icon = s.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: s.bg, color: s.fg, fontSize: 11, fontWeight: 700,
      padding: '3px 8px', borderRadius: 3, whiteSpace: 'nowrap',
      letterSpacing: '0.02em', fontFamily: "'JetBrains Mono', monospace"
    }}>
      <Icon size={11} strokeWidth={2.5} />
      {status || '未設定'}
    </span>
  );
}

function PriorityChip({ priority }) {
  if (!priority) return null;
  const s = PRIORITY_STYLE[priority] || { fg: '#3E5266', bg: '#DCE6EE', label: priority };
  return (
    <span style={{
      display: 'inline-block', background: s.bg, color: s.fg,
      fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 2,
      letterSpacing: '0.05em', fontFamily: "'JetBrains Mono', monospace"
    }}>
      {s.label}
    </span>
  );
}

function TaskCard({ task, onOpen }) {
  const overdue = task.dueDate && task.status !== '完了' && new Date(task.dueDate) < new Date(new Date().toDateString());
  return (
    <button
      onClick={() => onOpen(task)}
      style={{
        position: 'relative', display: 'block', width: '100%', textAlign: 'left',
        background: PAPER, border: `1px solid ${PAPER_LINE}`, borderRadius: 4,
        padding: '14px 16px', marginBottom: 10, cursor: 'pointer'
      }}
    >
      <CornerMarks />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: INK, lineHeight: 1.45, marginBottom: 4 }}>
            {task.name || '(無題のタスク)'}
          </div>
          <div style={{ fontSize: 10.5, color: '#6E8296', fontFamily: "'JetBrains Mono', monospace", marginBottom: 8, letterSpacing: '0.02em' }}>
            {task.id}{task.domain ? ` / ${task.domain}` : ''}
          </div>
        </div>
        <ChevronRight size={16} color="#8FA4B6" style={{ flexShrink: 0, marginTop: 2 }} />
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 9 }}>
        <StatusBadge status={task.status} />
        <PriorityChip priority={task.priority} />
        {task.blocker === 'Yes' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 700, color: REDLINE, fontFamily: "'JetBrains Mono', monospace" }}>
            <AlertTriangle size={11} /> BLOCKED
          </span>
        )}
        {overdue && (
          <span style={{ fontSize: 10.5, fontWeight: 700, color: REDLINE, fontFamily: "'JetBrains Mono', monospace" }}>OVERDUE</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <ProgressBar value={task.progressNum} color={task.status === '完了' ? '#5DA675' : AMBER} />
        </div>
        <span style={{ fontSize: 11, color: '#6E8296', minWidth: 32, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace" }}>
          {task.progressNum === null ? '—' : `${task.progressNum}%`}
        </span>
      </div>
      {task.dueDate && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 7, fontSize: 11, color: overdue ? REDLINE : '#6E8296' }}>
          <Clock size={11} /> 期限 {task.dueDate}
        </div>
      )}
    </button>
  );
}

function FilterSheet({ open, onClose, filters, setFilters, options }) {
  if (!open) return null;
  const FIELD_LABELS = {
    status: '状態', priority: '優先区分', category: '分類', domain: '領域', phase: 'フェーズ', assignee: '担当'
  };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,30,51,0.55)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: PAPER, width: '100%', maxHeight: '80vh', overflowY: 'auto', borderRadius: '10px 10px 0 0', padding: '18px 18px 28px', borderTop: `2px solid ${AMBER}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700, color: INK, letterSpacing: '0.03em' }}>絞り込み条件</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', padding: 4 }}>
            <X size={20} color="#4E6478" />
          </button>
        </div>
        {Object.keys(FIELD_LABELS).map((field) => (
          <div key={field} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#4E6478', marginBottom: 6, letterSpacing: '0.05em', fontFamily: "'JetBrains Mono', monospace" }}>
              {FIELD_LABELS[field]}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {options[field].map((val) => {
                const active = filters[field] === val;
                return (
                  <button
                    key={val || '(空欄)'}
                    onClick={() => setFilters((f) => ({ ...f, [field]: active ? null : val }))}
                    style={{
                      fontSize: 12.5, padding: '5px 11px', borderRadius: 3,
                      border: active ? `1px solid ${AMBER}` : `1px solid ${PAPER_LINE}`,
                      background: active ? '#FBE9C8' : '#fff',
                      color: active ? '#8A5A0E' : '#3E5266',
                      fontWeight: active ? 700 : 500, cursor: 'pointer'
                    }}
                  >
                    {val || '(未設定)'}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <button onClick={() => setFilters({})} style={{ width: '100%', padding: '10px', borderRadius: 3, border: `1px solid ${PAPER_LINE}`, background: '#fff', color: '#4E6478', fontSize: 13, fontWeight: 600, marginTop: 4 }}>
          すべてクリア
        </button>
      </div>
    </div>
  );
}

const LABEL_STYLE = { fontSize: 10.5, fontWeight: 700, color: '#6E8296', marginBottom: 6, letterSpacing: '0.05em', fontFamily: "'JetBrains Mono', monospace" };
const INPUT_STYLE = { width: '100%', border: `1px solid ${PAPER_LINE}`, borderRadius: 3, padding: '9px 10px', fontSize: 13.5, fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff', color: INK };

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={LABEL_STYLE}>{label}</div>
      {children}
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div style={{ position: 'relative', background: '#fff', border: `1px solid ${PAPER_LINE}`, borderRadius: 4, padding: 14, marginBottom: 14 }}>
      <CornerMarks color={AMBER} />
      <div style={{ ...LABEL_STYLE, marginBottom: 12, fontSize: 11.5, color: INK }}>{title}</div>
      {children}
    </div>
  );
}

function ChipGroup({ options, value, onChange, styleFor }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map((opt) => {
        const active = value === opt;
        const st = styleFor ? styleFor(opt) : null;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              fontSize: 12.5, padding: '6px 12px', borderRadius: 3,
              border: active ? `1.5px solid ${st ? st.dot || st.fg : AMBER}` : `1px solid ${PAPER_LINE}`,
              background: active ? (st ? st.bg : '#FBE9C8') : '#fff',
              color: active ? (st ? st.fg : '#8A5A0E') : '#3E5266',
              fontWeight: active ? 700 : 500, cursor: 'pointer'
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function TaskForm({ task, isNew, suggestedId, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState(() => task ? { ...task } : { ...EMPTY_TASK, id: suggestedId, createdAt: todayStr(), lastEdited: todayStr() });
  const [idError, setIdError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setVal = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = () => {
    if (!form.name.trim()) {
      alert('タスク名を入力してください。');
      return;
    }
    if (!form.id.trim()) {
      setIdError('タスクIDを入力してください。');
      return;
    }
    onSave({ ...form, lastEdited: todayStr() });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,30,51,0.55)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#E3EAF0', width: '100%', maxHeight: '92vh', overflowY: 'auto', borderRadius: '10px 10px 0 0', padding: '20px 18px 32px', borderTop: `2px solid ${AMBER}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#6E8296', letterSpacing: '0.03em', marginBottom: 2 }}>
              {isNew ? '新規タスク作成' : form.id}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: INK }}>{isNew ? '新しいタスクを登録' : 'タスクを編集'}</div>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', padding: 4 }}>
            <X size={20} color="#4E6478" />
          </button>
        </div>

        <SectionCard title="基本情報">
          <Field label="タスク名 *">
            <input style={INPUT_STYLE} value={form.name} onChange={set('name')} placeholder="例: 〈広報〉サイトマップ作成" />
          </Field>
          {isNew && (
            <Field label="タスクID *">
              <input
                style={{ ...INPUT_STYLE, fontFamily: "'JetBrains Mono', monospace" }}
                value={form.id}
                onChange={(e) => { setIdError(''); set('id')(e); }}
                placeholder="例: ATLAS-T-281"
              />
              {idError && <div style={{ color: REDLINE, fontSize: 11.5, marginTop: 4 }}>{idError}</div>}
            </Field>
          )}
          <Field label="状態">
            <ChipGroup options={STATUS_ORDER} value={form.status} onChange={(v) => setVal('status', v)} styleFor={(o) => STATUS_STYLE[o]} />
          </Field>
          <Field label="優先区分">
            <ChipGroup options={PRIORITY_ORDER} value={form.priority} onChange={(v) => setVal('priority', v)} styleFor={(o) => PRIORITY_STYLE[o]} />
          </Field>
          <Field label={`進捗率 ${form.progress === '' ? '(未設定)' : form.progress + '%'}`}>
            <input
              type="range" min="0" max="100"
              value={form.progress === '' ? 0 : form.progress}
              onChange={(e) => setVal('progress', String(e.target.value))}
              style={{ width: '100%' }}
            />
          </Field>
        </SectionCard>

        <SectionCard title="分類・規模">
          <Field label="領域"><input style={INPUT_STYLE} value={form.domain} onChange={set('domain')} placeholder="例: 広報・Web" /></Field>
          <Field label="分類"><input style={INPUT_STYLE} value={form.category} onChange={set('category')} placeholder="例: システム" /></Field>
          <Field label="フェーズ"><input style={INPUT_STYLE} value={form.phase} onChange={set('phase')} placeholder="例: Phase10｜開校準備" /></Field>
          <Field label="見積規模">
            <ChipGroup options={SIZE_ORDER} value={form.sizeEstimate} onChange={(v) => setVal('sizeEstimate', v)} />
          </Field>
          <Field label="担当"><input style={INPUT_STYLE} value={form.assignee} onChange={set('assignee')} /></Field>
        </SectionCard>

        <SectionCard title="日程">
          <Field label="期限"><input type="date" style={INPUT_STYLE} value={form.dueDate} onChange={set('dueDate')} /></Field>
          <Field label="開始日"><input type="date" style={INPUT_STYLE} value={form.startDate} onChange={set('startDate')} /></Field>
          <Field label="実行順"><input style={INPUT_STYLE} value={form.execOrder} onChange={set('execOrder')} inputMode="numeric" /></Field>
        </SectionCard>

        <SectionCard title="詳細・関連">
          <Field label="概要"><textarea style={{ ...INPUT_STYLE, resize: 'vertical' }} rows={2} value={form.summary} onChange={set('summary')} /></Field>
          <Field label="完了条件"><textarea style={{ ...INPUT_STYLE, resize: 'vertical' }} rows={2} value={form.doneCondition} onChange={set('doneCondition')} /></Field>
          <Field label="親タスク(名前で入力)"><input style={INPUT_STYLE} value={form.parent} onChange={set('parent')} placeholder="親タスクのタスク名" /></Field>
          <Field label="依存関係"><textarea style={{ ...INPUT_STYLE, resize: 'vertical' }} rows={2} value={form.dependency} onChange={set('dependency')} /></Field>
          <Field label="ブロッカー">
            <ChipGroup options={['No', 'Yes']} value={form.blocker} onChange={(v) => setVal('blocker', v)} />
          </Field>
          <Field label="リスク"><textarea style={{ ...INPUT_STYLE, resize: 'vertical' }} rows={2} value={form.risk} onChange={set('risk')} /></Field>
          <Field label="備考"><textarea style={{ ...INPUT_STYLE, resize: 'vertical' }} rows={2} value={form.note} onChange={set('note')} /></Field>
          <Field label="関連成果物"><textarea style={{ ...INPUT_STYLE, resize: 'vertical' }} rows={2} value={form.deliverable} onChange={set('deliverable')} /></Field>
          <Field label="監査区分"><input style={INPUT_STYLE} value={form.auditType} onChange={set('auditType')} /></Field>
          <Field label="日次表示区分"><input style={INPUT_STYLE} value={form.dailyDisplay} onChange={set('dailyDisplay')} /></Field>
        </SectionCard>

        <button
          onClick={handleSave}
          style={{ width: '100%', padding: '12px', borderRadius: 3, border: 'none', background: INK, color: '#F5F8FA', fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.03em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 10 }}
        >
          {isNew ? '登録する' : '保存する'}
        </button>

        {!isNew && onDelete && (
          <button
            onClick={onDelete}
            style={{ width: '100%', padding: '11px', borderRadius: 3, border: `1px solid ${REDLINE}`, background: '#fff', color: REDLINE, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <Trash2 size={15} /> このタスクを削除
          </button>
        )}
      </div>
    </div>
  );
}

function Dashboard({ tasks }) {
  const total = tasks.length;
  const statusCounts = useMemo(() => {
    const c = { '未着手': 0, '進行中': 0, '完了': 0, '保留': 0 };
    tasks.forEach((t) => { c[t.status] = (c[t.status] || 0) + 1; });
    return c;
  }, [tasks]);

  const avgProgress = useMemo(() => {
    const withProgress = tasks.filter((t) => t.progressNum !== null);
    if (!withProgress.length) return 0;
    return Math.round(withProgress.reduce((a, t) => a + t.progressNum, 0) / withProgress.length);
  }, [tasks]);

  const overdue = useMemo(() => {
    const today = new Date(new Date().toDateString());
    return tasks.filter((t) => t.dueDate && t.status !== '完了' && new Date(t.dueDate) < today);
  }, [tasks]);

  const blockers = useMemo(() => tasks.filter((t) => t.blocker === 'Yes'), [tasks]);

  const byDomain = useMemo(() => {
    const m = {};
    tasks.forEach((t) => {
      const key = t.domain || '(未分類)';
      if (!m[key]) m[key] = { total: 0, done: 0 };
      m[key].total += 1;
      if (t.status === '完了') m[key].done += 1;
    });
    return Object.entries(m).sort((a, b) => b[1].total - a[1].total);
  }, [tasks]);

  const priorityCounts = useMemo(() => {
    const m = {};
    tasks.forEach((t) => { m[t.priority] = (m[t.priority] || 0) + 1; });
    return m;
  }, [tasks]);

  return (
    <div style={{ paddingBottom: 20 }}>
      <div style={{
        position: 'relative', background: INK_DEEP, borderRadius: 6, padding: '20px 18px', marginBottom: 16, color: '#F5F8FA',
        backgroundImage: `repeating-linear-gradient(0deg, ${GRID_LINE} 0, ${GRID_LINE} 1px, transparent 1px, transparent 18px), repeating-linear-gradient(90deg, ${GRID_LINE} 0, ${GRID_LINE} 1px, transparent 1px, transparent 18px)`
      }}>
        <CornerMarks color="rgba(226,162,60,0.6)" />
        <div style={{ fontSize: 10.5, letterSpacing: '0.12em', color: AMBER, fontWeight: 700, marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>
          FIG.01 — 開校準備 全体進捗
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 40, fontWeight: 700 }}>{avgProgress}%</span>
          <span style={{ fontSize: 12.5, color: '#9EC4E0' }}>平均進捗率 · 全{total}件</span>
        </div>
        <ProgressBar value={avgProgress} color={AMBER} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {STATUS_ORDER.map((s) => {
          const style = STATUS_STYLE[s];
          return (
            <div key={s} style={{ position: 'relative', background: PAPER, border: `1px solid ${PAPER_LINE}`, borderRadius: 4, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: style.dot }} />
                <span style={{ fontSize: 11.5, color: '#4E6478', fontWeight: 600 }}>{s}</span>
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 700, color: INK }}>
                {statusCounts[s] || 0}
              </div>
            </div>
          );
        })}
      </div>

      {(overdue.length > 0 || blockers.length > 0) && (
        <div style={{ background: '#F4D9D2', border: `1px solid ${REDLINE}`, borderRadius: 4, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <AlertTriangle size={14} color={REDLINE} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: REDLINE, fontFamily: "'JetBrains Mono', monospace" }}>要注意</span>
          </div>
          <div style={{ fontSize: 12.5, color: '#8A2E1D', lineHeight: 1.6 }}>
            {overdue.length > 0 && <div>期限超過 {overdue.length}件</div>}
            {blockers.length > 0 && <div>ブロック中 {blockers.length}件</div>}
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, fontWeight: 700, color: '#4E6478', marginBottom: 8, letterSpacing: '0.05em', fontFamily: "'JetBrains Mono', monospace" }}>
        優先区分
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
        {Object.entries(priorityCounts).map(([p, count]) => (
          <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, background: PAPER, border: `1px solid ${PAPER_LINE}`, borderRadius: 20, padding: '5px 10px' }}>
            <PriorityChip priority={p} />
            <span style={{ fontSize: 12, color: '#3E5266', fontWeight: 600 }}>{count}</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: '#4E6478', marginBottom: 8, letterSpacing: '0.05em', fontFamily: "'JetBrains Mono', monospace" }}>
        領域別 完了状況
      </div>
      {byDomain.map(([domain, { total: t, done }]) => (
        <div key={domain} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#1C3348', marginBottom: 3 }}>
            <span>{domain}</span>
            <span style={{ color: '#6E8296', fontFamily: "'JetBrains Mono', monospace" }}>{done}/{t}</span>
          </div>
          <ProgressBar value={t ? Math.round((done / t) * 100) : 0} color="#5DA675" />
        </div>
      ))}
    </div>
  );
}

function HierarchyView({ tasks, onOpen }) {
  const byName = useMemo(() => {
    const m = {};
    tasks.forEach((t) => { m[t.name] = t; });
    return m;
  }, [tasks]);

  const childrenOf = useMemo(() => {
    const m = {};
    tasks.forEach((t) => {
      if (t.parent && byName[t.parent]) {
        const key = t.parent;
        if (!m[key]) m[key] = [];
        m[key].push(t);
      }
    });
    return m;
  }, [tasks, byName]);

  const roots = useMemo(() => tasks.filter((t) => !t.parent || !byName[t.parent]), [tasks, byName]);
  const rootsWithChildren = useMemo(() => roots.filter((t) => childrenOf[t.name] && childrenOf[t.name].length > 0), [roots, childrenOf]);
  const [expanded, setExpanded] = useState({});

  const toggle = (name) => setExpanded((e) => ({ ...e, [name]: !e[name] }));

  if (rootsWithChildren.length === 0) {
    return <div style={{ fontSize: 13, color: '#6E8296', textAlign: 'center', padding: '40px 20px' }}>親子関係を持つタスクが見つかりませんでした。</div>;
  }

  return (
    <div style={{ paddingBottom: 20 }}>
      <div style={{ fontSize: 12.5, color: '#4E6478', marginBottom: 14, lineHeight: 1.6 }}>
        「親タスク」を持つ子タスクをグループ化して表示しています。親タスクをタップすると子タスク一覧を開閉できます。
      </div>
      {rootsWithChildren.map((root) => {
        const kids = childrenOf[root.name] || [];
        const isOpen = expanded[root.name];
        const doneKids = kids.filter((k) => k.status === '完了').length;
        return (
          <div key={root.id} style={{ position: 'relative', marginBottom: 10, border: `1px solid ${PAPER_LINE}`, borderRadius: 4, background: PAPER, overflow: 'hidden' }}>
            <button onClick={() => toggle(root.name)} style={{ width: '100%', textAlign: 'left', padding: '12px 14px', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              {isOpen ? <ChevronDown size={16} color="#6E8296" /> : <ChevronRight size={16} color="#6E8296" />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: INK }}>{root.name}</div>
                <div style={{ fontSize: 11, color: '#6E8296', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>子タスク {doneKids}/{kids.length} 完了</div>
              </div>
              <StatusBadge status={root.status} />
            </button>
            {isOpen && (
              <div style={{ padding: '0 14px 12px' }}>
                {kids.map((k) => (
                  <button key={k.id} onClick={() => onOpen(k)} style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', marginTop: 6, background: '#fff', border: `1px solid #DDE7EE`, borderRadius: 3, cursor: 'pointer' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: '#1C3348', marginBottom: 3 }}>{k.name}</div>
                      <ProgressBar value={k.progressNum} color={k.status === '完了' ? '#5DA675' : AMBER} />
                    </div>
                    <StatusBadge status={k.status} />
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [tasksRaw, setTasksRaw] = useState(() => loadTasks());
  const [tab, setTab] = useState('list');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasksRaw));
    } catch (e) {
      console.error('保存に失敗しました', e);
    }
  }, [tasksRaw]);

  const tasks = useMemo(() => tasksRaw.map(normalizeTask), [tasksRaw]);

  const options = useMemo(() => {
    const uniq = (arr) => Array.from(new Set(arr.filter((v) => v !== undefined))).sort();
    return {
      status: uniq(tasks.map((t) => t.status)),
      priority: PRIORITY_ORDER.filter((p) => tasks.some((t) => t.priority === p)),
      category: uniq(tasks.map((t) => t.category)),
      domain: uniq(tasks.map((t) => t.domain)),
      phase: uniq(tasks.map((t) => t.phase)),
      assignee: uniq(tasks.map((t) => t.assignee)),
    };
  }, [tasks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (q && !((t.name || '').toLowerCase().includes(q) || (t.summary || '').toLowerCase().includes(q) || (t.id || '').toLowerCase().includes(q))) return false;
      for (const key of Object.keys(filters)) {
        if (filters[key] && t[key] !== filters[key]) return false;
      }
      return true;
    });
  }, [tasks, search, filters]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const rank = (t) => (t.status === '進行中' ? 0 : t.status === '保留' ? 1 : t.status === '未着手' ? 2 : 3);
      const r = rank(a) - rank(b);
      if (r !== 0) return r;
      const order = (v) => (v === '' ? Infinity : Number(v) || Infinity);
      return order(a.execOrder) - order(b.execOrder);
    });
  }, [filtered]);

  const handleUpdate = useCallback((updatedTask) => {
    setTasksRaw((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    setSelectedTask(null);
  }, []);

  const handleCreate = useCallback((newTask) => {
    if (tasksRaw.some((t) => t.id === newTask.id)) {
      alert('そのタスクIDはすでに使われています。別のIDを入力してください。');
      return;
    }
    setTasksRaw((prev) => [...prev, newTask]);
    setCreating(false);
  }, [tasksRaw]);

  const handleDelete = useCallback((id) => {
    if (window.confirm('このタスクを削除します。よろしいですか?')) {
      setTasksRaw((prev) => prev.filter((t) => t.id !== id));
      setSelectedTask(null);
    }
  }, []);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const TABS = [
    { key: 'list', label: '一覧', icon: LayoutList },
    { key: 'dashboard', label: 'ダッシュボード', icon: GaugeCircle },
    { key: 'hierarchy', label: '階層', icon: GitBranch },
  ];

  return (
    <div style={{ fontFamily: "'IBM Plex Sans JP', 'Hiragino Sans', sans-serif", background: '#E3EAF0', minHeight: '100vh', maxWidth: 480, margin: '0 auto', position: 'relative', paddingBottom: 70 }}>
      <div style={{
        padding: '20px 18px 14px', position: 'sticky', top: 0, zIndex: 10, background: INK, color: '#F5F8FA',
        backgroundImage: `repeating-linear-gradient(0deg, ${GRID_LINE} 0, ${GRID_LINE} 1px, transparent 1px, transparent 18px), repeating-linear-gradient(90deg, ${GRID_LINE} 0, ${GRID_LINE} 1px, transparent 1px, transparent 18px)`,
        borderBottom: `2px solid ${AMBER}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, letterSpacing: '0.16em', color: AMBER, fontWeight: 700, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>
          <Crosshair size={11} /> ATLAS UNIVERSITY — BLUEPRINT No.10
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 19, fontWeight: 700, letterSpacing: '0.01em' }}>
            開校準備タスク図面
          </div>
          <button
            onClick={() => setCreating(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: AMBER, color: INK_DEEP, border: 'none', borderRadius: 3, padding: '7px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}
          >
            <Plus size={14} /> 新規
          </button>
        </div>

        {tab === 'list' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: '#F5F8FA', border: `1px solid ${PAPER_LINE}`, borderRadius: 3, padding: '8px 10px' }}>
              <Search size={15} color="#6E8296" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="タスク名・IDで検索"
                style={{ border: 'none', outline: 'none', fontSize: 13, flex: 1, background: 'none', color: INK }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none' }}>
                  <X size={14} color="#6E8296" />
                </button>
              )}
            </div>
            <button
              onClick={() => setFilterOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: activeFilterCount ? AMBER : '#F5F8FA', color: activeFilterCount ? INK_DEEP : '#3E5266', border: `1px solid ${PAPER_LINE}`, borderRadius: 3, padding: '8px 12px', fontSize: 12.5, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}
            >
              <Filter size={14} />
              {activeFilterCount > 0 ? activeFilterCount : ''}
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: '14px 18px 0' }}>
        {tab === 'list' ? (
          <>
            <div style={{ fontSize: 11, color: '#4E6478', marginBottom: 10, fontFamily: "'JetBrains Mono', monospace" }}>{sorted.length}件のタスク</div>
            {sorted.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#4E6478', fontSize: 13, padding: '60px 20px' }}>
                条件に一致するタスクがありません。検索や絞り込みを見直すか、右上の「新規」から追加してみてください。
              </div>
            ) : (
              sorted.map((t) => <TaskCard key={t.id} task={t} onOpen={setSelectedTask} />)
            )}
          </>
        ) : tab === 'dashboard' ? (
          <Dashboard tasks={tasks} />
        ) : (
          <HierarchyView tasks={tasks} onOpen={setSelectedTask} />
        )}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: INK, borderTop: `2px solid ${AMBER}`, display: 'flex', padding: '8px 10px', zIndex: 20 }}>
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button key={key} onClick={() => setTab(key)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', padding: '6px 0', cursor: 'pointer', color: active ? AMBER : '#7C93A8' }}>
              <Icon size={19} strokeWidth={active ? 2.4 : 2} />
              <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 500, fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
            </button>
          );
        })}
      </div>

      <FilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} filters={filters} setFilters={setFilters} options={options} />

      {selectedTask && (
        <TaskForm
          task={selectedTask}
          isNew={false}
          onSave={handleUpdate}
          onCancel={() => setSelectedTask(null)}
          onDelete={() => handleDelete(selectedTask.id)}
        />
      )}
      {creating && (
        <TaskForm
          task={null}
          isNew={true}
          suggestedId={nextTaskId(tasksRaw)}
          onSave={handleCreate}
          onCancel={() => setCreating(false)}
        />
      )}
    </div>
  );
}
