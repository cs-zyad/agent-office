#!/usr/bin/env python3
"""
Codex Desktop observer — read-only on this Mac.

Watches ~/.codex/sessions/*.jsonl and sends ONLY sanitized section statuses
to a private Vercel Blob via the authenticated /api/codex endpoint.
Never uploads prompts, transcript text, commands, file paths, code or secrets.

Run:
  export CODEX_OFFICE_URL="https://agent-office-git-main-cszyad.vercel.app"
  read -s CODEX_OFFICE_TOKEN; export CODEX_OFFICE_TOKEN; echo
  python3 tools/codex-office-bridge.py

This is a best-effort local observer of an undocumented file format, not an
official API for observing sessions inside the Codex desktop app.
"""

import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(os.getenv('CODEX_HOME', str(Path.home() / '.codex'))) / 'sessions'
URL = os.environ.get('CODEX_OFFICE_URL', 'https://agent-office-git-main-cszyad.vercel.app').rstrip('/') + '/api/codex'
TOKEN = os.getenv('CODEX_OFFICE_TOKEN', '').strip()
PROJECT = os.getenv('CODEX_OFFICE_PROJECT', 'مشروع Codex')[:50]
SCAN_SECONDS = 12
MAX_SESSIONS = 12
MAX_AGE_SECONDS = 60 * 60 * 6
MAX_READ_BYTES = 600_000
HEARTBEAT_SECONDS = 75

KEYWORDS = (
    ('social', r'سوشال|محتوى|بوست|تغريد|تويتر|لينكد|انستا|ريلز|social|instagram|marketing|post'),
    ('security', r'أمن|حماية|ثغرة|ثغرات|security|audit|vulnerabil|authenticat'),
    ('qa', r'اختبار|جودة|تست|testing|test |tests|qa|bug|playwright'),
    ('devops', r'نشر|رفع|استضافة|سيرفر|deploy|vercel|docker|testflight|devops|pipeline'),
    ('backend', r'قاعدة بيانات|باك|خلفية|خادم|api|database|backend|postgres|supabase|firebase'),
    ('review', r'مراجعة|راجع الكود|review|refactor|lint'),
    ('design', r'تصميم|الوان|ألوان|تجربة المستخدم|figma|design|ux|ui/ux'),
    ('frontend', r'واجهة|شاشة|صفحة|مكون|frontend|react|css|component|interface'),
)

def pick_agent(text):
    text = (text or '').lower()[:2_000]
    for name, expression in KEYWORDS:
        if re.search(expression, text, re.IGNORECASE):
            return name
    return 'frontend'

def get_events(path):
    try:
        with path.open('rb') as handle:
            size = handle.seek(0, 2)
            handle.seek(max(0, size - MAX_READ_BYTES))
            data = handle.read()
        if size > MAX_READ_BYTES:
            data = data.split(b'\n', 1)[-1]
        lines = data.decode('utf-8', 'replace').splitlines()
        items = []
        for line in lines[-1_500:]:
            try:
                record = json.loads(line)
                if isinstance(record, dict) and record.get('type') in ('event_msg', 'response_item'):
                    items.append(record)
            except (json.JSONDecodeError, ValueError):
                continue
        return items
    except (OSError, PermissionError):
        return []

