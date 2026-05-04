const fs = require('fs');
let code = fs.readFileSync('app/pages/site/DashboardPage.tsx', 'utf8');

const activityStart = code.indexOf('{/* ─── Bottom Section: Activity & Quick Actions ─── */}');
const activityEnd = code.indexOf('{/* ─── KPI Ticker Banner ─── */}');

if (activityStart > -1 && activityEnd > -1) {
  const activityCode = code.slice(activityStart, activityEnd);
  code = code.slice(0, activityStart) + code.slice(activityEnd);
  
  const chartStart = code.indexOf('{/* ─── Main Chart Section ─── */}');
  
  if (chartStart > -1) {
    // We want to wrap "Main Chart Section" and everything below until the `Gelişmiş Analizleri Gizle`
    // Actually, simple way: Put Activity & Quick Actions BEFORE the "Main Chart Section"
    code = code.slice(0, chartStart) + activityCode + "\n\n" + code.slice(chartStart);
  }
}

// Now wrap charts in advanced check.
// We'll wrap from "Main Chart Section" up to "KPI Ticker Banner" (which is now after Main Chart Section)
// Wait, KPI Ticker Banner starts at something:
const newChartStart = code.indexOf('{/* ─── Main Chart Section ─── */}');
const toggleBtnLine = code.indexOf('onClick={() => setShowAdvancedMobile');

if (newChartStart > -1) {
  code = code.slice(0, newChartStart) +
    "{(!isMobile || showAdvancedMobile) && (\n<>\n" +
    code.slice(newChartStart);
}

// Close the wrapper before the showAdvancedMobile button
const buttonStart = code.lastIndexOf('{isMobile && (', code.indexOf('Gelişmiş Analizleri Gizle'));
if (buttonStart > -1) {
  code = code.slice(0, buttonStart) +
    "</>\n)}\n\n" +
    code.slice(buttonStart);
}

// But wait, there are already {(!isMobile || showAdvancedMobile) && ( ... )} inside the sections below KPI Ticker Banner.
// If I wrap everything, it will cause nested conditions which is fine, but might be syntax error if not careful.
// Let's just remove the existing `(!isMobile || showAdvancedMobile) && (` wrappers below KPI Ticker Banner, OR just let them be, React handles nested boolean blocks via Fragment fine?
// Actually if I use Fragment, nested {condition && (...)} is fine! In JSX, inside a Fragment, `bool && (<div>...</div>)` is valid.
// Wait! `(!isMobile || showAdvancedMobile) && (` is an expression. Inside a Fragment, you must wrap it in braces `{...}`.
// E.g.
/*
{(!isMobile || showAdvancedMobile) && (
  <>
     <div />
     {(!isMobile || showAdvancedMobile) && ( <div/> )}
  </>
)}
*/
// This is totally valid React JSX.

fs.writeFileSync('app/pages/site/DashboardPage.tsx', code);
console.log("DashboardPage Mobile Order Fixed");
