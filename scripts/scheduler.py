#!/usr/bin/env python3
"""
Scheduler Daemon — UMS Library OneSearch Automated Harvesting & Rebuild

Menjalankan harvest otomatis secara terjadwal:
- Harian (Default 02:00 WIB): Inkremental harvest (N hari terakhir) + rebuild cepat.
- Mingguan (Default Minggu 01:00 WIB): Full sync harvest + rebuild data.

Penggunaan:
    python scripts/scheduler.py              # Jalankan sebagai daemon background
    python scripts/scheduler.py --run-now    # Jalankan harvest inkremental sekarang juga
    python scripts/scheduler.py --run-full   # Jalankan full harvest sekarang juga
    python scripts/scheduler.py --status     # Cek status terakhir
"""

import os
import sys
import time
import json
import subprocess
import argparse
from datetime import datetime, timedelta

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS_DIR = os.path.join(PROJECT_ROOT, 'scripts')
DATA_DIR = os.path.join(PROJECT_ROOT, 'data')
LOGS_DIR = os.path.join(PROJECT_ROOT, 'logs', 'harvest')
STATE_FILE = os.path.join(DATA_DIR, 'scheduler_state.json')

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(LOGS_DIR, exist_ok=True)

# Configuration from Environment
SCHEDULE_TIME = os.environ.get('HARVEST_SCHEDULE_TIME', '02:00').strip() # HH:MM
INCREMENTAL_DAYS = int(os.environ.get('HARVEST_INCREMENTAL_DAYS', '3'))
AUTO_ENABLED = os.environ.get('HARVEST_AUTO_ENABLED', 'true').lower() in ('1', 'true', 'yes')


def get_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "status": "IDLE",
        "last_run": None,
        "last_mode": None,
        "last_duration_seconds": 0,
        "last_exit_code": 0,
        "last_log_file": None,
        "total_runs": 0,
        "updated_at": datetime.now().isoformat()
    }


def save_state(state):
    state["updated_at"] = datetime.now().isoformat()
    try:
        with open(STATE_FILE, 'w', encoding='utf-8') as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        print(f"[Scheduler] Failed to save state: {e}", file=sys.stderr)


def run_pipeline(mode='incremental', days=INCREMENTAL_DAYS, force=False):
    """
    Eksekusi harvest_all.py dengan mode inkremental atau full.
    """
    state = get_state()
    if state.get("status") == "RUNNING" and not force:
        # Check for stale lock (> 30 minutes)
        run_start = state.get("current_run_start")
        is_stale = False
        if run_start:
            try:
                start_dt = datetime.fromisoformat(run_start)
                if (datetime.now() - start_dt).total_seconds() > 1800:
                    is_stale = True
            except Exception:
                is_stale = True
        
        if not is_stale:
            print("[Scheduler] Pipeline is already running! Skipping.", file=sys.stderr)
            return False, "Already running"
        else:
            print("[Scheduler] Stale running lock detected (> 30 mins). Resetting lock and continuing...")

    start_time = datetime.now()
    timestamp_str = start_time.strftime('%Y%m%d_%H%M%S')
    log_file = os.path.join(LOGS_DIR, f"harvest_{mode}_{timestamp_str}.log")

    print(f"\n[{start_time.strftime('%Y-%m-%d %H:%M:%S')}] [Scheduler] Starting {mode.upper()} harvest pipeline...")

    state["status"] = "RUNNING"
    state["current_run_start"] = start_time.isoformat()
    state["current_mode"] = mode
    state["last_log_file"] = log_file
    save_state(state)

    cmd = [sys.executable, os.path.join(SCRIPTS_DIR, 'harvest_all.py'), '--rebuild']
    
    if mode == 'incremental':
        from_date = (start_time - timedelta(days=days)).strftime('%Y-%m-%d')
        cmd.extend(['--from', from_date])

    try:
        with open(log_file, 'w', encoding='utf-8') as log_f:
            log_f.write(f"=== UMS OneSearch Automated Harvest Log ===\n")
            log_f.write(f"Mode: {mode}\n")
            log_f.write(f"Command: {' '.join(cmd)}\n")
            log_f.write(f"Started at: {start_time.isoformat()}\n")
            log_f.write("=" * 45 + "\n\n")
            log_f.flush()

            proc = subprocess.Popen(
                cmd,
                cwd=PROJECT_ROOT,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding='utf-8',
                errors='replace'
            )

            # Stream output to both terminal and log file
            for line in proc.stdout:
                sys.stdout.write(line)
                sys.stdout.flush()
                log_f.write(line)
                log_f.flush()

            proc.wait()
            exit_code = proc.returncode

        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        state["status"] = "SUCCESS" if exit_code == 0 else "ERROR"
        state["last_run"] = end_time.isoformat()
        state["last_mode"] = mode
        state["last_duration_seconds"] = round(duration, 2)
        state["last_exit_code"] = exit_code
        state["total_runs"] = state.get("total_runs", 0) + 1
        state.pop("current_run_start", None)
        state.pop("current_mode", None)
        save_state(state)

        print(f"[{end_time.strftime('%Y-%m-%d %H:%M:%S')}] [Scheduler] Completed with exit code {exit_code} in {duration:.1f}s")
        return exit_code == 0, log_file

    except Exception as e:
        end_time = datetime.now()
        state["status"] = "ERROR"
        state["last_error"] = str(e)
        state.pop("current_run_start", None)
        save_state(state)
        print(f"[Scheduler] Exception during pipeline: {e}", file=sys.stderr)
        return False, str(e)


