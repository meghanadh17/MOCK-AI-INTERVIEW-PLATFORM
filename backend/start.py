#!/usr/bin/env python3
# ============================================================
#  MockAI — Unified Platform Gateway CLI
#  Professional-grade launcher for FastAPI + Celery services
#  Author: Platform Engineering
# ============================================================

from __future__ import annotations

import sys
import os
import argparse
import subprocess
import threading
import signal
import platform
import time
import shutil
import textwrap
import itertools
import datetime
import random
import select
import queue
import traceback
from dataclasses import dataclass, field
from enum import Enum, auto
from typing import Optional, List, Callable

# Reconfigure stdout/stderr to handle UTF-8 printing safely on Windows
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

# ─────────────────────────────────────────────────────────────
#  TERMINAL CAPABILITY DETECTION
# ─────────────────────────────────────────────────────────────

def _supports_color() -> bool:
    """Detect whether the terminal supports ANSI color sequences."""
    if not hasattr(sys.stdout, "isatty") or not sys.stdout.isatty():
        return False
    if platform.system() == "Windows":
        try:
            import ctypes
            kernel32 = ctypes.windll.kernel32  # type: ignore
            kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
            return True
        except Exception:
            return False
    term = os.environ.get("TERM", "")
    colorterm = os.environ.get("COLORTERM", "")
    return term != "dumb" and (colorterm in ("truecolor", "24bit") or "color" in term or term != "")

COLORS_ENABLED = _supports_color()
TERMINAL_WIDTH = shutil.get_terminal_size((120, 40)).columns

# ─────────────────────────────────────────────────────────────
#  ANSI ESCAPE CODES
# ─────────────────────────────────────────────────────────────

class A:
    """ANSI escape codes namespace."""
    RESET       = "\033[0m"       if COLORS_ENABLED else ""
    BOLD        = "\033[1m"       if COLORS_ENABLED else ""
    DIM         = "\033[2m"       if COLORS_ENABLED else ""
    ITALIC      = "\033[3m"       if COLORS_ENABLED else ""
    UNDERLINE   = "\033[4m"       if COLORS_ENABLED else ""
    BLINK       = "\033[5m"       if COLORS_ENABLED else ""
    REVERSE     = "\033[7m"       if COLORS_ENABLED else ""
    STRIKE      = "\033[9m"       if COLORS_ENABLED else ""

    # Standard foreground colors
    BLACK       = "\033[30m"      if COLORS_ENABLED else ""
    RED         = "\033[31m"      if COLORS_ENABLED else ""
    GREEN       = "\033[32m"      if COLORS_ENABLED else ""
    YELLOW      = "\033[33m"      if COLORS_ENABLED else ""
    BLUE        = "\033[34m"      if COLORS_ENABLED else ""
    MAGENTA     = "\033[35m"      if COLORS_ENABLED else ""
    CYAN        = "\033[36m"      if COLORS_ENABLED else ""
    WHITE       = "\033[37m"      if COLORS_ENABLED else ""

    # Bright foreground colors
    BRIGHT_BLACK   = "\033[90m"   if COLORS_ENABLED else ""
    BRIGHT_RED     = "\033[91m"   if COLORS_ENABLED else ""
    BRIGHT_GREEN   = "\033[92m"   if COLORS_ENABLED else ""
    BRIGHT_YELLOW  = "\033[93m"   if COLORS_ENABLED else ""
    BRIGHT_BLUE    = "\033[94m"   if COLORS_ENABLED else ""
    BRIGHT_MAGENTA = "\033[95m"   if COLORS_ENABLED else ""
    BRIGHT_CYAN    = "\033[96m"   if COLORS_ENABLED else ""
    BRIGHT_WHITE   = "\033[97m"   if COLORS_ENABLED else ""

    # Background colors
    BG_BLACK    = "\033[40m"      if COLORS_ENABLED else ""
    BG_RED      = "\033[41m"      if COLORS_ENABLED else ""
    BG_GREEN    = "\033[42m"      if COLORS_ENABLED else ""
    BG_YELLOW   = "\033[43m"      if COLORS_ENABLED else ""
    BG_BLUE     = "\033[44m"      if COLORS_ENABLED else ""
    BG_MAGENTA  = "\033[45m"      if COLORS_ENABLED else ""
    BG_CYAN     = "\033[46m"      if COLORS_ENABLED else ""
    BG_WHITE    = "\033[47m"      if COLORS_ENABLED else ""

    # 256-color helpers
    @staticmethod
    def fg256(n: int) -> str:
        return f"\033[38;5;{n}m" if COLORS_ENABLED else ""

    @staticmethod
    def bg256(n: int) -> str:
        return f"\033[48;5;{n}m" if COLORS_ENABLED else ""

    # Cursor / terminal control
    CLEAR_LINE  = "\033[2K\r"     if COLORS_ENABLED else ""
    HIDE_CURSOR = "\033[?25l"     if COLORS_ENABLED else ""
    SHOW_CURSOR = "\033[?25h"     if COLORS_ENABLED else ""
    SAVE_POS    = "\033[s"        if COLORS_ENABLED else ""
    RESTORE_POS = "\033[u"        if COLORS_ENABLED else ""

    @staticmethod
    def move_up(n: int = 1) -> str:
        return f"\033[{n}A" if COLORS_ENABLED else ""

    @staticmethod
    def move_down(n: int = 1) -> str:
        return f"\033[{n}B" if COLORS_ENABLED else ""

    @staticmethod
    def move_col(n: int) -> str:
        return f"\033[{n}G" if COLORS_ENABLED else ""

# ─────────────────────────────────────────────────────────────
#  COLOR THEME
# ─────────────────────────────────────────────────────────────

class Theme:
    """Semantic color mappings for UI consistency."""
    PRIMARY      = A.BRIGHT_CYAN
    SECONDARY    = A.BRIGHT_BLUE
    SUCCESS      = A.BRIGHT_GREEN
    WARNING      = A.BRIGHT_YELLOW
    ERROR        = A.BRIGHT_RED
    CRITICAL     = A.BOLD + A.BRIGHT_RED
    INFO         = A.BRIGHT_WHITE
    MUTED        = A.BRIGHT_BLACK
    ACCENT       = A.BRIGHT_MAGENTA
    PENDING      = A.BRIGHT_YELLOW
    RUNNING      = A.BRIGHT_CYAN
    STOPPED      = A.RED
    LABEL        = A.BOLD + A.BRIGHT_WHITE
    VALUE        = A.BRIGHT_CYAN
    BORDER       = A.fg256(240)
    BORDER_BRIGHT= A.fg256(250)
    HEADER_BG    = A.bg256(17)   # deep navy
    HEADER_FG    = A.BRIGHT_CYAN
    TAG_WEB      = A.BOLD + A.BRIGHT_BLUE
    TAG_WORKER   = A.BOLD + A.BRIGHT_MAGENTA
    TAG_SYS      = A.BOLD + A.BRIGHT_GREEN
    TAG_EVENT    = A.BOLD + A.BRIGHT_YELLOW
    TAG_ERR      = A.BOLD + A.BRIGHT_RED
    RESET        = A.RESET

