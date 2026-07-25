import { CanSelect } from '../src/CanSelect';

const singleSelectEl = document.querySelector<HTMLSelectElement>('#testSinglePicker')!;
const multiSelectEl = document.querySelector<HTMLSelectElement>('#testMultiplePicker')!;

new CanSelect(singleSelectEl);
new CanSelect(multiSelectEl);
