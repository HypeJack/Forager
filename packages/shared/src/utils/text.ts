import { compile } from 'html-to-text';

const converter = compile({
  wordwrap: false,
  selectors: [
    { selector: 'a', options: { ignoreHref: true } },
    { selector: 'img', format: 'skip' }, // optional: skip images entirely
  ]
});

export function htmlToPlainText(input?: string): string {
  if (!input) return "";
  return converter(input).trim();
}