# ─────────────────────────────────────────────────────────────
#  LOG LEVEL ENUM & STATUS ENUM
# ─────────────────────────────────────────────────────────────

class LogLevel(Enum):
    TRACE    = 0
    DEBUG    = 1
    INFO     = 2
    SUCCESS  = 3
    WARNING  = 4
    ERROR    = 5
    CRITICAL = 6
    EVENT    = 7

class ProcessStatus(Enum):
    PENDING  = auto()
    STARTING = auto()
    RUNNING  = auto()
    STOPPING = auto()
    STOPPED  = auto()
    CRASHED  = auto()
    RESTARTING = auto()

# ─────────────────────────────────────────────────────────────
#  LOG RECORD
# ─────────────────────────────────────────────────────────────

@dataclass
class LogRecord:
    timestamp: datetime.datetime
    level: LogLevel
    source: str
    message: str
    pid: Optional[int] = None
    exit_code: Optional[int] = None

# ─────────────────────────────────────────────────────────────
#  PROCESS RECORD
# ─────────────────────────────────────────────────────────────

@dataclass
class ManagedProcess:
    name: str
    display_name: str
    cmd: List[str]
    tag_color: str
    proc: Optional[subprocess.Popen] = None
    status: ProcessStatus = ProcessStatus.PENDING
    start_time: Optional[datetime.datetime] = None
    stop_time: Optional[datetime.datetime] = None
    restart_count: int = 0
    exit_code: Optional[int] = None
    log_count: int = 0
    error_count: int = 0
    warn_count: int = 0
    last_line: str = ""

    @property
    def pid(self) -> Optional[int]:
        return self.proc.pid if self.proc else None

    @property
    def uptime(self) -> str:
        if not self.start_time:
            return "—"
        end = self.stop_time or datetime.datetime.now()
        delta = int((end - self.start_time).total_seconds())
        h, rem = divmod(delta, 3600)
        m, s = divmod(rem, 60)
        return f"{h:02d}:{m:02d}:{s:02d}"

    @property
    def status_icon(self) -> str:
        icons = {
            ProcessStatus.PENDING:    f"{A.BRIGHT_YELLOW}◌{A.RESET}",
            ProcessStatus.STARTING:   f"{A.BRIGHT_CYAN}◎{A.RESET}",
            ProcessStatus.RUNNING:    f"{A.BRIGHT_GREEN}●{A.RESET}",
            ProcessStatus.STOPPING:   f"{A.BRIGHT_YELLOW}◐{A.RESET}",
            ProcessStatus.STOPPED:    f"{A.BRIGHT_BLACK}○{A.RESET}",
            ProcessStatus.CRASHED:    f"{A.BRIGHT_RED}✖{A.RESET}",
            ProcessStatus.RESTARTING: f"{A.BRIGHT_MAGENTA}↺{A.RESET}",
        }
        return icons.get(self.status, "?")

    @property
    def status_text(self) -> str:
        colors = {
            ProcessStatus.PENDING:    Theme.PENDING,
            ProcessStatus.STARTING:   Theme.RUNNING,
            ProcessStatus.RUNNING:    Theme.SUCCESS,
            ProcessStatus.STOPPING:   Theme.WARNING,
            ProcessStatus.STOPPED:    Theme.MUTED,
            ProcessStatus.CRASHED:    Theme.ERROR,
            ProcessStatus.RESTARTING: Theme.ACCENT,
        }
        c = colors.get(self.status, "")
        return f"{c}{self.status.name}{A.RESET}"

# ─────────────────────────────────────────────────────────────
#  PRINT UTILITIES
# ─────────────────────────────────────────────────────────────

_print_lock = threading.Lock()

def safe_print(*args, **kwargs):
    """Thread-safe print wrapper."""
    with _print_lock:
        print(*args, **kwargs, flush=True)

def ansi_strip(s: str) -> str:
    """Remove ANSI codes to get printable width."""
    import re
    return re.sub(r'\033\[[0-9;]*[mABCDEFGHJKLMSTfsu]|\033\[\?[0-9]+[hl]', '', s)

def visible_len(s: str) -> int:
    """Length of string excluding ANSI codes."""
    return len(ansi_strip(s))

def pad_right(s: str, width: int, char: str = " ") -> str:
    """Pad string to visible width ignoring ANSI codes."""
    vis = visible_len(s)
    if vis < width:
        s += char * (width - vis)
    return s

def truncate(s: str, max_len: int, suffix: str = "…") -> str:
    """Truncate plain string."""
    if len(s) <= max_len:
        return s
    return s[:max_len - len(suffix)] + suffix

def hr(char: str = "─", color: str = Theme.BORDER, width: int = 0) -> str:
    """Horizontal rule."""
    w = width or TERMINAL_WIDTH
    return f"{color}{char * w}{A.RESET}"

def box_line(content: str, width: int = 0, border_color: str = Theme.BORDER,
             pad: int = 1) -> str:
    """Wrap content in a single-line box row."""
    w = width or TERMINAL_WIDTH
    inner = w - 2
    padding = " " * pad
    vis = visible_len(content)
    fill = inner - vis - (pad * 2)
    if fill < 0:
        fill = 0
    return (f"{border_color}│{A.RESET}"
            f"{padding}{content}{' ' * fill}{padding}"
            f"{border_color}│{A.RESET}")

def box_top(width: int = 0, color: str = Theme.BORDER) -> str:
    w = width or TERMINAL_WIDTH
    return f"{color}╭{'─' * (w-2)}╮{A.RESET}"

def box_bottom(width: int = 0, color: str = Theme.BORDER) -> str:
    w = width or TERMINAL_WIDTH
    return f"{color}╰{'─' * (w-2)}╯{A.RESET}"

def box_sep(width: int = 0, color: str = Theme.BORDER) -> str:
    w = width or TERMINAL_WIDTH
    return f"{color}├{'─' * (w-2)}┤{A.RESET}"

# ─────────────────────────────────────────────────────────────
#  SPINNER
# ─────────────────────────────────────────────────────────────

class Spinner:
    """Animated terminal spinner with message."""

    FRAMES_DOTS    = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"]
    FRAMES_CIRCLE  = ["◜","◠","◝","◞","◡","◟"]
    FRAMES_BOUNCE  = ["▁","▃","▄","▅","▆","▇","▆","▅","▄","▃"]
    FRAMES_ARC     = ["◐","◓","◑","◒"]
    FRAMES_PULSE   = ["·","•","●","•","·"," "]
    FRAMES_ARROW   = ["←","↖","↑","↗","→","↘","↓","↙"]

    def __init__(self, message: str = "", color: str = Theme.PRIMARY,
                 frames: Optional[List[str]] = None, interval: float = 0.08):
        self.message = message
        self.color = color
        self.frames = frames or self.FRAMES_DOTS
        self.interval = interval
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._frame_iter = itertools.cycle(enumerate(self.frames))

    def _spin(self):
        sys.stdout.write(A.HIDE_CURSOR)
        sys.stdout.flush()
        while not self._stop_event.is_set():
            _, frame = next(self._frame_iter)
            line = f"\r  {self.color}{frame}{A.RESET}  {Theme.INFO}{self.message}{A.RESET}"
            sys.stdout.write(line)
            sys.stdout.flush()
            time.sleep(self.interval)
        sys.stdout.write(A.CLEAR_LINE)
        sys.stdout.write(A.SHOW_CURSOR)
        sys.stdout.flush()

    def start(self):
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._spin, daemon=True)
        self._thread.start()
        return self

    def stop(self, final_msg: str = "", icon: str = "✔", icon_color: str = Theme.SUCCESS):
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=1.0)
        if final_msg:
            safe_print(f"  {icon_color}{icon}{A.RESET}  {Theme.INFO}{final_msg}{A.RESET}")

    def update(self, message: str):
        self.message = message

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, *_):
        self.stop()

