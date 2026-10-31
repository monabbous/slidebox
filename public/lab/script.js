
'use strict';

const $ = (id) => document.getElementById(id);
const defaults = () => ({
  width: 2, spacing: .33, deform: .1, duration: 200,
  family: 'Sine', direction: 'InOut', palette: 'brand',
  colors: { accent: '#00b2b2', track: '#2a5b7c', border: '#5289a6', off: '#e8f6fa' }
});
let state = defaults();
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
  document.body.classList.toggle('brand-glass', state.palette === 'brand');
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
  const controlsPreview = $('controlsPreview');
  controlsPreview.style.setProperty('--slidebox-spacing', String(state.spacing));
  for (const container of [controlsPreview, $('preview'), $('checkboxPresets')]) {
    container.style.setProperty('--slidebox-duration', '0s');
    for (const [name, value] of Object.entries({
      track, border, off, on, deform: state.deform, easing: cssTiming()
    })) container.style.setProperty('--slidebox-' + name, String(value));
  }
  for (const id of ['nativeRange','nativeCheck','nativeRadio']) $(id).style.accentColor = nativeAccent;
  restoreFrame1 = requestAnimationFrame(() => {
    restoreFrame2 = requestAnimationFrame(() => {
      switchInput.style.setProperty('--_duration', state.duration + 'ms');
      controlsPreview.style.setProperty('--slidebox-duration', state.duration + 'ms');
      $('preview').style.setProperty('--slidebox-duration', state.duration + 'ms');
      $('checkboxPresets').style.setProperty('--slidebox-duration', state.duration + 'ms');
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
    brand:'The default nabous.dev palette: blue and teal, frosted tracks, and solid thumbs with pointer lighting.',
    custom:'Native controls and Slidebox use the selected colors.'
  };
  $('paletteNote').textContent=notes[state.palette];
  plotCurve();
  applyPreview();
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
document.querySelectorAll('button[data-scheme]').forEach(button => {
  button.addEventListener('click', () => {
    $('preview').dataset.scheme=button.dataset.scheme;
    $('controlsPreview').dataset.scheme=button.dataset.scheme;
    $('checkboxPresets').dataset.scheme=button.dataset.scheme;
    document.querySelectorAll('button[data-scheme]').forEach(b =>
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
$('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('installCommand').textContent);
    $('copy').querySelector('span').textContent='Copied';
    setTimeout(() => $('copy').querySelector('span').textContent='Copy install command',1500);
  } catch {
    const range=document.createRange();
    range.selectNodeContents($('installCommand'));
    const selection=window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    $('copy').querySelector('span').textContent='Select and copy';
  }
});
render();
