import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MessageCircle, Users, Search, Plus, Send, LogOut, UserRound,
  Check, X, Sparkles, ShieldCheck, Menu, ArrowLeft, LoaderCircle
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from './supabase';

const initials = (name = '?') => name.trim().split(/\s+/).slice(0, 2).map(x => x[0]?.toUpperCase()).join('') || '?';
const timeLabel = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

function Avatar({ name, online = false, small = false }) {
  return <div className={`avatar ${small ? 'avatar-small' : ''}`}>{initials(name)}{online && <i className="online-dot" />}</div>;
}

function ConfigScreen() {
  return <main className="setup-screen"><div className="setup-card">
    <div className="brand-mark large"><MessageCircle size={28} /></div>
    <span className="eyebrow">LET'S GET CONNECTED</span>
    <h1>Welcome to <span>LinkUp</span>.</h1>
    <p>Your private space for messages, friends, and good conversations.</p>
    <div className="setup-steps">
      <h3>One quick setup before you can use it</h3>
      <ol>
        <li>Create a free project at <a href="https://supabase.com" target="_blank" rel="noreferrer">Supabase</a>.</li>
        <li>In Supabase, open <b>SQL Editor</b> and run the <code>supabase/schema.sql</code> file included in this project.</li>
        <li>Copy your project URL and publishable/anon key into a new <code>.env</code> file, following <code>.env.example</code>.</li>
        <li>Run <code>npm install</code>, then <code>npm run dev</code>.</li>
      </ol>
    </div>
    <p className="muted tiny">Your credentials stay in your local environment. Never put a Supabase service-role key in a browser app.</p>
  </div></main>;
}

