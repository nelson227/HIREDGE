const { spawn } = require('child_process');

const proc = spawn('npx', ['expo', 'start', '--clear', '--lan'], {
  stdio: ['pipe', 'inherit', 'inherit'],
  shell: true,
  cwd: __dirname,
  env: { ...process.env, EXPO_NO_AUTH_PROMPT: '1' }
});

// Auto-select "Proceed anonymously" (2nd option = down arrow + enter)
// Send multiple times with delays to catch the prompt whenever it appears
function sendAnonymous() {
  try {
    proc.stdin.write('\u001B[B\r\n'); // Down arrow + Enter
  } catch {}
}

// Try at several intervals to catch the prompt
setTimeout(sendAnonymous, 3000);
setTimeout(sendAnonymous, 5000);
setTimeout(sendAnonymous, 8000);
setTimeout(sendAnonymous, 12000);
setTimeout(sendAnonymous, 15000);
setTimeout(sendAnonymous, 20000);

proc.on('exit', (code) => process.exit(code || 0));
process.on('SIGINT', () => { proc.kill(); process.exit(0); });
