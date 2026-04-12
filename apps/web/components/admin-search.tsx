"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Input } from "@workspace/ui/components/input"

type AdminSearchProps = {
  placeholder?: string
  basePath: string
}

export function AdminSearch({ placeholder = "Search...", basePath }: AdminSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(searchParams.get("q") ?? "")

  const searchParamsString = searchParams.toString()

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParamsString)
      if (value) {
        params.set("q", value)
      } else {
        params.delete("q")
      }
      router.replace(`${basePath}?${params.toString()}`)
    }, 300)

    return () => clearTimeout(timer)
  }, [basePath, router, searchParamsString, value])

  return (
    <Input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      className="max-w-sm"
    />
  )
}
