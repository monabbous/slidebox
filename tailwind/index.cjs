const plugin = require("tailwindcss/plugin");
const rules = require("./rules.json");
const groupRules = require("./group-rules.json");
const experimentalRules = require("./experimental-rules.json");

function flatten(colors, prefix = "") {
  return Object.fromEntries(Object.entries(colors).flatMap(([key, value]) => {
    const name = key === "DEFAULT" ? prefix : [prefix, key].filter(Boolean).join("-");
    return typeof value === "object" && value !== null
      ? Object.entries(flatten(value, name)) : [[name, value]];
  }));
}

module.exports = plugin.withOptions((defaults = {}) => ({ addUtilities, matchUtilities, theme }) => {
  const controls = ["size", "width", "spacing", "deform", "duration", "easing", "track", "border", "off", "on", "radius", "text", "selected-text"];
  for (const key of Object.keys(defaults)) {
    if (!controls.includes(key)) throw new Error(`Unknown Slidebox control: ${key}`);
  }
  const properties = Object.fromEntries(Object.entries(defaults).map(([key, value]) => [`--slidebox-${key}`, String(value)]));
  addUtilities(Object.fromEntries(Object.entries({ ".slidebox": rules, ".slidebox-group": groupRules, ...experimentalRules })
    .map(([selector, component]) => [selector, { ...properties, ...component }])));
  for (const key of controls) {
    let values = theme(`slidebox.${key}`, {});
    if (["track", "border", "off", "on", "text", "selected-text"].includes(key)) values = { ...flatten(theme("colors", {})), ...values };
    if (key === "radius") values = { ...theme("borderRadius", {}), ...values };
    if (key === "duration") values = { ...theme("transitionDuration", {}), ...values };
    if (key === "easing") values = { ...theme("transitionTimingFunction", {}), ...values };
    matchUtilities({ [`slidebox-${key}`]: value => ({ [`--slidebox-${key}`]: value }) }, { values });
  }
});
