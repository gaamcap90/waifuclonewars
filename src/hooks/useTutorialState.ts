// src/hooks/useTutorialState.ts
import { useState, useCallback } from 'react';
import {
  TUTORIAL_STEPS, STAGE_ORDER,
  TutorialStage, TutorialTrigger, TutorialStep,
} from '@/data/tutorialData';

// These stages are never entered via auto-advance — only via explicit setTutorialStage calls.
// Battle/boss stages wait for a fight node click; s3b_campfire waits for the campfire node.
const GATED_STAGES = new Set<TutorialStage>(['s1_battle', 's2_battle', 's3b_campfire', 's4_battle', 's5_boss']);

const LS_DONE_KEY = 'wcw_tutorial_done';

export interface TutorialState {
  active: boolean;
  stage: TutorialStage;
  step: number;
  done: boolean;
  justCompleted: boolean; // true for one render cycle after completion
}

export function loadTutorialDone(): boolean {
  return localStorage.getItem(LS_DONE_KEY) === 'true';
}

function saveDone() {
  localStorage.setItem(LS_DONE_KEY, 'true');
}

export function clearTutorialDone() {
  localStorage.removeItem(LS_DONE_KEY);
}

const INITIAL: TutorialState = {
  active: false,
  stage: 'welcome',
  step: 0,
  done: loadTutorialDone(),
  justCompleted: false,
};

export function useTutorialState() {
  const [state, setState] = useState<TutorialState>(INITIAL);

  /** The current step object, or null when tutorial is inactive / complete. */
  const currentStep: TutorialStep | null = state.active
    ? (TUTORIAL_STEPS[state.stage]?.[state.step] ?? null)
    : null;

  const totalStepsInStage = state.active
    ? (TUTORIAL_STEPS[state.stage]?.length ?? 0)
    : 0;

  /** Begin the tutorial from the start. */
  const startTutorial = useCallback(() => {
    clearTutorialDone();
    setState({ active: true, stage: 'welcome', step: 0, done: false, justCompleted: false });
  }, []);

  /** Mark tutorial as skipped / done without playing. */
  const skipTutorial = useCallback(() => {
    saveDone();
    setState(prev => ({ ...prev, active: false, done: true, justCompleted: false }));
  }, []);

  /** Clear the justCompleted flag after it's been read. */
  const clearJustCompleted = useCallback(() => {
    setState(prev => ({ ...prev, justCompleted: false }));
  }, []);

  /**
   * Fire a tutorial event. If the current step's trigger matches,
   * advance to the next step (or next stage if all steps done).
   */
  const advanceTutorial = useCallback((trigger: TutorialTrigger) => {
    setState(prev => {
      if (!prev.active) return prev;
      const steps = TUTORIAL_STEPS[prev.stage] ?? [];
      const current = steps[prev.step];
      if (!current) return prev;
      if (current.trigger !== trigger) return prev;

      const nextStep = prev.step + 1;

      // More steps remain in this stage
      if (nextStep < steps.length) {
        return { ...prev, step: nextStep };
      }

      // Stage complete — advance to next stage
      const stageIdx = STAGE_ORDER.indexOf(prev.stage);
      const nextStage = STAGE_ORDER[stageIdx + 1] ?? 'complete';

      if (nextStage === 'complete') {
        saveDone();
        return { ...prev, active: false, stage: 'complete', step: 0, done: true, justCompleted: true };
      }

      // Battle/boss stages are never auto-entered — they wait for setTutorialStage.
      // Stay past the end of the current stage (currentStep = null, no overlay shown).
      if (GATED_STAGES.has(nextStage)) {
        return { ...prev, step: steps.length };
      }

      return { ...prev, stage: nextStage, step: 0 };
    });
  }, []);

  /**
   * Force-jump to a specific stage (used by Index.tsx when a fight node is
   * entered — the battle stage needs to be active inside the combat screen).
   */
  const setTutorialStage = useCallback((stage: TutorialStage) => {
    setState(prev => {
      if (!prev.active) return prev;
      return { ...prev, stage, step: 0 };
    });
  }, []);

  return {
    tutorialState: state,
    currentStep,
    totalStepsInStage,
    stageId: state.stage,
    startTutorial,
    skipTutorial,
    advanceTutorial,
    setTutorialStage,
    clearJustCompleted,
  };
}
