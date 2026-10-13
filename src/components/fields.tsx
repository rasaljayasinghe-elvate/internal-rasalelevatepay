export const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-100";

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={"block " + (className ?? "")}>
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-neutral-500">{hint}</span>}
    </label>
  );
}

export function TextInput({
  label,
  hint,
  className,
  ...input
}: { label: string; hint?: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} hint={hint} className={className}>
      <input {...input} className={INPUT_CLASS} />
    </Field>
  );
}

export function TextArea({
  label,
  hint,
  className,
  ...input
}: { label: string; hint?: string; className?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} hint={hint} className={className}>
      <textarea rows={3} {...input} className={INPUT_CLASS} />
    </Field>
  );
}

export function Select({
  label,
  options,
  className,
  ...select
}: {
  label: string;
  options: Record<string, string> | { value: string; label: string }[];
  className?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const list = Array.isArray(options)
    ? options
    : Object.entries(options).map(([value, label]) => ({ value, label }));
  return (
    <Field label={label} className={className}>
      <select {...select} className={INPUT_CLASS}>
        {list.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={"whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium " + className}>
      {children}
    </span>
  );
}

export function ExternalLink({ href, children }: { href: string | null; children: React.ReactNode }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-brand hover:underline">
      {children}
    </a>
  );
}
