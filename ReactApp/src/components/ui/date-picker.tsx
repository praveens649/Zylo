"use client";

import { format, isValid, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  id?: string;
  /** "yyyy-MM-dd", or "yyyy-MM-ddTHH:mm" when `withTime` is set. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Inclusive "yyyy-MM-dd" bounds. */
  min?: string;
  max?: string;
  withTime?: boolean;
  disabled?: boolean;
  className?: string;
}

function parseDay(value: string) {
  if (!value) return undefined;
  const d = parse(value.slice(0, 10), "yyyy-MM-dd", new Date());
  return isValid(d) ? d : undefined;
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Pick a date",
  min,
  max,
  withTime,
  disabled,
  className,
}: DatePickerProps) {
  const selected = parseDay(value);
  const minDate = parseDay(min ?? "");
  const maxDate = parseDay(max ?? "");
  const now = new Date();
  const timePart = withTime && value.length > 10 ? value.slice(11, 16) : "09:00";
  const dateTime = withTime && value ? parse(value, "yyyy-MM-dd'T'HH:mm", new Date()) : undefined;
  const display =
    withTime && dateTime && isValid(dateTime)
      ? format(dateTime, "dd MMM yyyy, hh:mm a")
      : selected
        ? format(selected, "dd MMM yyyy")
        : undefined;

  const emit = (date: Date | undefined, time = timePart) => {
    if (!date) return onChange("");
    onChange(withTime ? `${format(date, "yyyy-MM-dd")}T${time}` : format(date, "yyyy-MM-dd"));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn("w-full justify-start font-normal", className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          {display ?? <span className="text-muted-foreground">{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={selected}
          defaultMonth={selected ?? minDate ?? now}
          startMonth={minDate ?? new Date(now.getFullYear() - 100, 0)}
          endMonth={maxDate ?? new Date(now.getFullYear() + 10, 11)}
          disabled={[
            ...(minDate ? [{ before: minDate }] : []),
            ...(maxDate ? [{ after: maxDate }] : []),
          ]}
          onSelect={(d) => emit(d)}
        />
        {withTime && (
          <div className="border-t p-3">
            <Input
              type="time"
              value={timePart}
              onChange={(e) => emit(selected ?? now, e.target.value)}
              className="h-9"
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
