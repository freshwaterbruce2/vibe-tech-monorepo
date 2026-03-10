// Type definitions for @testing-library/react
declare module '@testing-library/react' {
  import { ReactElement } from 'react';

  export interface RenderOptions {
    container?: HTMLElement;
    baseElement?: HTMLElement;
    hydrate?: boolean;
    wrapper?: React.ComponentType<any>;
    queries?: any;
  }

  export interface RenderResult {
    container: HTMLElement;
    baseElement: HTMLElement;
    debug: (element?: HTMLElement) => void;
    rerender: (ui: ReactElement) => void;
    unmount: () => void;
    asFragment: () => DocumentFragment;
    getByRole: (role: string, options?: any) => HTMLElement;
    getByLabelText: (text: string | RegExp, options?: any) => HTMLElement;
    getByPlaceholderText: (text: string | RegExp, options?: any) => HTMLElement;
    getByText: (text: string | RegExp, options?: any) => HTMLElement;
    getByDisplayValue: (value: string | RegExp, options?: any) => HTMLElement;
    getByAltText: (text: string | RegExp, options?: any) => HTMLElement;
    getByTitle: (title: string | RegExp, options?: any) => HTMLElement;
    getByTestId: (testId: string, options?: any) => HTMLElement;
    getAllByRole: (role: string, options?: any) => HTMLElement[];
    getAllByLabelText: (text: string | RegExp, options?: any) => HTMLElement[];
    getAllByPlaceholderText: (text: string | RegExp, options?: any) => HTMLElement[];
    getAllByText: (text: string | RegExp, options?: any) => HTMLElement[];
    getAllByDisplayValue: (value: string | RegExp, options?: any) => HTMLElement[];
    getAllByAltText: (text: string | RegExp, options?: any) => HTMLElement[];
    getAllByTitle: (title: string | RegExp, options?: any) => HTMLElement[];
    getAllByTestId: (testId: string, options?: any) => HTMLElement[];
    queryByRole: (role: string, options?: any) => HTMLElement | null;
    queryByLabelText: (text: string | RegExp, options?: any) => HTMLElement | null;
    queryByPlaceholderText: (text: string | RegExp, options?: any) => HTMLElement | null;
    queryByText: (text: string | RegExp, options?: any) => HTMLElement | null;
    queryByDisplayValue: (value: string | RegExp, options?: any) => HTMLElement | null;
    queryByAltText: (text: string | RegExp, options?: any) => HTMLElement | null;
    queryByTitle: (title: string | RegExp, options?: any) => HTMLElement | null;
    queryByTestId: (testId: string, options?: any) => HTMLElement | null;
    queryAllByRole: (role: string, options?: any) => HTMLElement[];
    queryAllByLabelText: (text: string | RegExp, options?: any) => HTMLElement[];
    queryAllByPlaceholderText: (text: string | RegExp, options?: any) => HTMLElement[];
    queryAllByText: (text: string | RegExp, options?: any) => HTMLElement[];
    queryAllByDisplayValue: (value: string | RegExp, options?: any) => HTMLElement[];
    queryAllByAltText: (text: string | RegExp, options?: any) => HTMLElement[];
    queryAllByTitle: (title: string | RegExp, options?: any) => HTMLElement[];
    queryAllByTestId: (testId: string, options?: any) => HTMLElement[];
    findByRole: (role: string, options?: any) => Promise<HTMLElement>;
    findByLabelText: (text: string | RegExp, options?: any) => Promise<HTMLElement>;
    findByPlaceholderText: (text: string | RegExp, options?: any) => Promise<HTMLElement>;
    findByText: (text: string | RegExp, options?: any) => Promise<HTMLElement>;
    findByDisplayValue: (value: string | RegExp, options?: any) => Promise<HTMLElement>;
    findByAltText: (text: string | RegExp, options?: any) => Promise<HTMLElement>;
    findByTitle: (title: string | RegExp, options?: any) => Promise<HTMLElement>;
    findByTestId: (testId: string, options?: any) => Promise<HTMLElement>;
    findAllByRole: (role: string, options?: any) => Promise<HTMLElement[]>;
    findAllByLabelText: (text: string | RegExp, options?: any) => Promise<HTMLElement[]>;
    findAllByPlaceholderText: (text: string | RegExp, options?: any) => Promise<HTMLElement[]>;
    findAllByText: (text: string | RegExp, options?: any) => Promise<HTMLElement[]>;
    findAllByDisplayValue: (value: string | RegExp, options?: any) => Promise<HTMLElement[]>;
    findAllByAltText: (text: string | RegExp, options?: any) => Promise<HTMLElement[]>;
    findAllByTitle: (title: string | RegExp, options?: any) => Promise<HTMLElement[]>;
    findAllByTestId: (testId: string, options?: any) => Promise<HTMLElement[]>;
  }

