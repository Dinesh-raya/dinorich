"""Run all E2E scenarios and generate a report."""
import subprocess
import sys
import json
from datetime import datetime

SCENARIOS = {
    1: "First Launch & Connection Screen",
    2: "Room Creation (Host)",
    3: "Room Join (Player 2)",
    4: "Game Start & Initial Board",
    5: "Rolling Dice & Movement",
    6: "Buying a Property",
    7: "Landing on Owned Property (Rent)",
    8: "Drawing a Card (Treasury/Surprise)",
    9: "Trading Between Players",
    10: "Auction",
    11: "Jail",
    12: "Building Houses & Hotels",
    13: "Mortgage Property",
    14: "Bankruptcy",
    15: "Game Over & Winner",
    16: "Mobile Responsiveness",
    17: "LAN Multiplayer",
    18: "Reconnection",
}


def run_e2e():
    """Run all E2E tests and generate report."""
    result = subprocess.run(
        [sys.executable, "-m", "pytest", "e2e/", "-v", "--timeout=300", "--tb=short"],
        capture_output=True,
        text=True,
    )

    passed = result.stdout.count(" PASSED")
    failed = result.stdout.count(" FAILED")
    errors = result.stdout.count(" ERROR")

    report = {
        "date": datetime.now().isoformat(),
        "total": len(SCENARIOS),
        "passed": passed,
        "failed": failed,
        "errors": errors,
        "scenarios": SCENARIOS,
        "stdout": result.stdout[-2000:],
        "stderr": result.stderr[-1000:] if result.stderr else "",
    }

    with open("e2e/report.json", "w") as f:
        json.dump(report, f, indent=2)

    print(f"\n{'='*60}")
    print(f"E2E Test Report — {report['date']}")
    print(f"{'='*60}")
    print(f"Passed: {passed}/{len(SCENARIOS)}")
    print(f"Failed: {failed}/{len(SCENARIOS)}")
    print(f"Errors: {errors}/{len(SCENARIOS)}")
    print(f"{'='*60}")

    if result.returncode != 0:
        print("\nFailed tests:")
        for line in result.stdout.split("\n"):
            if "FAILED" in line:
                print(f"  {line.strip()}")

    return result.returncode


if __name__ == "__main__":
    sys.exit(run_e2e())
