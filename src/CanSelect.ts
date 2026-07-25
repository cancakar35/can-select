import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';
import type { SelectPickerSettings } from './models/select-picker-settings';

import './style.css';

interface SelectPickerOption {
  index: number;
  text: string;
  option: HTMLOptionElement;
}

export class CanSelect {
  private readonly select: HTMLSelectElement;
  private readonly settings: Required<SelectPickerSettings>;
  private readonly isMultiple: boolean;
  private readonly selectPlaceholder: string;
  private readonly idBase: string;
  private readonly listId: string;
  private readonly selectedOptionClasses: string[];

  private readonly allOptions: SelectPickerOption[];

  private readonly wrapper: HTMLDivElement;
  private readonly button: HTMLDivElement;
  private readonly text: HTMLSpanElement;
  private readonly dropdown: HTMLDivElement;
  private readonly search: HTMLInputElement;
  private readonly list: HTMLUListElement;

  private activeIndex = -1;
  private visibleOptions: { row: HTMLDivElement; option: HTMLOptionElement }[] = [];
  private cleanup: (() => void) | null = null;
  private observer: MutationObserver | null = null;

  static defaultSettings: Required<SelectPickerSettings> = {
    emptyText: 'Nothing Selected',
    selectedCountText: 'Selected',
    wrapperClass: 'can-select-wrapper',
    buttonClass: 'can-select-button',
    buttonPlaceholderClass: 'can-select-button-placeholder',
    dropdownClass: 'can-select-dropdown',
    searchWrapperClass: 'can-select-search-wrapper',
    searchInputClass: 'can-select-search-input',
    searchInputPlaceholder: 'Search..',
    listBoxClass: 'can-select-listbox',
    optionClass: 'can-select-option',
    tickClass: 'can-select-tick',
    tickContent: '✓',
    tickHiddenClass: '',
    selectedOptionClass: 'can-select-option-selected',
  };

  private static instanceCount = 0;

  constructor(selectElement: HTMLSelectElement, settings: Partial<SelectPickerSettings> = {}) {
    const instCount = CanSelect.instanceCount++;

    this.select = selectElement;
    this.settings = { ...CanSelect.defaultSettings, ...settings };
    this.isMultiple = selectElement.hasAttribute('multiple');
    this.selectPlaceholder = selectElement.dataset.placeholder ?? this.settings.emptyText;
    this.idBase = `can-sp-${instCount}-${Date.now()}`;
    this.listId = `${this.idBase}-listbox`;
    this.selectedOptionClasses = this.settings.selectedOptionClass.trim().split(/\s+/);

    this.allOptions = Array.from(selectElement.options)
      .filter((o) => o.value)
      .map((opt, i) => ({ index: i, text: opt.text, option: opt }));

    this.wrapper = this.createWrapper();
    this.button = this.createButton();
    this.text = this.createButtonText();
    this.dropdown = this.createDropdown();
    this.search = this.createSearch();
    this.list = this.createList();

    this.mount();
    this.bindEvents();
    this.renderOptions(this.allOptions);
    this.updateText();
  }

