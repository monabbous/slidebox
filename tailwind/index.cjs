const plugin = require("tailwindcss/plugin");
const rules = require("./rules.json");

function flatten(colors, prefix = "") {
  return Object.fromEntries(Object.entries(colors).flatMap(([key, value]) => {
    const name = key === "DEFAULT" ? prefix : [prefix, key].filter(Boolean).join("-");
    return typeof value === "object" && value !== null
      ? Object.entries(flatten(value, name)) : [[name, value]];
  }));
}

module.exports = plugin.withOptions((defaults = {}) => ({ addUtilities, matchUtilities, theme }) => {
  const controls = ["size", "width", "spacing", "deform", "duration", "easing", "track", "border", "off", "on"];
  for (const key of Object.keys(defaults)) {
    if (!controls.includes(key)) throw new Error(`Unknown Slidebox control: ${key}`);
  }
  addUtilities({ ".slidebox": {
    ...Object.fromEntries(Object.entries(defaults).map(([key, value]) => [`--slidebox-${key}`, String(value)])),
    ...rules,
  } });
  for (const key of controls) {
    let values = theme(`slidebox.${key}`, {});
    if (["track", "border", "off", "on"].includes(key)) values = { ...flatten(theme("colors", {})), ...values };
    if (key === "duration") values = { ...theme("transitionDuration", {}), ...values };
    if (key === "easing") values = { ...theme("transitionTimingFunction", {}), ...values };
    matchUtilities({ [`slidebox-${key}`]: value => ({ [`--slidebox-${key}`]: value }) }, { values });
  }
});