def daemon_loop():
    print(f"==================================================")
    print(f"   UMS Library OneSearch Scheduler Daemon v1.0    ")
    print(f"==================================================")
    print(f"[*] Schedule Time      : Every day at {SCHEDULE_TIME} WIB")
    print(f"[*] Incremental Window : Last {INCREMENTAL_DAYS} days")
    print(f"[*] Auto Enabled       : {AUTO_ENABLED}")
    print(f"[*] Logs Directory     : {LOGS_DIR}")
    print(f"==================================================\n")

    last_executed_day = None

    while True:
        try:
            now = datetime.now()
            today_str = now.strftime('%Y-%m-%d')
            current_time = now.strftime('%H:%M')

            # Check if it is time to run and hasn't run today
            if AUTO_ENABLED and current_time == SCHEDULE_TIME and last_executed_day != today_str:
                last_executed_day = today_str
                # Hari Minggu (weekday == 6): Full Sync, Hari lain: Inkremental
                is_sunday = (now.weekday() == 6)
                mode = 'full' if is_sunday else 'incremental'
                print(f"[Scheduler] Triggering scheduled {mode.upper()} harvest at {now.strftime('%Y-%m-%d %H:%M:%S')}...")
                run_pipeline(mode=mode)

            time.sleep(30)
        except KeyboardInterrupt:
            print("\n[Scheduler] Stopped by user.")
            break
        except Exception as e:
            print(f"[Scheduler] Loop error: {e}", file=sys.stderr)
            time.sleep(30)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='UMS OneSearch Automated Scheduler')
    parser.add_argument('--run-now', action='store_true', help='Jalankan harvest inkremental sekarang')
    parser.add_argument('--run-full', action='store_true', help='Jalankan full harvest & rebuild sekarang')
    parser.add_argument('--days', type=int, default=INCREMENTAL_DAYS, help='Window hari inkremental')
    parser.add_argument('--force', action='store_true', help='Abaikan lock RUNNING jika ada')
    parser.add_argument('--status', action='store_true', help='Tampilkan status terakhir scheduler')

    args = parser.parse_args()

    if args.status:
        state = get_state()
        print(json.dumps(state, indent=2))
    elif args.run_full:
        run_pipeline(mode='full', force=args.force)
    elif args.run_now:
        run_pipeline(mode='incremental', days=args.days, force=args.force)
    else:
        daemon_loop()
