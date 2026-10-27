// Actual web UI with a deterministic REST stub; native push requires separate physical-device evidence.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.env.WEB_EXPORT_DIR||'../QuanLyPhongTroMobile/dist');
const server=http.createServer((req,res)=>{
 const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 let file=path.resolve(root,'.'+route);if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);res.end();return;}
 if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(root,'index.html');
 const ext=path.extname(file);res.setHeader('Content-Type',ext==='.js'?'application/javascript':ext==='.css'?'text/css':ext==='.html'?'text/html':'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:412,height:915}});
  let currentRole='admin';
  const rooms=[{id:7,room_number:'Phòng smoke',room_code:'SMOKE',area_id:1,area_size:20,price:1000,status:'empty'}];
  await context.route('**/QuanLyPhongTro/api/**',async route=>{
   const endpoint=route.request().url().split('/api/')[1],method=route.request().method();let result={success:true};
   if(method==='OPTIONS')return route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'}});
   if(endpoint==='login'){currentRole=route.request().postDataJSON().username==='tenant'?'tenant':'admin';}
   if(endpoint==='login'||endpoint==='session')result={success:true,token:'smoke-token',user:{id:101,username:'admin',fullname:'Smoke Admin',role:currentRole,status:1}};
   else if(endpoint==='dashboard')result=currentRole==='tenant'?{success:true,room:{room_number:'A101',area_name:'Khu A',area_size:25,price:2500000,contract_code:'HD-TENANT'},invoices:[]}:{success:true,stats:{rooms:{total:rooms.length,rented:0},unpaid_invoices_total:1000,pending_maintenance_count:0},invoices:[]};
   else if(endpoint==='rooms'&&method==='GET')result={success:true,data:rooms};
   else if(endpoint==='rooms'&&method==='POST'){const body=route.request().postDataJSON();rooms.push({...body,id:8});result={success:true,room_id:8};}
   else if(endpoint==='invoices')result={success:true,data:[{id:27,invoice_code:'HD-SMOKE-27',billing_month:'2026-11',remaining_amount:1000,total_amount:1000,paid_amount:0,status:'unpaid'}]};
   else if(endpoint==='invoices/27')result={success:true,data:{id:27,invoice_code:'HD-SMOKE-27',billing_month:'2026-11',due_date:'2026-11-20',remaining_amount:1000,total_amount:1000,paid_amount:0,status:'unpaid',details:[]}};
   else if(endpoint==='notifications')result={success:true,unread_count:1,data:[{id:1,title:'Hóa đơn mới',content:'Mở hóa đơn 27',is_read:0,reference_type:'invoice',reference_id:27}]};
   else if(endpoint==='notifications/preferences')result={success:true,preferences:{invoice:1,payment:1,maintenance:1,reminder:1}};
   else if(endpoint==='maintenance')result={success:true,data:[]};
   else result={success:true,data:[]};
   return route.fulfill({json:result,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'}});
  });
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByLabel('Tài khoản / điện thoại / email').fill('admin');
  await page.getByLabel('Mật khẩu',{exact:true}).fill('private-password');
  if(process.env.UI_SCREENSHOT_DIR){fs.mkdirSync(process.env.UI_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.UI_SCREENSHOT_DIR,'login.png'),fullPage:true});}
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await page.getByText('Xin chào, Smoke Admin').waitFor();
  console.log('PASS UI: authenticated global context renders dashboard');
  await page.getByRole('tab',{name:/Phòng/}).click();
  await page.getByRole('button',{name:'Thêm phòng',exact:true}).click();
  await page.getByLabel('Tên / số phòng').fill('Phòng mới UI');
  await page.getByLabel('Mã phòng (duy nhất)').fill('UI8');
  await page.getByLabel('Giá thuê',{exact:true}).fill('2000');
  await page.getByRole('button',{name:'Lưu',exact:true}).click();
  await page.getByText('🚪 Phòng mới UI',{exact:true}).waitFor();
  console.log('PASS UI: room form -> repository -> REST -> refreshed list');
  await page.getByRole('button',{name:'Lịch sử thông báo',exact:true}).click();
  await page.getByRole('button',{name:'Mở nội dung liên quan'}).click();
  await page.getByText('HD-SMOKE-27',{exact:true}).waitFor();
  console.log('PASS UI: notification opens exact invoice detail 27');
  await page.reload();await page.getByText('Xin chào, Smoke Admin').waitFor();
  console.log('PASS UI: persisted session restores after reload');
  if(process.env.UI_SCREENSHOT_DIR){fs.mkdirSync(process.env.UI_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.UI_SCREENSHOT_DIR,'mobile.png'),fullPage:true});await page.setViewportSize({width:1280,height:900});await page.screenshot({path:path.join(process.env.UI_SCREENSHOT_DIR,'desktop.png'),fullPage:true});}
  await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await page.getByLabel('Tài khoản / điện thoại / email').fill('tenant');await page.getByLabel('Mật khẩu',{exact:true}).fill('private-password');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.getByText('Phòng của bạn',{exact:true}).waitFor();await page.getByText('A101',{exact:true}).waitFor();if(await page.getByRole('tab',{name:'Phòng trọ',exact:true}).count())throw new Error('Tenant must not have admin room tab');console.log('PASS UI: tenant room overview and role-specific top navigation');if(process.env.UI_SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.UI_SCREENSHOT_DIR,'tenant.png'),fullPage:true});
  if(errors.length)throw new Error(errors.join('\n'));
  console.log('5 UI smoke checks passed; no uncaught browser errors');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
