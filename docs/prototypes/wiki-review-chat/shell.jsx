// Sidebar + Crumbs + small shared bits
const { useState, useEffect, useRef } = React;

window.Sidebar = function Sidebar({ scene, setScene, activeChat, setActiveChat }) {
  const links = [
    { key: "home",    label: "Project home", icon: "home" },
    { key: "sources", label: "Sources",      icon: "book", count: SAMPLE.sources.length },
    { key: "activity",label: "Activity",     icon: "activity" },
    { key: "settings",label: "Members",      icon: "settings" },
  ];
  return (
    <aside className="sidebar">
      <div className="sb-header">
        <div className="sb-mark"></div>
        <div className="sb-title">
          <span className="name">{SAMPLE.project.name}</span>
          <span className="meta">{SAMPLE.project.code}</span>
        </div>
        <button className="icon-btn" title="Project menu"><Icon name="more"/></button>
      </div>

      <button className="sb-search" onClick={() => alert("⌘K — search opens here")}>
        <Icon name="search" size={14}/>
        <span className="grow">Search project…</span>
        <span className="kbd">⌘K</span>
      </button>

      <div className="sb-section">
        <nav className="col gap-1">
          {links.map(l => (
            <div key={l.key}
                 className={"sb-link" + (scene === l.key ? " active" : "")}
                 onClick={() => setScene(l.key)}>
              <Icon name={l.icon}/>
              <span className="grow">{l.label}</span>
              {l.count != null && <span className="count">{l.count}</span>}
            </div>
          ))}
        </nav>
      </div>

      <div className="sb-eyebrow">
        <span>Chats</span>
        <button onClick={() => setScene("chat")} title="New chat"><Icon name="plus" size={12}/></button>
      </div>
      <div className="sb-chats scroll">
        {SAMPLE.conversations.map(c => (
          <div key={c.id}
               className={"sb-chat" + (scene === "chat" && activeChat === c.id ? " active" : "")}
               onClick={() => { setScene("chat"); setActiveChat(c.id); }}>
            <span style={{overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{c.title}</span>
            <span className="when">{c.when}</span>
          </div>
        ))}
      </div>

      <div className="sb-foot">
        <div className="sb-avatar">{SAMPLE.user.initials}</div>
        <div style={{flex:1, minWidth:0}}>
          <div className="name">{SAMPLE.user.name}</div>
          <div className="meta">{SAMPLE.user.handle}</div>
        </div>
        <button className="icon-btn"><Icon name="more"/></button>
      </div>
    </aside>
  );
};

window.Crumbs = function Crumbs({ trail, right }) {
  return (
    <div className="crumbs">
      {trail.map((t, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="sep">/</span>}
          <span className={"item" + (i === trail.length - 1 ? " active" : "")}>{t}</span>
        </React.Fragment>
      ))}
      <span className="spacer"></span>
      {right}
    </div>
  );
};

window.Tabs = function Tabs({ items, value, onChange }) {
  return (
    <div className="tabs">
      {items.map(it => (
        <div key={it.key}
             className={"tab" + (value === it.key ? " active" : "")}
             onClick={() => onChange(it.key)}>
          <span>{it.label}</span>
          {it.count != null && <span className="count">{it.count}</span>}
        </div>
      ))}
    </div>
  );
};

Object.assign(window, { Sidebar: window.Sidebar, Crumbs: window.Crumbs, Tabs: window.Tabs });