# ─────────────────────────────────────────────────────────────
#  PROGRESS BAR
# ─────────────────────────────────────────────────────────────

class ProgressBar:
    """Animated progress bar with percentage."""

    FILL_CHARS  = ["█", "▓", "▒", "░"]
    STYLE_BLOCK = ("█", "░")
    STYLE_WAVE  = ("▰", "▱")
    STYLE_SLIM  = ("━", "╌")
    STYLE_ROUND = ("●", "○")

    def __init__(self, total: int = 100, width: int = 40,
                 label: str = "", color: str = Theme.PRIMARY,
                 bg_color: str = Theme.MUTED,
                 style: tuple = STYLE_BLOCK):
        self.total = total
        self.width = width
        self.label = label
        self.color = color
        self.bg_color = bg_color
        self.fill_char, self.empty_char = style
        self._value = 0
        self._start = time.time()

    @property
    def value(self): return self._value

    @value.setter
    def value(self, v: int):
        self._value = max(0, min(v, self.total))

    def render(self, extra: str = "") -> str:
        pct = self._value / self.total if self.total > 0 else 0
        filled = int(self.width * pct)
        bar = (f"{self.color}{self.fill_char * filled}"
               f"{self.bg_color}{self.empty_char * (self.width - filled)}{A.RESET}")
        pct_str = f"{pct*100:5.1f}%"
        eta = self._eta()
        parts = [f"  {bar}  {Theme.VALUE}{pct_str}{A.RESET}"]
        if self.label:
            parts.append(f"  {Theme.MUTED}{self.label}{A.RESET}")
        if eta:
            parts.append(f"  {Theme.MUTED}{eta}{A.RESET}")
        if extra:
            parts.append(f"  {extra}")
        return "".join(parts)

    def _eta(self) -> str:
        if self._value <= 0:
            return ""
        elapsed = time.time() - self._start
        rate = self._value / elapsed if elapsed > 0 else 0
        if rate <= 0:
            return ""
        remaining = (self.total - self._value) / rate
        if remaining < 60:
            return f"ETA {remaining:.0f}s"
        return f"ETA {remaining/60:.1f}m"

    def print(self, extra: str = ""):
        sys.stdout.write(f"\r{self.render(extra)}")
        sys.stdout.flush()

    def println(self, extra: str = ""):
        safe_print(self.render(extra))

# ─────────────────────────────────────────────────────────────
#  LOG FORMATTER
# ─────────────────────────────────────────────────────────────

class LogFormatter:
    """Parses and colorizes log lines from subprocess output."""

    # Keyword → (LogLevel, color)
    PATTERNS: List[tuple] = [
        (["critical", "fatal"],          LogLevel.CRITICAL, Theme.CRITICAL),
        (["error", "err:", "exception",
          "traceback", "errno"],          LogLevel.ERROR,    Theme.ERROR),
        (["warning", "warn", " 307 ",
          " 404 ", " 301 ", " 302 "],    LogLevel.WARNING,  Theme.WARNING),
        (["success", "started", "ready",
          "listening", "connected",
          " 200 ", " 201 ", " 204 "],    LogLevel.SUCCESS,  Theme.SUCCESS),
        (["info", "starting", "loading",
          "initializing", "shutdown"],   LogLevel.INFO,     Theme.INFO),
        (["debug", "trace", "verbose"],  LogLevel.DEBUG,    Theme.MUTED),
    ]

    HTTP_METHODS = {"GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"}

    @classmethod
    def classify(cls, line: str) -> tuple[LogLevel, str]:
        """Return (level, color) for a raw log line."""
        low = line.lower()
        for keywords, level, color in cls.PATTERNS:
            if any(k in low for k in keywords):
                return level, color
        return LogLevel.INFO, Theme.INFO

    @classmethod
    def colorize(cls, line: str) -> str:
        """Apply color to a log line based on content."""
        level, color = cls.classify(line)
        # HTTP method highlighting
        words = line.split()
        if words:
            first = words[0].upper()
            if first in cls.HTTP_METHODS:
                method_colors = {
                    "GET":    A.BRIGHT_GREEN,
                    "POST":   A.BRIGHT_CYAN,
                    "PUT":    A.BRIGHT_YELLOW,
                    "DELETE": A.BRIGHT_RED,
                    "PATCH":  A.BRIGHT_MAGENTA,
                    "HEAD":   A.BRIGHT_BLUE,
                    "OPTIONS":A.BRIGHT_WHITE,
                }
                mc = method_colors.get(first, A.RESET)
                rest = " ".join(words[1:])
                return f"{mc}{first}{A.RESET} {color}{rest}{A.RESET}"
        return f"{color}{line}{A.RESET}"

    @classmethod
    def format_record(cls, record: LogRecord) -> str:
        """Format a full LogRecord into a display line."""
        ts = record.timestamp.strftime("%H:%M:%S.%f")[:-3]
        ts_str = f"{Theme.MUTED}{ts}{A.RESET}"

        source_colors = {
            "web":    Theme.TAG_WEB,
            "worker": Theme.TAG_WORKER,
            "system": Theme.TAG_SYS,
            "event":  Theme.TAG_EVENT,
            "error":  Theme.TAG_ERR,
        }
        src_color = source_colors.get(record.source.lower(), Theme.MUTED)
        src_str = f"{src_color}[{record.source.upper():>6}]{A.RESET}"

        level_colors = {
            LogLevel.TRACE:    Theme.MUTED,
            LogLevel.DEBUG:    Theme.MUTED,
            LogLevel.INFO:     Theme.INFO,
            LogLevel.SUCCESS:  Theme.SUCCESS,
            LogLevel.WARNING:  Theme.WARNING,
            LogLevel.ERROR:    Theme.ERROR,
            LogLevel.CRITICAL: Theme.CRITICAL,
            LogLevel.EVENT:    Theme.ACCENT,
        }
        lvl_color = level_colors.get(record.level, Theme.INFO)
        lvl_str = f"{lvl_color}{record.level.name:>8}{A.RESET}"

        pid_str = ""
        if record.pid:
            pid_str = f"  {Theme.MUTED}pid={record.pid}{A.RESET}"

        msg = cls.colorize(record.message)
        return f"  {ts_str}  {src_str}  {lvl_str}  {msg}{pid_str}"

# ─────────────────────────────────────────────────────────────
#  STATUS DASHBOARD
# ─────────────────────────────────────────────────────────────

