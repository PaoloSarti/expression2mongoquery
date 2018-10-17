# expression2mongoquery
## Description
This library compiles javascript expressions to MongoDB queries. In this way, filters can be expressed easily and in a more compact way, without having to write a ton of curly braces ;).
It could be used to specify filters in a plain text configuration.

## Installation
```bash
npm i --save expression2mongoquery
```

## Usage
### Simple Example
```js
const assert = require('assert')
const expressionToMongoQuery = require('expression2mongoquery')()
const query = expressionToMongoQuery('a == "value" && b > 42' )
assert.deepStrictEqual(query, {
  a: 'value',
  b: {
    $gt: 42
  }
})
```

### A More Complex Example
```js
const assert = require('assert')
const expressionToMongoQuery = require('./index')({
  converters: {
    birthDay: d => new Date(d),
  }
})
const query = expressionToMongoQuery('name == "John" && (birthDay > "1990-05-02" || info.id in [1,2,3])')
assert.deepStrictEqual(query, {
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
})
```

More examples can be found by consulting the test cases.

## Features
This library considers `identifiers` (variables) as document properties, while literal values are treated as values.


It supports:
 - equal and not equal signs for direct equality comparisons
 - equal and not equal to `undefined` translated as `$exists`
 - inequalities such as `>` `<` `>=` and `<=` to `$gt` etc...
 - `in` translated as `$in` for arrays (differently from JavasScript)
 - logical `&&`, `||` and `!` operators to `$or`, `$and`, `$not`
 - arbitrarly nested logical operators expressions
 - parenthesized expressions
 - composite identifiers to query nested documents i.e. `a.b["c"] > 3` becomes `{ 'a.b.c': { $gt: 3 } }`
 - provide your favourite way to parse JavaScript in construction by passing `{ parseExpressionFunction: <your-favourite-parser> }`
 - convert values according to the property name, by providing a `{ converters: { a: d => new Date(d) } }` map
 - regexes: `a == /^c.*/i` becomes `{ a: { $regex: /^c.*/i } }`

## How does it work?
This library parses JavaScript expressions with `acorn` (by default), then navigates the generated `AST` to transform it into `mongo` queries.
The JavaScript code is never evaluated or executed, so there aren't vulnerabilities caused by JavaScript code injection.

## Parser libraries tested
Every test case has passed using all the following parsers:
 - `acorn` (default)
 - `babylon`
 - `esprima`
 - `espree`

Refer to tests to see how you can use the above parsers.
