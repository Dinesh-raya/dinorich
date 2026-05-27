#!/usr/bin/env node
// Pre-build check: skip codegen if schemas.ts already exists
const fs = require('fs');
const path = require('path');

const schemasPath = path.join(__dirname, '..', 'types', 'generated', 'schemas.ts');
if (fs.existsSync(schemasPath)) {
  console.log('schemas.ts exists, skipping codegen');
  process.exit(0);
} else {
  console.log('schemas.ts not found, running codegen...');
  process.exit(1);
}
