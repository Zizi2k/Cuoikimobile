"""Integration checks against a disposable MySQL database; never uses the application's DB_NAME."""
import json, os, secrets, socket, subprocess, time, tempfile, urllib.request, urllib.error
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
PHP = os.environ.get('PHP_BIN', 'php')
env = dict(os.environ, DB_NAME='qlpt_security_' + secrets.token_hex(6), QLPT_API_SECRET=secrets.token_hex(32), QLPT_REALTIME_SECRET=secrets.token_hex(32), APP_ENV='test')
count = 0

def call(route, body=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token: headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(base + route, data=json.dumps(body).encode() if body is not None else None, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as res: return res.status, json.load(res)
    except urllib.error.HTTPError as err:
        return err.code, json.load(err)

def check(ok, label):
    global count
    if not ok: raise AssertionError(label)
    count += 1
    print('PASS:', label)

def login(username):
    status, data = call('api/login', {'username': username, 'password': 'Correct-private-test-password'})
    check(status == 200 and bool(data.get('token')), 'valid login: ' + username)
    return data['token']

process = None
try:
    subprocess.run([PHP, str(ROOT/'tests/security_fixture.php')], env=env, check=True)
    # Repeat migrations to verify upgrades are non-destructive and idempotent.
    for script in ['scripts/migrate_mobile_push.php', 'scripts/migrate_notification_reads.php', 'scripts/migrate_notification_reads.php', 'scripts/migrate_rubric.php', 'scripts/migrate_rubric.php']:
        subprocess.run([PHP, str(ROOT/script)], env=env, check=True)
    check(True, 'migrations apply repeatedly without deleting fixture data')
    with socket.socket() as s:
        s.bind(('127.0.0.1',0)); port=s.getsockname()[1]
    base=f'http://127.0.0.1:{port}/index.php?route='
    session_dir = tempfile.TemporaryDirectory(prefix='qlpt-sessions-')
    log=tempfile.TemporaryFile(mode='w+')
    # Capture Expo HTTP requests locally. This proves business dispatch, not FCM/APNs delivery.
    import threading
    from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
    pushes=[]
    class Capture(BaseHTTPRequestHandler):
        def do_POST(self):
            body=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
            if self.path=='/send':
                pushes.extend(body)
                response={'data':[{'status':'ok','id':'ticket-'+str(len(pushes))+'-'+str(i)} for i in range(len(body))]}
            else: response={'data':{ticket:{'status':'ok'} for ticket in body['ids']}}
            self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps(response).encode())
        def log_message(self,*args): pass
    capture=ThreadingHTTPServer(('127.0.0.1',0),Capture)
    threading.Thread(target=capture.serve_forever,daemon=True).start()
    env['QLPT_TEST_PUSH_URL']='http://127.0.0.1:'+str(capture.server_port)
    with socket.socket() as rt:
        rt.bind(('127.0.0.1',0)); realtime_port=rt.getsockname()[1]
    env['QLPT_REALTIME_URL']=f'http://127.0.0.1:{realtime_port}/api/emit'
    process=subprocess.Popen([PHP,'-d','session.save_path=' + session_dir.name,'-S',f'127.0.0.1:{port}','-t',str(ROOT/'public')],env=env,stdout=log,stderr=log)
    for _ in range(40):
        try:
            if call('api/health')[0] == 200: break
        except OSError: time.sleep(.1)
    else: raise RuntimeError('PHP server did not start')
    check(call('api/demo-tenants')[1] == {'success':True,'data':[]}, 'demo endpoint discloses no tenant data')
    for password in ['wrong-password','NhaTro@2026','123456','admin123','123456789102','789102']:
        check(call('api/login',{'username':'tenant_a','password':password})[0]==401,'reject wrong/shared/identity password: '+password)
    check(call('api/login',{'username':'admin_test','quick_login':True,'password':'wrong'})[0]==401,'quick_login cannot bypass admin authentication')
    check(call('api/login',{'username':'admin_test','quick_login':True})[0]==422,'quick_login still requires password')
    check(call('api/login',{'username':'0900000104','password':'abcdef'})[0]==401,'login cannot claim unlinked tenant')
    check(call('api/register',{'fullname':'Imposter','phone':'0900000104','password':'abcdef'})[0]==409,'registration cannot claim existing tenant profile')
    check(call('api/register',{'fullname':'New account','phone':'0900000199','password':'New-private-password'})[0]==201,'new unlinked registration still works')
    # Web login uses the same strict password policy (real session + CSRF).
    import http.cookiejar, re, urllib.parse
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl): return None
    for password, expected in [('NhaTro@2026', '/login'), ('Correct-private-test-password', '/dashboard')]:
        jar = http.cookiejar.CookieJar()
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar), NoRedirect())
        html = opener.open(base + 'login', timeout=10).read().decode()
        csrf = re.search(r'name="_csrf_token" value="([^"]+)"', html).group(1)
        req = urllib.request.Request(base + 'login', data=urllib.parse.urlencode({'username':'admin_test','password':password,'_csrf_token':csrf}).encode())
        try: opener.open(req, timeout=10); raise AssertionError('Expected redirect')
        except urllib.error.HTTPError as err:
            check(err.code == 302 and err.headers['Location'].endswith(expected), 'web login password policy: ' + expected)
    a,b,admin=login('tenant_a'),login('tenant_b'),login('admin_test')
    status,feed=call('api/notifications',token=a)
    check({n['id'] for n in feed['data']}=={101,102,105},'tenant feed excludes foreign/admin notifications')
    check(feed['unread_count']==3,'legacy global is_read does not mark a user read')
    check(call('api/notifications/read/103',{},a)[0]==404,'cannot mark another tenant notification read')
    check(call('api/notifications/read/104',{},a)[0]==404,'cannot mark operational admin notification read')
    check(call('api/notifications/read/101',{},a)[0]==200,'mark public notification read for A')
    check(call('api/notifications/read/101',{},a)[0]==200,'repeated read is idempotent')
    check(call('api/notifications/unread-count',token=b)[1]['unread_count']==2,'B stays unread after A reads public notice')
    check(call('api/notifications/read-all',{},a)[0]==200,'mark all for A')
    check(call('api/notifications/unread-count',token=a)[1]['unread_count']==0,'A unread count is zero')
    check(call('api/notifications/unread-count',token=b)[1]['unread_count']==2,'mark-all never changes B receipts')
    check(call('api/notifications/unread-count',token=admin)[1]['unread_count']==2,'admin has independent public and operational notices')
    dashboard=call('api/dashboard',token=a)[1]
    check(all(n['is_read']==1 for n in dashboard['notifications']),'dashboard uses same read receipts')
    check(call('api/push-token',{'token':'ExponentPushToken[SimDevice_android_1]'},a)[0]==422,'fake simulator push token rejected')
    check(call('api/push-token/remove',{'token':'x'})[0]==401,'push token removal requires authentication')
    call('api/push-token/remove',{'token':'ExponentPushToken[real_test_device_b]'},a)
    # Check the actual database after attempting cross-account deletion.
    code="require 'app/Helpers/Database.php'; echo App\\Helpers\\Database::getConnection()->query('SELECT COUNT(*) FROM push_tokens WHERE user_id=103')->fetchColumn();"
    out=subprocess.check_output([PHP,'-r',code],env=env,cwd=ROOT,text=True)
    check(out.strip()=='1','A cannot delete B device token')
    # Secret rotation invalidates API tokens; malformed signatures/payloads must not reach DB.
    import base64,hmac,hashlib
    payload='102.tenant.NaN'
    malformed=base64.urlsafe_b64encode(payload.encode()).decode().rstrip('=')+'.'+hmac.new(env['QLPT_API_SECRET'].encode(),payload.encode(),hashlib.sha256).hexdigest()
    check(call('api/notifications',token=malformed)[0]==401,'signed malformed expiry rejected')
    subprocess.run(['node','realtime-server/test/business.integration.js'],cwd=ROOT,env=dict(env,QLPT_API_URL=base+'api/',PORT=str(realtime_port),HOST='127.0.0.1'),check=True)
    event_types={entry.get('data',{}).get('type') for entry in pushes}
    check('new_invoice' in event_types and 'maintenance_update' in event_types, 'at least two real business actions issue Expo HTTP requests with data payloads')
    check('payment_received' in event_types, 'payment also dispatches automatically')
    subprocess.run([PHP,str(ROOT/'scripts/check_push_receipts.php')],env=env,check=True)
    check(True,'Expo receipts processed through the local provider stub')
    print(f'{count} security/push integration checks passed')
finally:
    if process: process.terminate();process.wait(timeout=5)
    if 'capture' in locals(): capture.shutdown();capture.server_close()
    if 'session_dir' in locals(): session_dir.cleanup()
    if 'log' in locals(): log.close()
    subprocess.run([PHP,str(ROOT/'tests/security_fixture.php'),'drop'],env=env,check=True)
