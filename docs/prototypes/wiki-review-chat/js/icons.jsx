/* Lucide-flavored inline SVG icons. Stroke-based, 1.6px, currentColor — matches the
   project's Lucide usage without requiring an extra dependency. */

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };

function Svg(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" {...stroke} {...props}>{props.children}</svg>;
}

const Icons = {
  sparkles: (p) => <Svg {...p}><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M17.7 6.3l-2.8 2.8M9.1 14.9l-2.8 2.8" /></Svg>,
  check: (p) => <Svg {...p}><path d="M5 12.5l4.5 4.5L19 7" /></Svg>,
  x: (p) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>,
  plus: (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>,
  minus: (p) => <Svg {...p}><path d="M5 12h14" /></Svg>,
  swap: (p) => <Svg {...p}><path d="M7 7h11M7 7l3-3M7 7l3 3M17 17H6M17 17l-3-3M17 17l-3 3" /></Svg>,
  doc: (p) => <Svg {...p}><path d="M7 3h7l5 5v13H7zM14 3v5h5" /></Svg>,
  docs: (p) => <Svg {...p}><path d="M9 3h7l4 4v12H9zM9 7H5v14h11" /></Svg>,
  meeting: (p) => <Svg {...p}><circle cx="9" cy="9" r="3" /><circle cx="17" cy="11" r="2" /><path d="M3 19c0-3 2.5-5 6-5s6 2 6 5M14 19c.5-2 2-3 4-3s3 .8 3.5 2.5" /></Svg>,
  email: (p) => <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></Svg>,
  file: (p) => <Svg {...p}><path d="M7 3h8l4 4v14H7zM15 3v4h4" /></Svg>,
  chat: (p) => <Svg {...p}><path d="M4 5h16v11H8l-4 4z" /></Svg>,
  pin: (p) => <Svg {...p}><path d="M12 2v6l3 3v3h-3v6l-1-1-1 1v-6H7v-3l3-3V2z" /></Svg>,
  inbox: (p) => <Svg {...p}><path d="M3 13h5l1 3h6l1-3h5M5 5h14l2 8v6H3v-6z" /></Svg>,
  panel: (p) => <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M14 4v16" /></Svg>,
  search: (p) => <Svg {...p}><circle cx="11" cy="11" r="6" /><path d="M16 16l4 4" /></Svg>,
  arrow: (p) => <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>,
  rotate: (p) => <Svg {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 4v4h-4M21 12a9 9 0 0 1-15 6.7L3 16M3 20v-4h4" /></Svg>,
  mapPin: (p) => <Svg {...p}><path d="M12 22s7-7.6 7-13a7 7 0 0 0-14 0c0 5.4 7 13 7 13z" /><circle cx="12" cy="9" r="2.5" /></Svg>,
  triangle: (p) => <Svg {...p}><path d="M12 4l9 16H3z" /><path d="M12 10v5M12 18v.01" /></Svg>,
  shield: (p) => <Svg {...p}><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></Svg>,
  user: (p) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" /></Svg>,
  layers: (p) => <Svg {...p}><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5M3 17l9 5 9-5" /></Svg>,
  send: (p) => <Svg {...p}><path d="M21 3L3 11l8 3 3 8z" /><path d="M21 3l-10 10" /></Svg>,
  undo: (p) => <Svg {...p}><path d="M9 14L3 9l6-5M3 9h11a6 6 0 0 1 0 12h-3" /></Svg>,
  more: (p) => <Svg {...p}><circle cx="6" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="18" cy="12" r="1" /></Svg>,
  filter: (p) => <Svg {...p}><path d="M4 5h16l-6 8v6l-4-2v-4z" /></Svg>,
  link: (p) => <Svg {...p}><path d="M9 15l6-6M10 6l2-2a4 4 0 0 1 6 6l-2 2M14 18l-2 2a4 4 0 0 1-6-6l2-2" /></Svg>,
  history: (p) => <Svg {...p}><path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 8v4l3 2" /></Svg>,
  spark: (p) => <Svg {...p}><path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.5 5.5l4 4M14.5 14.5l4 4M18.5 5.5l-4 4M9.5 14.5l-4 4" /></Svg>,
  zap: (p) => <Svg {...p}><path d="M13 3L4 14h7l-1 7 9-11h-7z" /></Svg>,
  warn: (p) => <Svg {...p}><path d="M10.3 3.7L2 19h20L13.7 3.7a2 2 0 0 0-3.4 0z" /><path d="M12 9v5M12 17v.01" /></Svg>,
  collapse: (p) => <Svg {...p}><path d="M9 4l-5 5h3v6H4l5 5M15 20l5-5h-3V9h3l-5-5" /></Svg>,
};

window.Icons = Icons;
