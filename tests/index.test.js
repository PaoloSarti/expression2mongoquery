'use strict'

const t = require('tap')
const expressionToMongoQueryCompiler = require('../index')

t.test('expressionToMongoQuery', t => {
  const tests = [
    {
      expression: 'a == 3',
      expected: { a: 3 }
    },
    {
      expression: '3 == a',
      expected: { a: 3 }
    },
    {
      expression: '(a == 3)',
      expected: { a: 3 }
    },
    {
      expression: '(((((a == 3)))))',
      expected: { a: 3 }
    },
    {
      expression: 'a == "ciao"',
      expected: { a: 'ciao' }
    },
    {
      expression: 'a == ["ciao"]',
      expected: { a: ['ciao'] }
    },
    {
      expression: 'a["b"] == "ciao"',
      expected: { 'a.b': 'ciao' }
    },
    {
      expression: 'a[1] == "ciao"',
      expected: { 'a.1': 'ciao' }
    },
    {
      expression: 'a["b"]["c"] == "ciao"',
      expected: { 'a.b.c': 'ciao' }
    },
    {
      expression: 'a.b == "ciao"',
      expected: { 'a.b': 'ciao' }
    },
    {
      expression: '"ciao" == a',
      expected: { a: 'ciao' }
    },
    {
      expression: 'a === 3',
      expected: { a: 3 }
    },
    {
      expression: '3 === a',
      expected: { a: 3 }
    },
    {
      expression: 'a < 3',
      expected: { a: { $lt: 3 } }
    },
    {
      expression: 'a.b < 3',
      expected: { 'a.b': { $lt: 3 } }
    },
    {
      expression: '3 < a',
      expected: { a: { $gt: 3 } }
    },
    {
      expression: '3 < a.b',
      expected: { 'a.b': { $gt: 3 } }
    },
    {
      expression: 'a > 3',
      expected: { a: { $gt: 3 } }
    },
    {
      expression: 'a.b > 3',
      expected: { 'a.b': { $gt: 3 } }
    },
    {
      expression: '3 > a',
      expected: { a: { $lt: 3 } }
    },
    {
      expression: '3 > a.b.c',
      expected: { 'a.b.c': { $lt: 3 } }
    },
    {
      expression: 'a <= 3',
      expected: { a: { $lte: 3 } }
    },
    {
      expression: '3 <= a',
      expected: { a: { $gte: 3 } }
    },
    {
      expression: 'a >= 3',
      expected: { a: { $gte: 3 } }
    },
    {
      expression: 'a == /^c.*$/i',
      expected: { a: /^c.*$/i }
    },
    {
      expression: 'a === /^c.*$/i',
      expected: { a: /^c.*$/i }
    },
    {
      expression: '/^c.*$/i == a',
      expected: { a: /^c.*$/i }
    },
    {
      expression: '/^c.*$/i === a',
      expected: { a: /^c.*$/i }
    },
    {
      expression: 'a <= 3',
      expected: { a: { $lte: 3 } }
    },
    {
      expression: 'a != 3',
      expected: { a: { $ne: 3 } }
    },
    {
      expression: 'a.b.c.d != 3',
      expected: { 'a.b.c.d': { $ne: 3 } }
    },
    {
      expression: '3 != a',
      expected: { a: { $ne: 3 } }
    },
    {
      expression: 'a == undefined',
      expected: { a: { $exists: false } }
    },
    {
      expression: 'a.b == undefined',
      expected: { 'a.b': { $exists: false } }
    },
    {
      expression: 'undefined == a',
      expected: { a: { $exists: false } }
    },
    {
      expression: 'undefined == a.b',
      expected: { 'a.b': { $exists: false } }
    },
    {
      expression: 'a === undefined',
      expected: { a: { $exists: false } }
    },
    {
      expression: 'undefined === a',
      expected: { a: { $exists: false } }
    },
    {
      expression: 'undefined === a.b',
      expected: { 'a.b': { $exists: false } }
    },
    {
      expression: 'a != undefined',
      expected: { a: { $exists: true } }
    },
    {
      expression: 'undefined != a',
      expected: { a: { $exists: true } }
    },
    {
      expression: 'undefined != a.b.c',
      expected: { 'a.b.c': { $exists: true } }
    },
    {
      expression: 'undefined !== a',
      expected: { a: { $exists: true } }
    },
    {
      expression: 'undefined !== a.b.c',
      expected: { 'a.b.c': { $exists: true } }
    },
    {
      expression: 'a !== undefined',
      expected: { a: { $exists: true } }
    },
    {
      expression: 'b in [2, 3, 4]',
      expected: { b: { $in: [2, 3, 4] } }
    },
    {
      expression: 'b.d in [2, 3, 4]',
      expected: { 'b.d': { $in: [2, 3, 4] } }
    },
    {
      expression: 'a === "ciao" && b === 3',
      expected: { a: 'ciao', b: 3 }
    },
    {
      expression: 'a > 3 && a < 45',
      expected: { $and: [ { a: { $gt: 3 } }, { a: { $lt: 45 } } ] }
    },
    {
      expression: 'a > 3 && a < 45 && b > 12',
      expected: { $and: [ { a: { $gt: 3 } }, { a: { $lt: 45 } } ], b: { $gt: 12 } }
    },
    {
      expression: 'a > 3 && (a < 45 && b > 12)',
      expected: { $and: [ { a: { $gt: 3 } }, { a: { $lt: 45 } } ], b: { $gt: 12 } }
    },
    {
      expression: 'a === "ciao" && (b === 3)',
      expected: { a: 'ciao', b: 3 }
    },
    {
      expression: 'a === "ciao" && ((((b === 3))))',
      expected: { a: 'ciao', b: 3 }
    },
    {
      expression: 'a == "value" && b > 42',
      expected: {
        a: 'value',
        b: {
          $gt: 42
        }
      }
    },
    {
      expression: 'a == "ciao" || (b === 3)',
      expected: { $or: [ { a: 'ciao' }, { b: 3 } ] }
    },
    {
      expression: 'a == "ciao" || (b.d.e === 3)',
      expected: { $or: [ { a: 'ciao' }, { 'b.d.e': 3 } ] }
    },
    {
      expression: 'a == "ciao" || (b > 3)',
      expected: { $or: [ { a: 'ciao' }, { b: { $gt: 3 } } ] }
    },
    {
      expression: 'a == "ciao" || !(b < 3)',
      expected: { $or: [ { a: 'ciao' }, { $not: { b: { $lt: 3 } } } ] }
    },
    {
      expression: 'a == "ciao" || (a == "wow" && d != "hei")',
      expected: { $or: [{ a: 'ciao' }, { a: 'wow', d: { $ne: 'hei' } }] }
    },
    {
      expression: 't == "ciao" || (t == "hei" && (userId != "paolo"))',
      expected: { $or: [{ t: 'ciao' }, { t: 'hei', userId: { $ne: 'paolo' } }] }
    },
    {
      expression: 't == "ciao" || b == "hei" || c === "hi"',
      expected: { $or: [{ t: 'ciao' }, { b: 'hei' }, { c: 'hi' }] }
    },
    {
      expression: 't == "ciao" || (t == "hei" || (userId != "paolo" && userId != undefined))',
      expected: {
        '$or': [
          {
            't': 'ciao'
          },
          {
            't': 'hei'
          },
          {
            '$and': [
              {
                'userId': {
                  '$ne': 'paolo'
                }
              },
              {
                'userId': {
                  '$exists': true
                }
              }
            ]
          }
        ]
      }
    },
    {
      expression: 'a',
      expectedError: Error('ResultIsAnInvalidMongoQuery')
    },
    {
      expression: '3',
      expectedError: Error('ResultIsAnInvalidMongoQuery')
    },
    {
      expression: '"ciao"',
      expectedError: Error('ResultIsAnInvalidMongoQuery')
    },
    {
      expression: '[1,2,3,"hi"]',
      expectedError: Error('ResultIsAnInvalidMongoQuery')
    },
    {
      expression: '3 == 3',
      expectedError: Error('UnsupportedBinaryExpressionEquality')
    },
    {
      expression: '3 === 3',
      expectedError: Error('UnsupportedBinaryExpressionEquality')
    },
    {
      expression: '-a',
      expectedError: Error('UnsupportedUnaryExpression')
    },
    {
      expression: 'undefined != undefined',
      expectedError: Error('UnsupportedExists')
    },
    {
      expression: 'undefined !== undefined',
      expectedError: Error('UnsupportedExists')
    },
    {
      expression: 'a == a',
      expectedError: Error('UnsupportedBinaryExpression')
    },
    {
      expression: 'a === a',
      expectedError: Error('UnsupportedBinaryExpression')
    },
    {
      expression: 'b >> 3',
      expectedError: Error('UnsupportedBinaryExpression')
    },
    {
      expression: 'e => 34',
      expectedError: Error('UnsupportedExpression')
    }
  ]

  t.test('default parseExpressionFunction (acorn)', t => {
    const expressionToMongoQuery = expressionToMongoQueryCompiler()
    runTests(t, expressionToMongoQuery, tests)
  })

  t.test('explicit acorn parseExpressionFunction', t => {
    const expressionToMongoQuery = expressionToMongoQueryCompiler({ parseExpressionFunction: require('acorn').parseExpressionAt })
    runTests(t, expressionToMongoQuery, tests)
  })

  t.test('babylon parseExpressionFunction', t => {
    const expressionToMongoQuery = expressionToMongoQueryCompiler({ parseExpressionFunction: require('babylon').parseExpression })
    runTests(t, expressionToMongoQuery, tests)
  })

  t.test('esprima parseExpressionFunction', t => {
    const esprima = require('esprima')
    const expressionToMongoQuery = expressionToMongoQueryCompiler({
      parseExpressionFunction: exp => esprima.parse(exp).body[0].expression
    })
    runTests(t, expressionToMongoQuery, tests)
  })

  t.test('espree parseExpressionFunction', t => {
    const espree = require('espree')
    const expressionToMongoQuery = expressionToMongoQueryCompiler({
      parseExpressionFunction: exp => espree.parse(exp, { ecmaVersion: 6 }).body[0].expression
    })
    runTests(t, expressionToMongoQuery, tests)
  })
  t.end()
})

