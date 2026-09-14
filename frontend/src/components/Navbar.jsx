import { NavLink } from "react-router-dom";

const icon = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 9.5 8 3l6 6.5M4 8v5.5h8V8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  box: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 5 8 2l6 3v6l-6 3-6-3V5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M2 5l6 3 6-3M8 8v6" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  ),
  truck: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M1.5 4h7v6h-7z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M8.5 7h3l2 2v1h-5V7Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="4" cy="12" r="1.3" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="11" cy="12" r="1.3" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ),
  clipboard: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="2.5" width="10" height="12" rx="1" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 2v1.4h4V2M5.5 7h5M5.5 9.5h5M5.5 12h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  file: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 1.5h5.5L12.5 5v9.5h-8.5v-13Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M9.5 1.5V5h3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
};

const links = [
  { to: "/", label: "Dashboard", key: "dashboard", end: true },
  { to: "/products", label: "Products", key: "box" },
  { to: "/suppliers", label: "Suppliers", key: "truck" },
  { to: "/purchase-orders", label: "Purchase Orders", key: "clipboard" },
  { to: "/reports", label: "Reports", key: "file" }
];

export default function Navbar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">SR</div>
        <div>
          <div className="sidebar-brand-name">Stockroom</div>
          <div className="sidebar-brand-sub">Inventory control</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
          >
            {icon[link.key]}
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