  export function render(ui: ReactElement, options?: RenderOptions): RenderResult;
  export function cleanup(): void;
  export function act(callback: () => void | Promise<void>): Promise<void>;

  // renderHook for testing hooks
  export interface RenderHookOptions<P = any> {
    initialProps?: P;
    wrapper?: React.ComponentType<any>;
  }

  export interface RenderHookResult<R, P = any> {
    result: { current: R };
    rerender: (newProps?: P) => void;
    unmount: () => void;
  }

  export function renderHook<R, P = any>(
    callback: (props: P) => R,
    options?: RenderHookOptions<P>
  ): RenderHookResult<R, P>;

  // Query functions
  export const screen: {
    getByRole: (role: string, options?: any) => HTMLElement;
    getByLabelText: (text: string | RegExp, options?: any) => HTMLElement;
    getByPlaceholderText: (text: string | RegExp, options?: any) => HTMLElement;
    getByText: (text: string | RegExp, options?: any) => HTMLElement;
    getByDisplayValue: (value: string | RegExp, options?: any) => HTMLElement;
    getByAltText: (text: string | RegExp, options?: any) => HTMLElement;
    getByTitle: (title: string | RegExp, options?: any) => HTMLElement;
    getByTestId: (testId: string, options?: any) => HTMLElement;
    getAllByRole: (role: string, options?: any) => HTMLElement[];
    getAllByLabelText: (text: string | RegExp, options?: any) => HTMLElement[];
    getAllByPlaceholderText: (text: string | RegExp, options?: any) => HTMLElement[];
    getAllByText: (text: string | RegExp, options?: any) => HTMLElement[];
    getAllByDisplayValue: (value: string | RegExp, options?: any) => HTMLElement[];
    getAllByAltText: (text: string | RegExp, options?: any) => HTMLElement[];
    getAllByTitle: (title: string | RegExp, options?: any) => HTMLElement[];
    getAllByTestId: (testId: string, options?: any) => HTMLElement[];
    queryByRole: (role: string, options?: any) => HTMLElement | null;
    queryByLabelText: (text: string | RegExp, options?: any) => HTMLElement | null;
    queryByPlaceholderText: (text: string | RegExp, options?: any) => HTMLElement | null;
    queryByText: (text: string | RegExp, options?: any) => HTMLElement | null;
    queryByDisplayValue: (value: string | RegExp, options?: any) => HTMLElement | null;
    queryByAltText: (text: string | RegExp, options?: any) => HTMLElement | null;
    queryByTitle: (title: string | RegExp, options?: any) => HTMLElement | null;
    queryByTestId: (testId: string, options?: any) => HTMLElement | null;
    queryAllByRole: (role: string, options?: any) => HTMLElement[];
    queryAllByLabelText: (text: string | RegExp, options?: any) => HTMLElement[];
    queryAllByPlaceholderText: (text: string | RegExp, options?: any) => HTMLElement[];
    queryAllByText: (text: string | RegExp, options?: any) => HTMLElement[];
    queryAllByDisplayValue: (value: string | RegExp, options?: any) => HTMLElement[];
    queryAllByAltText: (text: string | RegExp, options?: any) => HTMLElement[];
    queryAllByTitle: (title: string | RegExp, options?: any) => HTMLElement[];
    queryAllByTestId: (testId: string, options?: any) => HTMLElement[];
    findByRole: (role: string, options?: any) => Promise<HTMLElement>;
    findByLabelText: (text: string | RegExp, options?: any) => Promise<HTMLElement>;
    findByPlaceholderText: (text: string | RegExp, options?: any) => Promise<HTMLElement>;
    findByText: (text: string | RegExp, options?: any) => Promise<HTMLElement>;
    findByDisplayValue: (value: string | RegExp, options?: any) => Promise<HTMLElement>;
    findByAltText: (text: string | RegExp, options?: any) => Promise<HTMLElement>;
    findByTitle: (title: string | RegExp, options?: any) => Promise<HTMLElement>;
    findByTestId: (testId: string, options?: any) => Promise<HTMLElement>;
    findAllByRole: (role: string, options?: any) => Promise<HTMLElement[]>;
    findAllByLabelText: (text: string | RegExp, options?: any) => Promise<HTMLElement[]>;
    findAllByPlaceholderText: (text: string | RegExp, options?: any) => Promise<HTMLElement[]>;
    findAllByText: (text: string | RegExp, options?: any) => Promise<HTMLElement[]>;
    findAllByDisplayValue: (value: string | RegExp, options?: any) => Promise<HTMLElement[]>;
    findAllByAltText: (text: string | RegExp, options?: any) => Promise<HTMLElement[]>;
    findAllByTitle: (title: string | RegExp, options?: any) => Promise<HTMLElement[]>;
    findAllByTestId: (testId: string, options?: any) => Promise<HTMLElement[]>;
  };


