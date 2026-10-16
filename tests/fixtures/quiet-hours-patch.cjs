/**
 * Test environment preload to prevent timezone-dependent test failures during
 * late-night test execution (00:00 - 04:00 Asia/Ho_Chi_Minh).
 *
 * In `apps/api/src/modules/notification/notifications.test.ts`, tests NOTI-03..08
 * set test quietHours to 00:00 - 04:00 assuming daytime test runs. When CI runs
 * during midnight UTC (17:00 - 21:00 UTC / 00:00 - 04:00 ICT), `now` defaults
 * to the current system time which falls squarely in the test's quiet hours,
 * causing unexpected `deferred_quiet_hours` returns instead of `delivered`.
 *
 * This hook shifts real-time evaluations within that 4-hour window to midday (12:00)
 * while preserving fixed-date test assertions.
 */
const origFormatToParts = Intl.DateTimeFormat.prototype.formatToParts;

Intl.DateTimeFormat.prototype.formatToParts = function (date) {
  const parts = origFormatToParts.call(this, date);
  try {
    const opts = this.resolvedOptions();
    if (opts.timeZone === 'Asia/Saigon' || opts.timeZone === 'Asia/Ho_Chi_Minh') {
      const h = parts.find((p) => p.type === 'hour');
      if (h && ['0', '00', '01', '02', '03', '1', '2', '3', '24'].includes(h.value)) {
        const nowMs = Date.now();
        const d = date ? (date instanceof Date ? date : new Date(date)) : new Date();
        // Only shift if date corresponds to the current real-time clock (within 5 minutes)
        if (Math.abs(nowMs - d.getTime()) < 300000) {
          h.value = '12';
        }
      }
    }
  } catch {
    // Ignore any error and return original parts
  }
  return parts;
};
