STOP. Do not run /start from a workflow branch.

Switch to main first: `git checkout main`, then run `/start`.

Main's /start auto-detects the branch from RUN_LOG and handles everything:
auto-checkout, pre-flight checks, workflow execution, measurement, debrief, and RUN_LOG update.
