"use client";

import { useEffect, useState } from "react";
import {
  formatDisplayDate,
  formatDisplayDateTime,
  parseDisplayDate,
  parseDisplayDateTime,
} from "@/lib/display-date";

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
    <input
      className={cn(className)}
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
    <input
      className={cn(className)}
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
  );
}
