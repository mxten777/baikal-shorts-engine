from app.core.supabase import get_supabase
import json

db = get_supabase()

# 최근 프로젝트 조회
projects = db.table('projects').select('*').order('created_at', desc=True).limit(1).execute()

if projects.data:
    project = projects.data[0]
    pid = project['id']
    
    print(f"\n{'='*70}")
    print(f"프로젝트: {project['title']}")
    print(f"ID: {pid}")
    print(f"상태: {project['status']}")
    print(f"생성: {project['created_at']}")
    print(f"{'='*70}\n")
    
    # 파이프라인 실행 기록 조회
    runs = db.table('pipeline_runs').select('*').eq('project_id', pid).order('started_at', desc=False).execute()
    
    print(f"파이프라인 실행 기록 ({len(runs.data)}개):\n")
    for run in runs.data:
        print(f"  [{run['step']}]")
        print(f"    상태: {run['status']}")
        print(f"    시작: {run['started_at']}")
        print(f"    완료: {run.get('finished_at', 'None')}")
        if run['status'] == 'failed' and run.get('error_message'):
            print(f"    에러: {run['error_message'][:100]}")
        print()
else:
    print("⚠️ 프로젝트가 없습니다!")
