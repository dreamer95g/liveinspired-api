import { GraphQLScalarType, Kind } from 'graphql';



export const BigIntScalar = new GraphQLScalarType({
  name: 'BigInt',
  description: 'Entero de 64 bits, serializado como string',
  serialize: (v) => (v == null ? null : v.toString()),
  parseValue: (v) => {
    if (typeof v === 'bigint') return v;
    if (typeof v === 'number' || typeof v === 'string') return BigInt(v);
    throw new TypeError('BigInt inválido');
  },
  parseLiteral: (ast) => {
    if (ast.kind === Kind.INT || ast.kind === Kind.STRING) {
      return BigInt(ast.value);
    }
    return null;
  },
});

export const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'Fecha y hora en formato ISO-8601',
  serialize: (v) => (v instanceof Date ? v.toISOString() : v),
  parseValue: (v) => new Date(v),
  parseLiteral: (ast) => (ast.kind === Kind.STRING ? new Date(ast.value) : null),
});