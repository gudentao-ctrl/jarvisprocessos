import { useEffect, useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** How long a revealed password stays visible before hiding again. */
export const PASSWORD_REVEAL_MS = 5000;

type Props = Omit<ComponentProps<typeof Input>, "type">;

/** Password field with an eye button that shows the typed password for a few seconds. */
export function PasswordInput({ className, ...props }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), PASSWORD_REVEAL_MS);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pr-12", className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
