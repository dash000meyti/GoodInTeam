"use client";

import { ColorDot } from "@/components/shared/color-dot";
import { SelectField } from "@/components/shared/select-field";

export interface ProjectOption {
  id: string;
  name: string;
  color: string;
  slug?: string;
  billingType?: string;
}

export interface TaskOption {
  id: string;
  title: string;
  projectId: string | null;
}

/** Project picker with color dots. Works in forms (`name`) or controlled. */
export function ProjectSelect({
  projects,
  name,
  value,
  defaultValue,
  onChange,
  noneLabel,
  placeholder,
  size,
  className,
  id,
}: {
  projects: ProjectOption[];
  name?: string;
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string) => void;
  noneLabel?: string;
  placeholder?: string;
  size?: "sm" | "default";
  className?: string;
  id?: string;
}) {
  return (
    <SelectField
      id={id}
      name={name}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      noneLabel={noneLabel}
      placeholder={placeholder}
      size={size}
      className={className}
      options={projects.map((p) => ({
        value: p.id,
        label: <span className="truncate">{p.name}</span>,
        icon: <ColorDot color={p.color} />,
      }))}
    />
  );
}

/** Task picker limited to one project's open tasks (or personal tasks when no project). */
export function TaskSelect({
  tasks,
  projectId,
  name,
  value,
  onChange,
  noneLabel,
  placeholder,
  size,
  className,
  id,
}: {
  tasks: TaskOption[];
  projectId: string | null;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  noneLabel: string;
  placeholder?: string;
  size?: "sm" | "default";
  className?: string;
  id?: string;
}) {
  const options = tasks
    .filter((t) => (projectId ? t.projectId === projectId : !t.projectId) || t.id === value)
    .map((t) => ({ value: t.id, label: <span className="truncate">{t.title}</span> }));
  return (
    <SelectField
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      noneLabel={noneLabel}
      placeholder={placeholder}
      size={size}
      className={className}
      options={options}
    />
  );
}