class StatusDashboard:
    """Renders a live-updating process status panel."""

    def __init__(self, processes: List[ManagedProcess]):
        self.processes = processes
        self._last_height = 0

    def render(self) -> str:
        lines = []
        w = min(TERMINAL_WIDTH, 100)
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Header
        lines.append(box_top(w, Theme.BORDER_BRIGHT))
        title = f"{Theme.PRIMARY}{A.BOLD}  Process Status Dashboard{A.RESET}"
        time_str = f"{Theme.MUTED}{now}{A.RESET}"
        title_pad = pad_right(title, w - 4 - visible_len(time_str) - 2)
        lines.append(box_line(title_pad + time_str, w, Theme.BORDER_BRIGHT))
        lines.append(box_sep(w, Theme.BORDER_BRIGHT))

        # Column headers
        col_h = (f"  {'SERVICE':<16}  {'STATUS':<14}  {'PID':<8}  "
                 f"{'UPTIME':<10}  {'LOGS':>6}  {'WARNS':>6}  {'ERRORS':>6}  {'LAST EVENT'}")
        lines.append(box_line(f"{Theme.MUTED}{col_h}{A.RESET}", w, Theme.BORDER_BRIGHT, pad=0))
        lines.append(box_sep(w, Theme.BORDER_BRIGHT))

        for p in self.processes:
            pid_s = str(p.pid) if p.pid else "—"
            name_colored = f"{p.tag_color}{p.display_name:<16}{A.RESET}"
            status_s = pad_right(p.status_text, 14)
            pid_s = f"{Theme.VALUE}{pid_s:<8}{A.RESET}"
            uptime_s = f"{Theme.MUTED}{p.uptime:<10}{A.RESET}"
            log_s = f"{Theme.INFO}{p.log_count:>6}{A.RESET}"
            warn_s = (f"{Theme.WARNING}{p.warn_count:>6}{A.RESET}"
                      if p.warn_count else f"{Theme.MUTED}{p.warn_count:>6}{A.RESET}")
            err_s  = (f"{Theme.ERROR}{p.error_count:>6}{A.RESET}"
                      if p.error_count else f"{Theme.MUTED}{p.error_count:>6}{A.RESET}")
            last_ev = truncate(ansi_strip(p.last_line), 30) if p.last_line else "—"
            last_s = f"{Theme.MUTED}{last_ev}{A.RESET}"

            icon = p.status_icon
            row = (f"  {icon}  {name_colored}  {status_s}  "
                   f"{pid_s}  {uptime_s}  {log_s}  {warn_s}  {err_s}  {last_s}")
            lines.append(box_line(row, w, Theme.BORDER_BRIGHT, pad=0))

        lines.append(box_sep(w, Theme.BORDER_BRIGHT))

        # Footer hint
        hints = (f"  {Theme.MUTED}Ctrl+C to shutdown gracefully  •  "
                 f"--mode [both|web|worker]  •  --help for all options{A.RESET}")
        lines.append(box_line(hints, w, Theme.BORDER_BRIGHT, pad=0))
        lines.append(box_bottom(w, Theme.BORDER_BRIGHT))
        return "\n".join(lines)

    def print_once(self):
        safe_print(self.render())

# ─────────────────────────────────────────────────────────────
#  STARTUP CHECKLIST
# ─────────────────────────────────────────────────────────────

@dataclass
class CheckItem:
    name: str
    fn: Callable[[], tuple[bool, str]]  # returns (passed, detail)
    required: bool = True

class StartupChecker:
    """Pre-flight system checks before launching services."""

    def __init__(self, checks: List[CheckItem]):
        self.checks = checks
        self.results: List[tuple[bool, str, str]] = []  # (passed, name, detail)

    def run(self) -> bool:
        """Run all checks. Returns True if all required checks pass."""
        w = min(TERMINAL_WIDTH, 80)
        safe_print()
        safe_print(f"  {Theme.LABEL}Pre-flight System Checks{A.RESET}")
        safe_print(f"  {hr('─', Theme.BORDER, w - 4)}")
        all_passed = True

        for item in self.checks:
            sys.stdout.write(f"  {Theme.MUTED}  ○  {item.name}...{A.RESET}")
            sys.stdout.flush()
            try:
                passed, detail = item.fn()
            except Exception as e:
                passed, detail = False, str(e)

            self.results.append((passed, item.name, detail))

            if passed:
                sys.stdout.write(
                    f"\r  {Theme.SUCCESS}  ✔  {item.name}{A.RESET}"
                    f"  {Theme.MUTED}{detail}{A.RESET}\n"
                )
            elif item.required:
                all_passed = False
                sys.stdout.write(
                    f"\r  {Theme.ERROR}  ✖  {item.name}{A.RESET}"
                    f"  {Theme.ERROR}{detail}{A.RESET}\n"
                )
            else:
                sys.stdout.write(
                    f"\r  {Theme.WARNING}  ⚠  {item.name}{A.RESET}"
                    f"  {Theme.WARNING}{detail} (optional){A.RESET}\n"
                )
            sys.stdout.flush()

        safe_print(f"  {hr('─', Theme.BORDER, w - 4)}")
        passed_count = sum(1 for r in self.results if r[0])
        failed_required = sum(1 for r, n, d in zip(
            [r[0] for r in self.results],
            [r[1] for r in self.results],
            [r[2] for r in self.results]
        ) if not r)

        status_color = Theme.SUCCESS if all_passed else Theme.ERROR
        safe_print(
            f"  {status_color}{'✔ All checks passed' if all_passed else '✖ Some checks failed'}{A.RESET}"
            f"  {Theme.MUTED}({passed_count}/{len(self.checks)} passed){A.RESET}"
        )
        safe_print()
        return all_passed

# ─────────────────────────────────────────────────────────────
#  SYSTEM CHECK FUNCTIONS
# ─────────────────────────────────────────────────────────────

def check_python_version() -> tuple[bool, str]:
    v = sys.version_info
    ok = v >= (3, 9)
    return ok, f"Python {v.major}.{v.minor}.{v.micro}"

def check_uvicorn() -> tuple[bool, str]:
    try:
        result = subprocess.run(
            [sys.executable, "-m", "uvicorn", "--version"],
            capture_output=True, text=True, timeout=5
        )
        return result.returncode == 0, result.stdout.strip() or "available"
    except Exception as e:
        return False, str(e)

def check_celery() -> tuple[bool, str]:
    try:
        result = subprocess.run(
            [sys.executable, "-m", "celery", "--version"],
            capture_output=True, text=True, timeout=5
        )
        return result.returncode == 0, result.stdout.strip() or "available"
    except Exception as e:
        return False, str(e)

def check_app_module() -> tuple[bool, str]:
    try:
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        if backend_dir not in sys.path:
            sys.path.insert(0, backend_dir)
        import importlib
        importlib.import_module("app.main")
        return True, "app.main importable"
    except Exception as e:
        return False, str(e)

def check_celery_app_module() -> tuple[bool, str]:
    try:
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        if backend_dir not in sys.path:
            sys.path.insert(0, backend_dir)
        import importlib
        importlib.import_module("app.tasks.celery_app")
        return True, "app.tasks.celery_app importable"
    except Exception as e:
        return False, str(e)

def check_env_file() -> tuple[bool, str]:
    if os.path.exists(".env"):
        return True, ".env file found"
    return False, ".env file not found"

