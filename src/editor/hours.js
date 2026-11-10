/* The hours part: a week, Monday to Sunday, each day closed or up to three
   windows of two native time inputs. Two shapes on the wire, one editor:

     book.content.hours.week   [{ day, windows: [{ open, close }] }], close may be 24:00
     find.places[].hours       [{ day, open, close }], HH:MM only, 21 rows

   Days are 1 (Monday) to 7. The checks mirror availability.check_hours on the
   server, so a refusal there is rare.

     const e = NFCEditorKit.hoursEditor({ shape: 'booking', value: [...], onChange: (value, valid) => {} }); */
import { cls, say, word } from './config.js';
import { ask } from './confirm.js';
import { h, icon } from './dom.js';

export const MAX_WINDOWS = 3;
const DEFAULT_WINDOW = { open: '09:00', close: '17:00' };

export function minutes(time) {
  const m = /^(\d{2}):(\d{2})$/.exec(time || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function blankWeek() {
  return [1, 2, 3, 4, 5, 6, 7].map(day => ({ day, windows: [] }));
}

const byOpen = (a, b) => minutes(a.open) - minutes(b.open);

export const SHAPES = {
  booking: {
    allow24: true,
    read(week) {
      const model = blankWeek();
      for (const entry of week || []) model[entry.day - 1].windows = (entry.windows || []).map(w => ({ ...w }));
      return model;
    },
    write(model) {
      return model
        .map(d => ({ day: d.day, windows: d.windows.filter(complete).slice().sort(byOpen).map(w => ({ open: w.open, close: w.close })) }))
        .filter(d => d.windows.length);
    },
  },
  place: {
    allow24: false,
    read(rows) {
      const model = blankWeek();
      for (const r of rows || []) model[r.day - 1].windows.push({ open: r.open, close: r.close });
      return model;
    },
    write(model) {
      return model.flatMap(d => d.windows.filter(complete).slice().sort(byOpen).map(w => ({ day: d.day, open: w.open, close: w.close })));
    },
  },
};

function complete(w) { return minutes(w.open) !== null && minutes(w.close) !== null; }

/* <input type="time"> cannot say 24:00, so a day that ends at midnight shows
   00:00. That reading is safe: 00:00 can never be a real closing time, since a
   window closes after it opens the same day. */
export const toInput = time => (time === '24:00' ? '00:00' : time || '');
export const fromInput = (value, isClose, allow24) => (isClose && allow24 && value === '00:00' ? '24:00' : value);

/* One word key per window with a problem, by index. */
export function checkWindows(windows) {
  const problems = new Map();
  windows.forEach((w, i) => {
    if (!complete(w)) problems.set(i, 'hoursMissing');
    else if (minutes(w.close) <= minutes(w.open)) problems.set(i, 'hoursOrder');
  });
  const spans = windows.map((w, i) => ({ i, start: minutes(w.open), end: minutes(w.close) }))
    .filter(s => !problems.has(s.i)).sort((a, b) => a.start - b.start);
  for (let k = 1; k < spans.length; k += 1) {
    if (spans[k].start < spans[k - 1].end) problems.set(spans[k].i, 'hoursOverlap');
  }
  return problems;
}

export const weekIsValid = model => model.every(d => checkWindows(d.windows).size === 0);

export function hoursEditor({ shape = 'booking', value, onChange }) {
  const adapter = SHAPES[shape];
  const model = adapter.read(value);
  const el = h('div', { class: 'ed-hours' });
  const emit = () => { if (onChange) onChange(adapter.write(model), weekIsValid(model)); };

  function dayBlock(entry) {
    const dayName = word('days')[entry.day - 1];
    const windowsEl = h('div', { class: 'ed-hours-windows' });
    const add = h('button', { type: 'button', class: `${cls('buttonSecondary')} ${cls('buttonSmall')}`, onclick: () => {
      const last = entry.windows[entry.windows.length - 1];
      entry.windows.push(last && minutes(last.close) !== null && minutes(last.close) < 1380
        ? { open: last.close, close: minutes(last.close) < 1320 ? addHours(last.close, 2) : '23:59' }
        : { ...DEFAULT_WINDOW });
      paint();
      emit();
      const inputs = windowsEl.querySelectorAll('input');
      inputs[inputs.length - 2].focus();
    } }, icon('plus'), word('hoursAdd'));
    const copy = h('button', { type: 'button', class: `${cls('buttonGhost')} ${cls('buttonSmall')}`, onclick: async () => {
      const yes = await ask({ title: say('hoursCopyAsk', { day: dayName }), detail: word('hoursCopyDetail'), action: word('hoursCopyAction'), tone: 'primary' });
      if (!yes) return;
      for (const other of model) if (other !== entry) other.windows = entry.windows.map(w => ({ ...w }));
      blocks.forEach(b => b.paint());
      emit();
    } }, word('hoursCopy'));
    const foot = h('div', { class: 'ed-hours-foot' }, add, copy);
    const toggle = h('input', { class: cls('switchInput'), type: 'checkbox', role: 'switch', checked: entry.windows.length > 0, 'aria-label': say('hoursOpenOn', { day: dayName }) });
    toggle.addEventListener('change', async () => {
      if (toggle.checked) { entry.windows = [{ ...DEFAULT_WINDOW }]; paint(); emit(); return; }
      toggle.checked = true;
      const yes = await ask({ title: say('hoursCloseAsk', { day: dayName }), detail: word('hoursCloseDetail'), action: word('hoursCloseAction') });
      if (!yes) return;
      toggle.checked = false;
      entry.windows = [];
      paint();
      emit();
    });
    const block = h('section', { class: 'ed-hours-day', 'aria-label': dayName },
      h('div', { class: 'ed-hours-head' }, h('span', { class: 'ed-hours-name' }, dayName), h('span', { class: 'ed-hours-closed', hidden: true }, word('hoursClosed')), toggle),
      windowsEl, foot);

    function showProblems() {
      const problems = checkWindows(entry.windows);
      [...windowsEl.children].forEach((row, i) => {
        const key = problems.get(i);
        const error = row.querySelector('[data-ed-error]');
        error.textContent = key ? word(key) : '';
        error.hidden = !key;
        row.querySelectorAll('input').forEach((input) => {
          if (key) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', error.id); } else { input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); }
        });
      });
    }

    function timeInput(w, key, labelWord) {
      const isClose = key === 'close';
      const input = h('input', { class: cls('input'), type: 'time', value: toInput(w[key]), 'aria-label': say(labelWord, { day: dayName }) });
      input.addEventListener('change', () => { w[key] = fromInput(input.value, isClose, adapter.allow24); showProblems(); emit(); });
      return input;
    }

    function paint() {
      const open = entry.windows.length > 0;
      toggle.checked = open;
      block.querySelector('.ed-hours-closed').hidden = open;
      foot.hidden = !open;
      add.disabled = entry.windows.length >= MAX_WINDOWS;
      windowsEl.replaceChildren(...entry.windows.map((w, i) => {
        const errorId = `ed-hours-${entry.day}-${i}-${Math.random().toString(36).slice(2, 7)}`;
        const remove = h('button', { type: 'button', class: 'ed-rep-remove', 'aria-label': say('hoursRemove', { day: dayName }), onclick: async () => {
          if (!(await ask({ title: say('hoursRemoveAsk', { day: dayName }), action: word('remove') }))) return;
          entry.windows.splice(entry.windows.indexOf(w), 1);
          paint();
          emit();
          (entry.windows.length ? add : toggle).focus();
        } }, icon('close'));
        return h('div', { class: 'ed-hours-window' },
          h('div', { class: 'ed-hours-times' }, timeInput(w, 'open', 'hoursOpens'), h('span', { class: 'ed-hours-to' }, word('hoursTo')), timeInput(w, 'close', 'hoursCloses')),
          remove,
          h('p', { class: cls('fieldError'), id: errorId, 'data-ed-error': '', hidden: true }));
      }));
      showProblems();
    }

    return { el: block, paint };
  }

  const blocks = model.map(dayBlock);
  el.append(...blocks.map(b => b.el));
  blocks.forEach(b => b.paint());
  return { el, value: () => adapter.write(model), valid: () => weekIsValid(model) };
}

function addHours(time, n) {
  const total = minutes(time) + n * 60;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
