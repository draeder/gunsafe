export const checkIfThis = {
  isObject: (value: any) => {
    return !!(value && typeof value === 'object' && !Array.isArray(value))
  },
  isNumber: (value: any) => {
    return !!isNaN(Number(value))
  },
  isBoolean: (value: any) => {
    return value === 'true' || value === 'false' || value === true || value === false
  },
  isString: (value: any) => {
    return typeof value === 'string'
  },
  isArray: (value: any) => {
    return Array.isArray(value)
  },
}
