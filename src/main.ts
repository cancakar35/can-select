import { CanSelect } from './CanSelect';

document.addEventListener('DOMContentLoaded', function () {
  Array.from(document.querySelectorAll<HTMLSelectElement>('select.can-select-picker'))
    .filter((el) => !el.dataset.isCanSelect)
    .map((el) => new CanSelect(el));
});

export default CanSelect;
