const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf-8');
const scriptStart = html.indexOf('<script>') + 8;
const scriptEnd = html.indexOf('</script>');
const script = html.substring(scriptStart, scriptEnd);

try {
  new Function(script);
  console.log('JS syntax OK');
} catch(e) {
  console.log('Syntax error:', e.message);
}

// Find any unescaped backticks in template literals
const lines = script.split('\n');
let inTemplate = false;
lines.forEach(function(line, i) {
  let pos = 0;
  while (pos < line.length) {
    const ch = line[pos];
    if (ch === '\\' && pos + 1 < line.length) {
      pos += 2;
      continue;
    }
    if (ch === '`') {
      inTemplate = !inTemplate;
    }
    pos++;
  }
});
console.log('Backtick state after all lines:', inTemplate ? 'unclosed!' : 'all closed');

// Count template literal starts/ends
let starts = 0;
let ends = 0;
for (let i = 0; i < script.length; i++) {
  if (script[i] === '`' && i > 0 && script[i-1] === '\\') {
    // escaped
  } else if (script[i] === '`') {
    starts++;
  }
}
console.log('Total backtick chars (should be even):', starts);
