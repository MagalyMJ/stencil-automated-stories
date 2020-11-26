import { newSpecPage } from '@stencil/core/testing';
import { MyButton } from '../my-button';

describe('my-button', () => {
  it('renders', async () => {
    const page = await newSpecPage({
      components: [MyButton],
      html: `<my-button></my-button>`,
    });
    expect(page.root).toEqualHtml(`
      <my-button>
        <mock:shadow-root>
          <slot></slot>
        </mock:shadow-root>
      </my-button>
    `);
  });
});