  private createWrapper(): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.className = this.settings.wrapperClass;
    return wrapper;
  }

  private createButton(): HTMLDivElement {
    const button = document.createElement('div');
    button.className = this.settings.buttonClass;
    button.tabIndex = 0;
    button.role = 'combobox';
    button.ariaHasPopup = 'listbox';
    button.ariaExpanded = 'false';
    button.ariaMultiSelectable = this.isMultiple ? 'true' : 'false';
    button.setAttribute('aria-controls', this.listId);
    return button;
  }

  private createButtonText(): HTMLSpanElement {
    const text = document.createElement('span');
    text.className = this.settings.buttonPlaceholderClass;
    text.textContent = this.selectPlaceholder;
    return text;
  }

  private createDropdown(): HTMLDivElement {
    const dropdown = document.createElement('div');
    dropdown.className = this.settings.dropdownClass;
    dropdown.id = this.listId;
    dropdown.role = 'listbox';
    dropdown.ariaMultiSelectable = this.isMultiple ? 'true' : 'false';
    dropdown.popover = 'manual';
    return dropdown;
  }

  private createSearch(): HTMLInputElement {
    const search = document.createElement('input');
    search.type = 'search';
    search.role = 'searchbox';
    search.autocomplete = 'off';
    search.className = this.settings.searchInputClass;
    search.placeholder = this.settings.searchInputPlaceholder;
    search.id = `${this.idBase}-searchbox`;
    return search;
  }

  private createList(): HTMLUListElement {
    const list = document.createElement('ul');
    list.className = this.settings.listBoxClass;
    return list;
  }

  open(focusTarget: 'search' | 'list' = 'search'): void {
    if (this.dropdown.matches(':popover-open')) return;

    this.dropdown.showPopover();
    this.button.ariaExpanded = 'true';

    this.positionDropdown();
    this.cleanup = autoUpdate(this.button, this.dropdown, () => this.positionDropdown());

    setTimeout(() => {
      if (focusTarget === 'search') {
        this.search.focus();
        return;
      }

      if (this.visibleOptions.length) {
        this.activeIndex = 0;
        const first = this.visibleOptions[0].row;
        first.tabIndex = 0;
        first.focus();
        this.button.setAttribute('aria-activedescendant', first.id);
      }
    }, 0);
  }

  close(): void {
    if (!this.dropdown.matches(':popover-open')) return;

    this.dropdown.hidePopover();
    this.button.ariaExpanded = 'false';
    this.activeIndex = -1;
    this.button.removeAttribute('aria-activedescendant');

    if (this.cleanup) {
      this.cleanup();
      this.cleanup = null;
    }
  }

  destroy(): void {
    this.close();
    this.wrapper.remove();
    this.dropdown.remove();
    this.select.classList.remove('hidden');
    delete this.select.dataset.isCanSelect;
    this.observer?.disconnect();
  }

  private mount(): void {
    const searchWrap = document.createElement('div');
    searchWrap.className = this.settings.searchWrapperClass;
    searchWrap.appendChild(this.search);

    this.dropdown.append(searchWrap, this.list);
    this.button.appendChild(this.text);
    this.wrapper.append(this.button, this.dropdown);

    this.select.classList.add('hidden');
    this.select.dataset.isCanSelect = 'true';
    this.select.after(this.wrapper);

    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node === this.select || node === this.wrapper) {
            this.destroy();
          }
        });
      });
    });

    this.observer.observe(this.select.parentElement!, { childList: true, subtree: true });
  }

  private renderOptions(data: SelectPickerOption[]) {
    this.list.innerHTML = '';
    this.visibleOptions = [];
    this.activeIndex = -1;

    data.forEach((item) => {
      const li = document.createElement('li');
      const row = document.createElement('div');
      row.className = this.settings.optionClass;
      row.tabIndex = -1;
      row.role = 'option';
      row.dataset.index = item.index.toString();
      row.id = `${this.idBase}-opt-${item.index}`;
      row.ariaSelected = item.option.selected ? 'true' : 'false';

      const label = document.createElement('span');
      label.textContent = item.text;

      const tick = document.createElement('span');
      tick.className = `${this.settings.tickHiddenClass} ${this.settings.tickClass}`;
      tick.textContent = this.settings.tickContent;

      row.append(label, tick);
      li.appendChild(row);
      this.list.appendChild(li);

      this.updateRowUI(row, item.option, tick);
      this.visibleOptions.push({ row, option: item.option });
    });

    if (this.visibleOptions.length) {
      this.visibleOptions[0].row.tabIndex = 0;
    }
  }

  private updateRowUI(
    row: HTMLDivElement,
    option: HTMLOptionElement,
    tick: HTMLSpanElement | null
  ): void {
    if (option.selected) {
      row.classList.add(...this.selectedOptionClasses);
      row.ariaSelected = 'true';
      if (this.settings.tickHiddenClass) {
        tick?.classList.remove(this.settings.tickHiddenClass);
      }
    } else {
      row.classList.remove(...this.selectedOptionClasses);
      row.ariaSelected = 'false';
      if (this.settings.tickHiddenClass) {
        tick?.classList.add(this.settings.tickHiddenClass);
      }
    }
  }

  private syncUI() {
    this.visibleOptions.forEach(({ row, option }) => {
      const tick = row.querySelector<HTMLSpanElement>('span:last-child');
      this.updateRowUI(row, option, tick);
    });
  }

  private async positionDropdown() {
    this.dropdown.style.width = `${this.button.offsetWidth}px`;

    const { x, y } = await computePosition(this.button, this.dropdown, {
      placement: 'bottom-start',
      strategy: 'fixed',
      middleware: [offset(4), flip(), shift({ padding: 8 })],
    });

    Object.assign(this.dropdown.style, {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
    });
  }

  private updateText() {
    const selected = Array.from(this.select.selectedOptions);

    if (!selected.length) {
      this.text.textContent = this.selectPlaceholder;
      return;
    }

    if (!this.isMultiple || selected.length === 1) {
      this.text.textContent = selected[0].text;
      return;
    }

    this.text.textContent = `${selected.length} ${this.settings.selectedCountText}`;
  }

  private moveActive(step: number): void {
    if (!this.visibleOptions.length) return;

    if (this.activeIndex >= 0) {
      this.visibleOptions[this.activeIndex].row.tabIndex = -1;
    }

    this.activeIndex += step;

    if (this.activeIndex < 0) this.activeIndex = this.visibleOptions.length - 1;
    if (this.activeIndex >= this.visibleOptions.length) this.activeIndex = 0;

    const active = this.visibleOptions[this.activeIndex];
    active.row.tabIndex = 0;
    active.row.focus();
    this.button.setAttribute('aria-activedescendant', active.row.id);
    active.row.scrollIntoView({ block: 'nearest' });
  }

  private toggleActive(): void {
    if (this.activeIndex < 0) return;

    const row = this.visibleOptions[this.activeIndex].row;
    row.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    if (this.isMultiple) {
      row.focus();
    } else {
      this.button.focus();
    }
  }

  private bindEvents() {
    this.button.addEventListener('click', (e) => {
      e.stopPropagation();

      if (this.dropdown.matches(':popover-open')) {
        this.close();
      } else {
        this.open('search');
      }
    });

    // Prevent popover dismiss on selection (for multiselect)
    this.dropdown.addEventListener('click', (e) => {
      if (this.isMultiple) {
        e.stopPropagation();
      }
    });

    // Handle popover toggle event to keep our state in sync
    this.dropdown.addEventListener('toggle', (e) => {
      if ((e as ToggleEvent).newState === 'closed') {
        this.button.ariaExpanded = 'false';
        this.activeIndex = -1;
        this.button.removeAttribute('aria-activedescendant');

        if (this.cleanup) {
          this.cleanup();
          this.cleanup = null;
        }
      }
    });

    document.addEventListener('click', (e) => {
      if (
        !this.wrapper.contains(e.target as HTMLElement) &&
        !this.dropdown.contains(e.target as HTMLElement)
      ) {
        this.close();
      }
    });

    this.button.addEventListener('keydown', (e) => {
      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          this.open('search');
          break;

        case 'ArrowDown':
          e.preventDefault();
          this.open('list');
          break;

        case 'ArrowUp':
          e.preventDefault();
          this.open('list');

          setTimeout(() => {
            if (this.visibleOptions.length) {
              this.activeIndex = this.visibleOptions.length - 1;

              this.moveActive(0);
            }
          }, 0);

          break;

        case 'Escape':
          this.close();
          break;
      }
    });

    this.list.addEventListener('keydown', (e) => {
      if (!this.dropdown.matches(':popover-open')) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this.moveActive(1);
          break;

        case 'ArrowUp':
          e.preventDefault();
          this.moveActive(-1);
          break;

        case ' ':
        case 'Enter':
          e.preventDefault();
          this.toggleActive();
          break;

        case 'Escape':
          e.preventDefault();
          this.close();
          this.button.focus();
          break;
      }
    });

    this.list.addEventListener('click', (e) => {
      const row = (e.target as HTMLElement).closest<HTMLElement>('[role="option"]');

      if (!row || !this.list.contains(row)) return;

      const index = Number(row.dataset.index);

      const option = this.select.options[index];

      if (!option) return;

      if (this.isMultiple) {
        option.selected = !option.selected;
      } else {
        Array.from(this.select.options).forEach((o) => (o.selected = false));

        option.selected = true;
      }

      this.syncUI();
      this.updateText();

      this.select.dispatchEvent(new Event('change'));

      if (!this.isMultiple) this.close();
    });

    this.search.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();

        if (this.visibleOptions.length) {
          this.activeIndex = 0;

          this.moveActive(0);
        }
      }

      if (e.key === 'Escape') {
        e.preventDefault();

        this.close();
        this.button.focus();
      }
    });

    this.search.addEventListener('input', () => {
      const q = this.search.value.toLocaleLowerCase();

      const filtered = this.allOptions.filter((o) => o.text.toLocaleLowerCase().includes(q));

      this.renderOptions(filtered);
    });
  }
}
