import { redirect } from "next/navigation";

export default function InvoicesIndex() {
  // サイドバーから /invoices を押したときは「企業への請求」に遷移
  redirect("/invoices/companies");
}
