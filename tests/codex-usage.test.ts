import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCodexUsageHeaders as parse, codexWindowLabel } from '../pi-agent/extensions/lib/codex-usage.ts';

test('direct and forwarded mixed-case headers preserve zero, decimals and seconds', () => {
  const data = parse({
    'X-Codex-Primary-Used-Percent': '0',
    'X-Codex-Primary-Window-Minutes': '300',
    'X-Codex-Primary-Reset-At': '1700000000',
    'LLM_PROVIDER-X-CODEX-SECONDARY-USED-PERCENT': '12.75',
    'llm_provider-x-codex-secondary-window-minutes': '10080',
  }, 123)!;
  assert.equal(data.fetchedAt, 123);
  assert.deepEqual(data.usage?.primary, { usedPercent: 0, windowMinutes: 300, resetsAt: 1700000000 });
  assert.equal(data.usage?.secondary?.usedPercent, 12.75);
});

test('missing and invalid percentages never become zero', () => {
  for (const value of ['', ' ', 'NaN', 'Infinity', '-1', '1foo', '0x10', true, null, undefined, Infinity, -1]) {
    assert.equal(parse({ 'x-codex-primary-used-percent': value }), null);
  }
  assert.equal(parse({ 'x-codex-primary-reset-at': '123' }), null);
  assert.equal(parse(undefined), null);
  assert.equal(parse({ 'x-ratelimit-remaining': '10', 'x-codex-extra-used-percent': '20' }), null);
});

test('optional invalid metadata does not discard valid usage', () => {
  assert.deepEqual(parse({ 'x-codex-primary-used-percent': '20.5', 'x-codex-primary-reset-at': '-1', 'x-codex-primary-window-minutes': '' }, 0)?.usage?.primary,
    { usedPercent: 20.5, resetsAt: null, windowMinutes: null });
});

test('weekly-only primary relocates; duration labels honor actual windows', () => {
  const data = parse({ 'x-codex-primary-used-percent': '30', 'x-codex-primary-window-minutes': '10080' })!;
  assert.equal(data.usage?.primary, null);
  assert.equal(codexWindowLabel(data.usage!.secondary!, '7d'), '7d');
  for (const [minutes, label] of [[120, '2h'], [45, '45m'], [2880, '2d'], [null, '5h']] as const) {
    assert.equal(codexWindowLabel({ usedPercent: 1, resetsAt: null, windowMinutes: minutes }, '5h'), label);
  }
});

for (const prefix of ['x-codex-', 'llm_provider-x-codex-']) {
  test(`${prefix} placeholder secondary does not block weekly primary relocation`, () => {
    const data = parse({
      [`${prefix}primary-used-percent`]: '34',
      [`${prefix}primary-window-minutes`]: '10080',
      [`${prefix}primary-reset-at`]: '1791047416',
      [`${prefix}secondary-used-percent`]: '0',
      [`${prefix}secondary-window-minutes`]: '0',
    }, 123);
    assert.deepEqual(data, { fetchedAt: 123, usage: {
      primary: null,
      secondary: { usedPercent: 34, windowMinutes: 10080, resetsAt: 1791047416 },
    } });
  });

  test(`${prefix} empty zero windows are absent but genuine windows remain`, () => {
    for (const minutes of [undefined, '0']) {
      assert.equal(parse({ [`${prefix}primary-used-percent`]: '0',
        [`${prefix}primary-window-minutes`]: minutes }), null);
    }
    assert.deepEqual(parse({ [`${prefix}primary-used-percent`]: '0',
      [`${prefix}primary-window-minutes`]: '300' })?.usage?.primary,
    { usedPercent: 0, windowMinutes: 300, resetsAt: null });
    assert.deepEqual(parse({ [`${prefix}primary-used-percent`]: '0',
      [`${prefix}primary-reset-at`]: '0' })?.usage?.primary,
    { usedPercent: 0, windowMinutes: null, resetsAt: 0 });
    assert.deepEqual(parse({ [`${prefix}primary-used-percent`]: '34',
      [`${prefix}primary-window-minutes`]: '300',
      [`${prefix}secondary-used-percent`]: '0',
      [`${prefix}secondary-window-minutes`]: '10080' })?.usage, {
      primary: { usedPercent: 34, windowMinutes: 300, resetsAt: null },
      secondary: { usedPercent: 0, windowMinutes: 10080, resetsAt: null },
    });
  });
}

test('stream placeholder secondary does not block weekly primary relocation', async () => {
  const { parseCodexUsageEvent: parseEvent } = await import('../pi-agent/extensions/lib/codex-usage.ts');
  assert.deepEqual(parseEvent({ type: 'codex.rate_limits', rate_limits: {
    primary: { used_percent: 34, window_minutes: 10080, reset_at: 1791047416 },
    secondary: { used_percent: 0, window_minutes: 0 },
  } }, 123), { fetchedAt: 123, usage: {
    primary: null,
    secondary: { usedPercent: 34, windowMinutes: 10080, resetsAt: 1791047416 },
  } });
  assert.equal(parseEvent({ type: 'codex.rate_limits', rate_limits: {
    primary: { used_percent: 0 },
  } }), null);
});

test('stream events validate windows, ignore specialized pools and preserve resets', async () => {
  const { parseCodexUsageEvent: parseEvent } = await import('../pi-agent/extensions/lib/codex-usage.ts');
  const event = { type: 'codex.rate_limits', rate_limits: { primary: { used_percent: 0, window_minutes: 10080, reset_at: 1700000000 } } };
  assert.equal(parseEvent(event, 99)?.usage?.secondary?.resetsAt, 1700000000);
  assert.equal(parseEvent(event, 99)?.fetchedAt, 99);
  assert.equal(parseEvent({ ...event, metered_limit_name:'codex_other' }), null);
  assert.equal(parseEvent({ ...event, limit_name:'special' }), null);
  assert.ok(parseEvent({ ...event, limit_name:' CODEX ' }));
  assert.equal(parseEvent({ ...event, type:'response.completed' }), null);
  assert.equal(parseEvent({ type:'codex.rate_limits',rate_limits:{primary:{used_percent:'0'}} }), null);
  assert.equal(parseEvent({ type:'codex.rate_limits',rate_limits:{primary:{used_percent:NaN}} }), null);
});

test('tiny numeric event percentages remain valid; metadata requires safe integers', async () => {
  const { parseCodexUsageEvent: parseEvent } = await import('../pi-agent/extensions/lib/codex-usage.ts');
  for (const value of [1.5, Number.MAX_SAFE_INTEGER + 1, -1, Infinity]) {
    const data = parseEvent({ type: 'codex.rate_limits', rate_limits: {
      primary: { used_percent: 1e-7, window_minutes: value, reset_at: value },
    } });
    assert.deepEqual(data?.usage?.primary, { usedPercent: 1e-7, windowMinutes: null, resetsAt: null });
    assert.deepEqual(parse({ 'x-codex-primary-used-percent': '1.25',
      'x-codex-primary-window-minutes': String(value), 'x-codex-primary-reset-at': String(value),
    })?.usage?.primary, { usedPercent: 1.25, windowMinutes: null, resetsAt: null });
  }
  assert.equal(parse({ 'x-codex-primary-used-percent': '1e-7' }), null);
  assert.deepEqual(parse({ 'x-codex-primary-used-percent': '0',
    'x-codex-primary-window-minutes': '0', 'x-codex-primary-reset-at': '0',
  })?.usage?.primary, { usedPercent: 0, windowMinutes: null, resetsAt: 0 });
});
