import { Icon } from "../ui/Icon";

export function EvidenceSecurityNotice() {
  return (
    <div className="security-notice">
      <span className="shield-mark">
        <Icon name="shieldCheck" size={24} />
      </span>
      <div>
        <strong>All evidence is securely stored and time-stamped.</strong>
        <span>Integrity protected. Audit trail available.</span>
      </div>
    </div>
  );
}
