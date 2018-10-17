const IDENTIFIER = 'Identifier'
const UNDEFINED = 'undefined'

function expressionToMongoQueryCompiler ({ parseExpressionFunction, converters = {} } = {}) {
  const parse = parseExpressionFunction || require('acorn').parseExpressionAt
  return function expressionToMongoQuery (expr) {
    const tree = parse(expr)
    const mongoquery = expressionTreeToMongoQuery(tree, converters)
    if (mongoquery && mongoquery.constructor === Object) {
      return mongoquery
    }
    throw Error('ResultIsAnInvalidMongoQuery')
  }
}

const operatorsMap = {
  '>': '$gt',
  '<': '$lt',
  '>=': '$gte',
  '<=': '$lte',
  '!=': '$ne',
  '!==': '$ne',
  'in': '$in'
}

const invOperatorsMap = {
  '>': '$lt',
  '<': '$gt',
  '>=': '$lte',
  '<=': '$gte',
  '!=': '$ne',
  '!==': '$ne',
  'in': '$in'
}

const logicalOperatorsMap = {
  '&&': '$and',
  '||': '$or'
}

const identifierOrCompositeIdentifier = {
  [IDENTIFIER]: '',
  'MemberExpression': ''
}

function convert (converters, id, value) {
  return converters[id] ? converters[id](value) : value
}

function expressionTreeToMongoQuery (node, converters) {
  switch (node.type) {
    case 'UnaryExpression':
      if (node.operator === '!') {
        return { $not: expressionTreeToMongoQuery(node.argument, converters) }
      }

      throw Error('UnsupportedUnaryExpression')

    case 'Literal':
      return node.regex ? new RegExp(node.regex.pattern, node.regex.flags) : node.value

    case 'RegExpLiteral':
      return new RegExp(node.pattern, node.flags)

    case 'NumericLiteral':
      return node.value

    case 'StringLiteral':
      return node.value

    case 'ArrayExpression':
      return node.elements.map(e => e.value)

    case IDENTIFIER:
      return node.name

    case 'MemberExpression':
      return `${expressionTreeToMongoQuery(node.object)}.${expressionTreeToMongoQuery(node.property)}`

    case 'BinaryExpression':
      if (node.operator === '==' || node.operator === '===') {
        if (node.right.type === IDENTIFIER && node.right.name === UNDEFINED) {
          return {
            [expressionTreeToMongoQuery(node.left)]: { $exists: false }
          }
        }

        if (node.left.type === IDENTIFIER && node.left.name === UNDEFINED) {
          return {
            [expressionTreeToMongoQuery(node.right)]: { $exists: false }
          }
        }

        if (node.left.type in identifierOrCompositeIdentifier && !(node.right.type in identifierOrCompositeIdentifier)) {
          const id = expressionTreeToMongoQuery(node.left)
          return {
            [id]: convert(converters, id, expressionTreeToMongoQuery(node.right))
          }
        }

        if (!(node.left.type in identifierOrCompositeIdentifier) && node.right.type in identifierOrCompositeIdentifier) {
          const id = expressionTreeToMongoQuery(node.right)
          return {
            [id]: convert(converters, id, expressionTreeToMongoQuery(node.left))
          }
        }

        throw Error('UnsupportedBinaryExpressionEquality')
      }

      if ((node.operator === '!=' || node.operator === '!==') && node.right.type in identifierOrCompositeIdentifier && node.left.type in identifierOrCompositeIdentifier) {
        const left = expressionTreeToMongoQuery(node.left)
        const right = expressionTreeToMongoQuery(node.right)
        if (left !== UNDEFINED && right === UNDEFINED) {
          return {
            [left]: { $exists: true }
          }
        }

        if (left === UNDEFINED && right !== UNDEFINED) {
          return {
            [right]: { $exists: true }
          }
        }

        throw Error('UnsupportedExists')
      }

      if (node.left.type in identifierOrCompositeIdentifier && !(node.right.type in identifierOrCompositeIdentifier) && node.operator in operatorsMap) {
        const id = expressionTreeToMongoQuery(node.left)
        return {
          [id]: { [operatorsMap[node.operator]]: convert(converters, id, expressionTreeToMongoQuery(node.right)) }
        }
      }

      if (!(node.left.type in identifierOrCompositeIdentifier) && node.right.type in identifierOrCompositeIdentifier && node.operator in invOperatorsMap) {
        const id = expressionTreeToMongoQuery(node.right)
        return {
          [id]: { [invOperatorsMap[node.operator]]: convert(converters, id, expressionTreeToMongoQuery(node.left)) }
        }
      }

      throw Error('UnsupportedBinaryExpression')

    case 'LogicalExpression':
      const mongoLogicOperator = logicalOperatorsMap[node.operator]
      const children = [
        expressionTreeToMongoQuery(node.left, converters),
        expressionTreeToMongoQuery(node.right, converters)
      ]
      if (mongoLogicOperator === '$and') {
        return simplifyAnd(children)
      }
      return {
        [mongoLogicOperator]: simplifyLogicExpression(children, mongoLogicOperator)
      }
  }

  throw Error('UnsupportedExpression')
}

function simplifyLogicExpression (children, logicOp) {
  const res = []
  for (const child of children) {
    if (child[logicOp]) {
      res.push(...child[logicOp])
    } else {
      res.push(child)
    }
  }
  return res
}

function flattenAnd (children) {
  const res = []
  for (const child of children) {
    for (const key in child) {
      if (key === '$and') {
        res.push(...flattenAnd(child['$and']))
      } else {
        res.push({
          [key]: child[key]
        })
      }
    }
  }
  return res
}

function flattenedKeyCounts (flattened) {
  const res = {}
  for (const obj of flattened) {
    const key = Object.keys(obj)[0]
    if (key in res) {
      res[key] += 1
    } else {
      res[key] = 1
    }
  }
  return res
}

function simplifyAnd (children) {
  const res = {}
  const flattened = flattenAnd(children)
  const counts = flattenedKeyCounts(flattened)
  for (const obj of flattened) {
    const [key, value] = Object.entries(obj)[0]
    if (counts[key] === 1) {
      res[key] = value
    } else {
      if (res.$and) {
        res.$and.push(obj)
      } else {
        res.$and = [obj]
      }
    }
  }
  return res
}

module.exports = expressionToMongoQueryCompiler