def check_redis() -> tuple[bool, str]:
    try:
        import socket
        s = socket.create_connection(("localhost", 6379), timeout=2)
        s.close()
        return True, "Redis listening on :6379"
    except Exception:
        return False, "Redis not reachable on localhost:6379"

def check_disk_space() -> tuple[bool, str]:
    try:
        stat = shutil.disk_usage(".")
        free_gb = stat.free / (1024 ** 3)
        ok = free_gb >= 0.5
        return ok, f"{free_gb:.1f} GB free"
    except Exception as e:
        return False, str(e)

# ─────────────────────────────────────────────────────────────
#  BANNER
# ─────────────────────────────────────────────────────────────

BANNER_ART = r"""
  ╔╦╗╔═╗╔═╗╦╔═  ╔═╗╦
  ║║║║ ║║  ╠╩╗  ╠═╣║
  ╩ ╩╚═╝╚═╝╩ ╩  ╩ ╩╩
"""

LOGO_LINES = [
r"   ██████╗ ██╗      █████╗ ████████╗███████╗ ██████╗ ██████╗ ███╗   ███╗",
r"   ██╔══██╗██║     ██╔══██╗╚══██╔══╝██╔════╝██╔═══██╗██╔══██╗████╗ ████║",
r"   ██████╔╝██║     ███████║   ██║   █████╗  ██║   ██║██████╔╝██╔████╔██║",
r"   ██╔═══╝ ██║     ██╔══██║   ██║   ██╔══╝  ██║   ██║██╔══██╗██║╚██╔╝██║",
r"   ██║     ███████╗██║  ██║   ██║   ██║     ╚██████╔╝██║  ██║██║ ╚═╝ ██║",
r"   ╚═╝     ╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝      ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝",
]

LOGO_GRADIENT = [
    A.fg256(33),
    A.fg256(39),
    A.fg256(45),
    A.fg256(51),
    A.fg256(87),
    A.fg256(123),
]

def print_banner(args_summary: Optional[dict] = None):
    """Print the full animated banner with version info."""
    w = min(TERMINAL_WIDTH, 100)
    safe_print()

    # Logo with gradient
    for i, line in enumerate(LOGO_LINES):
        color = LOGO_GRADIENT[i % len(LOGO_GRADIENT)]
        safe_print(f"{color}{line}{A.RESET}")
        time.sleep(0.04)

    safe_print()
    subtitle = "  Smart AI-Based Mock Interview Platform Gateway"
    version  = "v2.0.0-professional"
    build_dt = datetime.datetime.now().strftime("%Y-%m-%d")

    safe_print(f"{Theme.MUTED}{subtitle}{A.RESET}")
    safe_print(
        f"  {Theme.VALUE}{version}{A.RESET}  "
        f"{Theme.MUTED}build {build_dt}{A.RESET}  "
        f"{Theme.MUTED}Python {sys.version_info.major}.{sys.version_info.minor}{A.RESET}  "
        f"{Theme.MUTED}{platform.system()} {platform.machine()}{A.RESET}"
    )
    safe_print()
    safe_print(f"  {hr('═', Theme.BORDER_BRIGHT, w - 4)}")

    if args_summary:
        safe_print()
        safe_print(f"  {Theme.LABEL}Launch Configuration{A.RESET}")
        safe_print()
        for k, v in args_summary.items():
            key_s = f"{Theme.MUTED}{k:<18}{A.RESET}"
            val_s = f"{Theme.VALUE}{v}{A.RESET}"
            safe_print(f"  {key_s}  {val_s}")
        safe_print()
        safe_print(f"  {hr('─', Theme.BORDER, w - 4)}")

    safe_print()

# ─────────────────────────────────────────────────────────────
#  SHUTDOWN ANIMATION
# ─────────────────────────────────────────────────────────────

def print_shutdown_banner():
    """Render a clean shutdown animation."""
    safe_print()
    safe_print(f"  {hr('═', Theme.BORDER_BRIGHT)}")
    safe_print(f"  {Theme.WARNING}{A.BOLD}Graceful Shutdown Initiated{A.RESET}")
    safe_print(f"  {hr('─', Theme.BORDER)}")
    safe_print(f"  {Theme.MUTED}Sending SIGTERM to child processes...{A.RESET}")

def print_goodbye():
    """Final exit message."""
    safe_print()
    safe_print(f"  {Theme.SUCCESS}{A.BOLD}✔  All processes terminated cleanly.{A.RESET}")
    safe_print(f"  {Theme.MUTED}Goodbye! 👋{A.RESET}")
    safe_print()

# ─────────────────────────────────────────────────────────────
#  EVENT BUS
# ─────────────────────────────────────────────────────────────

class EventBus:
    """Simple pub-sub event bus for internal signaling."""

    def __init__(self):
        self._listeners: dict[str, List[Callable]] = {}
        self._lock = threading.Lock()

    def on(self, event: str, fn: Callable):
        with self._lock:
            self._listeners.setdefault(event, []).append(fn)

    def emit(self, event: str, **kwargs):
        with self._lock:
            fns = list(self._listeners.get(event, []))
        for fn in fns:
            try:
                fn(**kwargs)
            except Exception:
                pass

event_bus = EventBus()

# ─────────────────────────────────────────────────────────────
#  METRICS COLLECTOR
# ─────────────────────────────────────────────────────────────

class MetricsCollector:
    """Collects and surfaces basic runtime metrics."""

    def __init__(self):
        self._lock = threading.Lock()
        self._counters: dict[str, int] = {}
        self._gauges: dict[str, float] = {}
        self._start_time = time.time()

    def inc(self, key: str, amount: int = 1):
        with self._lock:
            self._counters[key] = self._counters.get(key, 0) + amount

    def gauge(self, key: str, value: float):
        with self._lock:
            self._gauges[key] = value

    def get(self, key: str, default=0):
        with self._lock:
            return self._counters.get(key, default)

    def uptime(self) -> str:
        delta = int(time.time() - self._start_time)
        h, rem = divmod(delta, 3600)
        m, s = divmod(rem, 60)
        return f"{h:02d}:{m:02d}:{s:02d}"

    def summary(self) -> dict:
        with self._lock:
            return {
                "uptime": self.uptime(),
                "total_logs": self._counters.get("total_logs", 0),
                "web_logs": self._counters.get("web_logs", 0),
                "worker_logs": self._counters.get("worker_logs", 0),
                "errors": self._counters.get("errors", 0),
                "warnings": self._counters.get("warnings", 0),
            }

metrics = MetricsCollector()

# ─────────────────────────────────────────────────────────────
#  LOG RING BUFFER
# ─────────────────────────────────────────────────────────────

class RingBuffer:
    """Thread-safe fixed-size ring buffer for log history."""

    def __init__(self, capacity: int = 500):
        self._buf: List[LogRecord] = []
        self._capacity = capacity
        self._lock = threading.Lock()

    def push(self, record: LogRecord):
        with self._lock:
            if len(self._buf) >= self._capacity:
                self._buf.pop(0)
            self._buf.append(record)

    def tail(self, n: int = 20) -> List[LogRecord]:
        with self._lock:
            return list(self._buf[-n:])

    def filter(self, level: LogLevel) -> List[LogRecord]:
        with self._lock:
            return [r for r in self._buf if r.level.value >= level.value]

