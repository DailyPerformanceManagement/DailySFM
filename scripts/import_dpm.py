#!/usr/bin/env python3
"""Rebuild DailySFM from a PINNED public Claude DPM snapshot, NEVER from live B+K.

Run inside DailySFM with: python3 scripts/import_dpm.py
This importer is intentionally one-way: READ original DPM; WRITE only the current working tree.
"""
import base64
import hashlib
import json
import re
import urllib.request
from pathlib import Path

SOURCE = "https://raw.githubusercontent.com/DailyPerformanceManagement/DPM/267b7ec96800f87b0860d003b69793f700917b82/"
SOURCE_SHA = "78d6cd09b3793b91bdf7f68daed91dbc8e966957"
PROJECT_SHA = "a14bd8a7cdb5649062f2bf9a93665c508a10736b"
ROOT = Path(__file__).resolve().parents[1]
HELP_IMAGES = [
    "admin-users", "calendar", "capture", "closing", "data-entry", "data-targets",
    "ishikawa", "meeting", "muda", "pareto", "pd-questions", "pdca",
    "ps-step1", "smart", "tasks-mine", "tasks-pdca", "video", "why",
]

def fetch(path: str) -> bytes:
    with urllib.request.urlopen(SOURCE + path, timeout=30) as response:
        return response.read()

def verify_blob(raw: bytes, sha: str) -> None:
    blob = hashlib.sha1(f"blob {len(raw)}\0".encode() + raw).hexdigest()
    if blob != sha:
        raise ValueError(f"Pinned Git source changed: expected {sha}, got {blob}")

