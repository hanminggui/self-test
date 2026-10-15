"""
Command-line interface for the Metacognitive Testing System (cli.py).
Allows starting the web server, running mock agent evaluations, and inspecting reports.
"""

import argparse
import sys
import json
import uvicorn
from metacognitive_testing.session_manager import SessionManager
from metacognitive_testing.agents import MockSubjectAgent
from metacognitive_testing.models import TrialResponse, Phase1Response, Phase2MetacognitiveAction
from metacognitive_testing.api import print_admin_info


def run_server(host: str = "127.0.0.1", port: int = 8000):
    print_admin_info(host, port)
    uvicorn.run("metacognitive_testing.api:app", host=host, port=port, reload=False)


def run_agent_eval(policy: str = "ideal", trials: int = 60, seed: int = 42, name: str = None):
    subject_name = name or f"Agent_{policy.upper()}"
    print(f"\n=======================================================")
    print(f"🔬 启动受试者模拟评测 (Name: {subject_name}, Policy: {policy.upper()}, Trials: {trials})")
    print(f"=======================================================")

    sm = SessionManager()
    session = sm.create_session(
        subject_name=subject_name,
        subject_type=f"MOCK_{policy.upper()}",
        total_trials=trials,
        warmup_trials=min(20, trials // 3),
        seed=seed,
    )

    agent = MockSubjectAgent(name=subject_name, first_order_accuracy=0.7071, policy=policy, seed=seed)

    while not session.is_completed:
        req = sm.get_trial_request(session.session_id)
        current_task = session.current_task

        # Mock agent decides
        chosen, action, conf, buy_hint, revised = agent.decide_choice_and_action(
            correct_option=current_task.correct_option
        )

        resp = TrialResponse(
            session_id=session.session_id,
            trial_index=req.trial_index,
            phase_1_response=Phase1Response(selected_option=chosen),
            phase_2_metacognitive_action=Phase2MetacognitiveAction(
                action=action,
                confidence_level=conf,
                buy_hint_requested=buy_hint,
                revised_option=revised,
            ),
        )

        sm.process_trial_response(resp)

    report = sm.get_report(session.session_id)
    print("\n✅ 评测已完成，最终评估报告：")
    print(json.dumps(report.model_dump(), indent=2, ensure_ascii=False))
    return report


def main():
    parser = argparse.ArgumentParser(description="二元认知评测系统 CLI 工具")
    subparsers = parser.add_subparsers(dest="command")

    # Server subcommand
    srv_parser = subparsers.add_parser("serve", help="启动 FastAPI Web 服务")
    srv_parser.add_argument("--host", default="127.0.0.1", help="绑定主机地址")
    srv_parser.add_argument("--port", type=int, default=8000, help="监听端口")

    # Eval subcommand
    eval_parser = subparsers.add_parser("eval", help="运行模拟受试者评测")
    eval_parser.add_argument(
        "--policy",
        choices=["ideal", "blind_gambler", "underconfident", "hint_seeker", "random"],
        default="ideal",
        help="模拟受试者决策策略",
    )
    eval_parser.add_argument("--name", type=str, default=None, help="受测者名称或代号")
    eval_parser.add_argument("--trials", type=int, default=60, help="试次总数")
    eval_parser.add_argument("--seed", type=int, default=42, help="随机种子")

    args = parser.parse_args()

    if args.command == "serve":
        run_server(args.host, args.port)
    elif args.command == "eval":
        run_agent_eval(args.policy, args.trials, args.seed, args.name)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
