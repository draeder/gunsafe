'use strict'
export const checkIfThis = {
  isObject: (value) => {
    return !!(value && typeof value === 'object' && !Array.isArray(value))
  },
  isNumber: (value) => {
    return !!isNaN(Number(value))
  },
  isBoolean: (value) => {
    return value === 'true' || value === 'false' || value === true || value === false
  },
  isString: (value) => {
    return typeof value === 'string'
  },
  isArray: (value) => {
    return Array.isArray(value)
  },
}
