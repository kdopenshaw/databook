import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  ListsToggle,
  Separator,
} from '@mdxeditor/editor';
import * as Toolbar from '@radix-ui/react-toolbar';
import type { FloatingUIComponentProps } from '@mdxeditor/floating-selection-ui-plugin';

export function MarkdownSelectionToolbar(_props: FloatingUIComponentProps) {
  return (
    <Toolbar.Root
      className="dbk-mdx-popover"
      aria-label="Text formatting"
      onMouseDown={(e) => e.preventDefault()}
    >
      <BlockTypeSelect />
      <Separator />
      <BoldItalicUnderlineToggles />
      <CodeToggle />
      <Separator />
      <ListsToggle options={['bullet', 'number']} />
      <Separator />
      <CreateLink />
    </Toolbar.Root>
  );
}
