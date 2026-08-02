/**
 * node scripts/test-hr-timesheet.cjs  (sau build domain)
 */
const { processTimesheet, parseTimeToMinutes } = require('../packages/domain/dist/index.js');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const shift = {
  startMinutes: parseTimeToMinutes('08:00'),
  endMinutes: parseTimeToMinutes('17:00'),
  breakMinutes: 60,
};

const r = processTimesheet(
  {
    clockInMinutes: parseTimeToMinutes('08:15'),
    clockOutMinutes: parseTimeToMinutes('17:30'),
  },
  shift,
);

assert(r.standardMinutes === 8 * 60, `standard want 480 got ${r.standardMinutes}`);
assert(r.lateMinutes === 15, `late want 15 got ${r.lateMinutes}`);
assert(r.earlyLeaveMinutes === 0, 'not early');
// worked = 08:15–17:30 = 555 − 60 break = 495; OT = 495−480 = 15
assert(r.workedMinutes === 495, `worked want 495 got ${r.workedMinutes}`);
assert(r.otMinutes === 15, `ot want 15 got ${r.otMinutes}`);

const open = processTimesheet(
  { clockInMinutes: parseTimeToMinutes('08:00'), clockOutMinutes: null },
  shift,
);
assert(open.workedMinutes === 0 && open.otMinutes === 0, 'open punch');

console.log('PASS hr processTimesheet');
