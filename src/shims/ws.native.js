// React Native provides WebSocket globally. This module only replaces the
// Node.js fallback that Supabase Realtime imports dynamically.
module.exports = global.WebSocket;
module.exports.default = global.WebSocket;
