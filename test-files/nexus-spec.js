const ServerAddr = 'ws://localhost:3000';
describe('JS-Nexus', function() {
  // Throw error if a Nexus server is not running
  ensureNexusServerIsRunning();
});

function ensureNexusServerIsRunning() {
  const ws = new WebSocket(ServerAddr);
  ws.onclose = function() {
    console.error("No Connection to Nexus Server!");
  }
}
