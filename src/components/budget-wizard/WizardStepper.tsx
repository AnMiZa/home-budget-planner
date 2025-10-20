import type { WizardStepDefinition } from "./types";

interface WizardStepperProps {
  readonly steps: readonly WizardStepDefinition[];
  readonly currentStepIndex: number;
  readonly onStepSelect?: (index: number) => void;
}

export const WizardStepper = ({ steps, currentStepIndex, onStepSelect }: WizardStepperProps) => {
  return (
    <nav aria-label="Kroki kreatora">
      <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex;

          return (
            <li key={step.id} className="flex flex-1 items-center gap-3">
              <button
                type="button"
                className={
                  "flex h-10 min-w-[40px] items-center justify-center rounded-full border text-sm font-medium transition" +
                  (isActive
                    ? " border-primary bg-primary text-primary-foreground"
                    : isCompleted
                      ? " border-primary/50 bg-primary/10 text-primary"
                      : " border-muted-foreground/20 text-muted-foreground")
                }
                aria-current={isActive ? "step" : undefined}
                onClick={() => onStepSelect?.(index)}
              >
                {index + 1}
              </button>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">{step.title}</span>
                {step.description ? <span className="text-xs text-muted-foreground">{step.description}</span> : null}
              </div>
              {index < steps.length - 1 ? (
                <span className="hidden flex-1 border-t border-dashed border-muted sm:block" aria-hidden="true" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
