import { LegalDocumentType } from "@popwam/db";
import { ManagedLegalPage } from "@/components/managed-legal-page";

export const metadata = { title: "Terms" };
export default function TermsPage() { return <ManagedLegalPage type={LegalDocumentType.TERMS}/>; }