log_buffer = RingBuffer(capacity=1000)

# ─────────────────────────────────────────────────────────────
#  PROCESS MANAGER
# ─────────────────────────────────────────────────────────────

class ProcessManager:
    """Manages lifecycle of all child processes."""

    def __init__(self):
        self.processes: List[ManagedProcess] = []
        self._shutdown = threading.Event()
        self._log_q: queue.Queue = queue.Queue()
        self._env = os.environ.copy()
        self._env["PYTHONUNBUFFERED"] = "1"
        self._env["UVICORN_USE_COLORS"] = "true"
        self._env["FORCE_COLOR"] = "1"

    def register(self, proc: ManagedProcess):
        self.processes.append(proc)

    def start_all(self):
        for p in self.processes:
            self._start(p)

    def _start(self, mp: ManagedProcess):
        """Launch a single managed process."""
        mp.status = ProcessStatus.STARTING
        mp.start_time = datetime.datetime.now()

        event_bus.emit("process_starting", process=mp)
        self._log_event(
            mp.name, LogLevel.EVENT,
            f"Starting {mp.display_name}  cmd={' '.join(mp.cmd)}"
        )

        try:
            proc = subprocess.Popen(
                mp.cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                env=self._env,
                bufsize=1,
            )
            mp.proc = proc
            mp.status = ProcessStatus.RUNNING

            # Start reader thread
            t = threading.Thread(
                target=self._reader_thread,
                args=(mp,),
                daemon=True,
                name=f"reader-{mp.name}"
            )
            t.start()

            event_bus.emit("process_started", process=mp)
            self._log_event(
                mp.name, LogLevel.SUCCESS,
                f"{mp.display_name} started  pid={proc.pid}"
            )

        except FileNotFoundError as e:
            mp.status = ProcessStatus.CRASHED
            self._log_event(mp.name, LogLevel.CRITICAL, f"Launch failed: {e}")
        except Exception as e:
            mp.status = ProcessStatus.CRASHED
            self._log_event(mp.name, LogLevel.CRITICAL,
                            f"Unexpected error launching {mp.display_name}: {e}")

    def _reader_thread(self, mp: ManagedProcess):
        """Read stdout/stderr from a process and route to log pipeline."""
        try:
            for raw in iter(mp.proc.stdout.readline, b''):
                if self._shutdown.is_set():
                    break
                decoded = raw.decode("utf-8", errors="replace").rstrip("\r\n")
                if not decoded:
                    continue

                level, _ = LogFormatter.classify(decoded)
                mp.log_count += 1
                mp.last_line = decoded
                metrics.inc("total_logs")
                metrics.inc(f"{mp.name}_logs")

                if level == LogLevel.ERROR or level == LogLevel.CRITICAL:
                    mp.error_count += 1
                    metrics.inc("errors")
                elif level == LogLevel.WARNING:
                    mp.warn_count += 1
                    metrics.inc("warnings")

                record = LogRecord(
                    timestamp=datetime.datetime.now(),
                    level=level,
                    source=mp.name,
                    message=decoded,
                    pid=mp.pid,
                )
                log_buffer.push(record)
                event_bus.emit("log", record=record)
                self._emit_log(mp, record)

        except Exception as e:
            self._log_event(mp.name, LogLevel.ERROR, f"Reader error: {e}")
        finally:
            mp.proc.wait()
            mp.exit_code = mp.proc.returncode
            mp.stop_time = datetime.datetime.now()
            if mp.status not in (ProcessStatus.STOPPING, ProcessStatus.STOPPED):
                mp.status = ProcessStatus.CRASHED
                self._log_event(
                    mp.name, LogLevel.ERROR,
                    f"{mp.display_name} exited unexpectedly  exit_code={mp.exit_code}"
                )
                event_bus.emit("process_crashed", process=mp)
            else:
                mp.status = ProcessStatus.STOPPED
                event_bus.emit("process_stopped", process=mp)

    def _emit_log(self, mp: ManagedProcess, record: LogRecord):
        """Print a formatted log line."""
        safe_print(LogFormatter.format_record(record))

    def _log_event(self, source: str, level: LogLevel, msg: str):
        """Create and emit a synthetic system log record."""
        record = LogRecord(
            timestamp=datetime.datetime.now(),
            level=level,
            source="system",
            message=msg,
        )
        log_buffer.push(record)
        safe_print(LogFormatter.format_record(record))

    def stop_all(self):
        """Terminate all running processes gracefully."""
        self._shutdown.set()
        for mp in self.processes:
            if mp.proc and mp.proc.poll() is None:
                mp.status = ProcessStatus.STOPPING
                self._log_event(
                    mp.name, LogLevel.WARNING,
                    f"Sending SIGTERM to {mp.display_name}  pid={mp.pid}"
                )
                try:
                    mp.proc.terminate()
                    mp.proc.wait(timeout=5)
                    mp.status = ProcessStatus.STOPPED
                    self._log_event(
                        mp.name, LogLevel.SUCCESS,
                        f"{mp.display_name} terminated cleanly"
                    )
                except subprocess.TimeoutExpired:
                    self._log_event(
                        mp.name, LogLevel.ERROR,
                        f"{mp.display_name} did not exit in 5s — force killing"
                    )
                    mp.proc.kill()
                    mp.status = ProcessStatus.STOPPED
                except Exception as e:
                    self._log_event(
                        mp.name, LogLevel.CRITICAL,
                        f"Error stopping {mp.display_name}: {e}"
                    )

    def any_running(self) -> bool:
        return any(
            mp.proc is not None and mp.proc.poll() is None
            for mp in self.processes
        )

    def all_crashed(self) -> bool:
        return all(mp.status == ProcessStatus.CRASHED for mp in self.processes)

    def watchdog(self):
        """Block until all processes exit, checking every second."""
        try:
            while not self._shutdown.is_set():
                time.sleep(1.0)
                dead = [
                    mp for mp in self.processes
                    if mp.proc is not None and mp.proc.poll() is not None
                    and mp.status not in (ProcessStatus.STOPPED, ProcessStatus.STOPPING)
                ]
                if dead:
                    names = ", ".join(p.display_name for p in dead)
                    self._log_event(
                        "system", LogLevel.CRITICAL,
                        f"Unexpected exit detected: {names} — initiating shutdown"
                    )
                    break
        except KeyboardInterrupt:
            pass

