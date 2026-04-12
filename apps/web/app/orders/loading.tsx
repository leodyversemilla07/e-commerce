import { redirect } from "next/navigation"

export default function LegacyOrdersLoading() {
  redirect("/account/orders")
}