function AuthScreen() {
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { username: username.trim().toLowerCase() } }
        });
        if (error) throw error;
        if (!data.session) setNotice('Account created. Check your email to confirm your account, then sign in.');
        else setNotice('Account created! Welcome to LinkUp.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) { setError(e.message || 'Something went wrong.'); }
    finally { setBusy(false); }
  }

  return <main className="auth-screen"><div className="auth-visual">
    <div className="brand"><div className="brand-mark"><MessageCircle size={22}/></div><span>linkup</span></div>
    <div className="visual-copy"><span className="eyebrow">YOUR PEOPLE. YOUR SPACE.</span><h1>Good friends.<br/><span>Better conversations.</span></h1><p>A little corner of the internet made for your circle.</p>
      <div className="floating-chat chat-one"><Avatar name="Maya" small/><div><b>Maya</b><p>Game night tonight? 🎮</p></div><span>now</span></div>
      <div className="floating-chat chat-two"><Avatar name="Sam" small/><div><b>Sam</b><p>I'm in! 😂</p></div><span>1m</span></div>
      <div className="orb orb-one"/><div className="orb orb-two"/>
    </div>
    <div className="visual-footer"><ShieldCheck size={16}/> Built for your circle, with privacy in mind.</div>
  </div><div className="auth-panel"><div className="auth-box">
    <div className="mobile-brand brand"><div className="brand-mark"><MessageCircle size={22}/></div><span>linkup</span></div>
    <span className="eyebrow">{mode === 'signup' ? 'START YOUR CIRCLE' : 'GOOD TO SEE YOU'}</span>
    <h2>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
    <p className="muted">{mode === 'signup' ? 'Your friends are just a message away.' : 'Sign in to catch up with your people.'}</p>
    <form onSubmit={submit} className="auth-form">
      {mode === 'signup' && <label>Username<input value={username} onChange={e=>setUsername(e.target.value)} placeholder="e.g. alexcool" minLength="3" maxLength="24" pattern="[A-Za-z0-9_]+" required/><small>3–24 letters, numbers, or underscores.</small></label>}
      <label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email"/></label>
      <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" minLength="8" required autoComplete={mode==='signup'?'new-password':'current-password'}/></label>
      {error && <div className="alert error">{error}</div>}{notice && <div className="alert success">{notice}</div>}
      <button className="primary-button full" disabled={busy}>{busy ? <LoaderCircle className="spin" size={18}/> : null}{mode==='signup'?'Create account':'Sign in'} <span>→</span></button>
    </form>
    <p className="switch-auth">{mode==='signup'?'Already have an account?':'New to LinkUp?'} <button onClick={()=>{setMode(mode==='signup'?'signin':'signup');setError('');setNotice('')}}>{mode==='signup'?'Sign in':'Create account'}</button></p>
    <p className="terms">By continuing, you agree to be kind to the people in your circle.</p>
  </div></div></main>;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState('messages');
  const [profile, setProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [friendships, setFriendships] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeFriendship, setActiveFriendship] = useState(null);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [mobileChat, setMobileChat] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!isSupabaseConfigured) { setAuthLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession); setAuthLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) { setProfile(null); setProfiles([]); setFriendships([]); return; }
    loadAppData();
  }, [session?.user?.id]);

  async function loadAppData() {
    const user = session.user;
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    setProfile(p || { id: user.id, username: user.user_metadata?.username || user.email?.split('@')[0] || 'friend' });
    const { data: allProfiles } = await supabase.from('profiles').select('*').neq('id', user.id).order('username').limit(200);
    setProfiles(allProfiles || []);
    await loadFriendships();
  }

  async function loadFriendships() {
    if (!session?.user) return;
    const { data, error } = await supabase.from('friendships')
      .select('id,user_id,friend_id,status,created_at')
      .or(`user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`)
      .order('created_at', { ascending: false });
    if (!error) setFriendships(data || []);
  }

  const profileById = useMemo(() => new Map(profiles.map(p => [p.id, p])), [profiles]);
  function otherId(f) { return f.user_id === session?.user?.id ? f.friend_id : f.user_id; }
  function friendProfile(f) { return profileById.get(otherId(f)) || { id: otherId(f), username: 'friend' }; }
  const accepted = friendships.filter(f => f.status === 'accepted');
  const incoming = friendships.filter(f => f.status === 'pending' && f.friend_id === session?.user?.id);
  const outgoingIds = new Set(friendships.filter(f => f.status === 'pending' && f.user_id === session?.user?.id).map(f=>f.friend_id));
  const friendIds = new Set(friendships.map(f => otherId(f)));
  const activeFriend = activeFriendship ? friendProfile(activeFriendship) : null;

  useEffect(() => {
    if (!activeFriendship || !session?.user) { setMessages([]); return; }
    let alive = true;
    async function loadMessages() {
      const { data, error } = await supabase.from('messages').select('*').eq('friendship_id', activeFriendship.id).order('created_at', { ascending: true }).limit(300);
      if (alive && !error) setMessages(data || []);
    }
    loadMessages();
    const channel = supabase.channel(`messages-${activeFriendship.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `friendship_id=eq.${activeFriendship.id}` }, payload => {
        setMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new]);
      }).subscribe();
    return () => { alive = false; supabase.removeChannel(channel); };
  }, [activeFriendship?.id, session?.user?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!session?.user) return;
    const channel = supabase.channel('friendships-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => loadFriendships())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session?.user?.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  async function sendFriendRequest(id) {
    setBusy(true);
    const { error } = await supabase.from('friendships').insert({ user_id: session.user.id, friend_id: id, status: 'pending' });
    setBusy(false);
    if (error) setToast(error.code === '23505' ? 'You already sent a request.' : error.message);
    else { setToast('Friend request sent!'); await loadFriendships(); }
  }
  async function respondToRequest(f, status) {
    const { error } = await supabase.from('friendships').update({ status }).eq('id', f.id);
    if (error) setToast(error.message);
    else { setToast(status === 'accepted' ? 'You are now friends!' : 'Request declined.'); await loadFriendships(); }
  }
  async function sendMessage(e) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !activeFriendship) return;
    setDraft('');
    const { error } = await supabase.from('messages').insert({ friendship_id: activeFriendship.id, sender_id: session.user.id, content });
    if (error) { setDraft(content); setToast(error.message); }
  }
  async function signOut() { await supabase.auth.signOut(); setActiveFriendship(null); }
  function openChat(f) { setActiveFriendship(f); setTab('messages'); setMobileChat(true); }
  const visiblePeople = profiles.filter(p => {
    const q = search.trim().toLowerCase();
    return (!q || (p.username || '').toLowerCase().includes(q) || (p.display_name || '').toLowerCase().includes(q))
      && !friendIds.has(p.id);
  });

  if (!isSupabaseConfigured) return <ConfigScreen />;
  if (authLoading) return <div className="loading-screen"><div className="brand-mark"><MessageCircle/></div><LoaderCircle className="spin" size={24}/></div>;
  if (!session) return <AuthScreen />;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileChat ? 'hide-mobile' : ''}`}>
      <div className="side-brand"><div className="brand-mark"><MessageCircle size={21}/></div><span>linkup</span><span className="beta">BETA</span></div>
      <div className="user-card"><Avatar name={profile?.display_name || profile?.username}/><div className="user-meta"><b>{profile?.display_name || profile?.username || 'Your profile'}</b><span>@{profile?.username || 'friend'}</span></div><button className="icon-button" title="Sign out" onClick={signOut}><LogOut size={17}/></button></div>
      <div className="side-label">YOUR SPACE</div>
      <nav className="side-nav">
        <button className={tab==='messages'?'selected':''} onClick={()=>setTab('messages')}><MessageCircle size={19}/> Messages <span className="nav-count">{accepted.length}</span></button>
        <button className={tab==='friends'?'selected':''} onClick={()=>setTab('friends')}><Users size={19}/> Friends {incoming.length>0&&<span className="nav-count bright">{incoming.length}</span>}</button>
        <button className={tab==='discover'?'selected':''} onClick={()=>setTab('discover')}><Search size={19}/> Find people</button>
      </nav>
      <div className="sidebar-bottom"><div className="privacy-card"><ShieldCheck size={18}/><div><b>Your circle, your space</b><p>Only you and your friends can read your private chats.</p></div></div><div className="side-foot">LINKUP © 2026 <span>MADE FOR FRIENDS</span></div></div>
    </aside>
    <main className={`main-panel ${mobileChat ? 'show-mobile' : ''}`}>
      {tab === 'messages' ? <div className="messages-layout">
        <section className={`conversation-list ${mobileChat ? 'hide-mobile' : ''}`}>
          <div className="page-heading"><div><span className="eyebrow">YOUR PEOPLE</span><h1>Messages<span className="heading-dot">.</span></h1><p>Pick up where you left off.</p></div><button className="round-add" onClick={()=>setTab('discover')} title="Find friends"><Plus size={20}/></button></div>
          <div className="searchbox"><Search size={17}/><input placeholder="Search conversations..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
          <div className="list-section-title">ALL CHATS <span>{accepted.length}</span></div>
          <div className="people-list">
            {accepted.filter(f => friendProfile(f).username?.toLowerCase().includes(search.toLowerCase())).map(f => {
              const person = friendProfile(f);
              return <button key={f.id} className={`person-row ${activeFriendship?.id===f.id?'active':''}`} onClick={()=>openChat(f)}><Avatar name={person.display_name||person.username}/><div className="person-row-copy"><b>{person.display_name||person.username}</b><span>@{person.username}</span></div><span className="person-time">{timeLabel(f.created_at)}</span></button>;
            })}
            {accepted.length===0 && <div className="empty-state"><div className="empty-icon"><MessageCircle/></div><b>No chats yet</b><p>Add a friend to start your first conversation.</p><button className="text-button" onClick={()=>setTab('discover')}>Find your people →</button></div>}
          </div>
          <div className="list-footer"><span className="live-pip"/> Real-time messaging enabled</div>
        </section>
        <section className={`chat-panel ${mobileChat ? 'show-mobile' : ''}`}>
          {activeFriendship ? <><header className="chat-header"><button className="icon-button back-button" onClick={()=>setMobileChat(false)}><ArrowLeft size={19}/></button><Avatar name={activeFriend?.display_name||activeFriend?.username}/><div className="chat-person"><b>{activeFriend?.display_name||activeFriend?.username}</b><span>@{activeFriend?.username||'friend'}</span></div><div className="chat-header-right"><span className="live-pip"/> Private chat</div></header>
            <div className="chat-date"><span>YOUR CONVERSATION</span></div>
            <div className="message-stream">{messages.length===0&&<div className="chat-empty"><div className="empty-icon"><Sparkles/></div><h3>Start something good.</h3><p>Say hello to {activeFriend?.display_name||activeFriend?.username}.</p></div>}
              {messages.map(m => { const mine = m.sender_id===session.user.id; return <div key={m.id} className={`message-line ${mine?'mine':''}`}><div className="message-bubble">{m.content}<span>{timeLabel(m.created_at)}</span></div></div>; })}
              <div ref={bottomRef}/></div>
            <form className="composer" onSubmit={sendMessage}><input value={draft} onChange={e=>setDraft(e.target.value)} placeholder={`Message ${activeFriend?.username||'your friend'}...`} maxLength={4000}/><span className="composer-hint">↵</span><button className="send-button" disabled={!draft.trim()} aria-label="Send message"><Send size={18}/></button></form><div className="chat-footnote"><ShieldCheck size={13}/> Keep it kind. This conversation is private to its participants.</div>
          </> : <div className="welcome-chat"><div className="welcome-art"><div className="welcome-bubble bubble-a"><MessageCircle size={25}/></div><div className="welcome-bubble bubble-b"><Users size={25}/></div><div className="welcome-center"><MessageCircle size={44}/></div><span className="spark spark-a">✦</span><span className="spark spark-b">✧</span></div><span className="eyebrow">A SPACE FOR YOUR CIRCLE</span><h2>Good conversations<br/>start with <span>hello.</span></h2><p>Select a chat on the left, or find a friend to start talking.</p><button className="primary-button" onClick={()=>setTab('discover')}>Find your people <ArrowLeft size={16} className="rotate-arrow"/></button></div>}
        </section>
      </div> : tab === 'friends' ? <section className="content-page">
        <div className="page-heading"><div><span className="eyebrow">YOUR CIRCLE</span><h1>Friends<span className="heading-dot">.</span></h1><p>Your people, all in one place.</p></div><button className="primary-button" onClick={()=>setTab('discover')}><Plus size={17}/> Add friends</button></div>
        {incoming.length>0 && <><div className="section-heading"><h3>Friend requests</h3><span className="pill">{incoming.length} waiting</span></div><div className="cards-grid">{incoming.map(f=>{const p=friendProfile(f);return <div className="friend-card" key={f.id}><Avatar name={p.display_name||p.username}/><b>{p.display_name||p.username}</b><span>@{p.username}</span><div className="card-actions"><button className="accept-button" onClick={()=>respondToRequest(f,'accepted')}><Check size={16}/> Accept</button><button className="decline-button" onClick={()=>respondToRequest(f,'declined')}><X size={16}/></button></div></div>})}</div></>}
        <div className="section-heading"><h3>Your friends</h3><span className="pill">{accepted.length} friends</span></div>
        <div className="cards-grid">{accepted.map(f=>{const p=friendProfile(f);return <div className="friend-card" key={f.id}><Avatar name={p.display_name||p.username}/><b>{p.display_name||p.username}</b><span>@{p.username}</span><button className="secondary-button" onClick={()=>openChat(f)}><MessageCircle size={16}/> Message</button></div>})}</div>
        {accepted.length===0&&incoming.length===0&&<div className="empty-large"><Users size={30}/><h3>Your circle starts here.</h3><p>Find your friends and send them a request.</p><button className="primary-button" onClick={()=>setTab('discover')}>Find friends <ArrowLeft size={16} className="rotate-arrow"/></button></div>}
      </section> : <section className="content-page">
        <div className="page-heading"><div><span className="eyebrow">MEET YOUR PEOPLE</span><h1>Find friends<span className="heading-dot">.</span></h1><p>Search by username and bring your circle together.</p></div></div>
        <div className="searchbox discover-search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search usernames..."/>{search&&<button className="icon-button" onClick={()=>setSearch('')}><X size={16}/></button>}</div>
        <div className="section-heading"><h3>{search?`Results for “${search}”`:'People on LinkUp'}</h3><span className="pill">{visiblePeople.length} people</span></div>
        <div className="cards-grid">{visiblePeople.map(p=><div className="friend-card discover-card" key={p.id}><Avatar name={p.display_name||p.username}/><b>{p.display_name||p.username}</b><span>@{p.username}</span><button className="secondary-button" disabled={busy||outgoingIds.has(p.id)} onClick={()=>sendFriendRequest(p.id)}>{outgoingIds.has(p.id)?<><Check size={16}/> Request sent</>:<><Plus size={16}/> Add friend</>}</button></div>)}</div>
        {visiblePeople.length===0&&<div className="empty-large"><UserRound size={30}/><h3>No people found.</h3><p>Try another username, or invite a friend to create an account.</p></div>}
      </section>}
    </main>
    {toast&&<div className="toast">{toast}</div>}
  </div>;
}