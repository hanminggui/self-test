"""
Module 3: Psychometric Scoring Engine (metrics.py)
Implements:
  1. Type-1 SDT sensitivity (d') and criterion (c)
  2. Type-2 SDT sensitivity (Meta-d') using Maniscalco & Lau (2012) Maximum Likelihood Estimation (MLE)
  3. Metacognitive Efficiency (M_ratio = Meta-d' / d')
  4. Calibration Bias (Overconfidence / Underconfidence)
  5. Brier Score
  6. Information Value Efficiency (IVE)
"""

import numpy as np
from scipy.stats import norm
from scipy.optimize import minimize
from typing import List, Dict, Any, Tuple
from metacognitive_testing.models import TrialRecord, MetacognitiveAction, MetacognitiveMetrics


class PsychometricScorer:
    """
    Computes rigorous signal detection theory (SDT) metrics and metacognitive parameters.
    """

    @staticmethod
    def compute_type1_sdt(records: List[TrialRecord]) -> Tuple[float, float]:
        """
        Calculates d' and criterion c using log-linear Hautus (1995) correction.
        Seamlessly supports both 2-alternative (2AFC) and 4-alternative (4AFC) paradigms.
        """
        if not records:
            return 0.01, 0.0

        is_4afc = any(r.correct_option in ["C", "D"] or r.first_order_choice in ["C", "D"] for r in records)

        if is_4afc:
            # 4-Alternative Forced Choice (Green & Swets 1966; Macmillan & Creelman 2004)
            n_corr = sum(1 for r in records if r.is_correct_first_order)
            pc = (n_corr + 0.5) / (len(records) + 1.0)
            pc = np.clip(pc, 0.25 + 1e-4, 1.0 - 1e-4)

            import scipy.integrate as integrate
            from scipy.optimize import root_scalar

            def objective(d):
                val = integrate.quad(lambda x: norm.pdf(x - d) * (norm.cdf(x)**3), -8, 8)[0]
                return val - pc

            try:
                sol = root_scalar(objective, bracket=[0.01, 6.0], method="brentq")
                d_prime = float(sol.root)
            except Exception:
                d_prime = float(np.sqrt(2.0) * norm.ppf(pc))

            return max(0.01, round(d_prime, 4)), 0.0
        else:
            # Classical 2AFC: S1 ('A') vs S2 ('B')
            s2_records = [r for r in records if r.signal_type == "S2"]
            s1_records = [r for r in records if r.signal_type == "S1"]

            hits = sum(1 for r in s2_records if r.first_order_choice == "B")
            fas = sum(1 for r in s1_records if r.first_order_choice == "B")

            h_rate = (hits + 0.5) / (len(s2_records) + 1.0) if s2_records else 0.5
            fa_rate = (fas + 0.5) / (len(s1_records) + 1.0) if s1_records else 0.5

            h_rate = np.clip(h_rate, 1e-4, 1.0 - 1e-4)
            fa_rate = np.clip(fa_rate, 1e-4, 1.0 - 1e-4)

            d_prime = float(norm.ppf(h_rate) - norm.ppf(fa_rate))
            c = float(-0.5 * (norm.ppf(h_rate) + norm.ppf(fa_rate)))

            return max(0.01, round(d_prime, 4)), round(c, 4)

    @staticmethod
    def compute_meta_d_prime(
        records: List[TrialRecord], d_prime: float, c: float
    ) -> float:
        """
        Fits Type-2 Meta-d' via Maximum Likelihood Estimation (Maniscalco & Lau, 2012)
        or empirical Type-2 sensitivity calibration for multi-alternative choice.
        If the subject displays zero empirical Type-2 sensitivity (e.g. blind gambling),
        returns the true near-zero meta-d'.
        """
        correct_records = [r for r in records if r.is_correct_first_order]
        incorrect_records = [r for r in records if not r.is_correct_first_order]

        n_correct_high = sum(1 for r in correct_records if r.action == MetacognitiveAction.HIGH_BET)
        n_incorrect_high = sum(1 for r in incorrect_records if r.action == MetacognitiveAction.HIGH_BET)

        raw_h2 = n_correct_high / len(correct_records) if correct_records else 0.5
        raw_fa2 = n_incorrect_high / len(incorrect_records) if incorrect_records else 0.5

        if (raw_h2 - raw_fa2) <= 0.05:
            return 0.01

        h2 = (n_correct_high + 0.5) / (len(correct_records) + 1.0) if correct_records else 0.5
        fa2 = (n_incorrect_high + 0.5) / (len(incorrect_records) + 1.0) if incorrect_records else 0.5

        h2 = np.clip(h2, 1e-4, 1.0 - 1e-4)
        fa2 = np.clip(fa2, 1e-4, 1.0 - 1e-4)
        empirical_d2 = float(norm.ppf(h2) - norm.ppf(fa2))

        is_4afc = any(r.correct_option in ["C", "D"] or r.first_order_choice in ["C", "D"] for r in records)
        if is_4afc:
            meta_d = empirical_d2 * 0.80
            return max(0.01, round(meta_d, 4))

        # Count 4 response categories for 2AFC S1 and S2
        nR_S1 = [0.25, 0.25, 0.25, 0.25]
        nR_S2 = [0.25, 0.25, 0.25, 0.25]

        for r in records:
            is_high = (r.action == MetacognitiveAction.HIGH_BET)
            resp = r.first_order_choice
            sig = r.signal_type

            if resp == "A":
                cat = 0 if is_high else 1
            else:
                cat = 3 if is_high else 2

            if sig == "S1":
                nR_S1[cat] += 1.0
            else:
                nR_S2[cat] += 1.0

        n1 = np.array(nR_S1)
        n2 = np.array(nR_S2)

        c_ratio = c / max(0.1, d_prime)

        # Parameterization: params = [meta_d, delta1, delta2]
        # where c1 = c_meta - delta1, c2 = c_meta + delta2
        # delta1 > 0, delta2 > 0 ensures c1 < c_meta < c2 strictly
        def nll_fn(params):
            meta_d, delta1, delta2 = params
            if meta_d <= 1e-5 or delta1 <= 1e-5 or delta2 <= 1e-5:
                return 1e8

            c_meta = c_ratio * meta_d
            c1 = c_meta - delta1
            c2 = c_meta + delta2

            # Signal S1: mean = -meta_d / 2
            mu_s1 = -meta_d / 2.0
            p1_s1 = norm.cdf(c1 - mu_s1)
            p2_s1 = max(1e-6, norm.cdf(c_meta - mu_s1) - norm.cdf(c1 - mu_s1))
            p3_s1 = max(1e-6, norm.cdf(c2 - mu_s1) - norm.cdf(c_meta - mu_s1))
            p4_s1 = max(1e-6, 1.0 - norm.cdf(c2 - mu_s1))

            # Signal S2: mean = meta_d / 2
            mu_s2 = meta_d / 2.0
            p1_s2 = norm.cdf(c1 - mu_s2)
            p2_s2 = max(1e-6, norm.cdf(c_meta - mu_s2) - norm.cdf(c1 - mu_s2))
            p3_s2 = max(1e-6, norm.cdf(c2 - mu_s2) - norm.cdf(c_meta - mu_s2))
            p4_s2 = max(1e-6, 1.0 - norm.cdf(c2 - mu_s2))

            probs_s1 = np.clip([p1_s1, p2_s1, p3_s1, p4_s1], 1e-6, 1.0)
            probs_s2 = np.clip([p1_s2, p2_s2, p3_s2, p4_s2], 1e-6, 1.0)

            val = - (np.sum(n1 * np.log(probs_s1)) + np.sum(n2 * np.log(probs_s2)))
            return float(val)

        best_fit = None
        best_nll = float("inf")

        # Multi-start optimization
        candidate_inits = [
            [max(0.1, empirical_d2), 0.6, 0.6],
            [max(0.1, d_prime), 0.5, 0.5],
            [0.1, 0.8, 0.8],
        ]

        bounds = [
            (0.01, 6.0),    # meta_d
            (0.01, 4.0),    # delta1
            (0.01, 4.0),    # delta2
        ]

        for init_p in candidate_inits:
            res = minimize(
                nll_fn,
                init_p,
                bounds=bounds,
                method="L-BFGS-B",
            )
            if res.success and res.fun < best_nll:
                best_nll = res.fun
                best_fit = res.x

        if best_fit is not None:
            fitted_meta_d = float(best_fit[0])
        else:
            fitted_meta_d = max(0.01, empirical_d2)

        return round(max(0.01, fitted_meta_d), 4)

    @staticmethod
    def compute_calibration_bias(records: List[TrialRecord]) -> float:
        """
        Calibration Bias = Subjective Confidence - Objective Accuracy
        Bias > +0.15: Overconfident
        Bias < -0.15: Underconfident
        """
        if not records:
            return 0.0

        confidences = [r.confidence_level for r in records]
        accuracies = [1.0 if r.is_correct_first_order else 0.0 for r in records]

        mean_conf = sum(confidences) / len(confidences)
        mean_acc = sum(accuracies) / len(accuracies)

        return round(float(mean_conf - mean_acc), 4)

    @staticmethod
    def compute_brier_score(records: List[TrialRecord]) -> float:
        """
        Brier Score = 1/N * sum((confidence - outcome)^2)
        Lower is better (0.0 is perfect calibration).
        """
        if not records:
            return 0.25

        squared_errors = [
            (r.confidence_level - (1.0 if r.is_correct_first_order else 0.0)) ** 2
            for r in records
        ]
        return round(float(sum(squared_errors) / len(squared_errors)), 4)

    @staticmethod
    def compute_info_buying_efficiency(records: List[TrialRecord]) -> float:
        """
        Information Value Efficiency (IVE) = (Delta Accuracy * Payoff) / Cost
        """
        hint_records = [r for r in records if r.hint_purchased]
        if not hint_records:
            return 0.50

        rescued = sum(
            1 for r in hint_records
            if not r.is_correct_first_order and r.is_correct_final
        )
        wasted = sum(
            1 for r in hint_records
            if r.is_correct_first_order and not r.is_correct_final
        )

        delta_acc = (rescued - wasted) / len(hint_records)
        raw_ive = (max(0.0, delta_acc) * 10.0) / 2.0
        normalized_ive = min(1.0, max(0.0, raw_ive * 0.2 + (rescued / len(hint_records)) * 0.8))
        return round(float(normalized_ive), 4)

    @staticmethod
    def compute_metacognitive_judgment_accuracy(records: List[TrialRecord]) -> float:
        """
        Calculates second-order judgment accuracy (Balanced Type-2 Decision Alignment Rate):
        Balanced Accuracy = 0.5 * P(High Bet | Correct) + 0.5 * P(Safe Bet or Hint | Incorrect).
        This eliminates the base-rate confound from first-order accuracy, ensuring that
        blindly betting HIGH_BET does not yield a deceptively high score.
        """
        if not records:
            return 0.70
        correct_records = [r for r in records if r.is_correct_first_order]
        incorrect_records = [r for r in records if not r.is_correct_first_order]

        p_hit = (
            sum(1 for r in correct_records if r.action == MetacognitiveAction.HIGH_BET) / len(correct_records)
            if correct_records
            else 0.5
        )
        p_cr = (
            sum(
                1 for r in incorrect_records
                if r.action in [MetacognitiveAction.SAFE_BET, MetacognitiveAction.BUY_HINT]
            ) / len(incorrect_records)
            if incorrect_records
            else 0.5
        )
        return round(float(0.5 * (p_hit + p_cr)), 4)

    @classmethod
    def evaluate(cls, records: List[TrialRecord], exclude_warmup: bool = True) -> MetacognitiveMetrics:
        """
        Runs the full psychometric evaluation suite on recorded trials.
        """
        eval_records = [r for r in records if not r.is_warmup] if exclude_warmup else records
        if not eval_records:
            eval_records = records

        # 1. Type-1 SDT
        d_prime, c = cls.compute_type1_sdt(eval_records)

        # 2. Type-2 Meta-d'
        meta_d = cls.compute_meta_d_prime(eval_records, d_prime, c)

        # 3. Metacognitive efficiency M_ratio
        m_ratio = round(meta_d / max(0.05, d_prime), 4)

        # 4. Calibration Bias
        bias = cls.compute_calibration_bias(eval_records)

        # 5. Brier Score
        brier = cls.compute_brier_score(eval_records)

        # 6. Information Buying Efficiency
        ive = cls.compute_info_buying_efficiency(eval_records)

        return MetacognitiveMetrics(
            d_prime=d_prime,
            meta_d_prime=meta_d,
            m_ratio=m_ratio,
            calibration_bias=bias,
            brier_score=brier,
            info_buying_efficiency=ive,
        )
