import { newE2EPage } from '@stencil/core/testing';

describe('my-button', () => {
  it('renders', async () => {
    const page = await newE2EPage();
    await page.setContent('<my-button></my-button>');

    const element = await page.find('my-button');
    expect(element).toHaveClass('hydrated');
  });
});
