import { LegalDocumentType } from "@popwam/db";
import { ManagedLegalPage } from "@/components/managed-legal-page";

export const metadata = { title: "Privacy" };
export default function PrivacyPage() { return <ManagedLegalPage type={LegalDocumentType.PRIVACY}/>; }
