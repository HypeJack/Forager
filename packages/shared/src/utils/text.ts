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
  let text = converter(input);
  // replace non-breaking spaces with normal spaces
  text = text.replace(/\u00A0/g, ' ');
  // collapse horizontal spaces and tabs to single space
  text = text.replace(/[ \t]{2,}/g, ' ');
  // collapse 3+ consecutive newlines to 2
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}
// cache bust 1
