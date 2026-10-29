
'use strict';

const $ = (id) => document.getElementById(id);
const defaults = () => ({
  width: 2, spacing: .33, deform: .1, duration: 200,
  family: 'Sine', direction: 'InOut', palette: 'native',
  colors: { accent: '#00b2b2', track: '#2a5b7c', border: '#5289a6', off: '#e8f6fa' }
});
let state = defaults();
let format = 'css';
let restoreFrame1 = 0;
let restoreFrame2 = 0;
let animationFrame = 0;

const switchInput = $('switch');

const bounceOut = (time) => {
  const n = 7.5625, d = 2.75;
  if (time < 1/d) return n*time*time;
  if (time < 2/d) { time -= 1.5/d; return n*time*time + .75; }
  if (time < 2.5/d) { time -= 2.25/d; return n*time*time + .9375; }
  time -= 2.625/d;
  return n*time*time + .984375;
};

// Mathematical functions from easings.net. Out uses the time-reversed In
// function. Back and Elastic need their own InOut formulas.
function easingAt(time) {
  if (time <= 0) return 0;
  if (time >= 1) return 1;
  const { family, direction } = state;
  const c1 = 1.70158;
  const baseIn = (t) => {
    switch (family) {
      case 'Linear': return t;
      case 'Sine': return 1 - Math.cos(t*Math.PI/2);
      case 'Quad': return t*t;
      case 'Cubic': return t*t*t;
      case 'Quart': return t**4;
      case 'Quint': return t**5;
      case 'Expo': return t === 0 ? 0 : 2**(10*t - 10);
      case 'Circ': return 1 - Math.sqrt(Math.max(0, 1 - t*t));
      case 'Back': return (c1 + 1)*t*t*t - c1*t*t;
      case 'Elastic':
        return t === 0 ? 0 : t === 1 ? 1 :
          -(2**(10*t-10))*Math.sin((10*t-10.75)*2*Math.PI/3);
      case 'Bounce': return 1 - bounceOut(1-t);
      default: return t;
    }
  };
  if (family === 'Linear') return time;
  if (family === 'Back' && direction === 'InOut') {
    const c2 = c1*1.525;
    return time < .5
      ? ((2*time)**2*((c2+1)*2*time - c2))/2
      : (((2*time-2)**2*((c2+1)*(2*time-2)+c2))+2)/2;
  }
  if (family === 'Elastic' && direction === 'InOut') {
    const c5 = 2*Math.PI/4.5;
    return time < .5
      ? -(2**(20*time-10)*Math.sin((20*time-11.125)*c5))/2
      : (2**(-20*time+10)*Math.sin((20*time-11.125)*c5))/2 + 1;
  }
  if (direction === 'In') return baseIn(time);
  if (direction === 'Out') return 1 - baseIn(1-time);
  return time < .5 ? baseIn(2*time)/2 : 1 - baseIn(2-2*time)/2;
}

function cssTiming() {
  if (state.family === 'Linear') return 'linear';
  const stops = ['Elastic','Bounce'].includes(state.family) ? 160 : 85;
  return 'linear(' + Array.from({ length: stops + 1 }, (_, i) => {
    const t = i/stops;
    return `${Number(easingAt(t).toFixed(5))} ${Number((100*t).toFixed(3))}%`;
  }).join(', ') + ')';
}

// AccentColor isn't implemented as an ordinary CSS color in Chromium.
// SelectedItem is the closest available system color in dark mode.
const hasAccentColor = CSS.supports('color', 'AccentColor');
const systemAccent = hasAccentColor ? 'AccentColor' : 'SelectedItem';
// Chromium mobile's SelectedItem is cyan in light mode, while native controls
// use blue. No CSS keyword exposes the native accent color exactly.
const browserAccent = hasAccentColor ? 'AccentColor' : 'light-dark(#0b75ff, SelectedItem)';
function paletteValues() {
  if (state.palette === 'native') return ['Field','ButtonBorder','FieldText',browserAccent,'auto'];
  if (state.palette === 'system') return [
    'Field','color-mix(in srgb, ButtonBorder 65%, Field)','FieldText',systemAccent,systemAccent
  ];
  if (state.palette === 'brand') return ['#2a5b7c','#5289a6','#e8f6fa','#00b2b2','#00b2b2'];
  const c = state.colors;
  return [c.track,c.border,c.off,c.accent,c.accent];
}

