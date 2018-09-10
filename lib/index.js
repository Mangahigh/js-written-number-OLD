

exports = module.exports = writtenNumber;
const util = require('./util');

const languages = ['en', 'de', 'es', 'pt', 'fr', 'eo', 'it', 'vi', 'tr'];
const i18n = {
  en: require('./i18n/en.json'),
  de: require('./i18n/de.json'),
  es: require('./i18n/es.json'),
  pt: require('./i18n/pt.json'),
  ptPT: require('./i18n/pt-PT.json'),
  fr: require('./i18n/fr.json'),
  eo: require('./i18n/eo.json'),
  it: require('./i18n/it.json'),
  vi: require('./i18n/vi.json'),
  tr: require('./i18n/tr.json'),
  hu: require('./i18n/hu.json'),
  enIndian: require('./i18n/en-indian.json'),
};
exports.i18n = i18n;

const shortScale = [100];
for (let i = 1; i <= 16; i++) {
  shortScale.push(Math.pow(10, i * 3));
}

const longScale = [100, 1000];
for (let i = 1; i <= 15; i++) {
  longScale.push(Math.pow(10, i * 6));
}

writtenNumber.defaults = {
  noAnd: false,
  lang: 'en',
};

/**
 * Converts numbers to their written form.
 *
 * @param {Number} n The number to convert
 * @param {Object} [options] An object representation of the options
 * @return {String} writtenN The written form of `n`
 */

function writtenNumber(n, options) {
  options = options || {};
  options = util.defaults(options, writtenNumber.defaults);

  if (n < 0) {
    return '';
  }

  n = Math.round(+n);

  let language = typeof options.lang === 'string'
    ? i18n[options.lang]
    : options.lang;
  let scale = language.useLongScale ? longScale : shortScale;
  let { units } = language;
  let unit;

  if (!(units instanceof Array)) {
    const rawUnits = units;

    units = [];
    scale = Object.keys(rawUnits);

    for (const i in scale) {
      units.push(rawUnits[scale[i]]);
      scale[i] = Math.pow(10, parseInt(scale[i]));
    }
  }

  if (!language) {
    if (languages.indexOf(writtenNumber.defaults.lang) < 0) {
      writtenNumber.defaults.lang = 'en';
    }

    language = i18n[writtenNumber.defaults.lang];
  }

  const baseCardinals = language.base;

  if (language.unitExceptions[n]) return language.unitExceptions[n];
  if (baseCardinals[n]) return baseCardinals[n];
  if (n < 100) { return handleSmallerThan100(n, language, unit, baseCardinals, options); }

  const m = n % 100;
  let ret = [];

  if (m) {
    if (
      options.noAnd &&
      !(language.andException && language.andException[10])
    ) {
      ret.push(writtenNumber(m, options));
    } else if (language.oneException && m === 1) {
      ret.push(`${language.unitSeparator}${language.oneException}`);
    } else {
      ret.push(language.unitSeparator + writtenNumber(m, options));
    }
  }

  let firstSignificant;
  const { noSpaces } = language;

  for (let i = 0, len = units.length; i < len; i++) {
    let r = Math.floor(n / scale[i]);
    let divideBy;

    if (i === len - 1) divideBy = 1000000;
    else divideBy = scale[i + 1] / scale[i];

    r %= divideBy;

    unit = units[i];

    if (!r) continue;
    firstSignificant = scale[i];

    if (unit.useBaseInstead) {
      const shouldUseBaseException =
        unit.useBaseException.indexOf(r) > -1 &&
        (unit.useBaseExceptionWhenNoTrailingNumbers
          ? i === 0 && ret.length
          : true);
      if (!shouldUseBaseException) {
        ret.push(baseCardinals[r * scale[i]]);
      } else {
        ret.push(r > 1 && unit.plural ? unit.plural : unit.singular);
      }
      continue;
    }

    let str;
    if (typeof unit === 'string') {
      str = unit;
    } else {
      str = r > 1 && unit.plural && (!unit.avoidInNumberPlural || !m)
        ? unit.plural
        : unit.singular;
    }

    if (
      unit.avoidPrefixException &&
      unit.avoidPrefixException.indexOf(r) > -1
    ) {
      ret.push(str);
      continue;
    }

    const exception = language.unitExceptions[r];
    const number =
      exception ||
      writtenNumber(
        r,
        util.defaults(
          {
            // Languages with and exceptions need to set `noAnd` to false
            noAnd: !((language.andException && language.andException[r]) ||
              unit.andException) && true,
          },
          options,
        ),
      );
    n -= r * scale[i];
    noSpaces ? ret.push(`${number}${str}`) : ret.push(`${number} ${str}`);
  }

  const firstSignificantN = firstSignificant * Math.floor(n / firstSignificant);
  const rest = n - firstSignificantN;

  if (
    language.andWhenTrailing &&
    firstSignificant &&
    rest > 0 &&
    ret[0].indexOf(language.unitSeparator) !== 0
  ) {
    ret = [ret[0], language.unitSeparator.replace(/\s+$/, '')].concat(ret.slice(1));
  }

  return noSpaces ? ret.reverse().join('') : ret.reverse().join(' ');
}

function handleSmallerThan100(n, language, unit, baseCardinals, options) {
  const dec = Math.floor(n / 10) * 10;
  unit = n - dec;
  if (unit) {
    return (
      baseCardinals[dec] + language.baseSeparator + writtenNumber(unit, options)
    );
  }
  return baseCardinals[dec];
}
