/**
 *  Copyright (c) 2015, Facebook, Inc.
 *  All rights reserved.
 *
 *  This source code is licensed under the BSD-style license found in the
 *  LICENSE file in the root directory of this source tree. An additional grant
 *  of patent rights can be found in the PATENTS file in the same directory.
 */

import { describe, it } from 'mocha';
import { expectPassesRule, expectFailsRule } from './harness';
import NoUndefinedVariables from '../rules/NoUndefinedVariables';
import {
  undefinedVarMessage,
  undefinedVarByOpMessage,
} from '../errors';



function undefVar(varName, line, column) {
  return {
    message: undefinedVarMessage(varName),
    locations: [ { line: line, column: column } ],
  };
}

function undefVarByOp(varName, l1, c1, opName, l2, c2) {
  return {
    message: undefinedVarByOpMessage(varName, opName),
    locations: [ { line: l1, column: c1 }, { line: l2, column: c2 } ],
  };
}

describe('Validate: No undefined variables', () => {

  it('all variables defined', () => {
    expectPassesRule(NoUndefinedVariables, `
      query Foo($a: String, $b: String, $c: String) {
        field(a: $a, b: $b, c: $c)
      }
    `);
  });

  it('all variables deeply defined', () => {
    expectPassesRule(NoUndefinedVariables, `
      query Foo($a: String, $b: String, $c: String) {
        field(a: $a) {
          field(b: $b) {
            field(c: $c)
          }
        }
      }
    `);
  });

  it('all variables deeply in inline fragments defined', () => {
    expectPassesRule(NoUndefinedVariables, `
      query Foo($a: String, $b: String, $c: String) {
        ... on Type {
          field(a: $a) {
            field(b: $b) {
              ... on Type {
                field(c: $c)
              }
            }
          }
        }
      }
    `);
  });

  it('all variables in fragments deeply defined', () => {
    expectPassesRule(NoUndefinedVariables, `
      query Foo($a: String, $b: String, $c: String) {
        ...FragA
      }
      fragment FragA on Type {
        field(a: $a) {
          ...FragB
        }
      }
      fragment FragB on Type {
        field(b: $b) {
          ...FragC
        }
      }
      fragment FragC on Type {
        field(c: $c)
      }
    `);
  });

  it('variable within single fragment defined in multiple operations', () => {
    expectPassesRule(NoUndefinedVariables, `
      query Foo($a: String) {
        ...FragA
      }
      query Bar($a: String) {
        ...FragA
      }
      fragment FragA on Type {
        field(a: $a)
      }
    `);
  });

  it('variable within fragments defined in operations', () => {
    expectPassesRule(NoUndefinedVariables, `
      query Foo($a: String) {
        ...FragA
      }
      query Bar($b: String) {
        ...FragB
      }
      fragment FragA on Type {
        field(a: $a)
      }
      fragment FragB on Type {
        field(b: $b)
      }
    `);
  });

  it('variable within recursive fragment defined', () => {
    expectPassesRule(NoUndefinedVariables, `
      query Foo($a: String) {
        ...FragA
      }
      fragment FragA on Type {
        field(a: $a) {
          ...FragA
        }
      }
    `);
  });

  it('variable not defined', () => {
    expectFailsRule(NoUndefinedVariables, `
      query Foo($a: String, $b: String, $c: String) {
        field(a: $a, b: $b, c: $c, d: $d)
      }
    `, [
      undefVar('d', 3, 39)
    ]);
  });

  it('variable not defined by un-named query', () => {
    expectFailsRule(NoUndefinedVariables, `
      {
        field(a: $a)
      }
    `, [
      undefVar('a', 3, 18)
    ]);
  });

  it('multiple variables not defined', () => {
    expectFailsRule(NoUndefinedVariables, `
      query Foo($b: String) {
        field(a: $a, b: $b, c: $c)
      }
    `, [
      undefVar('a', 3, 18),
      undefVar('c', 3, 32)
    ]);
  });

  it('variable in fragment not defined by un-named query', () => {
    expectFailsRule(NoUndefinedVariables, `
      {
        ...FragA
      }
      fragment FragA on Type {
        field(a: $a)
      }
    `, [
      undefVar('a', 6, 18)
    ]);
  });

  it('variable in fragment not defined by operation', () => {
    expectFailsRule(NoUndefinedVariables, `
      query Foo($a: String, $b: String) {
        ...FragA
      }
      fragment FragA on Type {
        field(a: $a) {
          ...FragB
        }
      }
      fragment FragB on Type {
        field(b: $b) {
          ...FragC
        }
      }
      fragment FragC on Type {
        field(c: $c)
      }
    `, [
      undefVarByOp('c', 16, 18, 'Foo', 2, 7)
    ]);
  });

  it('multiple variables in fragments not defined', () => {
    expectFailsRule(NoUndefinedVariables, `
      query Foo($b: String) {
        ...FragA
      }
      fragment FragA on Type {
        field(a: $a) {
          ...FragB
        }
      }
      fragment FragB on Type {
        field(b: $b) {
          ...FragC
        }
      }
      fragment FragC on Type {
        field(c: $c)
      }
    `, [
      undefVarByOp('a', 6, 18, 'Foo', 2, 7),
      undefVarByOp('c', 16, 18, 'Foo', 2, 7)
    ]);
  });

  it('single variable in fragment not defined by multiple operations', () => {
    expectFailsRule(NoUndefinedVariables, `
      query Foo($a: String) {
        ...FragAB
      }
      query Bar($a: String) {
        ...FragAB
      }
      fragment FragAB on Type {
        field(a: $a, b: $b)
      }
    `, [
      undefVarByOp('b', 9, 25, 'Foo', 2, 7),
      undefVarByOp('b', 9, 25, 'Bar', 5, 7)
    ]);
  });

  it('variables in fragment not defined by multiple operations', () => {
    expectFailsRule(NoUndefinedVariables, `
      query Foo($b: String) {
        ...FragAB
      }
      query Bar($a: String) {
        ...FragAB
      }
      fragment FragAB on Type {
        field(a: $a, b: $b)
      }
    `, [
      undefVarByOp('a', 9, 18, 'Foo', 2, 7),
      undefVarByOp('b', 9, 25, 'Bar', 5, 7)
    ]);
  });

  it('variable in fragment used by other operation', () => {
    expectFailsRule(NoUndefinedVariables, `
      query Foo($b: String) {
        ...FragA
      }
      query Bar($a: String) {
        ...FragB
      }
      fragment FragA on Type {
        field(a: $a)
      }
      fragment FragB on Type {
        field(b: $b)
      }
    `, [
      undefVarByOp('a', 9, 18, 'Foo', 2, 7),
      undefVarByOp('b', 12, 18, 'Bar', 5, 7)
    ]);
  });

  it('multiple undefined variables produce multiple errors', () => {
    expectFailsRule(NoUndefinedVariables, `
      query Foo($b: String) {
        ...FragAB
      }
      query Bar($a: String) {
        ...FragAB
      }
      fragment FragAB on Type {
        field1(a: $a, b: $b)
        ...FragC
        field3(a: $a, b: $b)
      }
      fragment FragC on Type {
        field2(c: $c)
      }
    `, [
      undefVarByOp('a', 9, 19, 'Foo', 2, 7),
      undefVarByOp('c', 14, 19, 'Foo', 2, 7),
      undefVarByOp('a', 11, 19, 'Foo', 2, 7),
      undefVarByOp('b', 9, 26, 'Bar', 5, 7),
      undefVarByOp('c', 14, 19, 'Bar', 5, 7),
      undefVarByOp('b', 11, 26, 'Bar', 5, 7),
    ]);
  });

});