t.test('conversions', t => {
  const converters = {
    a: x => x + 1,
    b: d => new Date(d),
    birthDay: d => new Date(d),
    'c.d.e': x => 'hi'
  }

  const tests = [
    {
      expression: 'a == 5',
      expected: { a: 6 }
    },
    {
      expression: 'a == 5 || !(b > 6)',
      expected: {
        $or: [
          {
            a: 6
          },
          {
            $not: {
              b: {
                $gt: new Date(6)
              }
            }
          }
        ]
      }
    },
    {
      expression: 'a == 4 && (b > 100000 || c.d.e === "hola")',
      expected: {
        a: 5,
        $or: [
          {
            b: { $gt: new Date(100000) }
          },
          {
            'c.d.e': 'hi'
          }
        ]
      }
    },
    {
      expression: 'name == "John" && (birthDay > "1990-05-02" || info.id in [1,2,3])',
      expected: {
        name: 'John',
        $or: [
          {
            birthDay: {
              $gt: new Date('1990-05-02T00:00:00.000Z')
            }
          },
          {
            'info.id': {
              $in: [1, 2, 3]
            }
          }
        ]
      }
    }
  ]

  runTests(t, expressionToMongoQueryCompiler({ converters }), tests)
})

function runTests (t, expressionToMongoQuery, tests) {
  t.plan(tests.length)
  for (const { expression, expected, expectedError } of tests) {
    if (expectedError) {
      t.throws(() => {
        console.log(expressionToMongoQuery(expression))
      }, expectedError)
    } else {
      t.strictSame(expressionToMongoQuery(expression), expected, expression)
    }
  }
}