# ─────────────────────────────────────────────────────────────
#  ARGUMENT PARSER
# ─────────────────────────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="run",
        description=(
            f"{Theme.PRIMARY}{A.BOLD}MockAI Platform Launcher{A.RESET}\n"
            "Unified startup script for FastAPI web server and Celery background workers."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent(f"""
  {Theme.LABEL}Examples:{A.RESET}
    {Theme.MUTED}python run.py{A.RESET}                          Start both web + worker
    {Theme.MUTED}python run.py --mode web{A.RESET}               Web server only
    {Theme.MUTED}python run.py --mode worker{A.RESET}            Worker only
    {Theme.MUTED}python run.py --port 9000 --host 0.0.0.0{A.RESET}  Custom bind address
    {Theme.MUTED}python run.py --no-reload --loglevel debug{A.RESET}  Production mode, debug logs
    {Theme.MUTED}python run.py --skip-checks{A.RESET}            Skip pre-flight checks
        """)
    )

    # Server group
    srv = parser.add_argument_group("Web Server")
    srv.add_argument("--host",    default="0.0.0.0", metavar="ADDR",
                     help="Bind address for Uvicorn (default: 0.0.0.0)")
    srv.add_argument("--port",    type=int, default=8000, metavar="PORT",
                     help="Port for Uvicorn (default: 8000)")
    srv.add_argument("--reload",  action="store_true",  default=True,
                     help="Enable hot-reload (default: on)")
    srv.add_argument("--no-reload", dest="reload", action="store_false",
                     help="Disable hot-reload")
    srv.add_argument("--workers", type=int, default=1, metavar="N",
                     help="Number of Uvicorn worker processes (default: 1, ignored when --reload)")

    # Worker group
    wkr = parser.add_argument_group("Celery Worker")
    wkr.add_argument("--loglevel", default="info",
                     choices=["debug", "info", "warning", "error", "critical"],
                     help="Celery log level (default: info)")
    wkr.add_argument("--pool",    default=None, metavar="TYPE",
                     help="Celery pool: solo, prefork, eventlet, gevent (auto-detected)")
    wkr.add_argument("--concurrency", type=int, default=None, metavar="N",
                     help="Celery worker concurrency (default: CPU count)")
    wkr.add_argument("--queues",  default=None, metavar="Q1,Q2",
                     help="Comma-separated list of Celery queues to consume")

    # Launch control
    ctl = parser.add_argument_group("Launch Control")
    ctl.add_argument("--mode",    default="both",
                     choices=["both", "web", "worker"],
                     help="Which components to start (default: both)")
    ctl.add_argument("--skip-checks", action="store_true",
                     help="Skip pre-flight system checks")
    ctl.add_argument("--no-banner",   action="store_true",
                     help="Suppress the ASCII banner")
    ctl.add_argument("--quiet",       action="store_true",
                     help="Reduce output verbosity")
    ctl.add_argument("--dashboard",   action="store_true",
                     help="Show live process status dashboard on startup")

    return parser

# ─────────────────────────────────────────────────────────────
#  STARTUP SEQUENCE ANIMATION
# ─────────────────────────────────────────────────────────────

def animated_startup_sequence(steps: List[tuple[str, float]]):
    """
    Print an animated step list.
    steps: list of (label, delay) tuples.
    """
    safe_print()
    safe_print(f"  {Theme.LABEL}Initializing Services{A.RESET}")
    safe_print()
    for label, delay in steps:
        sys.stdout.write(f"  {Theme.MUTED}  ▸  {label}...{A.RESET}")
        sys.stdout.flush()
        time.sleep(delay)
        sys.stdout.write(
            f"\r  {Theme.SUCCESS}  ✔  {label}{A.RESET}"
            + " " * 10 + "\n"
        )
        sys.stdout.flush()
    safe_print()

# ─────────────────────────────────────────────────────────────
#  FINAL METRICS SUMMARY
# ─────────────────────────────────────────────────────────────

def print_session_summary(manager: ProcessManager):
    """Print a session summary after all processes stop."""
    w = min(TERMINAL_WIDTH, 80)
    summary = metrics.summary()
    safe_print()
    safe_print(f"  {hr('═', Theme.BORDER_BRIGHT, w - 4)}")
    safe_print(f"  {Theme.LABEL}{A.BOLD}Session Summary{A.RESET}")
    safe_print(f"  {hr('─', Theme.BORDER, w - 4)}")

    rows = [
        ("Total uptime",      summary["uptime"]),
        ("Total log lines",   str(summary["total_logs"])),
        ("Web server logs",   str(summary["web_logs"])),
        ("Worker logs",       str(summary["worker_logs"])),
        ("Warnings emitted",  str(summary["warnings"])),
        ("Errors encountered",str(summary["errors"])),
    ]
    for k, v in rows:
        key_s = f"  {Theme.MUTED}{k:<22}{A.RESET}"
        val_s = f"{Theme.VALUE}{v}{A.RESET}"
        safe_print(f"{key_s}  {val_s}")

    safe_print()
    for mp in manager.processes:
        safe_print(
            f"  {mp.status_icon}  {mp.tag_color}{mp.display_name}{A.RESET}"
            f"  uptime={Theme.VALUE}{mp.uptime}{A.RESET}"
            f"  logs={Theme.INFO}{mp.log_count}{A.RESET}"
            f"  errs={Theme.ERROR if mp.error_count else Theme.MUTED}{mp.error_count}{A.RESET}"
            f"  exit={Theme.VALUE}{mp.exit_code if mp.exit_code is not None else '—'}{A.RESET}"
        )

    safe_print()
    safe_print(f"  {hr('─', Theme.BORDER, w - 4)}")

# ─────────────────────────────────────────────────────────────
#  SIGNAL HANDLER SETUP
# ─────────────────────────────────────────────────────────────

_manager_ref: Optional[ProcessManager] = None

def _handle_signal(signum, frame):
    sig_name = signal.Signals(signum).name
    print_shutdown_banner()
    safe_print(f"  {Theme.WARNING}Signal received: {sig_name}{A.RESET}")
    if _manager_ref:
        _manager_ref.stop_all()
        print_session_summary(_manager_ref)
    print_goodbye()
    sys.exit(0)

# ─────────────────────────────────────────────────────────────
#  COMMAND BUILDER HELPERS
# ─────────────────────────────────────────────────────────────

def build_uvicorn_cmd(args) -> List[str]:
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    cmd = [
        sys.executable, "-m", "uvicorn",
        "app.main:app",
        "--host", args.host,
        "--port", str(args.port),
    ]
    if args.reload:
        cmd.append("--reload")
        cmd += ["--reload-dir", backend_dir]
    else:
        cmd += ["--workers", str(args.workers)]
    return cmd

def build_celery_cmd(args, pool: str) -> List[str]:
    cmd = [
        sys.executable, "-m", "celery",
        "-A", "app.tasks.celery_app",
        "worker",
        "--loglevel", args.loglevel,
        "--pool", pool,
    ]
    if args.concurrency:
        cmd += ["--concurrency", str(args.concurrency)]
    if args.queues:
        cmd += ["-Q", args.queues]
    return cmd

def resolve_celery_pool(args) -> str:
    if args.pool:
        return args.pool
    os_name = platform.system()
    if os_name == "Windows":
        return "solo"
    return "prefork"

# ─────────────────────────────────────────────────────────────
#  INTERACTIVE PROMPT (optional runtime commands)
# ─────────────────────────────────────────────────────────────

