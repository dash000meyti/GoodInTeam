/** Replace `{name}` placeholders: format("Hi {name}", { name: "Ali" }). */
export function format(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}
