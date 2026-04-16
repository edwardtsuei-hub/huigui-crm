"use client";

type StepStripProps = {
  steps: string[];
  currentStep: number;
};

export function StepStrip({ steps, currentStep }: StepStripProps) {
  return (
    <section className="step-strip" aria-label="流程步骤">
      {steps.map((step, index) => {
        const state =
          index < currentStep
            ? "complete"
            : index === currentStep
              ? "current"
              : "upcoming";

        return (
          <div className={`step-strip__item ${state}`} key={step}>
            <div className="step-strip__badge">{index + 1}</div>
            <div className="step-strip__label">{step}</div>
          </div>
        );
      })}
    </section>
  );
}
