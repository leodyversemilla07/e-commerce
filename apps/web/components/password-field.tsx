"use client"

import { ViewIcon, ViewOffIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

type PasswordFieldProps = {
  id: string
  name: string
  placeholder?: string
  minLength?: number
  required?: boolean
  autoComplete?: string
}

export function PasswordField({
  id,
  name,
  placeholder,
  minLength = 8,
  required = true,
  autoComplete,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        minLength={minLength}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        suppressHydrationWarning
        className="pr-20"
      />
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        className="absolute right-1 top-1/2 -translate-y-1/2 active:translate-y-0 active:not-aria-[haspopup]:translate-y-0"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        <HugeiconsIcon
          icon={visible ? ViewOffIcon : ViewIcon}
          size={16}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </Button>
    </div>
  )
}