def main() -> None:
    original = fetch("index.html")
    verify_blob(original, SOURCE_SHA)
    html = original.decode("utf-8")

    # The source uses an XOR-encoded string table for UI labels AND B+K credentials.
    # Decode it only to scrub the four B+K origin/configuration values, leaving all UI labels intact.
    match = re.search(r'const ǂ30c61=\(\(\)=>\{const k=\[([^\]]+)\],b=atob\("([^"]+)"\)', html)
    if not match:
        raise ValueError("Source dictionary changed; refusing unsafe import")
    key = [int(x) for x in match.group(1).split(",")]
    original_cipher = base64.b64decode(match.group(2))
    values = json.loads(bytes(v ^ key[i % len(key)] for i, v in enumerate(original_cipher)).decode("utf-8"))
    if not values[1051].startswith("https://fwkmgzwmfoyotnstybcq.supabase.co"):
        raise ValueError("Unrecognized B+K endpoint; abort")
    if not values[2529].startswith("sb_publishable_"):
        raise ValueError("Unrecognized B+K publishable key; abort")
    values[1051] = "https://dailysfm-disabled.invalid"
    values[2529] = "no-supabase-client"
    values[523] = "example.invalid"
    values[447] = "https://dailyperformancemanagement.github.io/DailySFM/"
    json_bytes = json.dumps(values, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    clean_cipher = bytes(v ^ key[i % len(key)] for i, v in enumerate(json_bytes))
    html = html.replace(match.group(2), base64.b64encode(clean_cipher).decode("ascii"), 1)

    # Prevent the clone from EVER obtaining a live B+K Supabase session.
    external_sdk = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/dist/umd/supabase.min.js"></script>'
    if external_sdk not in html:
        raise ValueError("Expected Supabase SDK tag missing; abort")
    html = html.replace(external_sdk, "", 1)
    html = html.replace(
        "https://supabase.com/dashboard/project/fwkmgzwmfoyotnstybcq/auth/users",
        "#"
    )
    create = "sb=window.supabase.createClient(ǀgt,ǀgu)"
    if html.count(create) != 1:
        raise ValueError("Unexpected number of live Supabase clients; abort")
    fake_client = (
        "sb={auth:{getSession:async()=>({data:{session:null}}),"
        "signOut:async()=>({error:null}),"
        "signInWithPassword:async()=>({data:null,error:{message:'Offline Lab'}}),"
        "onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},"
        "channel:null,from:()=>({select:()=>({data:[],error:{message:'Offline Lab'}})})}"
    )
    html = html.replace(create, fake_client, 1)

    # Replace the original B+K auth startup with original app's own LOCAL init/render.
    # The original 630KB of KPI/PDCA/problem-solving logic is preserved unchanged.
    anchor = "sb.auth.onAuthStateChange(e=>{"
    start = html.rfind(anchor)
    stop = html.find("</script>", start)
    if start < 0 or stop < 0 or stop - start > 1600:
        raise ValueError("Unable to isolate auth startup; abort")
    offline_startup = """(function dpmOfflineBootstrap(){
      window.cloudNoSeed=false;
      window.DailySFM={mode:'offline',original:'DailyPerformanceManagement/DPM'};
      ǀhc='dailysfm-local';ǀh8=ǀhc;ǀh5='leader';ǀhf=false;ǀhg=false;ǀhh=false;
      ǀh7='MAIN';ǀh4=['MAIN'];ǀhi=['MAIN'];
      ǀh6=[{code:'MAIN',name:'DPM Lab',label:'DPM Lab'}];
      ǀ3='dailysfm-original-offline-v1';
      const root=document.getElementById('appRoot');
      const overlay=document.getElementById('loginOverlay');
      if(overlay){overlay.hidden=true;overlay.style.display='none';}
      if(root){root.style.display='';root.classList.add('show');}
      const user=document.getElementById('userBox');if(user)user.textContent='DPM Lab · Offline';
      try{ǀfr();ǀfu();ǀgr();try{ǀ8w()}catch{}}
      catch(err){console.error('DPM Lab offline startup failed:',err);
       const badge=document.getElementById('dpmOfflineNotice');
       if(badge)badge.textContent='DPM-Original geladen · Offline-Initialisierung eingeschränkt';}
    })();"""
    html = html[:start] + offline_startup + html[stop:]

    # The original layout and stylesheet stay in place, unlike the earlier replacement demo.
    html = html.replace(
        "<body>",
        """<body><div id="dpmOfflineNotice" role="status" style="position:fixed;bottom:12px;left:12px;z-index:99999;background:#064b4b;color:#fff;border:1px solid #49a6a4;border-radius:9px;padding:9px 14px;font:600 12px/1.45 system-ui;box-shadow:0 5px 22px #0003">Original DPM · unabhängige Offline-Kopie · keine B+K-Verbindung · <a href="six-sigma.html" style="color:#c9ffeb;text-decoration:underline">Six Sigma Studio</a></div>""",
        1
    )
    html = html.replace("<title>KPI Cockpit", "<title>DailySFM · KPI Cockpit", 1)
    html = re.sub(r'<link rel="manifest" href="manifest\.webmanifest"\s*/>', "", html)
    html = re.sub(r'<link rel="icon" type="image/png" href="icons/icon-192\.png"\s*/>', "", html)
    html = re.sub(r'<link rel="apple-touch-icon" href="icons/apple-touch-icon\.png"\s*/>', "", html)
    if "fwkmgzwmfoyotnstybcq" in html or "sb_publishable_" in html or "window.supabase.createClient" in html:
        raise ValueError("Production connection is still present; refusing to publish")

    # Copy the TRUE original standalone projects workspace and its referenced help screenshots.
    project = fetch("projekte.html")
    verify_blob(project, PROJECT_SHA)
    (ROOT / "index.html").write_text(html, encoding="utf-8")
    (ROOT / "projekte.html").write_bytes(project)
    (ROOT / "hilfe").mkdir(parents=True, exist_ok=True)
    for item in HELP_IMAGES:
        filename = f"hilfe/{item}.jpg"
        (ROOT / filename).write_bytes(fetch(filename))

    print("Original DPM dashboard cloned safely.")
    print(f"Original cockpit: {len(original):,} bytes; isolated index: {len(html.encode()):,} bytes")
    print(f"Exact Claude improvement-project page: {len(project):,} bytes")
    print(f"Copied help screenshots: {len(HELP_IMAGES)}")
    print("B+K client removed; original repository not modified.")

if __name__ == "__main__":
    main()
