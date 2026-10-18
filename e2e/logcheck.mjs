// Crash reports and JS errors after a simulator walk.
//
//   node logcheck.mjs <tag> <vela-log-show.txt> <crash-reports-vela.txt>
//
// The log is `xcrun simctl spawn <udid> log show --predicate 'process == "<exe>"'`
// in compact style. Checks:
//   <tag>-CRASH-REPORTS  no DiagnosticReports file names the app
//   <tag>-JS-FATAL       no fatal JS / native exception lines
//   <tag>-JS-ERRORS      every console.error the app logged (React Native writes
//                        them as [com.facebook.react.log:javascript]) is a known,
//                        explained one; anything else fails
import fs from "node:fs";
import path from "node:path";

const [tag = "logs", logFile, crashList] = process.argv.slice(2);
const out = path.join(path.dirname(path.resolve(logFile ?? ".")), `results-logs-${tag}.json`);
const read = (f) => (f && fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "");
const lines = read(logFile).split("\n");
const crashes = read(crashList).split("\n").map((s) => s.trim()).filter(Boolean);

/** console.error lines we understand: the unsigned simulator build has no keychain access group. */
const KNOWN = [
  {
    re: /expo-notifications.*(registration info|getRegistrationInfoAsync|-34018|keychain)/i,
    why: "expo-notifications cannot read its keychain item in an unsigned simulator build (errSecMissingEntitlement -34018); signed builds have the entitlement",
  },
];
const FATAL = /RCTFatal|Unhandled JS Exception|JavaScript exception|Invariant Violation|TypeError: |ReferenceError: |SyntaxError: |RangeError: |Terminating app due to uncaught exception|EXC_BAD_ACCESS|SIGABRT/;

const js = lines.filter((l) => /com\.facebook\.react\.log/.test(l) && /^\S+ \S+ [EF] /.test(l));
const unknown = js.filter((l) => !KNOWN.some((k) => k.re.test(l)));
const known = js.filter((l) => KNOWN.some((k) => k.re.test(l)));
const fatal = lines.filter((l) => FATAL.test(l));

const results = [
  {
    name: `${tag}-CRASH-REPORTS`,
    status: crashes.length === 0 ? "PASS" : "FAIL",
    detail: crashes.length === 0 ? "no crash report names the app" : `crash reports: ${crashes.join(", ")}`,
  },
  {
    name: `${tag}-JS-FATAL`,
    status: lines.length > 1 ? (fatal.length === 0 ? "PASS" : "FAIL") : "NOT-TESTABLE",
    detail: lines.length > 1 ? (fatal.length === 0 ? `no fatal exception in ${lines.length} app log lines` : `fatal lines: ${fatal.slice(0, 8).map((l) => l.slice(0, 300)).join(" | ")}`) : "no app log captured",
  },
  {
    name: `${tag}-JS-ERRORS`,
    status: lines.length > 1 ? (unknown.length === 0 ? "PASS" : "FAIL") : "NOT-TESTABLE",
    detail:
      lines.length > 1
        ? `${js.length} console.error line(s) from JS; ${known.length} known (${KNOWN.map((k) => k.why).join("; ")}); unknown: ${unknown.length ? unknown.slice(0, 8).map((l) => l.slice(0, 300)).join(" | ") : "none"}`
        : "no app log captured",
  },
];
for (const r of results) console.log(`[logs] ${r.name} RESULT: ${r.status} — ${r.detail}`);
fs.writeFileSync(out, JSON.stringify(results, null, 2));
process.exit(results.some((r) => r.status === "FAIL") ? 1 : 0);
