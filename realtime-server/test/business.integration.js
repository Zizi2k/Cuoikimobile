// Invoked by tests/security_regression.py inside the disposable PHP/MySQL environment.
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {io}=require('socket.io-client');
const path=require('node:path');
let checks=0;const clients=[];
function check(value,label){assert.ok(value,label);checks++;console.log('PASS business:',label);}
async function api(endpoint,token,method='GET',body){const r=await fetch(process.env.QLPT_API_URL+endpoint,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});return{status:r.status,...await r.json()};}
function event(socket,name){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{socket.off(name,fn);reject(new Error('Missing event '+name));},15000);function fn(data){clearTimeout(timer);resolve(data);}socket.once(name,fn);});}
function command(socket,name,data){return new Promise((resolve,reject)=>socket.timeout(15000).emit(name,data,(err,res)=>err?reject(err):resolve(res)));}
async function connect(token){const socket=io(`http://127.0.0.1:${process.env.PORT}`,{auth:{token},transports:['websocket'],autoConnect:false,reconnection:false});clients.push(socket);await new Promise((resolve,reject)=>{socket.once('connect',resolve);socket.once('connect_error',reject);socket.connect();});return socket;}
const server=spawn(process.execPath,['src/server.js'],{cwd:path.resolve(__dirname,'..'),env:process.env,stdio:['ignore','ignore','pipe']});let errors='';server.stderr.on('data',d=>errors+=d);
(async()=>{
 try{
  for(let i=0;i<80;i++){try{const r=await fetch(`http://127.0.0.1:${process.env.PORT}/health`);if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  const login=async username=>{const r=await api('login',null,'POST',{username,password:'Correct-private-test-password'});assert.equal(r.status,200);return r.token;};
  const adminToken=await login('admin_test'),tenantToken=await login('tenant_a'),otherToken=await login('tenant_b');
  const admin=await connect(adminToken),tenant=await connect(tenantToken),other=await connect(otherToken);
  check(admin.connected&&tenant.connected&&other.connected,'three real Socket.IO clients authenticated against PHP');
  const denied=await new Promise(resolve=>tenant.emit('room:join','admin',resolve));check(!denied.success,'tenant cannot join admin room');
  const denyCommand=await command(tenant,'incident:updateStatus',{id:1,status:'completed'});check(!denyCommand.success,'tenant cannot invoke admin business command');
  check((await api('manage/areas',tenantToken)).status===403,'REST admin resources deny tenants');
  const newArea=await api('manage/areas',adminToken,'POST',{area_code:'TEST-CRUD',name:'CRUD area',address:'Test address'});assert.equal(newArea.success,true);const areaId=newArea.data.id;
  check((await api('manage/areas/'+areaId,adminToken,'PUT',{name:'Changed'})).success,'REST update area');
  check((await api('manage/areas',adminToken)).data.some(x=>x.id===areaId&&x.name==='Changed'),'REST read updated area');
  check((await api('manage/areas/'+areaId,adminToken,'DELETE')).success,'REST delete unused area');
  const room=await api('rooms',adminToken,'POST',{area_id:1,room_number:'Integration',room_code:'INT-ROOM',price:1000,area_size:20});assert.equal(room.success,true);const roomId=room.room_id;
  const contract=await api('manage/contracts',adminToken,'POST',{contract_code:'INT-CONTRACT',room_id:roomId,tenant_id:102,start_date:'2026-10-01',end_date:'2027-10-01',rent_price:1000,status:'active'});
  assert.equal(contract.success,true,JSON.stringify(contract));check(true,'REST creates contract and links room/tenant');
  const contractId=contract.data.id;
  check((await api('rooms',adminToken)).data.find(r=>r.id===roomId).status==='rented','contract updates room occupancy');
  check((await api('manage/contracts',adminToken,'POST',{contract_code:'INT-DUP',room_id:roomId,tenant_id:102,start_date:'2026-10-01',end_date:'2027-10-01',rent_price:1000})).status===422,'duplicate active contract rejected');
  await api('push-token',tenantToken,'POST',{token:'ExponentPushToken[IntegrationDeviceA]'});
  const received=event(admin,'incident:created');let leaked=false;other.on('incident:created',()=>leaked=true);
  const created=await command(tenant,'incident:create',{title:'Integration leak',description:'Pipe repair',priority:'high'});
  check(created.success,'tenant emits incident:create and receives business acknowledgement');
  const broadcast=await received;const incidentId=Number(created.id||broadcast.id);
  check(Number(broadcast.id)===incidentId,'admin receives targeted incident:created with committed id');
  await new Promise(r=>setTimeout(r,100));check(!leaked,'foreign tenant receives no incident broadcast');
  const changed=event(tenant,'incident:status:changed');
  const updated=await command(admin,'incident:updateStatus',{id:incidentId,status:'completed',admin_notes:'Repaired',cost:50});
  check(updated.success,'admin emits incident:updateStatus and receives acknowledgement');
  check((await changed).status==='completed','tenant receives status update without manual reload');
  check((await api('maintenance/'+incidentId,tenantToken)).data.admin_notes==='Repaired','target detail reflects database update');
  check((await api('maintenance/'+incidentId,otherToken)).status===404,'foreign tenant cannot open detail by guessed id');
  const invoiced=await api('invoices',adminToken,'POST',{contract_id:contractId,billing_month:'2026-11',due_date:'2026-11-20',room_price:1000,service_amount:0});assert.equal(invoiced.success,true,JSON.stringify(invoiced));const invoiceId=invoiced.invoice_id;
  check((await api('invoices/'+invoiceId,tenantToken)).data.total_amount==1000,'invoice REST detail uses correct owner and total');
  check((await api('invoices/'+invoiceId,otherToken)).status===404,'invoice detail rejects foreign tenant');
  check((await api('payments',adminToken,'POST',{invoice_id:invoiceId,amount:1001})).status===422,'overpayment rejected');
  const partial=await api('payments',adminToken,'POST',{invoice_id:invoiceId,amount:200}); check(partial.new_status==='partially_paid','partial payment recorded: '+JSON.stringify(partial));
  check((await api('payments',adminToken,'POST',{invoice_id:invoiceId,amount:800})).new_status==='paid','final payment clears balance');
  const history=await api('notifications',tenantToken);
  check(history.data.some(n=>Number(n.reference_id)===invoiceId&&n.reference_type==='invoice'),'business invoice notification stored with detail payload');
  check(history.data.some(n=>Number(n.reference_id)===incidentId&&n.reference_type==='maintenance'),'business maintenance notification stored with detail payload');
  const closed=event(tenant,'disconnect');tenant.disconnect();await closed;
  await new Promise(r=>setTimeout(r,50));
  await new Promise((resolve,reject)=>{tenant.once('connect',resolve);tenant.once('connect_error',reject);tenant.connect();});check(tenant.connected,'client can reconnect and reauthenticate');
  console.log(`${checks} business integration checks passed`);
 }finally{clients.forEach(s=>s.disconnect());server.kill();}
})().catch(error=>{console.error(error);console.error(errors);process.exitCode=1;});
