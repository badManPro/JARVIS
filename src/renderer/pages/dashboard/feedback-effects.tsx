import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Sparkles, Zap } from 'lucide-react';
import { Badge, Muted, SectionTitle } from '@/components/ui';
import { cn } from '@/lib/utils';

export type FeedbackTone = 'neutral' | 'success' | 'warning' | 'danger';

export type FeedbackMessage = {
  id: string;
  label: string;
  title: string;
  detail: string;
  tone: FeedbackTone;
  chips?: string[];
};

export type FeedbackStage = {
  label: string;
  detail: string;
};

export function createFeedbackMessage(message: Omit<FeedbackMessage, 'id'>): FeedbackMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...message,
  };
}

export function StagedFeedbackPanel({
  active,
  label,
  title,
  description,
  stages,
}: {
  active: boolean;
  label: string;
  title: string;
  description: string;
  stages: FeedbackStage[];
}) {
  const [activeStageIndex, setActiveStageIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setActiveStageIndex(0);
      return;
    }

    setActiveStageIndex(0);
    if (stages.length <= 1) {
      return;
    }

    let nextStageIndex = 0;
    const timer = globalThis.setInterval(() => {
      nextStageIndex = Math.min(nextStageIndex + 1, stages.length - 1);
      setActiveStageIndex(nextStageIndex);
      if (nextStageIndex >= stages.length - 1) {
        globalThis.clearInterval(timer);
      }
    }, 1050);

    return () => {
      globalThis.clearInterval(timer);
    };
  }, [active, stages.length]);

  if (!active) {
    return null;
  }

  const progress = `${Math.max(16, Math.round(((activeStageIndex + 1) / Math.max(stages.length, 1)) * 100))}%`;

  return (
    <div className="feedback-stage-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <Badge className="bg-white/80 text-slate-700">{label}</Badge>
          <SectionTitle className="mt-4 text-2xl">{title}</SectionTitle>
          <Muted className="mt-3 text-sm leading-6 text-slate-600">{description}</Muted>
        </div>
        <div className="feedback-stage-pill">
          <Sparkles className="h-4 w-4" />
          系统处理中
        </div>
      </div>

      <div className="feedback-stage-progress mt-5">
        <div className="feedback-stage-progress-bar" style={{ width: progress }} />
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {stages.map((stage, index) => {
          const state = index < activeStageIndex ? 'complete' : index === activeStageIndex ? 'active' : 'upcoming';
          return (
            <div
              key={`${stage.label}-${stage.detail}`}
              className={cn(
                'feedback-stage-item',
                state === 'complete' && 'is-complete',
                state === 'active' && 'is-active',
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'feedback-stage-dot',
                    state === 'complete' && 'is-complete',
                    state === 'active' && 'is-active',
                  )}
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">{stage.label}</div>
                  <div className="mt-2 text-xs leading-5 text-slate-500">{stage.detail}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FeedbackBanner({
  message,
  className,
}: {
  message: FeedbackMessage;
  className?: string;
}) {
  return (
    <div key={message.id} className={cn('feedback-flow-banner', className)} data-tone={message.tone}>
      <div className="flex items-start gap-3">
        <div className="feedback-flow-icon">
          <FeedbackToneIcon tone={message.tone} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{message.label}</div>
          <div className="mt-2 text-sm font-semibold text-slate-950">{message.title}</div>
          <div className="mt-2 text-sm leading-6 text-slate-700">{message.detail}</div>
          {message.chips?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.chips.map((chip) => (
                <Badge key={`${message.id}-${chip}`} className="bg-white/80 text-slate-700">
                  {chip}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function useTransientHighlight(duration = 1800) {
  const [token, setToken] = useState(0);
  const [active, setActive] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);

  useEffect(() => {
    if (token === 0) {
      return;
    }

    setActive(true);
    if (timeoutRef.current) {
      globalThis.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = globalThis.setTimeout(() => {
      setActive(false);
      timeoutRef.current = null;
    }, duration);

    return () => {
      if (timeoutRef.current) {
        globalThis.clearTimeout(timeoutRef.current);
      }
    };
  }, [duration, token]);

  useEffect(() => () => {
    if (timeoutRef.current) {
      globalThis.clearTimeout(timeoutRef.current);
    }
  }, []);

  return {
    active,
    trigger: () => setToken((value) => value + 1),
  };
}

function FeedbackToneIcon({ tone }: { tone: FeedbackTone }) {
  switch (tone) {
    case 'success':
      return <CheckCircle2 className="h-5 w-5" />;
    case 'warning':
      return <Zap className="h-5 w-5" />;
    case 'danger':
      return <AlertTriangle className="h-5 w-5" />;
    case 'neutral':
    default:
      return <Sparkles className="h-5 w-5" />;
  }
}