def interactive_monitor(manager: ProcessManager):
    """
    Optional non-blocking interactive monitor thread.
    Listens for stdin commands while processes run.
    Only active when stdin is a TTY.
    """
    if not sys.stdin.isatty():
        return

    HELP = (
        f"\n  {Theme.LABEL}Runtime Commands:{A.RESET}\n"
        f"  {Theme.VALUE}status{A.RESET}   — show process status\n"
        f"  {Theme.VALUE}logs{A.RESET}     — print last 20 log lines\n"
        f"  {Theme.VALUE}errors{A.RESET}   — print recent error logs\n"
        f"  {Theme.VALUE}metrics{A.RESET}  — show session metrics\n"
        f"  {Theme.VALUE}help{A.RESET}     — show this help\n"
        f"  {Theme.VALUE}quit{A.RESET}     — graceful shutdown\n"
    )

    def _input_loop():
        while not manager._shutdown.is_set():
            try:
                if sys.platform != "win32":
                    r, _, _ = select.select([sys.stdin], [], [], 0.5)
                    if not r:
                        continue
                line = sys.stdin.readline().strip().lower()
            except Exception:
                break

            if not line:
                continue

            if line in ("status", "s"):
                dashboard = StatusDashboard(manager.processes)
                dashboard.print_once()

            elif line in ("logs", "l"):
                records = log_buffer.tail(20)
                safe_print()
                for r in records:
                    safe_print(LogFormatter.format_record(r))
                safe_print()

            elif line in ("errors", "e"):
                records = log_buffer.filter(LogLevel.ERROR)[-20:]
                if not records:
                    safe_print(f"  {Theme.SUCCESS}No errors in log buffer.{A.RESET}")
                else:
                    safe_print()
                    for r in records:
                        safe_print(LogFormatter.format_record(r))
                safe_print()

            elif line in ("metrics", "m"):
                s = metrics.summary()
                safe_print()
                for k, v in s.items():
                    safe_print(f"  {Theme.MUTED}{k:<22}{A.RESET}  {Theme.VALUE}{v}{A.RESET}")
                safe_print()

            elif line in ("help", "h", "?"):
                safe_print(HELP)

            elif line in ("quit", "exit", "q"):
                safe_print(f"  {Theme.WARNING}Quit command received.{A.RESET}")
                manager._shutdown.set()
                break

            else:
                safe_print(f"  {Theme.MUTED}Unknown command: '{line}'. Type 'help' for commands.{A.RESET}")

    t = threading.Thread(target=_input_loop, daemon=True, name="monitor")
    t.start()

# ─────────────────────────────────────────────────────────────
#  MAIN ENTRY POINT
# ─────────────────────────────────────────────────────────────

def main():
    global _manager_ref

    parser = build_parser()
    args = parser.parse_args()

    # ── Banner ──────────────────────────────────────────────
    if not args.no_banner:
        args_summary = {
            "mode":        args.mode,
            "host":        args.host,
            "port":        str(args.port),
            "reload":      str(args.reload),
            "workers":     str(args.workers),
            "log level":   args.loglevel,
            "pool":        args.pool or "auto",
            "concurrency": str(args.concurrency) if args.concurrency else "auto",
            "queues":      args.queues or "default",
            "os":          f"{platform.system()} {platform.release()}",
            "python":      f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        }
        print_banner(args_summary if not args.quiet else None)

    # ── Pre-flight Checks ────────────────────────────────────
    if not args.skip_checks:
        checks: List[CheckItem] = [
            CheckItem("Python ≥ 3.9",         check_python_version,      required=True),
            CheckItem("Uvicorn available",     check_uvicorn,             required=args.mode in ("both", "web")),
            CheckItem("Celery available",      check_celery,              required=args.mode in ("both", "worker")),
            CheckItem("app.main module",       check_app_module,          required=args.mode in ("both", "web")),
            CheckItem("app.tasks.celery_app",  check_celery_app_module,   required=args.mode in ("both", "worker")),
            CheckItem(".env file",             check_env_file,            required=False),
            CheckItem("Redis connectivity",    check_redis,               required=False),
            CheckItem("Disk space",            check_disk_space,          required=False),
        ]
        checker = StartupChecker(checks)
        ok = checker.run()
        if not ok:
            safe_print(
                f"\n  {Theme.ERROR}{A.BOLD}✖  Pre-flight checks failed.{A.RESET}\n"
                f"  {Theme.MUTED}Fix the issues above or run with --skip-checks to bypass.{A.RESET}\n"
            )
            sys.exit(1)

    # ── Startup Animation ────────────────────────────────────
    if not args.quiet:
        steps = [
            ("Loading environment configuration", 0.15),
            ("Initializing logging pipeline",     0.12),
            ("Setting up process manager",        0.10),
            ("Preparing signal handlers",         0.08),
            ("Configuring metrics collector",     0.10),
        ]
        animated_startup_sequence(steps)

    # ── Resolve Celery Pool ──────────────────────────────────
    celery_pool = resolve_celery_pool(args)
    if args.pool is None and platform.system() == "Windows":
        safe_print(
            f"  {Theme.WARNING}⚠  Windows detected — Celery pool set to 'solo'{A.RESET}"
        )

    # ── Build Process Definitions ────────────────────────────
    manager = ProcessManager()
    _manager_ref = manager

    if args.mode in ("both", "web"):
        web_cmd = build_uvicorn_cmd(args)
        web_mp = ManagedProcess(
            name="web",
            display_name="FastAPI Web",
            cmd=web_cmd,
            tag_color=Theme.TAG_WEB,
        )
        manager.register(web_mp)
        if not args.quiet:
            safe_print(
                f"  {Theme.TAG_WEB}[WEB]{A.RESET}   "
                f"{Theme.MUTED}cmd: {' '.join(web_cmd)}{A.RESET}"
            )

    if args.mode in ("both", "worker"):
        worker_cmd = build_celery_cmd(args, celery_pool)
        worker_mp = ManagedProcess(
            name="worker",
            display_name="Celery Worker",
            cmd=worker_cmd,
            tag_color=Theme.TAG_WORKER,
        )
        manager.register(worker_mp)
        if not args.quiet:
            safe_print(
                f"  {Theme.TAG_WORKER}[WORKER]{A.RESET} "
                f"{Theme.MUTED}cmd: {' '.join(worker_cmd)}{A.RESET}"
            )

    safe_print()

    # ── Signal Handlers ──────────────────────────────────────
    signal.signal(signal.SIGINT,  _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    # ── Launch ───────────────────────────────────────────────
    safe_print(f"  {hr('─', Theme.BORDER)}")
    safe_print(
        f"  {Theme.SUCCESS}{A.BOLD}▶  Launching processes…{A.RESET}  "
        f"{Theme.MUTED}(press Ctrl+C to stop){A.RESET}"
    )
    safe_print(f"  {hr('─', Theme.BORDER)}")
    safe_print()

    manager.start_all()
    time.sleep(0.5)

    # ── Dashboard ────────────────────────────────────────────
    if args.dashboard:
        time.sleep(1.0)
        dashboard = StatusDashboard(manager.processes)
        dashboard.print_once()
        safe_print()

    # ── Interactive Monitor ──────────────────────────────────
    if not args.quiet and sys.stdin.isatty():
        interactive_monitor(manager)

    # ── Watchdog ─────────────────────────────────────────────
    try:
        manager.watchdog()
    except KeyboardInterrupt:
        pass

    # ── Shutdown ─────────────────────────────────────────────
    print_shutdown_banner()
    manager.stop_all()
    print_session_summary(manager)
    print_goodbye()
    sys.exit(0)


if __name__ == "__main__":
    main()