import { buildH776ParserAdapter } from './build-h776-parser-adapter.mjs';

export const DEFAULT_SOURCE_ADAPTERS = Object.freeze([
  Object.freeze({
    adapterId: 'h776-legacy-golden-v1',
    parserMode: 'legacy-golden-adapter',
    sourceIds: Object.freeze(['openscriptures-hebrewlexicon-bdb']),
    supports(input) {
      return input?.identity?.canonicalStrong === 'H776'
        && input?.goldenReference?.referenceCase === 'GEN-1-1-H776';
    },
    execute(input) {
      return buildH776ParserAdapter(input);
    },
  }),
]);