def session_snapshot(path, modified_ms):
    events = get_events(path)
    if not events:
        return None
    latest_prompt = ''
    latest_type = None
    latest_time_ms = modified_ms
    activity = 'يفكر في المهمة'
    state = 'idle'
    for item in events:
        outer_type = item.get('type')
        payload = item.get('payload') or {}
        kind = payload.get('type')
        if outer_type == 'event_msg':
            if kind == 'user_message':
                latest_prompt = payload.get('message', '') if isinstance(payload.get('message'), str) else latest_prompt
            elif kind == 'task_started':
                state = 'working'
                activity = 'يحلل المهمة'
                latest_type = kind
            elif kind == 'task_complete':
                state = 'done'
                activity = 'أنهى المهمة'
                latest_type = kind
            elif kind == 'turn_aborted':
                state = 'error'
                activity = 'توقّف التنفيذ'
                latest_type = kind
            elif kind == 'patch_apply_end':
                if state == 'working':
                    activity = 'يعدّل الملفات'
            elif kind in ('mcp_tool_call_end','web_search_end'):
                if state == 'working':
                    activity = 'يراجع الأدوات والنتائج'
            elif kind in ('item_started','item_completed'):
                details = payload.get('item') or {}
                if isinstance(details, dict) and state == 'working':
                    item_type = str(details.get('type', '')).lower()
                    if 'command' in item_type:
                        activity = 'ينفّذ أوامر المشروع'
                    elif 'file' in item_type or 'patch' in item_type:
                        activity = 'يعدّل ملفات المشروع'
        elif outer_type == 'response_item':
            if kind == 'message' and payload.get('role') == 'user':
                for content in (payload.get('content') or []):
                    if content.get('type') in ('input_text','text') and isinstance(content.get('text'), str):
                        text = content.get('text', '')
                        if len(text) < 3_000 and not text.startswith('# AGENTS.md'):
                            latest_prompt = text
            if kind in ('function_call', 'custom_tool_call') and state == 'working':
                name = str(payload.get('name') or '').lower()
                if 'patch' in name or 'edit' in name:
                    activity = 'يعدّل ملفات المشروع'
                elif name in ('exec_command', 'shell_command', 'run'):
                    activity = 'ينفّذ أوامر المشروع'
    if not latest_type:
        return None
    # Never infer an active job from a log that has stopped updating.
    if state == 'working' and (time.time()*1000 - modified_ms > 3*60*1000):
        state, activity = 'idle', 'لم تُرصد أحداث جديدة'
    return {
        'agent': pick_agent(latest_prompt),
        'state': state,
        'activity': activity,
        'updatedAt': int(latest_time_ms),
    }

def snapshots():
    if not ROOT.exists():
        return {}
    paths = []
    now = time.time()
    try:
        for file in ROOT.rglob('rollout-*.jsonl'):
            try:
                stat = file.stat()
            except (OSError, PermissionError):
                continue
            if now - stat.st_mtime <= MAX_AGE_SECONDS:
                paths.append((stat.st_mtime, file))
    except (OSError, PermissionError):
        return {}
    paths.sort(reverse=True)
    agents = {}
    for modified, path in paths[:MAX_SESSIONS]:
        record = session_snapshot(path, int(modified*1000))
        if record and record['agent'] not in agents:
            agents[record['agent']] = {
                'state': record['state'],
                'activity': record['activity'],
                'updatedAt': record['updatedAt'],
            }
    return agents

def post_status(data):
    body = json.dumps(data, ensure_ascii=False).encode('utf-8')
    request = urllib.request.Request(
        URL,
        data=body,
        method='POST',
        headers={
            'Authorization': 'Bearer ' + TOKEN,
            'Content-Type': 'application/json; charset=utf-8',
            'User-Agent': 'agent-office-codex-local-bridge/1.0',
        }
    )
    with urllib.request.urlopen(request, timeout=25) as response:
        return response.status == 200

def main():
    if not TOKEN:
        print('Missing CODEX_OFFICE_TOKEN. See tools/README-CODEX.md.', file=sys.stderr)
        sys.exit(2)
    if not URL.startswith('https://'):
        print('Bridge URL must use HTTPS.', file=sys.stderr)
        sys.exit(2)
    print('مراقبة جلسات Codex من الماك — بدون إرسال نصوص المحادثات')
    print('المصدر:', str(ROOT))
    print('الوجهة:', URL)
    print('أوقف المراقبة بـ Ctrl+C')
    last_fingerprint = None
    last_push = 0
    while True:
        payload = {'project': PROJECT, 'agents': snapshots()}
        fingerprint = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        try:
            if fingerprint != last_fingerprint or (payload['agents'] and time.time() - last_push > HEARTBEAT_SECONDS):
                if post_status(payload):
                    last_fingerprint, last_push = fingerprint, time.time()
                    desc = ', '.join(f"{k}: {v['state']}" for k, v in payload['agents'].items()) or 'بانتظار أول جلسة'
                    print(datetime.now().strftime('%H:%M:%S'), '✓', desc)
        except urllib.error.HTTPError as error:
            print('تعذر إرسال الحالة (HTTP', error.code, ') — تحقق من رمز الربط أو الرابط')
        except (OSError, TimeoutError) as error:
            print('تعذر الاتصال مؤقتًا:', type(error).__name__)
        time.sleep(SCAN_SECONDS)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\nتم إيقاف مراقبة Codex.')