function applyPreview() {
  const [track,border,off,on,nativeAccent] = paletteValues();
  cancelAnimationFrame(restoreFrame1);
  cancelAnimationFrame(restoreFrame2);
  // This must happen BEFORE geometry changes. Do not animate slider updates.
  switchInput.style.setProperty('--_duration','0s');
  const variables = {
    '--_container-width-ratio': state.width,
    '--_thumb-spacing-ratio': state.spacing,
    '--_deform': state.deform,
    '--_easing-function': cssTiming(),
    '--_track': track, '--_border': border, '--_off': off, '--_on': on
  };
  for (const [name,value] of Object.entries(variables)) {
    switchInput.style.setProperty(name,String(value));
  }
  for (const id of ['nativeRange','nativeCheck','nativeRadio']) $(id).style.accentColor = nativeAccent;
  restoreFrame1 = requestAnimationFrame(() => {
    restoreFrame2 = requestAnimationFrame(() => {
      switchInput.style.setProperty('--_duration', state.duration + 'ms');
    });
  });
}

function plotCurve() {
  const curve = Array.from({length:181}, (_,i) => {
    const t=i/180;
    const x=24+t*300;
    const y=140-(easingAt(t)+.35)/1.7*120;
    return (i?'L':'M')+x.toFixed(2)+' '+y.toFixed(2);
  }).join(' ');
  $('curve').setAttribute('d',curve);
  $('graphDot').setAttribute('cx',24);
  $('graphDot').setAttribute('cy',140-(easingAt(0)+.35)/1.7*120);
  $('easeName').textContent = state.family === 'Linear'
    ? 'linear' : 'ease'+state.direction+state.family;
}

function configDeclarations() {
  const [track,border,off,on] = paletteValues();
  return [
    `--_container-width-ratio: ${state.width};`,
    `--_thumb-spacing-ratio: ${state.spacing};`,
    `--_deform: ${state.deform};`,
    `--_duration: ${state.duration}ms;`,
    `--_easing-function: ${cssTiming()};`,
    `--_track: ${track};`,
    `--_border: ${border};`,
    `--_off: ${off};`,
    `--_on: ${state.palette === 'native' ? 'light-dark(#0b75ff, SelectedItem)' : state.palette === 'system' ? 'SelectedItem' : on};`
  ].join('\n  ');
}

const baseCSS = `appearance: none;
  -webkit-appearance: none;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(1em * var(--_container-width-ratio));
  height: 1em;
  padding: 0;
  background: var(--_track);
  border: 1px solid var(--_border);
  border-radius: 100vw;
  cursor: pointer;`;
const thumbCSS = `--_start: 0;
  --_end: 1;
  content: "";
  display: block;
  flex: 1 1 auto;
  min-width: 0;
  width: calc((1 - var(--_thumb-spacing-ratio)) * 1em);
  height: calc((1 - var(--_thumb-spacing-ratio)) * 1em);
  margin-block: calc(var(--_thumb-spacing-ratio) * .5em);
  margin-inline-start: calc((1em * var(--_container-width-ratio) - 1em) * var(--_start) + var(--_thumb-spacing-ratio) * .5em);
  margin-inline-end: calc((1em * var(--_container-width-ratio) - 1em) * var(--_end) + var(--_thumb-spacing-ratio) * .5em);
  border-radius: inherit;
  background: var(--_off);
  transition: background var(--_duration) var(--_easing-function), margin-inline-start var(--_duration) var(--_easing-function), margin-inline-end var(--_duration) var(--_easing-function);
  transition-delay: 0s, 0s, calc(var(--_duration) * var(--_deform));`;
const checkedCSS = `--_start: 1;
  --_end: 0;
  background: var(--_on);
  transition-delay: 0s, calc(var(--_duration) * var(--_deform)), 0s;`;
