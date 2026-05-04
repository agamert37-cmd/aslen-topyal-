const fs = require('fs');

let code = fs.readFileSync('/app/applet/app/pages/site/DashboardPage.tsx', 'utf8');

const actStart = code.indexOf('{/* ─── Bottom Section: Activity & Quick Actions ─── */}');
// find the end of Activity & Quick Actions. It ends right before `─── KPI Ticker Banner ───` but wait! I wrapped KPI Ticker Banner in `<></>` ? No, I put `</>` before `Bottom Section...`

// Let's find the Activity & Quick Actions chunk correctly.
// It starts at actStart and ends at the closing `</div>` of that grid.
// But it's easier to find the exact end string:
const actEnd = code.indexOf('{/* ─── KPI Ticker Banner ─── */}');
if (actStart > -1 && actEnd > -1) {
  const actBlock = code.slice(actStart, actEnd);
  
  // Remove it from the current position
  code = code.slice(0, actStart) + code.slice(actEnd);
  
  // Insert it BEFORE the Toggle.
  const toggleStart = code.indexOf('{/* ─── Mobil: Gelişmiş Analitik Toggle ─── */}');
  if (toggleStart > -1) {
    code = code.slice(0, toggleStart) + actBlock + "\n\n" + code.slice(toggleStart);
  } else {
    console.log("Toggle not found");
  }
} else {
  console.log("Activity block not found", actStart, actEnd);
}

fs.writeFileSync('/app/applet/app/pages/site/DashboardPage.tsx', code);
console.log("Activity moved up.");
