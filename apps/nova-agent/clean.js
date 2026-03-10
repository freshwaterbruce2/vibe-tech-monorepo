const fs = require('fs');
const path = require('path');

function walk(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fp = path.join(dir, file);
    if (fs.statSync(fp).isDirectory()) {
      walk(fp);
    } else if (fp.endsWith('.tsx')) {
      let content = fs.readFileSync(fp, 'utf8');
      
      // Fix 1: onClick={async () => handleQuickAction("xxx")}
      let newContent = content.replace(/onClick=\{async \(\) => handleQuickAction\((['"].*?['"])\)\}/g, 'onClick={() => { void handleQuickAction($1); }}');
      
      // Fix 2: onClick={async () => ...} without {}
      // This is harder via regex. Let's just fix known ones.
      
      if (content !== newContent) {
        fs.writeFileSync(fp, newContent);
        console.log('Fixed ' + fp);
      }
    }
  });
}

walk('src');
