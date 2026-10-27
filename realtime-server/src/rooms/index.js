/**
 * Room management and authorization logic.
 * Enforces server-side permissions: clients cannot arbitrarily join foreign rooms.
 */

function setupUserRooms(socket) {
  const user = socket.user;
  if (!user || !user.id) return;

  // 1. Every authenticated user automatically joins their personal private room
  const personalRoom = `user_${user.id}`;
  socket.join(personalRoom);

  // 2. Role-specific rooms
  if (user.role === 'admin') {
    socket.join('admin');
  } else {
    socket.join('tenant');
  }

  console.log(`[Socket] User #${user.id} (${user.role}) connected -> joined rooms: [${personalRoom}, ${user.role}]`);
}

/**
 * Handle custom room join requests with permission verification
 */
function handleJoinRoom(socket, requestedRoom, callback) {
  const user = socket.user;
  if (!user) {
    if (typeof callback === 'function') callback({ success: false, message: 'Unauthenticated' });
    return;
  }

  if (typeof requestedRoom !== 'string' || requestedRoom.length > 80) {
    if (typeof callback === 'function') callback({ success: false, message: 'Invalid room' });
    return;
  }

  // Admin can join any operational room
  if (user.role === 'admin') {
    socket.join(requestedRoom);
    if (typeof callback === 'function') callback({ success: true, room: requestedRoom });
    return;
  }

  // Tenant can only join their own room or their authorized room
  if (requestedRoom === `user_${user.id}` || requestedRoom === 'tenant') {
    socket.join(requestedRoom);
    if (typeof callback === 'function') callback({ success: true, room: requestedRoom });
    return;
  }

  // Deny foreign room join
  console.warn(`[Security] User #${user.id} attempted unauthorized access to room "${requestedRoom}"`);
  if (typeof callback === 'function') {
    callback({ success: false, message: 'Access denied to this room' });
  }
}

module.exports = {
  setupUserRooms,
  handleJoinRoom
};
