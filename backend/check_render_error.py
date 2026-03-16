from app.core.supabase import get_supabase
import json

db = get_supabase()

# 테스트 프로젝트 ID
test_project_id = "b97722a0-f40b-4f92-bbd1-314552cb709c"

result = db.table('render_jobs').select('*').eq('project_id', test_project_id).order('created_at', desc=True).execute()

if result.data:
    for idx, job in enumerate(result.data):
        print(f"\n=== 렌더 작업 #{idx + 1} ===")
        print(f"Status: {job.get('status')}")
        print(f"Progress: {job.get('progress', 0)}%")
        print(f"ID: {job.get('id')}")
        print(f"Created: {job.get('created_at')}")
        print(f"\n에러 메시지:")
        print(job.get('error_message', 'None'))
else:
    print(f"프로젝트 {test_project_id}의 렌더 작업이 없습니다")
