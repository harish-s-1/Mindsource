"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Cpu } from "lucide-react";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Form";
import { SimulationBadge } from "@/components/ui/SimulationBadge";

export function NewWorkloadForm() {
  const router = useRouter();
  const [analyzing, setAnalyzing] = useState(false);

  // No real analysis — a short simulated delay, then to the demo decision.
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (analyzing) return;
    setAnalyzing(true);
    setTimeout(() => {
      router.push("/decisions/demo");
    }, 1500);
  };

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Panel className="lg:col-span-2">
        <PanelHeader title="Workload definition" />
        <PanelBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Workload name" htmlFor="name" className="sm:col-span-2">
            <Input id="name" name="name" placeholder="e.g. Vision Fine-tune" defaultValue="Vision Fine-tune" />
          </Field>

          <Field label="Team" htmlFor="team">
            <Input id="team" name="team" placeholder="e.g. Perception" defaultValue="Perception" />
          </Field>

          <Field label="Workload type" htmlFor="type">
            <Select id="type" name="type" defaultValue="Fine-tuning">
              <option>Training</option>
              <option>Inference</option>
              <option>Fine-tuning</option>
              <option>Batch</option>
              <option>Experimentation</option>
            </Select>
          </Field>

          <Field label="GPU count" htmlFor="gpuCount">
            <Input id="gpuCount" name="gpuCount" type="number" min={1} defaultValue={4} />
          </Field>

          <Field label="GPU type preference" htmlFor="gpuType" hint="Advisory — the decision layer may recommend an alternative.">
            <Select id="gpuType" name="gpuType" defaultValue="No preference">
              <option>No preference</option>
              <option>H100</option>
              <option>A100</option>
              <option>L4</option>
              <option>T4</option>
            </Select>
          </Field>

          <Field label="GPU memory requirement" htmlFor="memory">
            <Input id="memory" name="memory" placeholder="GB" type="number" min={1} defaultValue={96} />
          </Field>

          <Field label="Expected duration" htmlFor="duration" hint="In hours.">
            <Input id="duration" name="duration" type="number" min={1} defaultValue={3} />
          </Field>

          <Field label="Priority" htmlFor="priority">
            <Select id="priority" name="priority" defaultValue="Medium">
              <option>Critical</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </Select>
          </Field>

          <Field label="Deadline" htmlFor="deadline">
            <Input id="deadline" name="deadline" type="datetime-local" defaultValue="2026-09-07T21:00" />
          </Field>
        </PanelBody>
      </Panel>

      <div className="space-y-4">
        <Panel>
          <PanelHeader title="Recommendation" hint={<SimulationBadge label="SIMULATED RECOMMENDATION" />} />
          <PanelBody>
            <p className="text-xs text-text-secondary">
              Submitting runs a simulated evaluation of GPU compatibility,
              availability, priority, deadline and cost, then returns a demo
              scheduling recommendation for review.
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-text-muted">
              <li className="flex items-center gap-2">
                <Cpu className="h-3.5 w-3.5" /> GPU compatibility check
              </li>
              <li className="flex items-center gap-2">
                <Cpu className="h-3.5 w-3.5" /> Availability &amp; priority scoring
              </li>
              <li className="flex items-center gap-2">
                <Cpu className="h-3.5 w-3.5" /> Deadline &amp; cost estimation
              </li>
            </ul>

            <Button type="submit" variant="primary" className="mt-4 w-full" disabled={analyzing}>
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing…
                </>
              ) : (
                "Analyze & Recommend"
              )}
            </Button>

            {analyzing && (
              <p className="mt-2 text-center text-2xs text-text-muted">
                Running simulated evaluation…
              </p>
            )}
          </PanelBody>
        </Panel>

        <p className="px-1 text-2xs text-text-muted">
          No workload is created or scheduled. This is a simulated demo — the
          recommendation is illustrative only.
        </p>
      </div>
    </form>
  );
}
