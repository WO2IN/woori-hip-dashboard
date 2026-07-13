'use client'

import { Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface MultiSelectProps {
  options: string[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = '전체',
}: MultiSelectProps) {
  const toggleValue = (item: string) => {
    onChange(
      value.includes(item)
        ? value.filter(v => v !== item)
        : [...value, item]
    )
  }

  const displayText =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? value[0]
        : `${value.length}개 선택`

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-9 w-full justify-between font-normal"
        >
          <span className="truncate">{displayText}</span>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-1"
        align="start"
      >
        <div className="max-h-60 overflow-y-auto">
          {options.map(option => {
            const selected = value.includes(option)

            return (
              <button
                key={option}
                type="button"
                onClick={() => toggleValue(option)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              >
                <div className="flex h-4 w-4 items-center justify-center rounded border">
                  {selected && <Check className="h-3 w-3" />}
                </div>

                <span>{option}</span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}