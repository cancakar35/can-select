# can-select ![Build](https://github.com/cancakar35/can-select/actions/workflows/ci.yml/badge.svg) ![NPM Version](https://img.shields.io/npm/v/%40cancakar%2Fcan-select?color=%23007EC6)

## Installation

**npm**
```bash
npm install @cancakar/can-select
```

**pnpm**
```bash
pnpm add @cancakar/can-select
```

**nuget (for .NET projects)**

....



#### ESM
```javascript
import CanSelect from '@cancakar/can-select';
```

#### Browser

```html
<link rel="stylesheet" href="can-select.css">

<script src="can-select.umd.js"></script>
```

## Usage

- Via `can-select-picker` class

```html
<select class="can-select-picker">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

- Via JavaScript

```javascript
const mySelectElement = document.getElementById('mySelectElementId');
new CanSelect(mySelectElement);
```
