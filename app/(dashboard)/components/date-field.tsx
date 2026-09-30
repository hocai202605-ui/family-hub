"use client";

import { useEffect, useState } from "react";
import {
  formatDisplayDate,
  formatDisplayDateTime,
  parseDisplayDate,
  parseDisplayDateTime,
} from "@/lib/display-date";
import { Icon } from "./icons";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type CommonProps = {
  id?: string;
  className?: string;
  required?: boolean;
  name?: string;
};

export function DateField({
  id,
  className,
  required,
  name,
  value,
  onChange,
}: CommonProps & {
  value: string;
  onChange: (isoDate: string) => void;
}) {
  const [text, setText] = useState(() => (value ? formatDisplayDate(value) : ""));

  useEffect(() => {
    setText(value ? formatDisplayDate(value) : "");
  }, [value]);

  return (
    <div className="relative flex w-full">
      <input
        className={cn(className, "pr-10")}
        id={id}
        inputMode="numeric"
        name={name}
        onBlur={() => {
          const parsed = parseDisplayDate(text);
          if (parsed) {
            onChange(parsed);
            setText(formatDisplayDate(parsed));
            return;
          }
          setText(value ? formatDisplayDate(value) : "");
        }}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          const parsed = parseDisplayDate(next);
          if (parsed) onChange(parsed);
        }}
        placeholder="dd/mm/yyyy"
        required={required}
        type="text"
        value={text}
      />
      <div className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2">
        <input
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          onChange={(e) => {
            if (e.target.value) {
              onChange(e.target.value);
              setText(formatDisplayDate(e.target.value));
            }
          }}
          type="date"
          value={value ? value.slice(0, 10) : ""}
        />
        <Icon className="pointer-events-none absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-slate-400" name="calendar" />
      </div>
    </div>
  );
}

export function DateTimeField({
  id,
  className,
  required,
  name,
  value,
  onChange,
}: CommonProps & {
  value: string;
  onChange: (isoDateTime: string) => void;
}) {
  const [text, setText] = useState(() => (value ? formatDisplayDateTime(value) : ""));

  useEffect(() => {
    setText(value ? formatDisplayDateTime(value) : "");
  }, [value]);

  return (
    <div className="relative flex w-full">
      <input
        className={cn(className, "pr-10")}
        id={id}
        name={name}
        onBlur={() => {
          const parsed = parseDisplayDateTime(text);
          if (parsed) {
            onChange(parsed);
            setText(formatDisplayDateTime(parsed));
            return;
          }
          setText(value ? formatDisplayDateTime(value) : "");
        }}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          const parsed = parseDisplayDateTime(next);
          if (parsed) onChange(parsed);
        }}
        placeholder="dd/mm/yyyy hh:mm"
        required={required}
        type="text"
        value={text}
      />
      <div className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2">
        <input
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          onChange={(e) => {
            if (e.target.value) {
              const dt = e.target.value.length === 10 ? e.target.value + "T00:00" : e.target.value;
              onChange(dt);
              setText(formatDisplayDateTime(dt));
            }
          }}
          type="datetime-local"
          value={value ? value.slice(0, 16) : ""}
        />
        <Icon className="pointer-events-none absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-slate-400" name="calendar" />
      </div>
    </div>
  );
}
