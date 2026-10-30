import React from "react";
import { describe, test, expect, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  MobileAssessmentView,
  TrialRequest,
} from "../src/frontend/components/game/MobileAssessmentView";
import { LocaleProvider } from "../src/frontend/contexts/LocaleContext";
import { GameEffectsProvider } from "../src/frontend/contexts/GameEffectsContext";

const mockTrialData: TrialRequest = {
  session_id: "test-session-mobile-001",
  trial_index: 3,
  phase: "FORMAL",
  payload: {
    stimulus_id: "stim-003",
    difficulty_level: 2,
    prompt:
      "观察以下 4x4 符号矩阵的旋转与反转规律，推导右下角缺失的符号单元：\n\n■ ▲ ★ ◆\n▲ ★ ◆ ■\n★ ◆ ■ ▲\n◆ ■ ▲ ·",
    options: {
      A: "■",
      B: "★",
      C: "▲",
      D: "◆",
    },
    has_hint: true,
    hint_cost: 1,
    hint_tier1_cost: 1,
    hint_tier2_cost: 2,
    hints_unlocked: 0,
    unlocked_hints: [],
    task_type: "SPATIAL_ROTATION",
  },
};

const renderWithContext = (ui: React.ReactElement) => {
  return renderToStaticMarkup(
    <LocaleProvider>
      <GameEffectsProvider>{ui}</GameEffectsProvider>
    </LocaleProvider>
  );
};

describe("MobileAssessmentView Suite", () => {
  describe("1. Layout & Touch Accessibility Gate (>= 44x44px)", () => {
    test("Renders header progress bar and hint trigger with min-h-[44px]", () => {
      const markup = renderWithContext(
        <MobileAssessmentView
          trialData={mockTrialData}
          totalTrials={30}
          selectedOption={null}
          onSelectOption={() => {}}
          selectedAction="HIGH_BET"
          onSelectAction={() => {}}
          unlockedHints={[]}
          hintsCost={0}
          onBuyHint={async () => {}}
          onSubmitTrial={async () => {}}
          loading={false}
          errorMsg=""
        />
      );

      // Progress counter
      expect(markup).toContain("03 / 30");

      // Hint trigger button touch target >= 44x44px
      expect(markup).toContain('data-testid="mobile-hint-trigger"');
      expect(markup).toContain("min-h-[44px]");
      expect(markup).toContain("min-w-[44px]");
    });

    test("Renders 2x2 Option matrix with min-h-[50px] (exceeding 44px touch gate)", () => {
      const markup = renderWithContext(
        <MobileAssessmentView
          trialData={mockTrialData}
          totalTrials={30}
          selectedOption="B"
          onSelectOption={() => {}}
          selectedAction="HIGH_BET"
          onSelectAction={() => {}}
          unlockedHints={[]}
          hintsCost={0}
          onBuyHint={async () => {}}
          onSubmitTrial={async () => {}}
          loading={false}
          errorMsg=""
        />
      );

      // All 4 options exist
      expect(markup).toContain('data-testid="mobile-option-A"');
      expect(markup).toContain('data-testid="mobile-option-B"');
      expect(markup).toContain('data-testid="mobile-option-C"');
      expect(markup).toContain('data-testid="mobile-option-D"');

      // Touch target >= 44px
      expect(markup).toContain("min-h-[50px]");

      // Selected option has active styling and aria-checked
      expect(markup).toContain('aria-checked="true"');
    });

    test("Renders confidence wager controls with min-h-[44px]", () => {
      const markup = renderWithContext(
        <MobileAssessmentView
          trialData={mockTrialData}
          totalTrials={30}
          selectedOption="A"
          selectedAction="HIGH_BET"
          onSelectOption={() => {}}
          onSelectAction={() => {}}
          unlockedHints={[]}
          hintsCost={0}
          onBuyHint={async () => {}}
          onSubmitTrial={async () => {}}
          loading={false}
          errorMsg=""
        />
      );

      expect(markup).toContain('data-testid="mobile-wager-high"');
      expect(markup).toContain('data-testid="mobile-wager-safe"');
      expect(markup).toContain("min-h-[44px]");
    });

    test("Renders submit button with min-h-[48px] and safe area padding in dock", () => {
      const markup = renderWithContext(
        <MobileAssessmentView
          trialData={mockTrialData}
          totalTrials={30}
          selectedOption="A"
          selectedAction="HIGH_BET"
          onSelectOption={() => {}}
          onSelectAction={() => {}}
          unlockedHints={[]}
          hintsCost={0}
          onBuyHint={async () => {}}
          onSubmitTrial={async () => {}}
          loading={false}
          errorMsg=""
        />
      );

      expect(markup).toContain('data-testid="mobile-submit-trial-btn"');
      expect(markup).toContain("min-h-[48px]");
      expect(markup).toContain("pb-[max(0.75rem,env(safe-area-inset-bottom))]");
    });
  });

  describe("2. Adaptive Scaling & Prompt Rendering", () => {
    test("Renders 2D symbol matrix in prompt without horizontal overflow classes", () => {
      const markup = renderWithContext(
        <MobileAssessmentView
          trialData={mockTrialData}
          totalTrials={30}
          selectedOption={null}
          onSelectOption={() => {}}
          selectedAction="HIGH_BET"
          onSelectAction={() => {}}
          unlockedHints={[]}
          hintsCost={0}
          onBuyHint={async () => {}}
          onSubmitTrial={async () => {}}
          loading={false}
          errorMsg=""
        />
      );

      // Symbol matrix container has max-w-full and overflow-x-auto
      expect(markup).toContain("max-w-full");
      expect(markup).toContain("overflow-x-auto");
      expect(markup).toContain("■");
      expect(markup).toContain("▲");
      expect(markup).toContain("★");
      expect(markup).toContain("◆");
    });
  });

  describe("3. Unlocked Hints Preview & BottomSheet Integration", () => {
    test("When hints are unlocked, shows unlocked pill banner and updated cost in wagers", () => {
      const trialWithHint: TrialRequest = {
        ...mockTrialData,
        payload: {
          ...mockTrialData.payload,
          hints_unlocked: 1,
          unlocked_hints: ["注意观察主对角线上的图形演变规律"],
        },
      };

      const markup = renderWithContext(
        <MobileAssessmentView
          trialData={trialWithHint}
          totalTrials={30}
          selectedOption="A"
          selectedAction="HIGH_BET"
          onSelectOption={() => {}}
          onSelectAction={() => {}}
          unlockedHints={["注意观察主对角线上的图形演变规律"]}
          hintsCost={1}
          onBuyHint={async () => {}}
          onSubmitTrial={async () => {}}
          loading={false}
          errorMsg=""
        />
      );

      // Header indicates unlocked count
      expect(markup).toContain("线索 (1/2)");

      // Prompt area has unlocked hint summary banner
      expect(markup).toContain("已解锁 1/2 级线索");
      expect(markup).toContain("已扣 1 分");

      // Wager values reflect hint deduction (10 - 1 = +9, 10 + 1 = -11)
      expect(markup).toContain("+9");
      expect(markup).toContain("-11");
    });
  });
});
