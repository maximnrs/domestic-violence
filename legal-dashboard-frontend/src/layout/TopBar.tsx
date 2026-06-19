import { Icon } from "../components/ui/Icon";

type TopBarProps = {
  title: string;
};

export function TopBar({ title }: TopBarProps) {
  return (
    <header className="topbar">
      <h1>{title}</h1>
      <div className="topbar-tools">
        <label className="search-box">
          <Icon name="search" size={18} />
          <input type="search" placeholder="Search cases..." />
        </label>
        <button className="icon-button" type="button" aria-label="Notifications">
          <Icon name="bell" size={18} />
        </button>
        <button className="icon-button" type="button" aria-label="Secure sign out">
          <Icon name="logOut" size={18} />
        </button>
        <div className="officer-chip">Legal Authority Officer</div>
      </div>
    </header>
  );
}
