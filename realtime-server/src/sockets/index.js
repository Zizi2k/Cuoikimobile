const { setupUserRooms, handleJoinRoom } = require('../rooms');
const config = require('../config');

async function requestBackend(token, endpoint, method = 'GET', body) {
  const response = await fetch(config.API_BASE + endpoint, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(12000)
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || `HTTP ${response.status}`);
  return data;
}

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    setupUserRooms(socket);
    socket.on('room:join', (room, callback) => handleJoinRoom(socket, room, callback));
    // Two authenticated business commands: client emit -> PHP transaction -> targeted broadcast + ack.
    const command = (event, role, endpoint) => socket.on(event, async (input, callback) => {
      if (typeof callback !== 'function') return;
      if (socket.user.role !== role) return callback({ success: false, message: 'Không có quyền thực hiện thao tác.' });
      try {
        const result = await requestBackend(socket.authToken, endpoint, 'POST', input);
        callback(result);
      } catch (error) { callback({ success: false, message: error.message || 'Máy chủ chưa xác nhận kết quả. Hãy tải lại trước khi gửi lại.' }); }
    });
    command('incident:create', 'tenant', 'maintenance');
    command('incident:updateStatus', 'admin', 'maintenance/update');
    socket.on('incident:delete', async (input, callback) => {
      if (typeof callback !== 'function') return;
      if (socket.user.role !== 'admin') return callback({ success: false, message: 'Không có quyền thực hiện thao tác.' });
      const id = Number(input?.id ?? 0);
      if (!Number.isFinite(id) || id <= 0) return callback({ success: false, message: 'Thiếu ID yêu cầu bảo trì.' });
      try {
        const result = await requestBackend(socket.authToken, `maintenance/delete/${id}`, 'POST');
        callback(result);
      } catch (error) { callback({ success: false, message: error.message || 'Máy chủ chưa xác nhận kết quả. Hãy tải lại trước khi gửi lại.' }); }
    });
    socket.on('ping:check', (callback) => { if (typeof callback === 'function') callback({ status: 'ok' }); });
  });
}
module.exports = { registerSocketHandlers, requestBackend };
