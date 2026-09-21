import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { socket } from './socket';

const blankTicket = { customer: '', issue: '', description: '', priority: 'Medium', status: 'Open', assignedAgent: '', resolution: '' };
const agentOptions = ['Agent A', 'Agent B', 'Agent C', 'Dispatch Lead'];

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' }).format(new Date(value));
}

function upsertTicket(previous, nextTicket) {
  const match = previous.some((ticket) => ticket._id === nextTicket._id);
  const tickets = match ? previous.map((ticket) => ticket._id === nextTicket._id ? nextTicket : ticket) : [nextTicket, ...previous];
  return tickets.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function TicketForm({ ticket, onChange, onSubmit, onClose, saving, isNew }) {
  return <div className="modal-backdrop"><section className="ticket-modal" aria-modal="true" role="dialog">
    <div className="modal-heading"><div><p className="eyebrow">{isNew ? 'New support request' : 'Live edit session'}</p><h2>{isNew ? 'Create ticket' : `Ticket #${ticket.ticketNumber}`}</h2>{!isNew && <p className="ownership">You are editing this ticket · 🔒 Locked by {ticket.lock?.agentName}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Close">×</button></div>
    <form onSubmit={onSubmit} className="ticket-form">
      <label>Customer / company<input required value={ticket.customer} onChange={(event) => onChange('customer', event.target.value)} /></label>
      <label>Issue<input required value={ticket.issue} onChange={(event) => onChange('issue', event.target.value)} /></label>
      <label className="full-width">Description<textarea required rows="3" value={ticket.description} onChange={(event) => onChange('description', event.target.value)} /></label>
      <label>Priority<select value={ticket.priority} onChange={(event) => onChange('priority', event.target.value)}>{['Low', 'Medium', 'High', 'Critical'].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Status<select value={ticket.status} onChange={(event) => onChange('status', event.target.value)}>{['Open', 'In Progress', 'Waiting on Customer', 'Resolved'].map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Assigned agent<input value={ticket.assignedAgent} onChange={(event) => onChange('assignedAgent', event.target.value)} placeholder="e.g. Agent A" /></label>
      <label className="full-width">Resolution<textarea rows="3" value={ticket.resolution || ''} onChange={(event) => onChange('resolution', event.target.value)} placeholder="Document the outcome or next action" /></label>
      <div className="modal-actions"><button type="button" className="secondary-button" disabled={saving} onClick={onClose}>{isNew ? 'Cancel' : 'Close without saving'}</button><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Saving…' : isNew ? 'Create ticket' : 'Save & unlock'}</button></div>
    </form>
  </section></div>;
}

export default function App() {
  const [tickets, setTickets] = useState([]);
  const [locks, setLocks] = useState({});
  const [agentName, setAgentName] = useState(() => localStorage.getItem('rapid-agent') || 'Agent A');
  const [connection, setConnection] = useState('connecting');
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(null);
  const [newTicket, setNewTicket] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const loadTickets = useCallback(async () => {
    try { const response = await api.get('/tickets'); setTickets(response.data); }
    catch { setError('Unable to load tickets. Check that the backend is running.'); }
  }, []);

  useEffect(() => { loadTickets(); }, [loadTickets]);
  useEffect(() => { localStorage.setItem('rapid-agent', agentName); }, [agentName]);
  useEffect(() => {
    const join = () => socket.emit('join_dashboard', { agentName });
    const onConnect = () => { setConnection('connected'); join(); loadTickets(); setNotice('Connection restored'); };
    const onDisconnect = () => setConnection('disconnected');
    const onCreated = (ticket) => setTickets((previous) => upsertTicket(previous, ticket));
    const onUpdated = (ticket) => setTickets((previous) => upsertTicket(previous, ticket));
    const onLocked = (lock) => setLocks((previous) => ({ ...previous, [lock.ticketId]: lock }));
    const onUnlocked = ({ ticketId }) => setLocks((previous) => { const copy = { ...previous }; delete copy[ticketId]; return copy; });
    socket.on('connect', onConnect); socket.on('disconnect', onDisconnect); socket.on('ticket_created', onCreated); socket.on('ticket_updated', onUpdated); socket.on('ticket_locked', onLocked); socket.on('ticket_unlocked', onUnlocked);
    socket.connect();
    return () => { socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); socket.off('ticket_created', onCreated); socket.off('ticket_updated', onUpdated); socket.off('ticket_locked', onLocked); socket.off('ticket_unlocked', onUnlocked); socket.disconnect(); };
  }, [agentName, loadTickets]);

  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 3500); return () => clearTimeout(timer); }, [notice]);

  const activeCount = useMemo(() => tickets.filter((ticket) => ticket.status !== 'Resolved').length, [tickets]);
  const updateDraft = (field, value) => setDraft((previous) => ({ ...previous, [field]: value }));
  const beginEdit = (ticket) => {
    if (connection !== 'connected') return setError('Changes cannot be started while disconnected.');
    socket.emit('lock_ticket', { ticketId: ticket._id, agentName }, (result) => {
      if (!result?.ok) return setError(result?.message || 'Unable to lock this ticket.');
      setEditing(ticket._id); setDraft({ ...ticket, lock: { agentName } }); setError('');
    });
  };
  const closeEditor = () => {
    if (newTicket) { setNewTicket(false); setDraft(null); return; }
    socket.emit('unlock_ticket', { ticketId: editing }, (result) => { if (!result?.ok) setError(result?.message || 'Could not release ticket lock.'); });
    setEditing(null); setDraft(null);
  };
  const saveTicket = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      if (newTicket) { const response = await api.post('/tickets', draft); setTickets((previous) => upsertTicket(previous, response.data)); setNewTicket(false); }
      else { const response = await api.put(`/tickets/${editing}`, draft); setTickets((previous) => upsertTicket(previous, response.data)); socket.emit('unlock_ticket', { ticketId: editing }); setEditing(null); }
      setDraft(null);
    } catch (requestError) { setError(requestError.response?.data?.message || 'Ticket could not be saved. Please try again.'); }
    finally { setSaving(false); }
  };
  const openNew = () => { setDraft({ ...blankTicket, assignedAgent: agentName }); setNewTicket(true); setError(''); };

  return <main className="app-shell"><aside className="sidebar"><div className="brand"><div className="brand-mark">RD</div><div><strong>RapidDispatch</strong><span>LIVE OPS</span></div></div><nav><a className="active" href="#tickets">▦ Operations desk</a><a href="#tickets">◷ My queue</a><a href="#tickets">◈ Team activity</a></nav><div className="sidebar-footer"><span className="live-dot"></span><span>Real-time operations</span></div></aside>
    <section className="workspace"><header className="topbar"><div><p className="eyebrow">SUPPORT OPERATIONS</p><h1>Live helpdesk</h1></div><div className="header-actions"><label className="agent-select">Working as<select value={agentName} onChange={(event) => setAgentName(event.target.value)}>{agentOptions.map((agent) => <option key={agent}>{agent}</option>)}</select></label><span className={`connection ${connection}`}>{connection === 'connected' ? '● Connected' : '● Disconnected'}</span></div></header>
      {connection === 'disconnected' && <div className="connection-banner">Connection Lost: Reconnecting… Changes may not save while offline.</div>}
      {notice && <div className="notice">{notice}</div>}{error && <div className="error-banner">{error}<button onClick={() => setError('')}>Dismiss</button></div>}
      <div className="metric-row"><article className="metric-card"><span>ACTIVE TICKETS</span><strong>{activeCount}</strong><small>Across live operations</small></article><article className="metric-card"><span>LIVE LOCKS</span><strong>{Object.keys(locks).length}</strong><small>Protected edit sessions</small></article><article className="metric-card"><span>TEAM PRESENCE</span><strong>{connection === 'connected' ? 'Online' : 'Offline'}</strong><small>{connection === 'connected' ? 'Syncing in real time' : 'Awaiting reconnection'}</small></article></div>
      <section className="ticket-section" id="tickets"><div className="section-heading"><div><h2>Active ticket board</h2><p>Every update is synchronized across the support team.</p></div><button className="primary-button" onClick={openNew}>+ New Ticket</button></div>
        <div className="table-wrap">{tickets.length === 0 ? <div className="loading">Loading tickets…</div> : <table><thead><tr><th>Ticket</th><th>Priority</th><th>Status</th><th>Assigned agent</th><th>Last updated</th><th>Lock state</th><th></th></tr></thead><tbody>{tickets.map((ticket) => { const lock = locks[ticket._id]; const owned = lock?.agentName === agentName && lock?.socketId === socket.id; return <tr key={ticket._id} className={lock && !owned ? 'locked-row' : ''}><td><strong>#{ticket.ticketNumber}</strong><span className="customer">{ticket.customer}</span><span className="issue">{ticket.issue}</span></td><td><span className={`badge priority-${ticket.priority.toLowerCase()}`}>{ticket.priority}</span></td><td><span className={`badge status-${ticket.status.toLowerCase().replaceAll(' ', '-')}`}>{ticket.status}</span></td><td>{ticket.assignedAgent || 'Unassigned'}</td><td>{formatTime(ticket.updatedAt)}</td><td>{lock ? <span className={owned ? 'lock own-lock' : 'lock'}>🔒 {owned ? 'You are editing' : `Locked by ${lock.agentName}`}</span> : <span className="unlocked">Available</span>}</td><td><button className="edit-button" disabled={Boolean(lock) || connection !== 'connected'} onClick={() => beginEdit(ticket)}>Edit</button></td></tr>; })}</tbody></table>}</div>
      </section>
    </section>{(editing || newTicket) && <TicketForm ticket={draft} onChange={updateDraft} onSubmit={saveTicket} onClose={closeEditor} saving={saving} isNew={newTicket} />}</main>;
}

