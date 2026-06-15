type TopBarProps = {
  title: string;
};

export function TopBar({ title }: TopBarProps) {
  return (
    <header className="topbar">
      <h1>{title}</h1>
      <div className="topbar-tools">
        <label className="search-box">
          <span aria-hidden="true">Search</span>
          <input type="search" placeholder="Search cases..." />
        </label>
        <button className="icon-button" type="button" aria-label="Notifications">
          !
        </button>
        <button className="icon-button" type="button" aria-label="Secure sign out">
          Exit
        </button>
        <div className="officer-chip">Legal Authority Officer</div>
      </div>
    </header>
  );
}