const extraCSS = `
.slidebox:not(:checked):active::after { --_end: calc(1 - var(--_deform)); }
.slidebox:checked:active::after { --_start: calc(1 - var(--_deform)); }
.slidebox:disabled { cursor: not-allowed; opacity: .5; }
@media (forced-colors: active) {
  .slidebox { --_track: Field; --_border: ButtonBorder; --_off: FieldText; --_on: Highlight; }
}
@media (prefers-reduced-motion: reduce) {
  .slidebox::after { transition-duration: .01ms; transition-delay: 0ms; }
}`;
function generatedCode() {
  const decl=configDeclarations();
  const accentUpgrade = ['native', 'system'].includes(state.palette)
    ? '\n@supports (color: AccentColor) { .slidebox { --_on: AccentColor; } }' : '';
  if (format === 'vars') return `.slidebox {\n  ${decl}\n}${accentUpgrade}`;
  if (format === 'tailwind') return `@import "tailwindcss";

@utility slidebox {
  ${decl}
  ${baseCSS}
  &::after {
    ${thumbCSS}
  }
  &:checked::after {
    ${checkedCSS}
  }
  &:not(:checked):active::after { --_end: calc(1 - var(--_deform)); }
  &:checked:active::after { --_start: calc(1 - var(--_deform)); }
  &:disabled { cursor: not-allowed; opacity: .5; }
}
${accentUpgrade}${extraCSS.slice(extraCSS.indexOf('@media'))}`;
  return `.slidebox {
  ${decl}
  ${baseCSS}
}
.slidebox::after {
  ${thumbCSS}
}
.slidebox:checked::after {
  ${checkedCSS}
}
${accentUpgrade}\n${extraCSS}`;
}

function render() {
  for (const key of ['width','spacing','deform','duration']) {
    $(key).value=state[key];
    $(key+'Value').textContent=state[key]+(key==='width'?'×':key==='duration'?'ms':'');
  }
  $('family').value=state.family;
  $('palette').value=state.palette;
  document.querySelectorAll('[data-direction]').forEach(button =>
    button.classList.toggle('active',button.dataset.direction===state.direction));
  $('colorGrid').hidden=state.palette!=='custom';
  for (const [key,value] of Object.entries(state.colors)) $(key).value=value;
  const notes={
    native:'Native controls use accent-color: auto. Slidebox uses a matching blue in light mode and SelectedItem in dark mode when AccentColor is unavailable.',
    system:'Uses Field, FieldText, ButtonBorder and SelectedItem (AccentColor where available). System colors may differ from native controls.',
    brand:'Uses the blue and teal colors from nabous.dev.',
    custom:'Native controls and Slidebox use the selected colors.'
  };
  $('paletteNote').textContent=notes[state.palette];
  plotCurve();
  applyPreview();
  $('code').textContent=generatedCode();
}

for (const key of ['width','spacing','deform','duration']) {
  $(key).addEventListener('input', event => {
    state[key]=Number(event.target.value);
    render();
  });
}
$('family').addEventListener('change', event => {state.family=event.target.value;render();});
document.querySelectorAll('[data-direction]').forEach(button => {
  button.addEventListener('click', () => {state.direction=button.dataset.direction;render();});
});
$('palette').addEventListener('change', event => {state.palette=event.target.value;render();});
for (const key of ['accent','track','border','off']) {
  $(key).addEventListener('input', event => {state.colors[key]=event.target.value;render();});
}
document.querySelectorAll('[data-scheme]').forEach(button => {
  button.addEventListener('click', () => {
    $('preview').dataset.scheme=button.dataset.scheme;
    document.querySelectorAll('[data-scheme]').forEach(b =>
      b.classList.toggle('active',b===button));
  });
});
switchInput.addEventListener('change', () => {
  $('switchState').textContent=switchInput.checked?'Checked':'Unchecked';
});
$('replay').addEventListener('click', () => switchInput.click());
$('reset').addEventListener('click', () => {state=defaults();render();});
$('play').addEventListener('click', () => {
  cancelAnimationFrame(animationFrame);
  switchInput.click();
  const start=performance.now();
  const duration=Math.max(50,state.duration);
  const tick = now => {
    const t=Math.min(1,(now-start)/duration);
    $('graphDot').setAttribute('cx',24+t*300);
    $('graphDot').setAttribute('cy',140-(easingAt(t)+.35)/1.7*120);
    if(t<1)animationFrame=requestAnimationFrame(tick);
  };
  animationFrame=requestAnimationFrame(tick);
});
document.querySelectorAll('[data-format]').forEach(button => {
  button.addEventListener('click', () => {
    format=button.dataset.format;
    document.querySelectorAll('[data-format]').forEach(b =>
      b.classList.toggle('active',b===button));
    $('code').textContent=generatedCode();
  });
});
$('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(generatedCode());
    $('copy').querySelector('span').textContent='Copied';
    setTimeout(() => $('copy').querySelector('span').textContent='Copy code',1500);
  } catch {
    const range=document.createRange();
    range.selectNodeContents($('code'));
    const selection=window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    $('copy').querySelector('span').textContent='Select and copy';
  }
});
render();
