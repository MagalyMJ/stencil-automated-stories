import path from 'path';
import Case from 'case';
import { storiesOf } from '@storybook/html';

/**
 * Given a property (from stencil Component.properties) and an optional
 * controlOptions object generates a control which can be used to
 * dynamically update the properties of the component.
 */
function getControlForProp(prop, controlOptions) {
  let defaultVal = '';
  let control = {
    defaultValue: defaultVal,
    control: { type: 'text' },
  };

  // control options have to be defined using camelCase
  const propCamel = Case.camel(prop.attribute);
  const argsOption = controlOptions.args[propCamel] || controlOptions.args[prop.attribute];
  const argTypesOptions = controlOptions.argTypes[propCamel] || controlOptions.argTypes[prop.attribute];

  // if control options are defined, use those
  if (argTypesOptions) {
    control = argTypesOptions;
  }
  // otherwise, implicitly create controls based on prop type or attribute name
  else if (/^(?:number|boolean|object)$/i.test(prop.type)) {
    control = { control: { type: prop.type.toLowerCase() } };
  } else if (/^(?:string)$/i.test(prop.type)) {
    if (!/^(?:string|number|boolean|object)$/i.test(prop.complexType.original)) {
      const arrOptions = prop.complexType.original.split(' | ');
      const selectOptions = arrOptions.map(o => (o.match(/('(\w|-)+')/g) ? o.replace(/'|\|/gi, '').trim() : o));

      control = {
        control: {
          type: 'select',
          options: selectOptions,
        },
      };
    }
  } else if (prop.attribute.indexOf('date') !== -1) {
    control = {
      control: {
        type: 'date',
      },
    };
    defaultVal = new Date();
  }

  if (argsOption) {
    defaultVal = argsOption;
  } else if (prop.defaultValue) {
    try {
      defaultVal = prop.defaultValue;

      if (typeof defaultVal === 'string') {
        defaultVal =
          /('\w+')/g.test(defaultVal) || /('')/g.test(defaultVal) ? (/('')/g.test(defaultVal) ? 'Example Label' : defaultVal.replace(/'/gi, '')) : JSON.parse(defaultVal);
      }
    } catch (e) {
      defaultVal = typeof prop.defaultValue === 'string' ? prop.defaultValue : undefined;
    }
  }

  console.log('generating', prop.attribute, 'control with args:', defaultVal, control);

  // switch (type) {
  //   // controls returns UNIX timestamp for "date" type
  //   // and we need to convert it to ISO-8601
  //   case 'date':
  //     return new Date(val).toISOString();
  // }

  return { default: defaultVal, control: { ...control, defaultValue: defaultVal } };
}

/**
 * Given a stencil Component and control options, returns an dictionary of
 * all the properties and default values.
 */
function getPropsWithControlValues(Component, controlOptions) {
  let controls = { args: {}, argTypes: {} };
  Object.keys(Component.properties || {}).forEach(key => {
    const property = Component.properties[key];

    // normalize older "attr" into newer "attribute" property
    if (property.hasOwnProperty('attr')) {
      property.attribute = property.attr;
    }

    if (property.hasOwnProperty('attribute')) {
      const control = getControlForProp(property, controlOptions);
      controls = {
        args: { ...controls.args, [key]: control.default },
        argTypes: { ...controls.argTypes, [key]: control.control },
      };
    }
  });

  return controls;
}

/**
 * Template used to render a single stencil component. To use this template
 * do something like the following code snippet:
 *
 *   ```
 *   const container = document.createElement('div');
 *   const component = document.createElement('your-component');
 *   container.innerHTML = getStencilTemplate('Some Title', 'Some Description');
 *   container.querySelector('.placeholder').appendChild(component);
 *   ```
 */
function getStencilTemplate({ title, description }) {
  let template = `
          <div class="component-area">
              <h2>${title}</h2>
              ${description ? '<p>' + description + '</p>' : ''}
              <div class="placeholder">
                <!-- the component will be inserted here -->
              </div>
          </div>
      `;

  return template;
}

/**
 * Generates DOM nodes from states to render.
 */
function createNodes(el, elements) {
  if (elements && elements.length > 0) {
    elements.forEach(({ tag, innerText, props, children }) => {
      let childEl = document.createElement(tag);
      childEl.innerHTML = innerText;
      if (props) {
        Object.keys(props).forEach(prop => {
          if (props[prop]) {
            childEl.setAttribute(prop, props[prop]);
          } else {
            childEl.removeAttribute(prop);
          }
        });
      }
      createNodes(childEl, children);
      el.appendChild(childEl);
    });
  }
}

/**
 * Generates an interactive controls-enabled story for a stencil Component.
 * For any additional states, a static rendering is generated with
 * the given state (see existing components for examples).
 *
 * Example "states" array:
 *
 *   [{
 *     title: 'A title for this state',
 *     description: 'A description of why this state exists',
 *     props: {
 *        --- props to set on your component ---
 *     },
 *     children: [{
 *        tag: 'span',
 *        innerText: 'Lorem ipsum',
 *        children: []
 *     }]
 *   }]
 *
 * Example "argTypes(controls)" config:
 *
 *   {
 *     [propName]: {          // A decorated @Prop() on your component
 *        control: {
 *          type: 'color',       // The type of "control" to use in the controls panel
 *          description: 'desc'  // The description for the control
 *          [options]: [         // Options to set for the control built, it can be (options, min, max, step, sepaartor)
 *            '#ff99cc',         // Check the addon-controls documentation for more info
 *          ]
 *        }
 *     }
 *   }
 */
function createStencilStory({ Component, notes, states, args = {}, argTypes = {} }, stories) {
  // It is important that the main container element
  // is NOT created inside of the render function below!!
  const mainEl = document.createElement('div');
  const controls = getPropsWithControlValues(Component, { args, argTypes });
  const storyOpts = notes ? { notes, args: controls.args, argTypes: controls.argTypes } : { args: controls.args, argTypes: controls.argTypes };
  const tag = Component.is;

  // Clone the "states" array and add the default state first
  states = states && states.length ? states.slice(0) : [];
  states.unshift({
    title: 'Default state (use Controls below to edit props):',
    tag: Component.is,
    props: {},
    children: [{ tag: 'span', innerText: 'Default' }],
  });

  // Create the story with all of the states
  stories.add(
    Component.name,
    args => {
      mainEl.innerHTML = '';
      // First, add the controls-enabled props to the default state.
      // This MUST be done inside this render function!!
      states[0].props = { ...args };
      states[0].argTypes = controls.argTypes;

      // Next, render each state. Only the first one is interactive (with controls).
      // This is sort of a light-weight "chapters" addon because the community
      // "chapters" addon only works with react :/
      states.forEach(({ title, description, props, children }) => {
        const containerEl = document.createElement('div');
        const componentEl = document.createElement(String(tag));

        if (props) {
          Object.keys(props).forEach(prop => {
            const propKebab = Case.kebab(prop);
            if (props[prop]) {
              componentEl.setAttribute(propKebab, props[prop]);
            } else {
              componentEl.removeAttribute(propKebab);
            }
          });
        }

        if (children) {
          createNodes(componentEl, children);
        }

        containerEl.innerHTML = getStencilTemplate({
          title,
          description,
          tag,
          props,
          args,
          children,
        });

        containerEl.querySelector(`.placeholder`).appendChild(componentEl);
        mainEl.appendChild(containerEl);
      });

      return mainEl;
    },
    storyOpts,
  );
}

/**
 * Given a module, iterates over the exports and returns the first
 * one which looks like a stencil component (using duck typing).
 */
function getComponentFromExports(_module) {
  const key = Object.keys(_module).find(exportKey => {
    const _export = _module[exportKey];
    // does it quack like a stencil class component?
    if (_export.prototype && _export.is && _export.encapsulation) {
      return true;
    }
  });

  return _module[key];
}

/**
 * Cleans the notes, which should be in markdown format.
 * The markdown parser used by the notes addon is not the best, so
 * we have to fix some issues before rendering.
 */
function cleanNotes(notes) {
  if (notes) {
    // replaces "\|" with "` `" so property tables to break
    return notes.replace(/\\\|/g, '` `');
  }
}

// Gets all stories and check for specific configuration to add to each story
function buildGeneratorConfigs(componentsCtx, storiesCtx) {
  const componentRoutes = componentsCtx.keys();
  const storyRoutes = storiesCtx.keys();

  return componentRoutes.reduce((obj, compRoute) => {
    const _module = componentsCtx(compRoute);
    const Component = getComponentFromExports(_module);
    const dirName = '/' + path.basename(path.dirname(compRoute)) + '/';
    const storyRoute = storyRoutes.find(k => k.indexOf(dirName) > -1);

    if (!Component) {
      console.warn(`Couldn't load component ${compRoute}`);
      return obj;
    }

    if (storyRoute) {
      const _export = storiesCtx(storyRoute).default;

      // If the default export is a function, then that function should
      // be used to create the story. It will be passed the "stories" object
      // where it should call stories.add(...) manually.
      if (typeof _export === 'function') {
        return Object.assign(obj, {
          [Component.name]: _export,
        });
      }

      return Object.assign(obj, {
        [Component.name]: {
          Component,
          states: _export.states,
          args: _export.args,
          argTypes: _export.argTypes,
          notes: cleanNotes(_export.notes),
        },
      });
    }

    return Object.assign(obj, {
      [Component.name]: {
        Component,
      },
    });
  }, {});
}

/**
 * Iterates all of the stencil contexts and build a "config" object
 * which is used to generate the individual stories.
 */
function buildStencilStories(name, componentsCtx, storiesCtx) {
  const configs = buildGeneratorConfigs(componentsCtx, storiesCtx);

  const stories = storiesOf(name, module);

  Object.keys(configs)
    .map(comp => configs[comp])
    .forEach(config =>
      typeof config === 'function'
        ? // If the config is a function, call it with the stories context.
          // The function is responsible for calling stories.add(...) manually.
          config(stories)
        : createStencilStory(config, stories),
    );
}

export default buildStencilStories;