  // FireEvent
  export const fireEvent: {
    click: (element: Element) => void;
    change: (element: Element, options?: { target: { value: any } }) => void;
    input: (element: Element, options?: { target: { value: any } }) => void;
    keyDown: (element: Element, options?: { key: string; code?: string; keyCode?: number }) => void;
    keyUp: (element: Element, options?: { key: string; code?: string; keyCode?: number }) => void;
    keyPress: (element: Element, options?: { key: string; code?: string; keyCode?: number }) => void;
    mouseDown: (element: Element) => void;
    mouseUp: (element: Element) => void;
    mouseEnter: (element: Element) => void;
    mouseLeave: (element: Element) => void;
    mouseOver: (element: Element) => void;
    mouseOut: (element: Element) => void;
    submit: (element: Element) => void;
    focus: (element: Element) => void;
    blur: (element: Element) => void;
    scroll: (element: Element) => void;
    load: (element: Element) => void;
    error: (element: Element) => void;
    touchStart: (element: Element, options?: any) => void;
    touchEnd: (element: Element, options?: any) => void;
    touchMove: (element: Element, options?: any) => void;
    touchCancel: (element: Element, options?: any) => void;
    contextMenu: (element: Element) => void;
    doubleClick: (element: Element) => void;
    dragStart: (element: Element) => void;
    dragEnd: (element: Element) => void;
    drop: (element: Element) => void;
  };

  export function waitFor<T>(
    callback: () => T | Promise<T>,
    options?: { timeout?: number; interval?: number }
  ): Promise<T>;

  export function waitForElementToBeRemoved<T>(
    callback: (() => T) | T,
    options?: { timeout?: number; interval?: number }
  ): Promise<void>;
}

// Type definitions for @testing-library/user-event
declare module '@testing-library/user-event' {
  export interface UserEvent {
    click(element: Element): Promise<void>;
    dblClick(element: Element): Promise<void>;
    type(element: Element, text: string, options?: any): Promise<void>;
    clear(element: Element): Promise<void>;
    tab(options?: { shift?: boolean }): Promise<void>;
    hover(element: Element): Promise<void>;
    unhover(element: Element): Promise<void>;
    upload(element: Element, file: File | File[]): Promise<void>;
    selectOptions(element: Element, values: string | string[]): Promise<void>;
    deselectOptions(element: Element, values: string | string[]): Promise<void>;
    keyboard(text: string): Promise<void>;
    pointer(actions: any): Promise<void>;
    setup(options?: any): UserEvent;
  }

  const userEvent: UserEvent & {
    setup: (options?: any) => UserEvent;
  };

  export default userEvent;
}