import { htmlToPlainText } from "./packages/shared/src/utils/text.js";

function test() {
  const tests = [
    { input: "plain text", name: "Pass through" },
    { input: "<p>Hello&nbsp;world!</p><p>This is a test.</p>", name: "Paragraphs and entities" },
    { input: "Congress&amp;Bundestag&#39;s program", name: "Entities without tags" },
    { input: "Click <a href='https://example.com'>here</a>", name: "Links without brackets" },
    { input: "<p>Multiple&nbsp;&nbsp;&nbsp;spaces here</p><p>And a new paragraph.</p>", name: "Whitespace collapse" },
    { input: undefined, name: "Undefined input" },
  ];

  for (const t of tests) {
    console.log(`\n--- Test: ${t.name} ---`);
    console.log(`Input:  ${t.input}`);
    console.log(`Output: ${htmlToPlainText(t.input)}`);
  }
}
test();
